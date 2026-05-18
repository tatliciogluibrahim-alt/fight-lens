/**
 * Accuracy Calculator
 *
 * Computes model performance metrics from a set of PredictionRecords.
 *
 * Brier Score formula (per fight):
 *   BS = ((p_winner − 1)² + (p_loser − 0)²) / 2
 *   where p_winner is the probability assigned to the actual winner (0–1 decimal).
 *
 * Averaged across all resolved fights. Lower is better.
 *   0.00 = perfect  |  0.25 = equivalent to always predicting 50/50  |  >0.25 = overconfident wrong
 *
 * Model grade derived from combined winner accuracy + Brier score:
 *   A: winnerAcc ≥ 70% AND brierScore ≤ 0.18
 *   B: winnerAcc ≥ 60% AND brierScore ≤ 0.22
 *   C: winnerAcc ≥ 52% AND brierScore ≤ 0.245
 *   D: winnerAcc ≥ 45%
 *   F: below all thresholds
 */

import type {
  AccuracyMetrics,
  CalibrationBucket,
  FighterSide,
  MethodType,
  ModelGrade,
  PredictionRecord,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function methodTypeMatches(predicted: { decision: number; koTko: number; submission: number }, actual: MethodType): boolean {
  const topPredicted = (["decision", "koTko", "submission"] as const)
    .map((key) => ({ key, value: predicted[key] }))
    .sort((a, b) => b.value - a.value)[0].key;

  const topActual =
    actual === "decision" ? "decision" :
    actual === "ko_tko" ? "koTko" :
    actual === "submission" ? "submission" : null;

  return topPredicted === topActual;
}

function resolvedRecords(records: PredictionRecord[]) {
  return records.filter(
    (r): r is PredictionRecord & { outcome: NonNullable<PredictionRecord["outcome"]> } =>
      r.outcome !== null &&
      (r.outcome.winner === "fighterA" || r.outcome.winner === "fighterB"),
  );
}

// ─── Brier Score ──────────────────────────────────────────────────────────────

function computeBrierScore(records: ReturnType<typeof resolvedRecords>): number | null {
  if (!records.length) return null;

  const scores = records.map((r) => {
    const pA = r.prediction.fighterAWinProbability / 100;
    const pB = r.prediction.fighterBWinProbability / 100;
    const winnerIsA = r.outcome.winner === "fighterA";

    // Brier score for this fight
    const pWinner = winnerIsA ? pA : pB;
    const pLoser = winnerIsA ? pB : pA;
    return (Math.pow(pWinner - 1, 2) + Math.pow(pLoser - 0, 2)) / 2;
  });

  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// ─── Calibration buckets ──────────────────────────────────────────────────────

function computeCalibration(records: ReturnType<typeof resolvedRecords>): CalibrationBucket[] {
  const buckets: Array<{ min: number; max: number; label: string; mid: number }> = [
    { min: 0.50, max: 0.60, label: "50–60%", mid: 0.55 },
    { min: 0.60, max: 0.70, label: "60–70%", mid: 0.65 },
    { min: 0.70, max: 0.80, label: "70–80%", mid: 0.75 },
    { min: 0.80, max: 1.01, label: "80%+",   mid: 0.85 },
  ];

  return buckets.map(({ min, max, label, mid }) => {
    // Include the fight in the bucket using the FAVORITE's probability
    const inBucket = records.filter((r) => {
      const favProb = Math.max(
        r.prediction.fighterAWinProbability,
        r.prediction.fighterBWinProbability,
      ) / 100;
      return favProb >= min && favProb < max;
    });

    const correct = inBucket.filter((r) => {
      const aIsFav = r.prediction.fighterAWinProbability >= r.prediction.fighterBWinProbability;
      const winnerMatchesFav =
        (aIsFav && r.outcome.winner === "fighterA") ||
        (!aIsFav && r.outcome.winner === "fighterB");
      return winnerMatchesFav;
    });

    return {
      rangeLabel: label,
      predictedMidpoint: mid,
      actualWinRate: inBucket.length > 0 ? correct.length / inBucket.length : 0,
      count: inBucket.length,
    };
  });
}

// ─── Grade ────────────────────────────────────────────────────────────────────

function computeGrade(winnerAcc: number | null, brier: number | null): ModelGrade | null {
  if (winnerAcc === null || brier === null) return null;

  if (winnerAcc >= 70 && brier <= 0.18) return "A";
  if (winnerAcc >= 60 && brier <= 0.22) return "B";
  if (winnerAcc >= 52 && brier <= 0.245) return "C";
  if (winnerAcc >= 45) return "D";
  return "F";
}

// ─── Main function ────────────────────────────────────────────────────────────

export function computeAccuracyMetrics(records: PredictionRecord[]): AccuracyMetrics {
  const resolved = resolvedRecords(records);

  if (!resolved.length) {
    return {
      totalPredictions: records.length,
      resolvedCount: 0,
      winnerAccuracy: null,
      methodAccuracy: null,
      brierScore: null,
      calibrationBuckets: [],
      grade: null,
      lastUpdated: null,
    };
  }

  // Winner accuracy
  const correctWinners = resolved.filter((r) => {
    const aIsFav = r.prediction.fighterAWinProbability >= r.prediction.fighterBWinProbability;
    const favWon =
      (aIsFav && r.outcome.winner === "fighterA") ||
      (!aIsFav && r.outcome.winner === "fighterB");
    return favWon;
  });
  const winnerAccuracy = Math.round((correctWinners.length / resolved.length) * 100);

  // Method accuracy
  const validMethod = resolved.filter((r) => r.outcome.method !== "other");
  const correctMethod = validMethod.filter((r) =>
    methodTypeMatches(r.prediction.methodBreakdown, r.outcome.method),
  );
  const methodAccuracy = validMethod.length
    ? Math.round((correctMethod.length / validMethod.length) * 100)
    : null;

  const brierScore = computeBrierScore(resolved);
  const calibrationBuckets = computeCalibration(resolved);
  const grade = computeGrade(winnerAccuracy, brierScore);

  // Most recent outcome timestamp
  const timestamps = resolved
    .map((r) => r.outcome.recordedAt)
    .filter(Boolean)
    .sort();
  const lastUpdated = timestamps[timestamps.length - 1] ?? null;

  return {
    totalPredictions: records.length,
    resolvedCount: resolved.length,
    winnerAccuracy,
    methodAccuracy,
    brierScore: brierScore !== null ? Math.round(brierScore * 1000) / 1000 : null,
    calibrationBuckets,
    grade,
    lastUpdated,
  };
}
