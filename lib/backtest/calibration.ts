/**
 * calibration — evaluate how well model confidence matches actual win rates
 *
 * A well-calibrated model means: when it says 70%, the actual win rate
 * in that confidence bucket should be close to 70%.
 *
 * This uses the same bucket logic as lib/accuracy/calculator.ts so the
 * backtest calibration is directly comparable to the live model record.
 */

import type { BacktestResult, BacktestSummary } from "./types";

const CALIBRATION_BUCKETS = [
  { label: "50–60%", min: 0.50, max: 0.60, midpoint: 0.55 },
  { label: "60–70%", min: 0.60, max: 0.70, midpoint: 0.65 },
  { label: "70–80%", min: 0.70, max: 0.80, midpoint: 0.75 },
  { label: "80%+",   min: 0.80, max: 1.00, midpoint: 0.90 },
];

/**
 * Compute a calibration summary across a set of scored backtest results.
 *
 * @param results - Scored BacktestResult array (from scorePredictions)
 * @param modelVersion - The model version string to stamp in the summary
 * @returns BacktestSummary with accuracy metrics and calibration breakdown
 */
export function computeBacktestCalibration(
  results: BacktestResult[],
  modelVersion: string,
): BacktestSummary {
  const scored = results.filter((r) => r.correct !== null);
  const totalFights = results.length;
  const scoredFights = scored.length;

  const winnerAccuracy =
    scoredFights > 0
      ? Math.round((scored.filter((r) => r.correct).length / scoredFights) * 100)
      : null;

  const methodScored = scored.filter((r) => r.methodCorrect !== null);
  const methodAccuracy =
    methodScored.length > 0
      ? Math.round((methodScored.filter((r) => r.methodCorrect).length / methodScored.length) * 100)
      : null;

  const brierContributions = scored
    .map((r) => r.brierContribution)
    .filter((b): b is number => b !== null);

  const brierScore =
    brierContributions.length > 0
      ? brierContributions.reduce((a, b) => a + b, 0) / brierContributions.length
      : null;

  const calibrationBuckets = CALIBRATION_BUCKETS.map((bucket) => {
    const inBucket = scored.filter((r) => {
      const prob = Math.max(
        r.prediction.fighterAWinProbability,
        r.prediction.fighterBWinProbability,
      ) / 100;
      return prob >= bucket.min && prob < bucket.max;
    });
    const wins = inBucket.filter((r) => r.correct).length;

    return {
      rangeLabel: bucket.label,
      predictedMidpoint: bucket.midpoint,
      actualWinRate: inBucket.length > 0 ? wins / inBucket.length : 0,
      count: inBucket.length,
    };
  });

  return {
    totalFights,
    scoredFights,
    winnerAccuracy,
    methodAccuracy,
    brierScore: brierScore !== null ? Math.round(brierScore * 1000) / 1000 : null,
    calibrationBuckets,
    generatedAt: new Date().toISOString(),
    modelVersion,
    caveats: [
      "Backtest calibration may differ from live model record due to data vintage.",
      "As-of features reflect UFCStats data available before each fight date.",
      "Small sample sizes make calibration buckets unreliable.",
    ],
  };
}
