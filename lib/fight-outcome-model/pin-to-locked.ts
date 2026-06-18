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
 * It also re-aligns the `scenarios` array so the "the call" card names the
 * locked favorite, not the live-re-run favorite. Without this, a fight where
 * the locked call leans one way but the post-event re-run leans the other
 * shows a giant probability on Strickland and a "the call → Chimaev" card
 * (the QA-observed contradiction).
 */
import type { FightOutcomeModelOutput, OutcomeScenario } from "./types";
import type { PredictionRecord } from "@/lib/accuracy/types";
import {
  getNamedCallSide,
  isTooCloseToCall,
  resolveNamedCallThreshold,
} from "@/lib/predictionThresholds";

function leanLabel(prob: number): "strong lean" | "lean" | "slight lean" | "no lean" {
  if (prob >= 70) return "strong lean";
  if (prob >= 60) return "lean";
  if (prob >= 52) return "slight lean";
  return "no lean";
}

/**
 * If the live scenarios point at the live favorite but the locked call points
 * at the other fighter, swap the lean+upset content (titles stay where they
 * are, so "the call" remains the lean card and "live path" remains the upset
 * card — only the fighter labels and descriptions move).
 */
function reconcileScenarios(
  scenarios: FightOutcomeModelOutput["scenarios"],
  lockedFavoriteName: string,
): FightOutcomeModelOutput["scenarios"] {
  const lean = scenarios.find((s): s is OutcomeScenario => s.id === "lean");
  const upset = scenarios.find((s): s is OutcomeScenario => s.id === "upset");
  const swing = scenarios.find((s): s is OutcomeScenario => s.id === "swing");
  if (!lean || !upset || !swing) return scenarios;

  if (lean.fighterLabel === lockedFavoriteName) return scenarios;

  const fixedLean: OutcomeScenario = {
    ...lean,
    fighterLabel: upset.fighterLabel,
    description: upset.description,
  };
  const fixedUpset: OutcomeScenario = {
    ...upset,
    fighterLabel: lean.fighterLabel,
    description: lean.description,
  };
  return [fixedLean, fixedUpset, swing] as FightOutcomeModelOutput["scenarios"];
}

export function pinToLockedPrediction(
  liveModel: FightOutcomeModelOutput,
  prediction: PredictionRecord,
): FightOutcomeModelOutput {
  const pA = prediction.prediction.fighterAWinProbability;
  const pB = prediction.prediction.fighterBWinProbability;
  const { decision, koTko, submission } = prediction.prediction.methodBreakdown;
  // Evaluate the named call against the threshold of the version this prediction
  // was locked under — not the current live threshold.
  const threshold = resolveNamedCallThreshold(prediction.modelVersion);
  const tooClose = isTooCloseToCall(pA, pB, threshold);
  const namedSide = getNamedCallSide(pA, pB, threshold);

  const lockedFavoriteName =
    namedSide === "fighterA"
      ? liveModel.fighterA.fighterName
      : namedSide === "fighterB"
        ? liveModel.fighterB.fighterName
        : null;

  return {
    ...liveModel,
    // Stamp the locked call's own version so downstream threshold resolution
    // (view model, audits) evaluates it against the version it was locked under.
    modelVersion: prediction.modelVersion,
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
    scenarios: lockedFavoriteName
      ? reconcileScenarios(liveModel.scenarios, lockedFavoriteName)
      : liveModel.scenarios,
  };
}
