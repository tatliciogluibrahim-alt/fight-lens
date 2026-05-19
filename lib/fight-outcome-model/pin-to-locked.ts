/**
 * pinToLockedPrediction
 *
 * For a fight that has already happened, the live model re-runs with
 * post-event updated stats and produces different probabilities than the
 * pre-fight locked call. That creates a contradiction: the FightResultBanner
 * shows the locked verdict (correct/incorrect) but TheCall shows new numbers.
 *
 * This utility overrides the win probabilities, method breakdown, tooClose,
 * and leanLabel in the live model output with the values from the locked
 * prediction file, so The Call section matches the actual pre-fight call.
 *
 * The narrative (scenarios, swing factor descriptions) comes from the live
 * model run — these are still analytically useful in hindsight.
 */
import type { FightOutcomeModelOutput } from "./types";
import type { PredictionRecord } from "@/lib/accuracy/types";

function leanLabel(prob: number): "strong lean" | "lean" | "slight lean" | "no lean" {
  if (prob >= 70) return "strong lean";
  if (prob >= 60) return "lean";
  if (prob >= 53) return "slight lean";
  return "no lean";
}

export function pinToLockedPrediction(
  liveModel: FightOutcomeModelOutput,
  prediction: PredictionRecord,
): FightOutcomeModelOutput {
  const pA = prediction.prediction.fighterAWinProbability;
  const pB = prediction.prediction.fighterBWinProbability;
  const { decision, koTko, submission } = prediction.prediction.methodBreakdown;
  const tooClose = Math.abs(pA - pB) < 5;

  return {
    ...liveModel,
    tooClose,
    methodBreakdown: { decision, koTko, submission },
    fighterA: {
      ...liveModel.fighterA,
      winProbability: pA,
      leanLabel: leanLabel(pA),
    },
    fighterB: {
      ...liveModel.fighterB,
      winProbability: pB,
      leanLabel: leanLabel(pB),
    },
  };
}
