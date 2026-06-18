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
 * winner / lean / counter-path reference into one shape that every component
 * reads from.
 *
 * IMPORTANT: This module is presentation-only. It does NOT change model math.
 * It also does not change opponentTotals or as-of backtest logic.
 */

import { buildFightShapeModel } from "@/lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "@/lib/fight-outcome-model/model";
import { pinToLockedPrediction } from "@/lib/fight-outcome-model/pin-to-locked";
import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { FightOutcomeModelOutput, OutcomeScenario } from "@/lib/fight-outcome-model/types";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import {
  getNamedCallSide,
  isTooCloseToCall,
  resolveNamedCallThreshold,
  type PredictionSide,
} from "@/lib/predictionThresholds";
import { detectRankingMismatch, type RankingMismatch } from "@/lib/ranking-mismatch";

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

export type PublicCallState =
  | "lockedCall"
  | "currentCall"
  | "noLean"
  | "insufficientData"
  | "pending";

export type ResultState = "pending" | "scored" | "noResult";

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

  /** Explicit public state. If this is noLean/insufficientData, no fighter is the call. */
  callState: PublicCallState;

  /** The fighter the model leans toward. Null for noLean/insufficientData/pending. */
  predictedWinner: FighterRef | null;
  predictedLoser: FighterRef | null;

  /** Same as predictedWinner.winProbability — convenience for consumers */
  winnerProbability: number | null;
  loserProbability: number | null;

  /** Public call label used by list rows, record rows, and fight pages. */
  displayedCallLabel: string;

  /** True when the page should say "Too close to call" instead of naming a fighter. */
  isTooCloseToCall: boolean;

  /** Backwards-compatible alias for components that still use the old name. */
  tooClose: boolean;

  isLockedHistoricalCall: boolean;
  isNamedCall: boolean;
  publicPredictionSource: string;

  readStrength: ReadStrength;

  /** Top method by share — primary public display */
  methodLean: "Decision" | "KO/TKO" | "Submission" | null;
  /** Full method distribution for context */
  methodDistribution: { decision: number; koTko: number; submission: number };
  /** Public copy that keeps method direction secondary to the winner call. */
  methodLeanNote: string;

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
  resultState: ResultState;
  isScored: boolean;
  actualWinner: FighterRef | null;
  actualMethod: "decision" | "ko_tko" | "submission" | "other" | "draw" | "nc" | null;
  actualRound: number | null;
  actualTime: string | null;
  /** True if predictedWinner matched actualWinner. Null when not scored or draw/NC. */
  modelCorrect: boolean | null;
  /** True if the public methodLean direction matched (finish vs decision). */
  methodCorrect: boolean | null;

  /** Where the call comes from. Drives the surface label. */
  sourceType: PredictionSourceType;

  /** Plain-English data warnings carried through from the model */
  dataWarnings: string[];

  /**
   * Auto-derived ranking-mismatch signal. Non-null when the model lean lands
   * on the lower-ranked fighter by a meaningful margin (e.g. Lopes #2 vs
   * Garcia #9 → model says Garcia 75%). UI surfaces this as a small
   * "Ranking note" near the call so the disconnect is visible.
   *
   * Presentation-only — never modifies the locked prediction or model math.
   */
  rankingMismatch: RankingMismatch | null;
}

export interface PredictionRecordCallView {
  hasNamedCall: boolean;
  callState: "lockedCall" | "noLean";
  predictedSide: PredictionSide | null;
  predictedWinnerName: string | null;
  predictedLoserName: string | null;
  winnerProbability: number | null;
  loserProbability: number | null;
  displayedCallLabel: string;
  isTooCloseToCall: boolean;
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

function sideForFighter(fight: SourcedFight, fighterId: string): PredictionSide {
  return fight.fighters.fighterA.id === fighterId ? "fighterA" : "fighterB";
}

function topPathLabel(fight: SourcedFight, fighter: FighterRef | null): string | null {
  if (!fighter) return null;
  const side = sideForFighter(fight, fighter.id);
  const paths = side === "fighterA" ? fight.paths?.fighterA : fight.paths?.fighterB;
  return paths?.[0]?.label?.toLowerCase() ?? null;
}

function readStrengthLabel(readStrength: ReadStrength): string {
  switch (readStrength) {
    case "strong": return "strong";
    case "usable": return "usable";
    case "thin": return "thin";
    case "data-pending": return "data pending";
  }
}

function buildMethodLeanNote(callState: PublicCallState): string {
  if (callState === "noLean") {
    return "Method lean is directional. Winner call is too close.";
  }
  if (callState === "insufficientData" || callState === "pending") {
    return "Method lean stays hidden until enough sourced data is available.";
  }
  return "Method lean is directional. Winner calls are tracked separately.";
}

function buildDisplayedCallLabel(
  callState: PublicCallState,
  predictedWinner: FighterRef | null,
): string {
  if (callState === "noLean") return "Too close to call";
  if (callState === "insufficientData") return "Insufficient data for a public call";
  if (callState === "pending") return "Pending";
  if (!predictedWinner) return "Pending";
  return `${predictedWinner.name} ${predictedWinner.winProbability}%`;
}

function buildPublicPredictionSource(
  sourceType: PredictionSourceType,
  callState: PublicCallState,
): string {
  if (callState === "noLean") {
    return sourceType === "lockedCall" ? "Logged no-call" : "Current no-call";
  }
  if (callState === "insufficientData" || callState === "pending") return "Data pending";
  if (sourceType === "lockedCall") return "Logged call";
  if (sourceType === "historicalBacktest") return "Historical backtest";
  return "Current model read";
}

function buildBreakInsight({
  callState,
  predictedLoser,
  swingFactorLabel,
}: {
  callState: PublicCallState;
  predictedLoser: FighterRef | null;
  swingFactorLabel: string;
}): string {
  const challenger = callState === "noLean" ? null : predictedLoser?.name;
  const label = swingFactorLabel.toLowerCase();

  if (label === "grappling control") {
    return challenger
      ? `${challenger} can flip this by turning open exchanges into long control sequences.`
      : "This separates if one fighter turns open exchanges into long control sequences.";
  }

  if (label === "striking volume") {
    return challenger
      ? `${challenger} can flip this if they close the volume gap early and keep exchanges active.`
      : "This separates if one fighter closes the volume gap and keeps exchanges active.";
  }

  if (label === "style pressure") {
    return challenger
      ? `${challenger} can flip this if they force reactions first and own the tempo for long stretches.`
      : "This separates if one fighter forces reactions first and owns the tempo.";
  }

  if (label === "recent form") {
    return challenger
      ? `${challenger} can flip this if their sharper recent form shows up in the opening minutes.`
      : "This separates if one fighter's recent form carries into cleaner early minutes.";
  }

  if (label === "absorption resistance") {
    return challenger
      ? `${challenger} can flip this if they handle the early damage risk and land cleaner late.`
      : "This separates if one fighter handles the early damage risk and lands cleaner late.";
  }

  return challenger
    ? `${challenger} can flip this if the main swing factor shows up early.`
    : "This separates if one repeatable edge shows up early.";
}

function buildPublicScenarios({
  fight,
  callState,
  predictedWinner,
  predictedLoser,
  winnerProbability,
  loserProbability,
  readStrength,
  breakInsight,
}: {
  fight: SourcedFight;
  callState: PublicCallState;
  predictedWinner: FighterRef | null;
  predictedLoser: FighterRef | null;
  winnerProbability: number | null;
  loserProbability: number | null;
  readStrength: ReadStrength;
  breakInsight: string;
}): [OutcomeScenario, OutcomeScenario, OutcomeScenario] {
  if (!predictedWinner || !predictedLoser || callState === "noLean") {
    const pathA = topPathLabel(fight, asFighterRef(fight.fighters.fighterA, 50));
    const pathB = topPathLabel(fight, asFighterRef(fight.fighters.fighterB, 50));
    const pathCopy =
      pathA || pathB
        ? `No single counter path is assigned because the winner call is too close. Watch ${fight.fighters.fighterA.name}${pathA ? ` through ${pathA}` : ""} and ${fight.fighters.fighterB.name}${pathB ? ` through ${pathB}` : ""}.`
        : "No single counter path is assigned because the winner call is too close. Both fighters' routes remain viable until one clear edge separates the read.";

    return [
      {
        id: "lean",
        title: "the call",
        fighterLabel: null,
        description: "Too close to call. The model does not separate these two enough to make a clear public call.",
      },
      {
        id: "upset",
        title: "paths to watch",
        fighterLabel: null,
        description: pathCopy,
      },
      {
        id: "swing",
        title: "what would separate this fight",
        fighterLabel: null,
        description: breakInsight,
      },
    ];
  }

  const loserPath = topPathLabel(fight, predictedLoser);
  const counterPathDescription = loserPath
    ? `${predictedLoser.name}'s counter path is ${loserPath}. The model still leans ${predictedWinner.name}, but ${predictedLoser.name} carries ${loserProbability}% in the read.`
    : `${predictedLoser.name} stays live at ${loserProbability}% if the matchup plays differently than the model expects.`;

  return [
    {
      id: "lean",
      title: "the call",
      fighterLabel: predictedWinner.name,
      description: `${predictedWinner.name} is the model lean at ${winnerProbability}%. ${readStrengthLabel(readStrength).charAt(0).toUpperCase() + readStrengthLabel(readStrength).slice(1)} directional read — not a guarantee.`,
    },
    {
      id: "upset",
      title: "counter path",
      fighterLabel: predictedLoser.name,
      description: counterPathDescription,
    },
    {
      id: "swing",
      title: "what breaks the call",
      fighterLabel: null,
      description: breakInsight,
    },
  ];
}

export function getPredictionRecordCall(record: PredictionRecord): PredictionRecordCallView {
  const pA = record.prediction.fighterAWinProbability;
  const pB = record.prediction.fighterBWinProbability;
  const predictedSide = getNamedCallSide(pA, pB, resolveNamedCallThreshold(record.modelVersion));
  const hasNamedCall = predictedSide !== null;
  const predictedWinnerName =
    predictedSide === "fighterA"
      ? record.fighters.fighterA
      : predictedSide === "fighterB"
        ? record.fighters.fighterB
        : null;
  const predictedLoserName =
    predictedSide === "fighterA"
      ? record.fighters.fighterB
      : predictedSide === "fighterB"
        ? record.fighters.fighterA
        : null;
  const winnerProbability =
    predictedSide === "fighterA" ? pA : predictedSide === "fighterB" ? pB : null;
  const loserProbability =
    predictedSide === "fighterA" ? pB : predictedSide === "fighterB" ? pA : null;

  return {
    hasNamedCall,
    callState: hasNamedCall ? "lockedCall" : "noLean",
    predictedSide,
    predictedWinnerName,
    predictedLoserName,
    winnerProbability,
    loserProbability,
    displayedCallLabel: hasNamedCall && predictedWinnerName && winnerProbability != null
      ? `${predictedWinnerName} ${winnerProbability}%`
      : "Too close to call",
    isTooCloseToCall: !hasNamedCall,
  };
}

// ─── Builder ──────────────────────────────────────────────────────────────────

interface BuildArgs {
  eventId: string | null;
  fight: SourcedFight;
  outcomeModel: FightOutcomeModelOutput;
  lockedPrediction: PredictionRecord | null;
}

export interface PredictionViewModelBundle {
  fightShapeModel: FightShapeModelOutput;
  outcomeModel: FightOutcomeModelOutput;
  viewModel: PredictionViewModel;
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
  if (lockedPrediction) {
    sourceType = lockedPrediction.isBacktestReconstruction
      ? "historicalBacktest"
      : "lockedCall";
  } else if (outcomeModel.confidence === "insufficient") {
    sourceType = "pending";
  } else {
    sourceType = "currentModel";
  }

  // ── Public call state / predicted winner ──────────────────────────────────
  // For locked calls, outcomeModel.modelVersion is the version the call was
  // locked under (stamped by pinToLockedPrediction); for live reads it is the
  // current model version. Either way the threshold matches the probabilities.
  const namedCallThreshold = resolveNamedCallThreshold(outcomeModel.modelVersion);
  const namedSide =
    sourceType === "pending" ? null : getNamedCallSide(probA, probB, namedCallThreshold);
  const callState: PublicCallState =
    sourceType === "pending"
      ? "insufficientData"
      : namedSide === null
        ? "noLean"
        : sourceType === "currentModel"
          ? "currentCall"
          : "lockedCall";

  const predictedWinner =
    namedSide === "fighterA" ? fighterARef :
    namedSide === "fighterB" ? fighterBRef :
    null;
  const predictedLoser =
    namedSide === "fighterA" ? fighterBRef :
    namedSide === "fighterB" ? fighterARef :
    null;

  const winnerProbability = predictedWinner?.winProbability ?? null;
  const loserProbability = predictedLoser?.winProbability ?? null;
  const tooClose = callState === "noLean";
  const displayedCallLabel = buildDisplayedCallLabel(callState, predictedWinner);
  const publicPredictionSource = buildPublicPredictionSource(sourceType, callState);

  // ── Read strength ──────────────────────────────────────────────────────────
  const autoReadStrength = readStrengthFrom(
    callState === "noLean" ? Math.max(probA, probB) : winnerProbability,
    outcomeModel.confidence,
  );

  // Manual sanity floor: when the fight carries a manual model-confidence
  // label that is more cautious than the auto-derived read strength, the
  // displayed strength downgrades to match. This keeps the confidence band
  // width and the scenario copy consistent with the Data-caution / Low pill —
  // previously Hokit (71% → auto "strong") rendered a tight ±5 band directly
  // above a "Data caution" warning, contradicting it. The floor only ever
  // WIDENS the displayed band; it never narrows it. Display-only — the locked
  // probability and the public record are untouched.
  const MANUAL_STRENGTH_FLOOR: Record<string, ReadStrength> = {
    "Strong": "strong",
    "Medium": "usable",
    "Medium-low": "thin",
    "Low": "thin",
    "Data caution": "thin",
  };
  const STRENGTH_CAUTION_RANK: Record<ReadStrength, number> = {
    strong: 0,
    usable: 1,
    thin: 2,
    "data-pending": 3,
  };
  const manualFloor = fight.modelSanity?.modelConfidenceLabel
    ? MANUAL_STRENGTH_FLOOR[fight.modelSanity.modelConfidenceLabel] ?? null
    : null;
  const readStrength: ReadStrength =
    autoReadStrength === "data-pending" || manualFloor == null
      ? autoReadStrength
      : STRENGTH_CAUTION_RANK[manualFloor] > STRENGTH_CAUTION_RANK[autoReadStrength]
        ? manualFloor
        : autoReadStrength;

  // ── Method ────────────────────────────────────────────────────────────────
  const methodDistribution = {
    decision: outcomeModel.methodBreakdown.decision,
    koTko: outcomeModel.methodBreakdown.koTko,
    submission: outcomeModel.methodBreakdown.submission,
  };
  const methodLean = sourceType === "pending" ? null : topMethod(methodDistribution);
  const methodLeanNote = buildMethodLeanNote(callState);

  // ── Scenarios: generated from the canonical call state ────────────────────
  const whatBreaksTheCall = buildBreakInsight({
    callState,
    predictedLoser,
    swingFactorLabel: outcomeModel.swingFactorLabel,
  });

  const scenarios = buildPublicScenarios({
    fight,
    callState,
    predictedWinner,
    predictedLoser,
    winnerProbability,
    loserProbability,
    readStrength,
    breakInsight: whatBreaksTheCall,
  });

  // ── Scoring state ─────────────────────────────────────────────────────────
  let isScored = false;
  let resultState: ResultState = "pending";
  let actualWinnerRef: FighterRef | null = null;
  let actualMethod: PredictionViewModel["actualMethod"] = null;
  let actualRound: number | null = null;
  let actualTime: string | null = null;
  let modelCorrect: boolean | null = null;
  let methodCorrect: boolean | null = null;

  if (lockedPrediction?.outcome) {
    isScored = true;
    resultState = "scored";
    const w = lockedPrediction.outcome.winner;
    if (w === "fighterA") actualWinnerRef = fighterARef;
    else if (w === "fighterB") actualWinnerRef = fighterBRef;
    // draw / nc → leave null but isScored stays true

    actualMethod = lockedPrediction.outcome.method;
    actualRound = lockedPrediction.outcome.round;
    actualTime = lockedPrediction.outcome.time;

    if (predictedWinner && actualWinnerRef) {
      modelCorrect = predictedWinner.id === actualWinnerRef.id;
    } else if (w === "draw" || w === "nc") {
      resultState = "noResult";
      modelCorrect = null;
    }

    // Method correctness: directional only — finish vs decision
    if (methodLean) {
      const predictedFinish = methodLean !== "Decision";
      const actualFinish = actualMethod === "ko_tko" || actualMethod === "submission";
      methodCorrect = predictedFinish === actualFinish;
    }
  }

  const rankingMismatch = detectRankingMismatch({
    fighterA: fight.fighters.fighterA,
    fighterB: fight.fighters.fighterB,
    predictedWinnerId: predictedWinner?.id ?? null,
    winnerProbability,
  });

  return {
    eventId,
    fightId: fight.id,
    modelVersion: outcomeModel.modelVersion,
    fighterA: fighterARef,
    fighterB: fighterBRef,
    callState,
    predictedWinner,
    predictedLoser,
    winnerProbability,
    loserProbability,
    displayedCallLabel,
    isTooCloseToCall: tooClose,
    tooClose,
    isLockedHistoricalCall: sourceType === "lockedCall" && Boolean(lockedPrediction?.outcome),
    isNamedCall: predictedWinner !== null,
    publicPredictionSource,
    readStrength,
    methodLean,
    methodDistribution,
    methodLeanNote,
    livePathFighter: predictedLoser, // convention: lower-prob side
    swingFactorLabel: outcomeModel.swingFactorLabel,
    whatBreaksTheCall,
    scenarios,
    resultState,
    isScored,
    actualWinner: actualWinnerRef,
    actualMethod,
    actualRound,
    actualTime,
    modelCorrect,
    methodCorrect,
    sourceType,
    dataWarnings: outcomeModel.dataWarnings,
    rankingMismatch,
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

export function buildPredictionViewModelBundle({
  eventId,
  fight,
  lockedPrediction,
}: {
  eventId: string | null;
  fight: SourcedFight;
  lockedPrediction: PredictionRecord | null;
}): PredictionViewModelBundle {
  const fightShapeModel = buildFightShapeModel(fight);
  const liveOutcomeModel = buildFightOutcomeModel(fight, fightShapeModel);
  const outcomeModel = lockedPrediction
    ? pinToLockedPrediction(liveOutcomeModel, lockedPrediction)
    : liveOutcomeModel;
  const viewModel = buildPredictionViewModel({
    eventId,
    fight,
    outcomeModel,
    lockedPrediction,
  });

  return { fightShapeModel, outcomeModel, viewModel };
}
