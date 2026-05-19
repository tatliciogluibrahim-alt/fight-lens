/**
 * runBacktest — run the outcome model on as-of features
 *
 * This wraps buildFightOutcomeModel (or a backtest-compatible variant) and
 * produces a BacktestPrediction that can be scored against actual outcomes.
 *
 * The backtest model run must be deterministic and reproducible.
 * Given the same as-of features, it must always produce the same output.
 *
 * TODO: Wire up to buildFightOutcomeModel once buildAsOfFeatures is implemented.
 * For now this is a typed stub so the rest of the backtest pipeline compiles.
 */

import type { AsOfFightFeatures, BacktestPrediction } from "./types";

const BACKTEST_MODEL_VERSION = "outcome-v0.2";

/**
 * Run the prediction model on as-of features.
 *
 * @param features - Leakage-checked as-of features for both fighters
 * @returns BacktestPrediction with win probabilities and method breakdown
 */
export function runBacktest(features: AsOfFightFeatures): BacktestPrediction {
  // TODO: Implement
  // Steps:
  // 1. Build a SourcedFight-shaped object from AsOfFightFeatures
  // 2. Run buildFightShapeModel on it
  // 3. Run buildFightOutcomeModel on the shape output
  // 4. Map the output to BacktestPrediction
  // 5. Mark leakageChecked: true

  void features;

  throw new Error("runBacktest: not yet implemented. See TODO in this file.");
}

/**
 * Run the model on a batch of fights.
 * Returns predictions in the same order as the input.
 */
export async function runBacktestBatch(
  fightFeatures: AsOfFightFeatures[],
): Promise<BacktestPrediction[]> {
  return Promise.all(
    fightFeatures.map(async (features) => {
      return runBacktest(features);
    }),
  );
}

export { BACKTEST_MODEL_VERSION };
