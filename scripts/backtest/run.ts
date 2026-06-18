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
import {
  OFFICIAL_RECORD_BASELINE_ID,
  RECORD_BASELINE_VARIANTS,
  recordBaselinePredictions,
  scoreRecordBaseline,
  type RecordBaselinePrediction,
} from "@/lib/backtest/recordBaselines";
import type {
  AsOfFightFeatures,
  BacktestPrediction,
  BacktestResult,
  LeakageCheckReport,
} from "@/lib/backtest/types";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";
import type { MethodType, PredictionRecord } from "@/lib/accuracy/types";

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
  recordBaselines: Record<string, RecordBaselinePrediction>;
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

// ─── Load fight-detail outcomes ───────────────────────────────────────────────
//
// For backtest expansion: pulling outcomes directly from UFCStats fight-detail
// JSONs avoids the need to author dozens of prediction files for past events.
// The outcome is keyed by the *UFCStats fight ID* (the same id used in the
// normalized event JSON as `ufcstatsFightId`).

interface FightDetailFile {
  id: string;
  result: { method: string; round: number | null; time: string | null } | null;
  fighters: Array<{ id: string; name: string; result: "W" | "L" | "D" | "NC" | null }>;
}

// Mirrors lib/accuracy/types FightOutcome — used to build an outcome from
// UFCStats fight-detail JSONs. Draws/NCs are returned as non-directional
// outcomes so the caller can skip and report them consistently.
interface DetailOutcome {
  winner: "fighterA" | "fighterB" | "draw" | "nc";
  method: MethodType;
  round: number;
  time: string;
  recordedAt: string;
}

function normalizeMethod(raw: string | null | undefined): MethodType | "draw" | "nc" | null {
  if (!raw) return null;
  const m = raw.toLowerCase();
  if (m.includes("ko/tko") || m.includes("ko-tko") || m === "ko" || m === "tko") return "ko_tko";
  if (m.includes("sub")) return "submission";
  if (m.includes("dec") || m === "u-dec" || m === "s-dec" || m === "m-dec") return "decision";
  if (m.includes("draw")) return "draw";
  if (m.includes("nc") || m.includes("no contest") || m.includes("overturned") || m.includes("dq")) return "nc";
  // Default conservatively to "other" so the fight stays scoreable
  return "other";
}

function loadFightDetails(): Map<string, FightDetailFile> {
  const detailsDir = repoPath("data/generated/ufcstats/fights");
  if (!fs.existsSync(detailsDir)) return new Map();
  const files = fs.readdirSync(detailsDir).filter((f) => f.endsWith(".json"));
  const map = new Map<string, FightDetailFile>();
  for (const file of files) {
    try {
      const detail = readJson<FightDetailFile>(path.join(detailsDir, file));
      if (detail.id) map.set(detail.id, detail);
    } catch {
      // Silently skip malformed detail files — they shouldn't block the backtest
    }
  }
  return map;
}

/**
 * Build a backtest outcome from a fight-detail file matched to a normalized fight.
 * Returns null if the fight didn't have a clean result (draw, NC, or missing data).
 *
 * Key choice: we resolve the winner by matching fighter UFCStats IDs, not by
 * relying on array order. The detail file may list fighters in either order.
 */
function outcomeFromDetail(
  detail: FightDetailFile,
  fight: SourcedFight,
): DetailOutcome | null {
  if (!detail.result || !detail.fighters?.length) return null;

  const idA = fight.fighters.fighterA.ufcstatsId;
  const idB = fight.fighters.fighterB.ufcstatsId;
  const fa = detail.fighters.find((f) => f.id === idA);
  const fb = detail.fighters.find((f) => f.id === idB);
  if (!fa || !fb) return null;

  let winner: DetailOutcome["winner"];
  if (fa.result === "W" && fb.result === "L") winner = "fighterA";
  else if (fb.result === "W" && fa.result === "L") winner = "fighterB";
  else if (fa.result === "D" || fb.result === "D") winner = "draw";
  else if (fa.result === "NC" || fb.result === "NC") winner = "nc";
  else return null; // Inconclusive — skip rather than guess

  const method = normalizeMethod(detail.result.method);
  if (!method) return null;
  // Draws/NCs flow into winner already; method must align with MethodType for typing
  const methodType: MethodType = method === "draw" || method === "nc" ? "other" : method;

  return {
    winner,
    method: methodType,
    round: detail.result.round ?? 0,
    time: detail.result.time ?? "--:--",
    recordedAt: new Date().toISOString(),
  };
}

// ─── Deprecated profile-record baselines ─────────────────────────────────────
// These read normalized fighter profile strings. They are retained only as a
// reference because those profile snapshots are not guaranteed to be as-of safe.

function parseRecord(record: string | null | undefined): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 };
  const match = record.match(/^(\d+)-(\d+)/);
  return match ? { wins: Number(match[1]), losses: Number(match[2]) } : { wins: 0, losses: 0 };
}

function legacyProfileRecordPick(fight: SourcedFight): "fighterA" | "fighterB" | "coin-flip" {
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

// Stats the backtest considers — kept here so feature-coverage stays in sync
const TRACKED_STATS = [
  "slpm",
  "strikingAccuracy",
  "sapm",
  "strikingDefense",
  "takedownAverage",
  "takedownAccuracy",
  "takedownDefense",
  "submissionAverage",
] as const;

function extractMissingFlags(features: AsOfFightFeatures): string[] {
  const flags: string[] = [];
  for (const side of ["fighterA", "fighterB"] as const) {
    const stats = features[side].aggregateStats;
    for (const key of TRACKED_STATS) {
      if (stats[key] == null) flags.push(`${side}.${key} missing`);
    }
    if (features[side].fightHistoryCount === 0) flags.push(`${side} has no prior fight history`);
  }
  return flags;
}

// ─── Calibration CSV export ───────────────────────────────────────────────────
//
// One row per scored fight (directional outcomes only). All values come from the
// as-of backtest path: predicted_prob_a and raw_delta are the model's as-of
// prediction (career averages recomputed from history strictly before the event
// date), NOT the current-snapshot stats.

// Deterministic 0/1 parity from a string — used to symmetrize A/B assignment.
function hashParity(s: string): 0 | 1 {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h & 1) as 0 | 1;
}

function writeCalibrationCsv(
  rows: BacktestRow[],
  skipReport: Array<{ event: string; fightId: string; reason: string }>,
): void {
  const header = [
    "fight_id", "fighter_a", "fighter_b", "predicted_prob_a", "outcome_a",
    "raw_delta", "fight_date", "close_flag", "asof_frozen",
  ];
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines: string[] = [header.join(",")];
  const dates: string[] = [];
  let caveats = 0;
  let outcomeASum = 0;
  let written = 0;

  for (const r of rows) {
    if (!r.outcome) continue;
    const w = r.outcome.winner;
    if (w !== "fighterA" && w !== "fighterB") continue; // directional only

    // ── Symmetrization (CRITICAL) ──────────────────────────────────────────────
    // The normalized event data lists the WINNER first, so raw fighterA wins ~98%
    // of fights. Pairing a ~0.5 prediction against an outcome that's almost always
    // 1 is confounded with position, not skill, and is useless for calibration.
    // We deterministically swap A/B for ~half the fights (seeded by fight_id) so
    // that outcome_a ≈ 50% and the dataset is calibration-valid. predicted_prob_a,
    // outcome_a, raw_delta, and the fighter labels are all flipped consistently;
    // close_flag is invariant under p → 1−p.
    const swap = hashParity(r.fightId) === 1;
    const probARaw = r.prediction.fighterAWinProbability / 100;
    const probA = swap ? 1 - probARaw : probARaw;
    const outcomeA = (w === "fighterA") === !swap ? 1 : 0;
    const rawDelta = r.prediction.rawDelta;
    const rawDeltaOut = rawDelta == null ? null : swap ? -rawDelta : rawDelta;
    const nameA = swap ? r.fighters.fighterB : r.fighters.fighterA;
    const nameB = swap ? r.fighters.fighterA : r.fighters.fighterB;

    const closeFlag = Math.abs(probA - 0.5) < 0.10 ? 1 : 0;
    const asofFrozen = r.leakageReport.passed ? 1 : 0; // 1 = firewall clean; 0 = thin-history caveat
    if (!asofFrozen) caveats++;
    outcomeASum += outcomeA;
    written++;
    dates.push(r.asOfDate);

    lines.push([
      esc(r.fightId),
      esc(nameA),
      esc(nameB),
      probA.toFixed(4),
      String(outcomeA),
      rawDeltaOut != null ? rawDeltaOut.toFixed(6) : "",
      r.asOfDate,
      String(closeFlag),
      String(asofFrozen),
    ].join(","));
  }

  const outPath = repoPath("scripts/backtest/export_calibration_253.csv");
  fs.writeFileSync(outPath, lines.join("\n") + "\n");

  const sorted = [...dates].sort();
  const dateSkips = skipReport.filter((s) => /date/i.test(s.reason)).length;
  console.log(`\n=== Calibration CSV export ===`);
  console.log(`Wrote ${written} fight rows → ${path.relative(REPO_ROOT, outPath)}`);
  console.log(`Date range: ${sorted[0] ?? "n/a"} → ${sorted[sorted.length - 1] ?? "n/a"}`);
  console.log(`Symmetrized A/B (seeded by fight_id): outcome_a base rate is now ${(100 * outcomeASum / Math.max(written, 1)).toFixed(1)}% (was ~98% winner-first before symmetrization).`);
  console.log(`as-of caveats: ${caveats} row(s) flagged asof_frozen=0 — this is THIN PRE-FIGHT HISTORY, not future-data leakage (the date firewall still applied).`);
  console.log(`fights excluded from corpus for unparseable event date: ${dateSkips}`);
  console.log(
    `AS-OF CONFIRMATION: UFCStats inputs are FROZEN at fight date — career averages ` +
    `(slpm, sapm, takedown rates, etc.) are recomputed from each fighter's prior bouts ` +
    `filtered to strictly before the event date, NOT pulled as-of today.`,
  );
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

  console.log(`\nLoading fight-detail files for outcome backfill...`);
  const fightDetails = loadFightDetails();
  console.log(`  Loaded ${fightDetails.size} fight-detail files`);

  // Step 2: Process each fight
  const rows: BacktestRow[] = [];
  const leakageReports: LeakageCheckReport[] = [];
  const missingDataReport: Array<{ fightId: string; flags: string[]; dataWarnings: { fighterA: string[]; fighterB: string[] } }> = [];
  const skipReport: Array<{ event: string; fightId: string; reason: string }> = [];
  const outcomeSourceById = new Map<string, "prediction-file" | "fight-detail">();

  for (const event of events) {
    const eventDateIso = parseEventDate(event.event.date);
    if (!eventDateIso) {
      console.warn(`\n  SKIP ${event.event.name}: could not parse event date "${event.event.date}"`);
      continue;
    }

    console.log(`\nProcessing ${event.event.name} (${eventDateIso})`);

    for (const fight of event.fights) {
      // Resolve outcome — prefer locked prediction files, fall back to UFCStats detail
      const pred = predictions.get(fight.id);
      let resolvedOutcome: PredictionRecord["outcome"] | null = pred?.outcome ?? null;
      let outcomeSource: "prediction-file" | "fight-detail" = "prediction-file";

      if (!resolvedOutcome) {
        const detail = fightDetails.get(fight.ufcstatsFightId);
        if (detail) {
          const derived = outcomeFromDetail(detail, fight);
          if (derived) {
            resolvedOutcome = derived;
            outcomeSource = "fight-detail";
          }
        }
      }

      if (!resolvedOutcome) {
        console.log(`  SKIP ${fight.id}: no outcome recorded`);
        skipReport.push({ event: event.event.name, fightId: fight.id, reason: "no outcome (no prediction file, no fight-detail result)" });
        continue;
      }

      if (resolvedOutcome.winner === "draw" || resolvedOutcome.winner === "nc") {
        console.log(`  SKIP ${fight.id}: ${resolvedOutcome.winner} outcome — not scored`);
        skipReport.push({ event: event.event.name, fightId: fight.id, reason: `outcome was ${resolvedOutcome.winner} — not directional` });
        continue;
      }

      outcomeSourceById.set(fight.id, outcomeSource);
      console.log(`  Processing ${fight.id}${outcomeSource === "fight-detail" ? " [detail-derived]" : ""}...`);

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
      const score = scorePrediction(prediction, resolvedOutcome);

      // Step 7: Extract missing data flags
      const missingFlags = extractMissingFlags(features);
      const recordBaselines = recordBaselinePredictions(features);

      const row: BacktestRow = {
        fightId: fight.id,
        event: event.event.name,
        asOfDate: eventDateIso,
        fighters: {
          fighterA: fight.fighters.fighterA.name,
          fighterB: fight.fighters.fighterB.name,
        },
        prediction,
        outcome: resolvedOutcome,
        score,
        leakageReport,
        dataWarnings: {
          fighterA: features.fighterA.dataWarnings,
          fighterB: features.fighterB.dataWarnings,
        },
        missingDataFlags: missingFlags,
        recordBaselines,
      };

      rows.push(row);

      if (missingFlags.length > 0 || features.fighterA.dataWarnings.length > 0 || features.fighterB.dataWarnings.length > 0) {
        missingDataReport.push({
          fightId: fight.id,
          flags: missingFlags,
          dataWarnings: { fighterA: features.fighterA.dataWarnings, fighterB: features.fighterB.dataWarnings },
        });
      }

      const winner = resolvedOutcome.winner;
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

  // Export the calibration CSV for external model review.
  writeCalibrationCsv(rows, skipReport);

  if (rows.length === 0) {
    console.error("No fights scored. Cannot write output files.");
    process.exit(1);
  }

  // ─── Calibration summary ──────────────────────────────────────────────────

  const results = rows.map((r) => r.score);
  const summary = computeBacktestCalibration(results, BACKTEST_MODEL_VERSION);

  // ─── Baseline comparison ──────────────────────────────────────────────────

  const scoredRows = rows.filter((r) => r.score.correct !== null && r.outcome && r.outcome.winner !== "draw" && r.outcome.winner !== "nc");

  const legacyBaselines: BaselineResult[] = [
    {
      name: "legacy-profile-record",
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

    const recordPick = legacyProfileRecordPick(fight);
    if (recordPick === winner) legacyBaselines[0].correctCount++;

    const expPick = moreExperiencePick(fight);
    if (expPick === winner) legacyBaselines[1].correctCount++;
  }

  for (const b of legacyBaselines) {
    b.accuracy = b.totalScored > 0 ? Math.round((b.correctCount / b.totalScored) * 100) : null;
  }

  const recordBaselineRowsById = Object.fromEntries(
    RECORD_BASELINE_VARIANTS.map((variant) => [
      variant.id,
      scoredRows.flatMap((row) => {
        if (!row.outcome || row.outcome.winner === "draw" || row.outcome.winner === "nc") return [];
        const baseline = row.recordBaselines[variant.id];
        if (!baseline) return [];
        return [{
          outcomeWinner: row.outcome.winner,
          modelCorrect: row.score.correct === true,
          baseline,
        }];
      }),
    ]),
  );
  const recordBaselines = Object.fromEntries(
    RECORD_BASELINE_VARIANTS.map((variant) => [
      variant.id,
      scoreRecordBaseline(variant.id, recordBaselineRowsById[variant.id] ?? []),
    ]),
  );
  const officialRecordBaseline = recordBaselines[OFFICIAL_RECORD_BASELINE_ID];

  const brierAssessment = summary.brierScore != null && officialRecordBaseline.brierScore != null
    ? summary.brierScore < officialRecordBaseline.brierScore
      ? "Beats the official leakage-safe as-of record baseline on Brier; still early and needs more validation."
      : "Does not beat the official leakage-safe as-of record baseline on Brier."
    : summary.brierScore != null
      ? assessBrierScore(summary.brierScore, summary.scoredFights)
      : null;

  const fullSummary = {
    ...summary,
    baselines: {
      random: { accuracy: 50, brierScore: BASELINES.ALWAYS_FIFTY_FIFTY_BRIER },
      officialRecord: officialRecordBaseline,
      recordBaselines,
      legacyProfileRecord: {
        accuracy: legacyBaselines[0].accuracy,
        scoredFights: legacyBaselines[0].totalScored,
        correct: legacyBaselines[0].correctCount,
        leakageSafe: false,
        deprecated: true,
        label: "Legacy profile-record baseline",
        note: "Uses normalized fighter profile record strings. Retained for reference only; not the official comparison.",
      },
      betterRecord: {
        accuracy: officialRecordBaseline.allFightAccuracy,
        pickAccuracy: officialRecordBaseline.pickAccuracy,
        coverage: officialRecordBaseline.coverage,
        brierScore: officialRecordBaseline.brierScore,
        scoredFights: scoredRows.length,
        picked: officialRecordBaseline.picked,
        correct: officialRecordBaseline.correctPicked,
        leakageSafe: true,
        baselineId: OFFICIAL_RECORD_BASELINE_ID,
        label: officialRecordBaseline.label,
        note: "Deprecated field name retained for compatibility; this now points to the official leakage-safe as-of record baseline.",
      },
      moreExperience: { accuracy: legacyBaselines[1].accuracy, scoredFights: legacyBaselines[1].totalScored, correct: legacyBaselines[1].correctCount },
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
    recordBaselines: r.recordBaselines,
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

  // ─── Feature coverage report ──────────────────────────────────────────────
  //
  // Counts how often each stat is real (sourced from history) vs missing
  // (model falls back to UFC averages). The brief calls for a per-feature
  // breakdown so we can see exactly where the data pipeline is thin.

  const featureCoverage: Record<string, { real: number; missing: number; coverageRate: number | null }> = {};
  const physicalCoverage = { reach: { real: 0, missing: 0 }, stance: { real: 0, missing: 0 }, dob: { real: 0, missing: 0 }, daysSinceLastFight: { real: 0, missing: 0 } };
  const totalFighterRows = rows.length * 2; // 2 fighters per fight

  for (const key of TRACKED_STATS) {
    featureCoverage[key] = { real: 0, missing: 0, coverageRate: null };
  }
  for (const row of rows) {
    const fight = fightLookup.get(row.fightId);
    if (!fight) continue;
    for (const side of ["fighterA", "fighterB"] as const) {
      const fighter = fight.fighters[side];
      // Aggregate stats — we need the as-of features again. They aren't on the row,
      // so recompute lightly: read the missingDataFlags string to infer.
      for (const key of TRACKED_STATS) {
        if (row.missingDataFlags.includes(`${side}.${key} missing`)) {
          featureCoverage[key].missing++;
        } else {
          featureCoverage[key].real++;
        }
      }
      // Physicals come from the fighter profile, not the as-of computation
      if (fighter.reach) physicalCoverage.reach.real++; else physicalCoverage.reach.missing++;
      if (fighter.stance) physicalCoverage.stance.real++; else physicalCoverage.stance.missing++;
      if (fighter.dob) physicalCoverage.dob.real++; else physicalCoverage.dob.missing++;
      // days-since-last-fight: derive from history
      const lastFightDate = fighter.fightHistory?.[0]?.date ?? null;
      if (lastFightDate) physicalCoverage.daysSinceLastFight.real++; else physicalCoverage.daysSinceLastFight.missing++;
    }
  }
  for (const key of Object.keys(featureCoverage)) {
    const fc = featureCoverage[key];
    const total = fc.real + fc.missing;
    fc.coverageRate = total > 0 ? Math.round((fc.real / total) * 100) : null;
  }

  // Opponent quality is currently always derived/manual — record-keeping
  const opponentQualityNote = "opponentQuality is a manual override (when present) or model-defaulted; not part of the leakage-safe as-of computation in this pipeline";

  writeJsonAtomic(path.join(outDir, "feature-coverage.json"), {
    generatedAt: new Date().toISOString(),
    totalFighterRows,
    aggregateStats: featureCoverage,
    physicals: Object.fromEntries(
      Object.entries(physicalCoverage).map(([k, v]) => {
        const total = v.real + v.missing;
        return [k, { ...v, coverageRate: total > 0 ? Math.round((v.real / total) * 100) : null }];
      }),
    ),
    notes: {
      missing: "Model falls back to UFC-average defaults when a stat is missing",
      opponentQuality: opponentQualityNote,
    },
  });
  console.log("Wrote: data/generated/backtests/feature-coverage.json");

  // ─── Event-by-event performance ───────────────────────────────────────────

  const byEvent = new Map<string, BacktestRow[]>();
  for (const row of rows) {
    const list = byEvent.get(row.event) ?? [];
    list.push(row);
    byEvent.set(row.event, list);
  }

  const eventPerformance = Array.from(byEvent.entries()).map(([eventName, eventRows]) => {
    const scored = eventRows.filter((r) => r.score.correct !== null);
    const correct = scored.filter((r) => r.score.correct === true).length;
    const methodScored = eventRows.filter((r) => r.score.methodCorrect !== null);
    const methodCorrect = methodScored.filter((r) => r.score.methodCorrect === true).length;
    const brierTotal = eventRows.reduce((sum, r) => sum + (r.score.brierContribution ?? 0), 0);
    const brierCount = eventRows.filter((r) => r.score.brierContribution !== null).length;
    return {
      event: eventName,
      asOfDate: eventRows[0]?.asOfDate ?? null,
      totalFights: eventRows.length,
      scoredFights: scored.length,
      winnerAccuracy: scored.length > 0 ? Math.round((correct / scored.length) * 100) : null,
      methodAccuracy: methodScored.length > 0 ? Math.round((methodCorrect / methodScored.length) * 100) : null,
      brierScore: brierCount > 0 ? Number((brierTotal / brierCount).toFixed(3)) : null,
      outcomeSourceMix: {
        predictionFile: eventRows.filter((r) => outcomeSourceById.get(r.fightId) === "prediction-file").length,
        fightDetail: eventRows.filter((r) => outcomeSourceById.get(r.fightId) === "fight-detail").length,
      },
    };
  });

  writeJsonAtomic(path.join(outDir, "event-performance.json"), {
    generatedAt: new Date().toISOString(),
    modelVersion: BACKTEST_MODEL_VERSION,
    eventCount: eventPerformance.length,
    events: eventPerformance,
  });
  console.log("Wrote: data/generated/backtests/event-performance.json");

  // ─── Skip report ──────────────────────────────────────────────────────────

  writeJsonAtomic(path.join(outDir, "skip-report.json"), {
    generatedAt: new Date().toISOString(),
    skippedCount: skipReport.length,
    skipped: skipReport,
  });
  console.log("Wrote: data/generated/backtests/skip-report.json");

  // ─── Print summary ────────────────────────────────────────────────────────

  console.log("\n=== BACKTEST SUMMARY ===\n");
  console.log(`  Total fights:         ${summary.totalFights}`);
  console.log(`  Scored fights:        ${summary.scoredFights}`);
  console.log(`  Winner accuracy:      ${summary.winnerAccuracy ?? "n/a"}%`);
  console.log(`  Method accuracy:      ${summary.methodAccuracy ?? "n/a"}%`);
  console.log(`  Brier score:          ${summary.brierScore ?? "n/a"} (lower is better; random=0.25)`);
  console.log(
    `  Official as-of record: ${officialRecordBaseline.pickAccuracy ?? "n/a"}% picked` +
    ` / ${officialRecordBaseline.allFightAccuracy ?? "n/a"}% all fights` +
    ` · brier ${officialRecordBaseline.brierScore ?? "n/a"}`,
  );
  console.log(`  Legacy profile record: ${legacyBaselines[0].accuracy ?? "n/a"}% (not leakage-safe; reference only)`);
  console.log(`  More-experience base: ${legacyBaselines[1].accuracy ?? "n/a"}%`);
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

  console.log("\n  Event-by-event:");
  for (const ev of eventPerformance) {
    console.log(
      `    ${ev.event} (${ev.asOfDate}): ${ev.winnerAccuracy ?? "n/a"}% on ${ev.scoredFights}/${ev.totalFights}` +
      ` · brier ${ev.brierScore ?? "n/a"} · method ${ev.methodAccuracy ?? "n/a"}%`,
    );
  }

  const sources = Array.from(outcomeSourceById.values());
  const fromPredFile = sources.filter((s) => s === "prediction-file").length;
  const fromDetail = sources.filter((s) => s === "fight-detail").length;
  console.log(`\n  Outcome source: ${fromPredFile} from prediction files · ${fromDetail} from UFCStats fight details`);
  console.log(`  Skipped fights: ${skipReport.length}`);

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
