/**
 * baselines — naive baseline models for comparison
 *
 * A model is only useful if it beats dumb baselines.
 * These baselines give context to the Brier score and winner accuracy.
 *
 * Reference baselines:
 *   - Always 50/50: Brier = 0.250, winner accuracy ≈ 50%
 *   - Always favour favourite (by record): accuracy varies, Brier ≈ 0.20–0.22
 *   - Random pick: accuracy ≈ 50%, Brier ≈ 0.25
 *
 * UFC historical benchmarks (2020–2025):
 *   - Betting favourite win rate: ~67%
 *   - Finish rate: ~37%
 */

export const BASELINES = {
  /**
   * Brier score of a model that always predicts 50/50.
   * This is the ceiling for "no information" — any useful model should be below.
   */
  ALWAYS_FIFTY_FIFTY_BRIER: 0.25,

  /**
   * Approximate Brier score of a model that always picks the betting favourite.
   * Based on ~67% favourite win rate with ~65% average confidence.
   * Fight Lens must beat this to be meaningful.
   */
  FAVOURITE_PICKER_BRIER: 0.20,

  /**
   * UFC average win rate when model correctly identifies the favourite.
   * Source: aggregated UFCStats 2018–2025.
   */
  UFC_FAVOURITE_WIN_RATE: 0.67,

  /**
   * UFC average finish rate across all weight classes (2024–2025).
   */
  UFC_FINISH_RATE: 0.37,

  /**
   * Minimum winner accuracy that beats random guessing with statistical significance.
   * At n=30 fights, you need >60% to reject the 50/50 null at p<0.10.
   */
  MIN_MEANINGFUL_ACCURACY: 0.60,

  /**
   * Minimum sample size before calibration buckets are reliable.
   */
  MIN_CALIBRATION_SAMPLE: 30,
} as const;

/**
 * Evaluate whether a Brier score represents a meaningful improvement over baseline.
 *
 * @param brierScore - Computed Brier score (lower is better)
 * @param n - Number of fights scored
 * @returns Plain-English assessment
 */
export function assessBrierScore(brierScore: number, n: number): string {
  if (n < BASELINES.MIN_CALIBRATION_SAMPLE) {
    return `Sample too small (n=${n}). Need ${BASELINES.MIN_CALIBRATION_SAMPLE}+ fights for reliable calibration.`;
  }
  if (brierScore <= 0.12) return "Well-calibrated — model confidence aligns with actual win rates.";
  if (brierScore <= 0.18) return "Acceptable — beats random, room to improve on confidence calibration.";
  if (brierScore <= BASELINES.FAVOURITE_PICKER_BRIER) return "Marginal — close to a naive favourite-picker baseline.";
  return "Below baseline — model is overclaiming confidence on wrong picks.";
}
