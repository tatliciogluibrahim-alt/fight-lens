/**
 * Fight Outcome Model — outcome-v0.1
 *
 * Computes win probabilities and outcome scenarios for a UFC matchup
 * by combining existing fight-shape signals (SPI, form) with raw
 * aggregate stat differentials (striking, grappling, absorption).
 *
 * All inputs are sourced from UFCStats. The model does not use betting
 * lines, public sentiment, or manual overrides.
 *
 * Probability conversion: weighted logistic function (k=3.5).
 * At Δ=0.25 → ~72%   At Δ=0.15 → ~65%   At Δ=0.05 → ~54%
 */

import type { SourcedFight, SourcedFightHistoryItem, SourcedFighter } from "../sourced-event";
import type { FightShapeModelOutput } from "../fight-shape-model/types";
import type {
  FightOutcomeModelOutput,
  FighterOutcomeProbability,
  MatchupMethodBreakdown,
  OutcomeModelConfidence,
  OutcomeScenario,
} from "./types";
import {
  isTooCloseToCall,
  resolveNamedCallThreshold,
  parseModelMinorVersion,
  CALIBRATED_MODEL_MINOR,
} from "@/lib/predictionThresholds";

// Current model version. v0.3 adds temperature recalibration (T=0.824) and the
// 58% named-call threshold. Predictions locked under an earlier version are
// re-run against that version's frozen logic (see options.modelVersion below),
// so historical calls never drift when the live model changes.
const MODEL_VERSION = "outcome-v0.3";

/** Whether a given model version applies the T=0.824 temperature recalibration. */
function usesTemperatureRecalibration(modelVersion: string): boolean {
  const minor = parseModelMinorVersion(modelVersion);
  return minor == null ? true : minor >= CALIBRATED_MODEL_MINOR;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stat(fighter: SourcedFighter, key: string): number | null {
  const v = fighter.aggregateStats?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function isWin(f: SourcedFightHistoryItem) {
  return String(f.result ?? "").toLowerCase().startsWith("w");
}

function isFinish(f: SourcedFightHistoryItem) {
  const m = String(f.method ?? "").toLowerCase();
  return m.includes("ko") || m.includes("tko") || m.includes("sub");
}

function isKoTko(f: SourcedFightHistoryItem) {
  const m = String(f.method ?? "").toLowerCase();
  return m.includes("ko") || m.includes("tko");
}

function isSub(f: SourcedFightHistoryItem) {
  return String(f.method ?? "").toLowerCase().includes("sub");
}

/** Logistic function — maps a delta in [-1, +1] to a probability in (0, 1) */
function logistic(delta: number, k = 3.5): number {
  return 1 / (1 + Math.exp(-k * delta));
}

/**
 * Temperature recalibration, T = 0.824, fitted on n=188 frozen backtest fights.
 * Applied as a post-processing step AFTER the logistic. With T < 1 it divides
 * the logit by 0.824, pushing probabilities away from 0.5 (sharper, more
 * confident). rawDelta and the logistic are unchanged; only the final
 * probability is recalibrated.
 */
const RECALIBRATION_TEMPERATURE = 0.824;
function temperatureRecalibrate(p: number, T = RECALIBRATION_TEMPERATURE): number {
  const clamped = Math.min(1 - 1e-9, Math.max(1e-9, p));
  const logit = Math.log(clamped / (1 - clamped));
  return 1 / (1 + Math.exp(-(logit / T)));
}

/** Clamp a number to [0, 100] and round */
function pct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ─── Finish profile ──────────────────────────────────────────────────────────

interface FinishProfile {
  finishRate: number; // 0–1 among wins
  koRate: number;     // 0–1 among wins
  subRate: number;    // 0–1 among wins
}

/**
 * UFC average finish rate (calibrated against 2024-25 data).
 * ~37% of UFC fights end by finish — lower than older historical averages
 * due to improved fighter conditioning and grappling defense.
 */
const UFC_AVG_FINISH_RATE = 0.37;
const UFC_AVG_KO_SHARE = 0.55; // KO/TKO share of finishes; sub share is 0.45

function finishProfile(fighter: SourcedFighter): FinishProfile {
  const wins = fighter.lastFive.filter(isWin);
  if (!wins.length) {
    // Fall back to UFC average
    return {
      finishRate: UFC_AVG_FINISH_RATE,
      koRate: UFC_AVG_FINISH_RATE * UFC_AVG_KO_SHARE,
      subRate: UFC_AVG_FINISH_RATE * (1 - UFC_AVG_KO_SHARE),
    };
  }
  const finishes = wins.filter(isFinish);
  const kos = wins.filter(isKoTko);
  const subs = wins.filter(isSub);
  return {
    finishRate: finishes.length / wins.length,
    koRate: kos.length / wins.length,
    subRate: subs.length / wins.length,
  };
}

// ─── Lean label ──────────────────────────────────────────────────────────────

function leanLabel(prob: number): FighterOutcomeProbability["leanLabel"] {
  if (prob >= 0.70) return "strong lean";
  if (prob >= 0.60) return "lean";
  if (prob >= 0.52) return "slight lean";
  return "no lean";
}

// ─── Per-fighter outcome object ──────────────────────────────────────────────

function buildFighterOutcome(
  fighter: SourcedFighter,
  winProb: number,
  fp: FinishProfile,
): FighterOutcomeProbability {
  return {
    fighterId: fighter.id,
    fighterName: fighter.name,
    winProbability: pct(winProb * 100),
    decisionProbability: pct((1 - fp.finishRate) * 100),
    finishProbability: pct(fp.finishRate * 100),
    koTkoProbability: pct(fp.koRate * 100),
    submissionProbability: pct(fp.subRate * 100),
    leanLabel: leanLabel(winProb),
  };
}

// ─── Method breakdown ────────────────────────────────────────────────────────

function buildMethodBreakdown(
  winProbA: number,
  fpA: FinishProfile,
  fpB: FinishProfile,
): MatchupMethodBreakdown {
  const winProbB = 1 - winProbA;

  // Overall finish rate: weighted blend of both fighters' tendencies
  const overallFinish = winProbA * fpA.finishRate + winProbB * fpB.finishRate;

  // KO/TKO and sub rates (also weighted by win prob)
  const rawKo = winProbA * fpA.koRate + winProbB * fpB.koRate;
  const rawSub = winProbA * fpA.subRate + winProbB * fpB.subRate;

  // Normalise ko + sub to sum to overallFinish
  const finishTotal = rawKo + rawSub;
  const koNorm = finishTotal > 0 ? (rawKo / finishTotal) * overallFinish : 0;
  const subNorm = finishTotal > 0 ? (rawSub / finishTotal) * overallFinish : 0;

  const ko = pct(koNorm * 100);
  const sub = pct(subNorm * 100);
  const dec = Math.max(0, 100 - ko - sub); // absorb rounding in decision

  return { decision: dec, koTko: ko, submission: sub };
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

function buildScenarios(
  fight: SourcedFight,
  fighterA: SourcedFighter,
  fighterB: SourcedFighter,
  winProbA: number,
  fpA: FinishProfile,
  fpB: FinishProfile,
  swingLabel: string,
  swingDescription: string,
): [OutcomeScenario, OutcomeScenario, OutcomeScenario] {
  const aIsFavorite = winProbA > 0.50;
  const favorite = aIsFavorite ? fighterA : fighterB;
  const underdog = aIsFavorite ? fighterB : fighterA;
  const favProb = Math.max(winProbA, 1 - winProbA);
  const favFP = aIsFavorite ? fpA : fpB;

  // Lean scenario
  const leanMethod =
    favFP.finishRate >= 0.60
      ? favFP.subRate > favFP.koRate
        ? "a submission"
        : "a KO or TKO"
      : "a decision";

  let leanDesc: string;
  if (favProb >= 0.70) {
    leanDesc = `${favorite.name} is the clear side here. The shape, form, and stat differentials all point the same direction. Most likely route: ${leanMethod}.`;
  } else if (favProb >= 0.60) {
    leanDesc = `${favorite.name} gets the lean. Shape and form tilt the same way, but the underdog has a counter path. Most likely: ${leanMethod}, but this doesn't close early.`;
  } else {
    leanDesc = `Slim lean toward ${favorite.name}, but the model barely separates these two. Either side winning is a reasonable outcome. Most likely: ${leanMethod} in a close fight.`;
  }

  // Upset scenario
  const underdogPaths = aIsFavorite
    ? (fight.paths?.fighterB ?? [])
    : (fight.paths?.fighterA ?? []);
  const topUnderdogPath = underdogPaths[0]?.label?.toLowerCase() ?? null;

  let upsetDesc: string;
  if (topUnderdogPath) {
    upsetDesc = `${underdog.name}'s clearest path: "${topUnderdogPath}". The route is specific, but the probability is real — the model gives them ${pct((1 - favProb) * 100)}%.`;
  } else {
    upsetDesc = `${underdog.name}'s route is narrower, but it exists. The clearest option is keeping the fight away from ${favorite.name}'s structural advantage and forcing a different tempo. The model gives them ${pct((1 - favProb) * 100)}%.`;
  }

  // Swing scenario
  const swingDesc = swingDescription;

  return [
    { id: "lean", title: "the call", fighterLabel: favorite.name, description: leanDesc },
    { id: "upset", title: "counter path", fighterLabel: underdog.name, description: upsetDesc },
    { id: "swing", title: "what breaks the call", fighterLabel: swingLabel, description: swingDesc },
  ];
}

// ─── Main model function ─────────────────────────────────────────────────────

export function buildFightOutcomeModel(
  fight: SourcedFight,
  shapeModel: FightShapeModelOutput,
  options?: { modelVersion?: string },
): FightOutcomeModelOutput {
  const modelVersion = options?.modelVersion ?? MODEL_VERSION;
  const applyTemperature = usesTemperatureRecalibration(modelVersion);
  const namedCallThreshold = resolveNamedCallThreshold(modelVersion);
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const warnings: string[] = [];

  // ── Factor 1: Style Pressure Index delta (weight: 0.25) ──────────────────
  const spiA = shapeModel.metrics.stylePressureIndex.fighterA.score;
  const spiB = shapeModel.metrics.stylePressureIndex.fighterB.score;
  const hasSpi = spiA != null && spiB != null;
  if (!hasSpi) warnings.push("Style pressure incomplete — factor omitted from model.");
  const spiDelta = hasSpi ? (spiA - spiB) / 100 : 0;
  const spiWeight = hasSpi ? 0.25 : 0;

  // ── Factor 2: Opponent-quality-adjusted form delta (weight: 0.20) ─────────
  const formA = shapeModel.metrics.opponentQualityAdjustedForm.fighterA.score;
  const formB = shapeModel.metrics.opponentQualityAdjustedForm.fighterB.score;
  const hasForm = formA != null && formB != null;
  if (!hasForm) warnings.push("Form score incomplete — factor omitted from model.");
  const formDelta = hasForm ? (formA - formB) / 100 : 0;
  const formWeight = hasForm ? 0.20 : 0;

  // ── Factor 3: Striking net advantage (weight: 0.25) ──────────────────────
  // Recalibrated up from 0.22 — striking edge is the strongest predictor in
  // the UFC 328 sample (grapplers Chimaev + Taira both underperformed projections).
  const slpmA = stat(fighterA, "slpm") ?? 3.5;
  const slpmB = stat(fighterB, "slpm") ?? 3.5;
  const defA = (stat(fighterA, "strikingDefense") ?? 50) / 100;
  const defB = (stat(fighterB, "strikingDefense") ?? 50) / 100;
  const landedA = slpmA * (1 - defB);
  const landedB = slpmB * (1 - defA);
  const strikingDelta = Math.max(-1, Math.min(1, (landedA - landedB) / 3));
  const strikingWeight = 0.25;

  // ── Factor 4: Grappling net advantage (weight: 0.16) ─────────────────────
  // Recalibrated down from 0.20 — raw takedown stats over-weight wrestlers whose
  // grappling advantage dissolves against elite TD defense (e.g. Strickland at 85%+).
  const tdAvgA = stat(fighterA, "takedownAverage") ?? 1;
  const tdAccA = (stat(fighterA, "takedownAccuracy") ?? 40) / 100;
  const tdDefA = (stat(fighterA, "takedownDefense") ?? 60) / 100;
  const tdAvgB = stat(fighterB, "takedownAverage") ?? 1;
  const tdAccB = (stat(fighterB, "takedownAccuracy") ?? 40) / 100;
  const tdDefB = (stat(fighterB, "takedownDefense") ?? 60) / 100;
  const grapplingA = tdAvgA * tdAccA * (1 - tdDefB);
  const grapplingB = tdAvgB * tdAccB * (1 - tdDefA);
  const grapplingDelta = Math.max(-1, Math.min(1, (grapplingA - grapplingB) / 2.5));
  const grapplingWeight = 0.16;

  // ── Factor 5: Absorption resistance / chin delta (weight: 0.14) ───────────
  const sapmA = stat(fighterA, "sapm") ?? 3.5;
  const sapmB = stat(fighterB, "sapm") ?? 3.5;
  const absorptionDelta = Math.max(-1, Math.min(1, (sapmB - sapmA) / 4));
  const absorptionWeight = 0.14;

  // ── Combine with logistic conversion ─────────────────────────────────────
  const totalWeight = spiWeight + formWeight + strikingWeight + grapplingWeight + absorptionWeight;
  const rawDelta =
    (spiWeight * spiDelta +
      formWeight * formDelta +
      strikingWeight * strikingDelta +
      grapplingWeight * grapplingDelta +
      absorptionWeight * absorptionDelta) /
    Math.max(totalWeight, 0.001);

  // Temperature recalibration T=0.824 fitted on n=188 frozen backtest fights —
  // post-processing after the logistic. v0.3+ only; legacy versions (v0.1/v0.2)
  // use the raw logistic so their locked calls reproduce exactly.
  const baseWinProbA = logistic(rawDelta, 3.5);
  const winProbA = applyTemperature ? temperatureRecalibrate(baseWinProbA) : baseWinProbA;
  const winProbB = 1 - winProbA;

  // ── Finish profiles ───────────────────────────────────────────────────────
  const fpA = finishProfile(fighterA);
  const fpB = finishProfile(fighterB);

  // ── Swing factor (highest absolute weighted contribution) ─────────────────
  const factors = [
    {
      label: "grappling control",
      description: `Takedown accuracy vs. takedown defense is the highest-leverage variable in this matchup. If the grappler converts consistently, the fight changes shape — striking range becomes conditional.`,
      contribution: Math.abs(grapplingDelta * grapplingWeight),
    },
    {
      label: "striking volume",
      description: `Landing clean while not getting hit back is the difference here. If the striking volume gap closes — through good footwork or pressure — the model result shifts fast.`,
      contribution: Math.abs(strikingDelta * strikingWeight),
    },
    {
      label: "style pressure",
      description: `The style pressure differential is the widest signal the model found. Whoever generates more forward output and forces reaction controls tempo and rounds.`,
      contribution: Math.abs(spiDelta * spiWeight),
    },
    {
      label: "recent form",
      description: `Both fighters' recent shape — momentum, method of recent wins, opponent quality — can override style signals when the physical matchup is close.`,
      contribution: Math.abs(formDelta * formWeight),
    },
    {
      label: "absorption resistance",
      description: `The fighter who absorbs less clean damage dictates late-round pace. It compounds: whoever lands the cleaner shot early tends to accumulate a scoring advantage by round 4–5.`,
      contribution: Math.abs(absorptionDelta * absorptionWeight),
    },
  ].sort((a, b) => b.contribution - a.contribution);

  const swing = factors[0];

  // ── Build outputs ─────────────────────────────────────────────────────────
  const outcomeA = buildFighterOutcome(fighterA, winProbA, fpA);
  const outcomeB = buildFighterOutcome(fighterB, winProbB, fpB);
  const methodBreakdown = buildMethodBreakdown(winProbA, fpA, fpB);
  const scenarios = buildScenarios(
    fight,
    fighterA,
    fighterB,
    winProbA,
    fpA,
    fpB,
    swing.label,
    swing.description,
  );

  const tooClose = isTooCloseToCall(
    outcomeA.winProbability,
    outcomeB.winProbability,
    namedCallThreshold,
  );

  // ── Confidence ────────────────────────────────────────────────────────────
  let confidence: OutcomeModelConfidence;
  if (!hasSpi && !hasForm) {
    confidence = "insufficient";
  } else if (!hasSpi || !hasForm) {
    confidence = "low";
  } else if (shapeModel.dataConfidence.label === "High") {
    confidence = "high";
  } else if (shapeModel.dataConfidence.label === "Medium") {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    matchupId: fight.id,
    fighterA: outcomeA,
    fighterB: outcomeB,
    tooClose,
    methodBreakdown,
    scenarios,
    swingFactorLabel: swing.label,
    swingFactorDescription: swing.description,
    confidence,
    modelVersion,
    dataWarnings: warnings,
    rawDelta,
  };
}
