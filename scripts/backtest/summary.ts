#!/usr/bin/env node
/**
 * scripts/backtest/summary.ts
 *
 * Print a human-readable backtest summary from pre-generated output files.
 * Run after: npx tsx scripts/backtest/run.ts
 *
 * Usage: npx tsx scripts/backtest/summary.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessBrierScore } from "@/lib/backtest/baselines";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function repoPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

async function main() {
  const summaryPath = repoPath("data/generated/backtests/summary.json");
  const predsPath = repoPath("data/generated/backtests/predictions.json");

  if (!fs.existsSync(summaryPath)) {
    console.error("No backtest output found. Run: npx tsx scripts/backtest/run.ts");
    process.exit(1);
  }

  const summaryFile = readJson<{
    generatedAt: string;
    modelVersion: string;
    summary: {
      totalFights: number;
      scoredFights: number;
      winnerAccuracy: number | null;
      methodAccuracy: number | null;
      brierScore: number | null;
      calibrationBuckets: Array<{
        rangeLabel: string;
        predictedMidpoint: number;
        actualWinRate: number;
        count: number;
      }>;
      baselines: {
        random: { accuracy: number; brierScore: number };
        officialRecord?: {
          id: string;
          label: string;
          pickAccuracy: number | null;
          allFightAccuracy: number | null;
          brierScore: number | null;
          picked: number;
          noPick: number;
          coverage: number | null;
        };
        betterRecord: {
          accuracy: number | null;
          pickAccuracy?: number | null;
          coverage?: number | null;
          brierScore?: number | null;
          scoredFights: number;
          correct: number;
          picked?: number;
          leakageSafe?: boolean;
          label?: string;
        };
        legacyProfileRecord?: {
          accuracy: number | null;
          scoredFights: number;
          correct: number;
          leakageSafe: false;
          deprecated: true;
          label: string;
          note: string;
        };
        moreExperience: { accuracy: number | null; scoredFights: number; correct: number };
        ufcFavouriteWinRate: number;
      };
      caveats: string[];
    };
    accuracyByConfidenceBucket: Array<{
      label: string;
      count: number;
      correct: number;
      accuracy: number | null;
    }>;
  }>(summaryPath);

  const predsFile = readJson<{
    totalFights: number;
    predictions: Array<{
      fightId: string;
      fighters: { fighterA: string; fighterB: string };
      prediction: { fighterAWinProbability: number; fighterBWinProbability: number };
      outcome: { winner: string; method: string } | null;
      score: { correct: boolean | null; brierContribution: number | null };
      missingDataFlags: string[];
    }>;
  }>(predsPath);

  const { summary } = summaryFile;

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║            FIGHT LENS — BACKTEST SUMMARY                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(`  Generated: ${new Date(summaryFile.generatedAt).toLocaleString()}`);
  console.log(`  Model:     ${summaryFile.modelVersion}`);

  console.log("\n── Core Metrics ─────────────────────────────────────────────\n");
  console.log(`  Fights scored:        ${summary.scoredFights} / ${summary.totalFights}`);
  console.log(`  Winner accuracy:      ${summary.winnerAccuracy ?? "n/a"}%`);
  console.log(`  Method accuracy:      ${summary.methodAccuracy ?? "n/a"}%`);
  console.log(`  Brier score:          ${summary.brierScore ?? "n/a"}  (lower=better, random=0.25)`);

  if (summary.brierScore != null) {
    console.log(`  Assessment:           ${assessBrierScore(summary.brierScore, summary.scoredFights)}`);
  }

  console.log("\n── Baselines ─────────────────────────────────────────────────\n");
  console.log(`  Random guess:         50% accuracy, Brier = ${summary.baselines.random.brierScore}`);
  const officialRecord = summary.baselines.officialRecord ?? summary.baselines.betterRecord;
  const officialAllFightAccuracy = "allFightAccuracy" in officialRecord
    ? officialRecord.allFightAccuracy
    : officialRecord.accuracy;
  console.log(
    `  Official as-of record: ${officialRecord.pickAccuracy ?? "n/a"}% picked` +
    ` / ${officialAllFightAccuracy ?? "n/a"}% all fights` +
    ` · coverage ${officialRecord.coverage ?? "n/a"}%` +
    ` · Brier ${officialRecord.brierScore ?? "n/a"}`,
  );
  if (summary.baselines.legacyProfileRecord) {
    console.log(
      `  Legacy profile record: ${summary.baselines.legacyProfileRecord.accuracy ?? "n/a"}% ` +
      `(not leakage-safe; reference only)`,
    );
  }
  console.log(`  More experience:      ${summary.baselines.moreExperience.accuracy ?? "n/a"}% (${summary.baselines.moreExperience.correct}/${summary.baselines.moreExperience.scoredFights})`);
  console.log(`  UFC fav win rate:     ${Math.round(summary.baselines.ufcFavouriteWinRate * 100)}% (historical avg)`);

  console.log("\n── Accuracy by Confidence ───────────────────────────────────\n");
  for (const b of summaryFile.accuracyByConfidenceBucket) {
    const bar = b.accuracy != null ? "█".repeat(Math.round(b.accuracy / 5)) : "";
    console.log(`  ${b.label.padEnd(8)} ${String(b.accuracy ?? "n/a").padStart(3)}%  ${bar}  (n=${b.count})`);
  }

  console.log("\n── Calibration ──────────────────────────────────────────────\n");
  console.log("  Predicted → Actual");
  for (const b of summary.calibrationBuckets) {
    const actual = b.count > 0 ? `${Math.round(b.actualWinRate * 100)}%` : "n/a";
    const predicted = `${Math.round(b.predictedMidpoint * 100)}%`;
    const bar = b.count > 0 ? "█".repeat(Math.round(b.actualWinRate * 20)) : "";
    console.log(`  ${b.rangeLabel.padEnd(8)} ${predicted.padStart(4)} → ${actual.padStart(4)}  ${bar}  (n=${b.count})`);
  }

  console.log("\n── All Predictions ──────────────────────────────────────────\n");
  for (const p of predsFile.predictions) {
    const fA = p.fighters.fighterA.split(" ").slice(-1)[0];
    const fB = p.fighters.fighterB.split(" ").slice(-1)[0];
    const correct = p.score.correct == null ? " ? " : p.score.correct ? " ✓ " : " ✗ ";
    const brier = p.score.brierContribution != null ? p.score.brierContribution.toFixed(3) : " n/a";
    console.log(
      `  ${correct} ${fA.padEnd(14)} ${String(p.prediction.fighterAWinProbability).padStart(2)}% vs` +
      ` ${fB.padEnd(14)} ${String(p.prediction.fighterBWinProbability).padStart(2)}%` +
      ` | actual: ${p.outcome?.winner ?? "?"} | method: ${p.outcome?.method ?? "?"}` +
      ` | brier: ${brier}`
    );
  }

  if (summary.caveats.length > 0) {
    console.log("\n── Caveats ──────────────────────────────────────────────────\n");
    for (const c of summary.caveats) {
      console.log(`  • ${c}`);
    }
  }

  console.log("\n────────────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
