#!/usr/bin/env node
/**
 * scripts/backtest/run.ts
 *
 * Historical backtest runner for Fight Lens.
 *
 * For every fight in the normalized event JSONs that has a recorded outcome,
 * this script:
 *   1. Loads the normalized event data (SourcedFight objects with full fightHistory)
 *   2. Determines the event date (the as-of cutoff)
 *   3. Builds as-of features for both fighters (fightHistory filtered to < event date)
 *   4. Recomputes aggregate stats from those filtered fights only (no leakage)
 *   5. Runs buildFightShapeModel + buildFightOutcomeModel on the as-of features
 *   6. Scores predictions vs actual outcomes
 *   7. Writes outputs to data/generated/backtests/
 *
 * Run: npx tsx scripts/backtest/run.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Path helpers ─────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function repoPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

// ─── Import lib modules ───────────────────────────────────────────────────────
// Note: these are pure TypeScript with no React/Next.js imports, so tsx works fine.

import { buildAsOfFeaturesFromSourcedFight } from "@/lib/backtest/buildAsOfFeatures";
import { runBacktest, BACKTEST_MODEL_VERSION } from "@/lib/backtest/runBacktest";
import { scorePrediction } from "@/lib/backtest/scorePredictions";
import { computeBacktestCalibration } from "@/lib/backtest/calibration";
import { checkForLeakage } from "@/lib/backtest/leakageChecks";
import { BASELINES, assessBrierScore } from "@/lib/backtest/baselines";
import type {
  AsOfFightFeatures,
  BacktestPrediction,
  BacktestResult,
  LeakageCheckReport,
} from "@/lib/backtest/types";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PredictionFile extends PredictionRecord {
  isBacktestReconstruction?: boolean;
}

interface BacktestRow {
  fightId: string;
  event: string;
  asOfDate: string;
  fighters: { fighterA: string; fighterB: string };
  prediction: BacktestPrediction;
  outcome: PredictionRecord["outcome"];
  score: BacktestResult;
  leakageReport: LeakageCheckReport;
  dataWarnings: { fighterA: string[]; fighterB: string[] };
  missingDataFlags: string[];
}

interface BaselineResult {
  name: string;
  correctCount: number;
  totalScored: number;
  accuracy: number | null;
}

// ─── Parse UFCStats date to ISO ───────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, "jan.": 0, january: 0,
  feb: 1, "feb.": 1, february: 1,
  mar: 2, "mar.": 2, march: 2,
  apr: 3, "apr.": 3, april: 3,
  may: 4, "may.": 4,
  jun: 5, "jun.": 5, june: 5,
  jul: 6, "jul.": 6, july: 6,
  aug: 7, "aug.": 7, august: 7,
  sep: 8, "sep.": 8, september: 8,
  oct: 9, "oct.": 9, october: 9,
  nov: 10, "nov.": 10, november: 10,
  dec: 11, "dec.": 11, december: 11,
};

function parseEventDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(",", "").replace(/\s+/g, " ").trim();
  const [monthText, dayText, yearText] = cleaned.split(" ");
  const month = MONTH_MAP[monthText?.toLowerCase()];
  const day = Number(dayText);
  const year = Number(yearText);
  if (month == null || !day || !year) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Load normalized events ───────────────────────────────────────────────────

function loadAllEvents(): SourcedEvent[] {
  const eventsDir = repoPath("data/normalized/events");
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".json"));

  const events: SourcedEvent[] = [];
  // Deduplicate by event name — two JSON files may cover the same event
  const seenNames = new Set<string>();

  for (const file of files) {
    try {
      const event = readJson<SourcedEvent>(path.join(eventsDir, file));
      // Normalize name for dedup: "UFC 329: McGregor vs. Holloway 2" and variants
      const nameKey = event.event.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seenNames.has(nameKey)) {
        console.log(`  SKIP duplicate event file: ${file} (same event as already loaded)`);
        continue;
      }
      seenNames.add(nameKey);
      events.push(event);
      console.log(`  Loaded event: ${event.event.name} (${event.fights.length} fights)`);
    } catch (err) {
      console.warn(`  Could not load ${file}:`, (err as Error).message);
    }
  }
  return events;
}

// ─── Load prediction files ────────────────────────────────────────────────────

function loadPredictions(): Map<string, PredictionFile> {
  const predsDir = repoPath("data/predictions");
  const files = fs.readdirSync(predsDir).filter((f) => f.endsWith(".json"));

  const map = new Map<string, PredictionFile>();
  for (const file of files) {
    try {
      const pred = readJson<PredictionFile>(path.join(predsDir, file));
      map.set(pred.fightId, pred);
    } catch (err) {
      console.warn(`  Could not load prediction ${file}:`, (err as Error).message);
    }
  }
  return map;
}

// ─── Baseline: better-record picker ──────────────────────────────────────────

function parseRecord(record: string | null | undefined): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 };
  const match = record.match(/^(\d+)-(\d+)/);
  return match ? { wins: Number(match[1]), losses: Number(match[2]) } : { wins: 0, losses: 0 };
}

function betterRecordPick(fight: SourcedFight): "fighterA" | "fighterB" | "coin-flip" {
  const ra = parseRecord(fight.fighters.fighterA.record);
  const rb = parseRecord(fight.fighters.fighterB.record);
  const ratioA = ra.wins / Math.max(1, ra.wins + ra.losses);
  const ratioB = rb.wins / Math.max(1, rb.wins + rb.losses);
  if (ratioA > ratioB) return "fighterA";
  if (ratioB > ratioA) return "fighterB";
  return "coin-flip";
}

function moreExperiencePick(fight: SourcedFight): "fighterA" | "fighterB" | "coin-flip" {
  const ra = parseRecord(fight.fighters.fighterA.record);
  const rb = parseRecord(fight.fighters.fighterB.record);
  const totalA = ra.wins + ra.losses;
  const totalB = rb.wins + rb.losses;
  if (totalA > totalB) return "fighterA";
  if (totalB > totalA) return "fighterB";
  return "coin-flip";
}

// ─── Missing data flags ───────────────────────────────────────────────────────

function extractMissingFlags(features: AsOfFightFeatures): string[] {
  const flags: string[] = [];
  const stats = features.fighterA.aggregateStats;
  if (stats.sapm == null) flags.push("fighterA.sapm missing");
  if (stats.strikingDefense == null) flags.push("fighterA.strikingDefense missing");
  if (stats.takedownDefense == null) flags.push("fighterA.takedownDefense missing");
  const statsB = features.fighterB.aggregateStats;
  if (statsB.sapm == null) flags.push("fighterB.sapm missing");
  if (statsB.strikingDefense == null) flags.push("fighterB.strikingDefense missing");
  if (statsB.takedownDefense == null) flags.push("fighterB.takedownDefense missing");
  if (features.fighterA.fightHistoryCount === 0) flags.push("fighterA has no prior fight history");
  if (features.fighterB.fightHistoryCount === 0) flags.push("fighterB has no prior fight history");
  return flags;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Fight Lens Backtest Runner ===\n");

  // Step 1: Load data
  console.log("Loading normalized events...");
  const events = loadAllEvents();
  console.log(`\nLoading prediction files...`);
  const predictions = loadPredictions();
  console.log(`  Loaded ${predictions.size} prediction files`);

  // Step 2: Process each fight
  const rows: BacktestRow[] = [];
  const leakageReports: LeakageCheckReport[] = [];
  const missingDataReport: Array<{ fightId: string; flags: string[]; dataWarnings: { fighterA: string[]; fighterB: string[] } }> = [];

  for (const event of events) {
    const eventDateIso = parseEventDate(event.event.date);
    if (!eventDateIso) {
      console.warn(`\n  SKIP ${event.event.name}: could not parse event date "${event.event.date}"`);
      continue;
    }

    console.log(`\nProcessing ${event.event.name} (${eventDateIso})`);

    for (const fight of event.fights) {
      const pred = predictions.get(fight.id);

      // Only backtest fights with a recorded outcome
      if (!pred?.outcome) {
        console.log(`  SKIP ${fight.id}: no outcome recorded`);
        continue;
      }

      console.log(`  Processing ${fight.id}...`);

      // Step 3: Build as-of features (leakage firewall)
      let features: AsOfFightFeatures;
      try {
        features = buildAsOfFeaturesFromSourcedFight(fight, event.event.name, eventDateIso);
      } catch (err) {
        console.error(`    ERROR building as-of features: ${(err as Error).message}`);
        continue;
      }

      // Step 4: Leakage check
      const leakageReport = checkForLeakage(features);
      leakageReports.push(leakageReport);

      if (!leakageReport.passed) {
        console.warn(`    LEAKAGE ISSUES: ${leakageReport.issues.join("; ")}`);
        // We still run the model but flag it clearly
      }

      // Step 5: Run the model
      let prediction: BacktestPrediction;
      try {
        prediction = runBacktest(features);
      } catch (err) {
        console.error(`    ERROR running model: ${(err as Error).message}`);
        continue;
      }

      // Step 6: Score
      const score = scorePrediction(prediction, pred.outcome);

      // Step 7: Extract missing data flags
      const missingFlags = extractMissingFlags(features);

      const row: BacktestRow = {
        fightId: fight.id,
        event: event.event.name,
        asOfDate: eventDateIso,
        fighters: {
          fighterA: fight.fighters.fighterA.name,
          fighterB: fight.fighters.fighterB.name,
        },
        prediction,
        outcome: pred.outcome,
        score,
        leakageReport,
        dataWarnings: {
          fighterA: features.fighterA.dataWarnings,
          fighterB: features.fighterB.dataWarnings,
        },
        missingDataFlags: missingFlags,
      };

      rows.push(row);

      if (missingFlags.length > 0 || features.fighterA.dataWarnings.length > 0 || features.fighterB.dataWarnings.length > 0) {
        missingDataReport.push({
          fightId: fight.id,
          flags: missingFlags,
          dataWarnings: { fighterA: features.fighterA.dataWarnings, fighterB: features.fighterB.dataWarnings },
        });
      }

      const winner = pred.outcome.winner;
      const modelPickA = prediction.fighterAWinProbability >= prediction.fighterBWinProbability;
      const correct = score.correct;
      const fA = fight.fighters.fighterA.name.split(" ").slice(-1)[0];
      const fB = fight.fighters.fighterB.name.split(" ").slice(-1)[0];
      console.log(
        `    ${fA} ${prediction.fighterAWinProbability}% vs ${fB} ${prediction.fighterBWinProbability}%` +
        ` | actual: ${winner} | correct: ${correct == null ? "n/a" : correct ? "YES" : "NO"}` +
        ` | brier: ${score.brierContribution?.toFixed(3) ?? "n/a"}`
      );
    }
  }

  console.log(`\n=== Processed ${rows.length} fights with outcomes ===\n`);

  if (rows.length === 0) {
    console.error("No fights scored. Cannot write output files.");
    process.exit(1);
  }

  // ─── Calibration summary ──────────────────────────────────────────────────

  const results = rows.map((r) => r.score);
  const summary = computeBacktestCalibration(results, BACKTEST_MODEL_VERSION);

  // ─── Baseline comparison ──────────────────────────────────────────────────

  const scoredRows = rows.filter((r) => r.score.correct !== null && r.outcome && r.outcome.winner !== "draw" && r.outcome.winner !== "nc");

  const baselines: BaselineResult[] = [
    {
      name: "better-record",
      correctCount: 0,
      totalScored: scoredRows.length,
      accuracy: null,
    },
    {
      name: "more-experience",
      correctCount: 0,
      totalScored: scoredRows.length,
      accuracy: null,
    },
  ];

  // We need the fight objects to run baselines — build a lookup
  const fightLookup = new Map<string, SourcedFight>();
  for (const event of events) {
    for (const fight of event.fights) {
      fightLookup.set(fight.id, fight);
    }
  }

  for (const row of scoredRows) {
    const fight = fightLookup.get(row.fightId);
    if (!fight || !row.outcome) continue;
    const winner = row.outcome.winner as "fighterA" | "fighterB";

    const recordPick = betterRecordPick(fight);
    if (recordPick === winner) baselines[0].correctCount++;

    const expPick = moreExperiencePick(fight);
    if (expPick === winner) baselines[1].correctCount++;
  }

  for (const b of baselines) {
    b.accuracy = b.totalScored > 0 ? Math.round((b.correctCount / b.totalScored) * 100) : null;
  }

  const brierAssessment = summary.brierScore != null ? assessBrierScore(summary.brierScore, summary.scoredFights) : null;

  const fullSummary = {
    ...summary,
    baselines: {
      random: { accuracy: 50, brierScore: BASELINES.ALWAYS_FIFTY_FIFTY_BRIER },
      betterRecord: { accuracy: baselines[0].accuracy, scoredFights: baselines[0].totalScored, correct: baselines[0].correctCount },
      moreExperience: { accuracy: baselines[1].accuracy, scoredFights: baselines[1].totalScored, correct: baselines[1].correctCount },
      ufcFavouriteWinRate: BASELINES.UFC_FAVOURITE_WIN_RATE,
    },
    brierAssessment,
    missingDataRate: rows.length > 0 ? Math.round((missingDataReport.length / rows.length) * 100) : null,
  };

  // ─── Confidence bucket accuracy ───────────────────────────────────────────

  const confidenceBuckets = [
    { label: "50-60%", min: 50, max: 60 },
    { label: "60-70%", min: 60, max: 70 },
    { label: "70-80%", min: 70, max: 80 },
    { label: "80%+", min: 80, max: 101 },
  ].map(({ label, min, max }) => {
    const inBucket = scoredRows.filter((r) => {
      const maxProb = Math.max(r.prediction.fighterAWinProbability, r.prediction.fighterBWinProbability);
      return maxProb >= min && maxProb < max;
    });
    const correct = inBucket.filter((r) => r.score.correct).length;
    return {
      label,
      count: inBucket.length,
      correct,
      accuracy: inBucket.length > 0 ? Math.round((correct / inBucket.length) * 100) : null,
    };
  });

  // ─── Predictions output ───────────────────────────────────────────────────

  const predictionsOutput = rows.map((r) => ({
    fightId: r.fightId,
    event: r.event,
    asOfDate: r.asOfDate,
    fighters: r.fighters,
    prediction: {
      fighterAWinProbability: r.prediction.fighterAWinProbability,
      fighterBWinProbability: r.prediction.fighterBWinProbability,
      methodBreakdown: r.prediction.methodBreakdown,
      confidence: r.prediction.confidence,
    },
    outcome: r.outcome,
    score: {
      correct: r.score.correct,
      brierContribution: r.score.brierContribution,
      methodCorrect: r.score.methodCorrect,
    },
    leakagePassed: r.leakageReport.passed,
    missingDataFlags: r.missingDataFlags,
  }));

  // ─── Write outputs ────────────────────────────────────────────────────────

  const outDir = repoPath("data/generated/backtests");

  writeJsonAtomic(path.join(outDir, "predictions.json"), {
    generatedAt: new Date().toISOString(),
    modelVersion: BACKTEST_MODEL_VERSION,
    totalFights: rows.length,
    predictions: predictionsOutput,
  });
  console.log("Wrote: data/generated/backtests/predictions.json");

  writeJsonAtomic(path.join(outDir, "summary.json"), {
    generatedAt: new Date().toISOString(),
    modelVersion: BACKTEST_MODEL_VERSION,
    summary: fullSummary,
    accuracyByConfidenceBucket: confidenceBuckets,
  });
  console.log("Wrote: data/generated/backtests/summary.json");

  writeJsonAtomic(path.join(outDir, "calibration.json"), {
    generatedAt: new Date().toISOString(),
    modelVersion: BACKTEST_MODEL_VERSION,
    calibrationBuckets: summary.calibrationBuckets,
    winnerAccuracy: summary.winnerAccuracy,
    methodAccuracy: summary.methodAccuracy,
    brierScore: summary.brierScore,
    caveats: summary.caveats,
  });
  console.log("Wrote: data/generated/backtests/calibration.json");

  writeJsonAtomic(path.join(outDir, "missing-data-report.json"), {
    generatedAt: new Date().toISOString(),
    totalFights: rows.length,
    fightsWithMissingData: missingDataReport.length,
    missingDataRate: fullSummary.missingDataRate,
    fights: missingDataReport,
  });
  console.log("Wrote: data/generated/backtests/missing-data-report.json");

  writeJsonAtomic(path.join(outDir, "leakage-reports.json"), {
    generatedAt: new Date().toISOString(),
    totalFights: rows.length,
    passed: leakageReports.filter((r) => r.passed).length,
    failed: leakageReports.filter((r) => !r.passed).length,
    reports: leakageReports,
  });
  console.log("Wrote: data/generated/backtests/leakage-reports.json");

  // ─── Print summary ────────────────────────────────────────────────────────

  console.log("\n=== BACKTEST SUMMARY ===\n");
  console.log(`  Total fights:         ${summary.totalFights}`);
  console.log(`  Scored fights:        ${summary.scoredFights}`);
  console.log(`  Winner accuracy:      ${summary.winnerAccuracy ?? "n/a"}%`);
  console.log(`  Method accuracy:      ${summary.methodAccuracy ?? "n/a"}%`);
  console.log(`  Brier score:          ${summary.brierScore ?? "n/a"} (lower is better; random=0.25)`);
  console.log(`  Better-record base:   ${baselines[0].accuracy ?? "n/a"}%`);
  console.log(`  More-experience base: ${baselines[1].accuracy ?? "n/a"}%`);
  console.log(`  Missing data rate:    ${fullSummary.missingDataRate ?? "n/a"}%`);
  if (brierAssessment) console.log(`\n  Assessment: ${brierAssessment}`);

  console.log("\n  Confidence bucket accuracy:");
  for (const b of confidenceBuckets) {
    console.log(`    ${b.label}: ${b.accuracy ?? "n/a"}% (${b.correct}/${b.count})`);
  }

  console.log("\n  Calibration:");
  for (const b of summary.calibrationBuckets) {
    const actual = b.count > 0 ? Math.round(b.actualWinRate * 100) : null;
    console.log(`    ${b.rangeLabel}: predicted ${Math.round(b.predictedMidpoint * 100)}% | actual ${actual ?? "n/a"}% | n=${b.count}`);
  }

  console.log("\n  Sample predictions:");
  for (const row of rows.slice(0, 5)) {
    const fA = row.fighters.fighterA.split(" ").slice(-1)[0];
    const fB = row.fighters.fighterB.split(" ").slice(-1)[0];
    const correct = row.score.correct == null ? "n/a" : row.score.correct ? "✓" : "✗";
    console.log(
      `    ${fA} ${row.prediction.fighterAWinProbability}% vs ${fB} ${row.prediction.fighterBWinProbability}%` +
      ` → actual: ${row.outcome?.winner ?? "?"} [${correct}]`
    );
  }

  console.log("\n=== Done ===\n");
}

main().catch((err) => {
  console.error("\nBacktest runner failed:");
  console.error(err);
  process.exitCode = 1;
});
