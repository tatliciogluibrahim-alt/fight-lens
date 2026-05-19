/**
 * scorePredictions — compare backtest predictions against real outcomes
 *
 * This is separated from runBacktest so the scoring logic can be used on
 * both backtest predictions and live locked predictions (from data/predictions/).
 * The same scoring math powers both the model record page and backtest summaries.
 */

import type { BacktestPrediction, BacktestResult } from "./types";
import type { PredictionRecord } from "@/lib/accuracy/types";

/**
 * Score a single backtest prediction against a known outcome.
 *
 * @param prediction - The backtest prediction (pre-fight)
 * @param outcome - The actual fight result (post-fight)
 * @returns Scored BacktestResult with accuracy metrics
 */
export function scorePrediction(
  prediction: BacktestPrediction,
  outcome: PredictionRecord["outcome"],
): BacktestResult {
  if (!outcome || outcome.winner === "draw" || outcome.winner === "nc") {
    return {
      prediction,
      outcome,
      correct: null,
      brierContribution: null,
      methodCorrect: null,
    };
  }

  const modelPickedA = prediction.fighterAWinProbability >= prediction.fighterBWinProbability;
  const correct = outcome.winner === "fighterA" ? modelPickedA : !modelPickedA;

  // Brier score contribution: (p - actual)^2
  // actual = 1 if fighterA won, 0 if fighterB won
  const actual = outcome.winner === "fighterA" ? 1 : 0;
  const probA = prediction.fighterAWinProbability / 100;
  const brierContribution = Math.pow(probA - actual, 2);

  // Method accuracy: was the finish/decision call directionally right?
  const methodCorrect = scoreMethodAccuracy(prediction, outcome.method);

  return {
    prediction,
    outcome,
    correct,
    brierContribution,
    methodCorrect,
  };
}

/**
 * Score a batch of predictions.
 */
export function scorePredictions(
  pairs: Array<{ prediction: BacktestPrediction; outcome: PredictionRecord["outcome"] }>,
): BacktestResult[] {
  return pairs.map(({ prediction, outcome }) => scorePrediction(prediction, outcome));
}

/**
 * Check if the method breakdown was directionally correct.
 * "Directionally correct" means: if the model had finish > 50%, did a finish happen?
 */
function scoreMethodAccuracy(
  prediction: BacktestPrediction,
  actualMethod: string,
): boolean | null {
  const finishPct = prediction.methodBreakdown.koTko + prediction.methodBreakdown.submission;
  const modelExpectedFinish = finishPct > 50;
  const actualFinish =
    actualMethod === "ko_tko" || actualMethod === "submission";

  return modelExpectedFinish === actualFinish;
}
