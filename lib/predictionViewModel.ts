/**
 * predictionViewModel — single source of truth for a fight page.
 *
 * Different sections of a fight page used to derive winners independently:
 *   - The Call card read outcomeModel.scenarios[0].fighterLabel
 *   - FightShapeSummary picked whoever had higher stylePressureIndex
 *   - PathsToVictory rendered both fighters with no winner reference
 *   - FightResultBanner computed its own modelPick from locked probabilities
 *
 * For a locked fight, those could disagree — exactly the Chimaev/Strickland
 * contradiction observed in QA. This module collapses every public-facing
 * winner / lean / live-path reference into one shape that every component
 * reads from.
 *
 * IMPORTANT: This module is presentation-only. It does NOT change model math.
 * It also does not change opponentTotals or as-of backtest logic.
 */

import type { FightOutcomeModelOutput, OutcomeScenario } from "@/lib/fight-outcome-model/types";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Where the displayed call comes from. The UI MUST label each appropriately:
 *   - lockedCall     → "Logged call" (intended to be pre-fight)
 *   - currentModel   → live recalculation, no locked call exists
 *   - historicalBacktest → retroactive as-of run, never publicly logged
 *   - pending        → no signal available
 */
export type PredictionSourceType =
  | "lockedCall"
  | "currentModel"
  | "historicalBacktest"
  | "pending";

export type ReadStrength = "strong" | "usable" | "thin" | "data-pending";

export interface FighterRef {
  id: string;
  ufcstatsId: string;
  name: string;
  /** Win probability for this fighter, 0–100 (rounded as the model emits it) */
  winProbability: number;
}

export interface PredictionViewModel {
  eventId: string | null;
  fightId: string;
  modelVersion: string;

  fighterA: FighterRef;
  fighterB: FighterRef;

  /** The fighter the model leans toward. Null only if the model produced no call. */
  predictedWinner: FighterRef | null;
  predictedLoser: FighterRef | null;

  /** Same as predictedWinner.winProbability — convenience for consumers */
  winnerProbability: number | null;
  loserProbability: number | null;

  /** True when both fighters are within ~5% of 50/50 */
  tooClose: boolean;

  readStrength: ReadStrength;

  /** Top method by share — primary public display */
  methodLean: "Decision" | "KO/TKO" | "Submission" | null;
  /** Full method distribution for context */
  methodDistribution: { decision: number; koTko: number; submission: number };

  /**
   * The fighter whose route lives in "Live Path" — by convention, the lower-
   * probability side. Same as predictedLoser unless overridden.
   */
  livePathFighter: FighterRef | null;

  /** Short label for what would shrink the model's edge */
  swingFactorLabel: string;
  /** Description for "what breaks the call" */
  whatBreaksTheCall: string;

  /** Scenario cards from the outcome model, all reconciled to the canonical winner */
  scenarios: readonly OutcomeScenario[];

  /** Scoring state — populated only when an actual outcome is on file */
  isScored: boolean;
  actualWinner: FighterRef | null;
  actualMethod: "decision" | "ko_tko" | "submission" | "other" | "draw" | "nc" | null;
  /** True if predictedWinner matched actualWinner. Null when not scored or draw/NC. */
  modelCorrect: boolean | null;
  /** True if the public methodLean direction matched (finish vs decision). */
  methodCorrect: boolean | null;

  /** Where the call comes from. Drives the surface label. */
  sourceType: PredictionSourceType;

  /** Plain-English data warnings carried through from the model */
  dataWarnings: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readStrengthFrom(
  topProb: number | null,
  confidence: FightOutcomeModelOutput["confidence"] | null,
): ReadStrength {
  if (confidence === "insufficient" || topProb == null) return "data-pending";
  if (confidence === "high" || topProb >= 70) return "strong";
  if (confidence === "medium" || topProb >= 60) return "usable";
  return "thin";
}

function topMethod(
  m: { decision: number; koTko: number; submission: number },
): PredictionViewModel["methodLean"] {
  const entries: Array<[PredictionViewModel["methodLean"], number]> = [
    ["Decision", m.decision],
    ["KO/TKO", m.koTko],
    ["Submission", m.submission],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function asFighterRef(
  src: SourcedFighter,
  winProb: number,
): FighterRef {
  return {
    id: src.id,
    ufcstatsId: src.ufcstatsId,
    name: src.name,
    winProbability: winProb,
  };
}

/**
 * Reconcile the outcome model's scenarios to the locked direction.
 *
 * Reason: buildScenarios uses live probabilities. When the locked prediction
 * disagrees with the live re-run (which it routinely does for past fights),
 * the "the call" card can name the live favorite while the giant probability
 * shows the locked favorite. This swap keeps them in sync.
 */
function reconcileScenariosToWinner(
  scenarios: FightOutcomeModelOutput["scenarios"],
  predictedWinnerName: string,
): FightOutcomeModelOutput["scenarios"] {
  // The "lean" scenario should name the predictedWinner; "upset" should name the loser.
  // If they're flipped, swap their fighterLabel + description (titles stay where they are).
  const lean = scenarios.find((s) => s.id === "lean");
  const upset = scenarios.find((s) => s.id === "upset");
  const swing = scenarios.find((s) => s.id === "swing");
  if (!lean || !upset || !swing) return scenarios;

  if (lean.fighterLabel === predictedWinnerName) return scenarios; // already aligned

  const fixedLean = { ...lean, fighterLabel: upset.fighterLabel, description: upset.description };
  const fixedUpset = { ...upset, fighterLabel: lean.fighterLabel, description: lean.description };
  return [fixedLean, fixedUpset, swing] as FightOutcomeModelOutput["scenarios"];
}

// ─── Builder ──────────────────────────────────────────────────────────────────

interface BuildArgs {
  eventId: string | null;
  fight: SourcedFight;
  outcomeModel: FightOutcomeModelOutput;
  lockedPrediction: PredictionRecord | null;
}

/**
 * Build the canonical view model that every fight-page component will consume.
 *
 * Source-resolution rules:
 *   - If a locked PredictionRecord exists AND predictionMadeAt is set AND it
 *     is not flagged as a backtest reconstruction → sourceType = lockedCall.
 *   - If a backtest-flagged PredictionRecord exists → sourceType =
 *     historicalBacktest. The numbers still come from outcomeModel (the
 *     model.ts call site pins them via pinToLockedPrediction for that case).
 *   - Otherwise sourceType = currentModel (or pending if confidence is insufficient).
 */
export function buildPredictionViewModel({
  eventId,
  fight,
  outcomeModel,
  lockedPrediction,
}: BuildArgs): PredictionViewModel {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const probA = outcomeModel.fighterA.winProbability;
  const probB = outcomeModel.fighterB.winProbability;

  const fighterARef = asFighterRef(fighterA, probA);
  const fighterBRef = asFighterRef(fighterB, probB);

  // ── Source type ────────────────────────────────────────────────────────────
  let sourceType: PredictionSourceType;
  if (outcomeModel.confidence === "insufficient") {
    sourceType = "pending";
  } else if (lockedPrediction) {
    sourceType = lockedPrediction.isBacktestReconstruction
      ? "historicalBacktest"
      : "lockedCall";
  } else {
    sourceType = "currentModel";
  }

  // ── Predicted winner / loser ──────────────────────────────────────────────
  // tooClose is a separate property — the predictedWinner is still defined
  // (it's whichever side carries the higher probability), but the UI can
  // present it differently when tooClose is true.
  const aIsWinner = probA >= probB;
  const predictedWinner = sourceType === "pending"
    ? null
    : aIsWinner ? fighterARef : fighterBRef;
  const predictedLoser = sourceType === "pending"
    ? null
    : aIsWinner ? fighterBRef : fighterARef;

  const winnerProbability = predictedWinner?.winProbability ?? null;
  const loserProbability = predictedLoser?.winProbability ?? null;

  // ── Read strength ──────────────────────────────────────────────────────────
  const readStrength = readStrengthFrom(winnerProbability, outcomeModel.confidence);

  // ── Method ────────────────────────────────────────────────────────────────
  const methodDistribution = {
    decision: outcomeModel.methodBreakdown.decision,
    koTko: outcomeModel.methodBreakdown.koTko,
    submission: outcomeModel.methodBreakdown.submission,
  };
  const methodLean = sourceType === "pending" ? null : topMethod(methodDistribution);

  // ── Scenarios: reconcile to predictedWinner ───────────────────────────────
  const scenarios = predictedWinner
    ? reconcileScenariosToWinner(outcomeModel.scenarios, predictedWinner.name)
    : outcomeModel.scenarios;

  // ── Scoring state ─────────────────────────────────────────────────────────
  let isScored = false;
  let actualWinnerRef: FighterRef | null = null;
  let actualMethod: PredictionViewModel["actualMethod"] = null;
  let modelCorrect: boolean | null = null;
  let methodCorrect: boolean | null = null;

  if (lockedPrediction?.outcome) {
    isScored = true;
    const w = lockedPrediction.outcome.winner;
    if (w === "fighterA") actualWinnerRef = fighterARef;
    else if (w === "fighterB") actualWinnerRef = fighterBRef;
    // draw / nc → leave null but isScored stays true

    actualMethod = lockedPrediction.outcome.method;

    if (predictedWinner && actualWinnerRef) {
      modelCorrect = predictedWinner.id === actualWinnerRef.id;
    } else if (w === "draw" || w === "nc") {
      modelCorrect = null;
    }

    // Method correctness: directional only — finish vs decision
    if (methodLean) {
      const predictedFinish = methodLean !== "Decision";
      const actualFinish = actualMethod === "ko_tko" || actualMethod === "submission";
      methodCorrect = predictedFinish === actualFinish;
    }
  }

  return {
    eventId,
    fightId: fight.id,
    modelVersion: outcomeModel.modelVersion,
    fighterA: fighterARef,
    fighterB: fighterBRef,
    predictedWinner,
    predictedLoser,
    winnerProbability,
    loserProbability,
    tooClose: outcomeModel.tooClose,
    readStrength,
    methodLean,
    methodDistribution,
    livePathFighter: predictedLoser, // convention: lower-prob side
    swingFactorLabel: outcomeModel.swingFactorLabel,
    whatBreaksTheCall: outcomeModel.swingFactorDescription,
    scenarios,
    isScored,
    actualWinner: actualWinnerRef,
    actualMethod,
    modelCorrect,
    methodCorrect,
    sourceType,
    dataWarnings: outcomeModel.dataWarnings,
  };
}

// ─── Source label copy (for UI consumption) ───────────────────────────────────

export function sourceLabel(s: PredictionSourceType): string {
  switch (s) {
    case "lockedCall": return "Logged call";
    case "currentModel": return "Current model read";
    case "historicalBacktest": return "Historical backtest";
    case "pending": return "Data pending";
  }
}
