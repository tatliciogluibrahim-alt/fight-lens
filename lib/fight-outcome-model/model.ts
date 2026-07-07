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
  usesTemperatureRecalibration,
  usesMatchupAwareModel,
} from "@/lib/predictionThresholds";

// Current live model version. v0.4 is the reconciled shipped model:
//   - raw logistic, temperature OFF (the T=0.824 sharpening in v0.3 was an
//     experiment that the backtest showed hurts calibration, so it is retired)
//   - matchup-aware method head (opponent finish-resistance + submission floor)
//   - missing-data factor dropping and shrinkage toward 0.5
//   - 58% named-call threshold (unchanged from v0.3)
// Predictions locked under an earlier version are re-run against that version's
// frozen logic (see options.modelVersion below), so historical calls never
// drift when the live model changes. See docs/MODEL_STATUS.md.
const MODEL_VERSION = "outcome-v0.4";

// Sum of the five factor weights at full data coverage. In v0.4 this is the
// constant denominator: a factor with missing inputs contributes no delta but
// its weight stays here, so missing data shrinks the probability toward 0.5.
const FULL_FACTOR_WEIGHT = 1.0; // 0.25 SPI + 0.20 form + 0.25 strike + 0.16 grapple + 0.14 absorb

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

// ─── Opponent durability (v0.4 matchup-aware method) ─────────────────────────
//
// A finish is a two-sided event: it needs a finisher AND a beatable opponent.
// The legacy method head blended each fighter's OWN finish profile and never
// looked at how hard the opponent is to finish. v0.4 reads the opponent's
// history of losses to estimate finish-resistance and submission-vulnerability,
// shrunk hard toward division priors because loss samples are small.

interface Durability {
  /** Shrunk fraction of this fighter's losses that ended in a finish (0-1). */
  finishedLossRate: number;
  /** Shrunk submission share of this fighter's finish-losses (0-1). */
  subLossShare: number;
  lossSample: number;
}

// Division priors. Roughly half of modern UFC losses end in a finish; of those,
// a bit over a third are submissions. These anchor the shrinkage so a fighter
// with one or two losses does not swing the estimate.
const REF_LOSS_FINISH_RATE = 0.5;
const REF_SUB_LOSS_SHARE = 0.35;
const DURABILITY_PRIOR_K = 4; // pseudo-count strength

function isLoss(f: SourcedFightHistoryItem) {
  return String(f.result ?? "").toLowerCase().startsWith("l");
}

function opponentDurability(opp: SourcedFighter): Durability {
  const history = opp.fightHistory?.length ? opp.fightHistory : opp.lastFive;
  const losses = history.filter(isLoss);
  const finishLosses = losses.filter(isFinish);
  const subLosses = losses.filter(isSub);
  const lossN = losses.length;
  const finishedLossRate =
    (finishLosses.length + REF_LOSS_FINISH_RATE * DURABILITY_PRIOR_K) /
    (lossN + DURABILITY_PRIOR_K);
  const subLossShare =
    (subLosses.length + REF_SUB_LOSS_SHARE * DURABILITY_PRIOR_K) /
    (finishLosses.length + DURABILITY_PRIOR_K);
  return { finishedLossRate, subLossShare, lossSample: lossN };
}

// Opponent finish-resistance multiplier on the winner's finish rate. Centered at
// 1.0 when the opponent is finished at the reference rate; capped so a thin
// sample cannot double or zero out the finish chance.
function finishResistanceMultiplier(d: Durability): number {
  const ratio = d.finishedLossRate / REF_LOSS_FINISH_RATE;
  return Math.max(0.7, Math.min(1.3, ratio));
}

// Submission always keeps a floor share of the finish mass, and KO/TKO keeps a
// floor too, so a real fight is never a hard 0% on either finish route.
const SUB_SHARE_FLOOR = 0.15;
const KO_SHARE_FLOOR = 0.15;

// Weight on the division base finish rate when regressing a fighter's own finish
// rate. A fighter with zero recent finishes still projects some finish chance.
const FINISH_BASE_WEIGHT = 0.25;

/** Submission share of a winner's finishes, blended with opponent sub-vulnerability, floored. */
function submissionShare(winnerFP: FinishProfile, oppDur: Durability): number {
  const ownSubShare =
    winnerFP.finishRate > 0 ? winnerFP.subRate / winnerFP.finishRate : REF_SUB_LOSS_SHARE;
  const blended = 0.6 * ownSubShare + 0.4 * oppDur.subLossShare;
  return Math.max(SUB_SHARE_FLOOR, Math.min(1 - KO_SHARE_FLOOR, blended));
}

// Deterministic largest-remainder rounding of a {decision, ko, sub} float triple
// to three integers that sum to 100, with an explicit resolver so the TOP method
// is never an ambiguous tie. This removes the old "absorb rounding into decision"
// step that could silently produce a decision/ko display tie (e.g. the
// whittaker-krylov 42/42 that silently picked decision).
//
// Tie-break rule (documented and reproducible): the method with the larger
// unrounded float wins; exact float ties fall back to a fixed priority of
// ko > sub > decision (a tied fight leans finish, consistent with the coarse
// finish-vs-decision method scoring).
function roundBreakdownTo100(
  decFloat: number,
  koFloat: number,
  subFloat: number,
): { decision: number; koTko: number; submission: number } {
  const parts = [
    { key: "koTko", value: koFloat, priority: 0 },
    { key: "submission", value: subFloat, priority: 1 },
    { key: "decision", value: decFloat, priority: 2 },
  ].map((p) => ({ ...p, floor: Math.floor(p.value), rem: p.value - Math.floor(p.value) }));

  let remainder = 100 - parts.reduce((sum, p) => sum + p.floor, 0);
  const byRemainder = [...parts].sort((a, b) => b.rem - a.rem || a.priority - b.priority);
  for (let i = 0; i < byRemainder.length && remainder > 0; i++, remainder--) {
    byRemainder[i].floor += 1;
  }

  // Resolve an ambiguous top-method tie by moving one point to the deterministic
  // winner, so the displayed lean is never a silent coin-flip.
  const ranked = [...parts].sort(
    (a, b) => b.floor - a.floor || b.value - a.value || a.priority - b.priority,
  );
  if (ranked[0].floor === ranked[1].floor) {
    ranked[0].floor += 1;
    ranked[1].floor -= 1;
  }

  const out = Object.fromEntries(parts.map((p) => [p.key, p.floor])) as {
    decision: number;
    koTko: number;
    submission: number;
  };
  return out;
}

// ─── Confidence helpers ───────────────────────────────────────────────────────

const CONFIDENCE_RANK: Record<OutcomeModelConfidence, number> = {
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function capConfidence(
  current: OutcomeModelConfidence,
  ceiling: OutcomeModelConfidence,
): OutcomeModelConfidence {
  return CONFIDENCE_RANK[current] <= CONFIDENCE_RANK[ceiling] ? current : ceiling;
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

/**
 * v0.4 matchup-aware method breakdown.
 *
 * For each side's win path, the finish probability is that fighter's own finish
 * rate scaled by how finishable the OPPONENT has been (finish-resistance from
 * loss history), and the KO/submission split blends the winner's own tendency
 * with the opponent's submission-vulnerability. Submission and KO both keep a
 * floor share of the finish mass, so a real fight is never a hard 0% on either
 * route (fixes the "submission 0%" artifact). Rounding is deterministic via
 * largest-remainder, removing the silent decision/ko tie-break.
 */
function buildMatchupAwareMethodBreakdown(
  winProbA: number,
  fpA: FinishProfile,
  fpB: FinishProfile,
  fighterA: SourcedFighter,
  fighterB: SourcedFighter,
): MatchupMethodBreakdown {
  const winProbB = 1 - winProbA;
  const durA = opponentDurability(fighterA);
  const durB = opponentDurability(fighterB);

  // Regress each fighter's own finish rate toward the division base rate. A
  // fighter with zero recent finishes should not project as a literal 100%
  // decision. Any real UFC fight carries some finish chance, so the base rate is
  // a floor (this removes the dec100/ko0/sub0 hard-zero artifact).
  const finishRateA = FINISH_BASE_WEIGHT * UFC_AVG_FINISH_RATE + (1 - FINISH_BASE_WEIGHT) * fpA.finishRate;
  const finishRateB = FINISH_BASE_WEIGHT * UFC_AVG_FINISH_RATE + (1 - FINISH_BASE_WEIGHT) * fpB.finishRate;

  // A finishing B is scaled by B's finish-resistance; B finishing A by A's.
  const finishAoverB = Math.min(0.95, finishRateA * finishResistanceMultiplier(durB));
  const finishBoverA = Math.min(0.95, finishRateB * finishResistanceMultiplier(durA));

  const subShareA = submissionShare(fpA, durB);
  const subShareB = submissionShare(fpB, durA);

  // Split each side's finish mass into KO and submission, then weight by win prob.
  const koMass =
    winProbA * finishAoverB * (1 - subShareA) + winProbB * finishBoverA * (1 - subShareB);
  const subMass =
    winProbA * finishAoverB * subShareA + winProbB * finishBoverA * subShareB;

  const koFloat = Math.max(0, Math.min(100, koMass * 100));
  const subFloat = Math.max(0, Math.min(100, subMass * 100));
  const decFloat = Math.max(0, 100 - koFloat - subFloat);

  return roundBreakdownTo100(decFloat, koFloat, subFloat);
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
    upsetDesc = `${underdog.name}'s clearest path: "${topUnderdogPath}". The route is specific, but the probability is real. The model gives them ${pct((1 - favProb) * 100)}%.`;
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
  options?: {
    modelVersion?: string;
    /**
     * Backtest-only temperature override for the calibration A/B (run via
     * BACKTEST_TEMP=<T> npm run backtest). When set, this temperature is applied
     * to the final probability instead of the version default. T=1 is a no-op.
     * Never passed by the live app.
     */
    temperature?: number | null;
  },
): FightOutcomeModelOutput {
  const modelVersion = options?.modelVersion ?? MODEL_VERSION;
  const applyTemperature = usesTemperatureRecalibration(modelVersion);
  const matchupAware = usesMatchupAwareModel(modelVersion);
  const namedCallThreshold = resolveNamedCallThreshold(modelVersion);
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const warnings: string[] = [];

  // ── Factor 1: Style Pressure Index delta (weight: 0.25) ──────────────────
  const spiA = shapeModel.metrics.stylePressureIndex.fighterA.score;
  const spiB = shapeModel.metrics.stylePressureIndex.fighterB.score;
  const hasSpi = spiA != null && spiB != null;
  if (!hasSpi) warnings.push("Style pressure incomplete, factor omitted from model.");
  const spiDelta = hasSpi ? (spiA - spiB) / 100 : 0;
  const spiWeight = hasSpi ? 0.25 : 0;

  // ── Factor 2: Opponent-quality-adjusted form delta (weight: 0.20) ─────────
  const formA = shapeModel.metrics.opponentQualityAdjustedForm.fighterA.score;
  const formB = shapeModel.metrics.opponentQualityAdjustedForm.fighterB.score;
  const hasForm = formA != null && formB != null;
  if (!hasForm) warnings.push("Form score incomplete, factor omitted from model.");
  const formDelta = hasForm ? (formA - formB) / 100 : 0;
  const formWeight = hasForm ? 0.20 : 0;

  // ── Factor 3: Striking net advantage (weight: 0.25) ──────────────────────
  // Striking edge is the strongest single predictor in the corpus. v0.4 drops
  // this factor's weight when either side's striking inputs are missing, instead
  // of imputing a league-average that hands the fighter-with-data a phantom edge.
  const slpmARaw = stat(fighterA, "slpm");
  const slpmBRaw = stat(fighterB, "slpm");
  const strikeDefARaw = stat(fighterA, "strikingDefense");
  const strikeDefBRaw = stat(fighterB, "strikingDefense");
  const slpmA = slpmARaw ?? 3.5;
  const slpmB = slpmBRaw ?? 3.5;
  const defA = (strikeDefARaw ?? 50) / 100;
  const defB = (strikeDefBRaw ?? 50) / 100;
  const landedA = slpmA * (1 - defB);
  const landedB = slpmB * (1 - defA);
  const strikingDelta = Math.max(-1, Math.min(1, (landedA - landedB) / 3));
  const strikingComplete =
    slpmARaw != null && slpmBRaw != null && strikeDefARaw != null && strikeDefBRaw != null;
  const strikingWeight = matchupAware && !strikingComplete ? 0 : 0.25;
  if (matchupAware && !strikingComplete) {
    warnings.push("Striking stats incomplete, factor omitted from model.");
  }

  // ── Factor 4: Grappling net advantage (weight: 0.16) ─────────────────────
  // Weighted below striking because raw takedown stats over-credit wrestlers
  // whose advantage dissolves against elite takedown defense. v0.4 drops the
  // factor when either side's takedown inputs are missing.
  const tdAvgARaw = stat(fighterA, "takedownAverage");
  const tdAccARaw = stat(fighterA, "takedownAccuracy");
  const tdDefARaw = stat(fighterA, "takedownDefense");
  const tdAvgBRaw = stat(fighterB, "takedownAverage");
  const tdAccBRaw = stat(fighterB, "takedownAccuracy");
  const tdDefBRaw = stat(fighterB, "takedownDefense");
  const tdAvgA = tdAvgARaw ?? 1;
  const tdAccA = (tdAccARaw ?? 40) / 100;
  const tdDefA = (tdDefARaw ?? 60) / 100;
  const tdAvgB = tdAvgBRaw ?? 1;
  const tdAccB = (tdAccBRaw ?? 40) / 100;
  const tdDefB = (tdDefBRaw ?? 60) / 100;
  const grapplingA = tdAvgA * tdAccA * (1 - tdDefB);
  const grapplingB = tdAvgB * tdAccB * (1 - tdDefA);
  const grapplingDelta = Math.max(-1, Math.min(1, (grapplingA - grapplingB) / 2.5));
  const grapplingComplete =
    tdAvgARaw != null && tdAccARaw != null && tdDefARaw != null &&
    tdAvgBRaw != null && tdAccBRaw != null && tdDefBRaw != null;
  const grapplingWeight = matchupAware && !grapplingComplete ? 0 : 0.16;
  if (matchupAware && !grapplingComplete) {
    warnings.push("Grappling stats incomplete, factor omitted from model.");
  }

  // ── Factor 5: Absorption resistance / chin delta (weight: 0.14) ───────────
  const sapmARaw = stat(fighterA, "sapm");
  const sapmBRaw = stat(fighterB, "sapm");
  const sapmA = sapmARaw ?? 3.5;
  const sapmB = sapmBRaw ?? 3.5;
  const absorptionDelta = Math.max(-1, Math.min(1, (sapmB - sapmA) / 4));
  const absorptionComplete = sapmARaw != null && sapmBRaw != null;
  const absorptionWeight = matchupAware && !absorptionComplete ? 0 : 0.14;
  if (matchupAware && !absorptionComplete) {
    warnings.push("Absorption stats incomplete, factor omitted from model.");
  }

  // ── Combine with logistic conversion ─────────────────────────────────────
  // The *Weight values above are the NUMERATOR weights: a factor with missing
  // inputs is set to weight 0 (contributes no delta) in v0.4.
  const numeratorWeightSum =
    spiWeight + formWeight + strikingWeight + grapplingWeight + absorptionWeight;

  // v0.4 missing-data handling: a factor with missing inputs is dropped (weight
  // 0, above) instead of imputing a phantom league-average that would hand the
  // fighter-with-data a spurious edge. The delta is then re-normalized over the
  // surviving weight (present-weight denominator), so the remaining real signals
  // decide the call. Backtested against three variants (present-weight,
  // full-denominator shrink, and a blend): present-weight held the best
  // calibration and best winner accuracy; the shrink variants made the model
  // underconfident on the accurate thin-history mismatches (see
  // MODEL_EXPERIMENTS.md). Legacy versions never drop these weights, so their
  // locked calls reproduce exactly (see scripts/audit/drift-check.ts).
  const denominator = numeratorWeightSum;
  const rawDelta =
    (spiWeight * spiDelta +
      formWeight * formDelta +
      strikingWeight * strikingDelta +
      grapplingWeight * grapplingDelta +
      absorptionWeight * absorptionDelta) /
    Math.max(denominator, 0.001);

  const baseWinProbA = logistic(rawDelta, 3.5);

  // Share of the full factor weight that survived, for the confidence penalty.
  const coverage = Math.min(1, numeratorWeightSum / FULL_FACTOR_WEIGHT);

  let winProbA: number;
  if (matchupAware) {
    // v0.4: no temperature; missing-data shrinkage already applied via the full
    // denominator above.
    winProbA = baseWinProbA;
  } else {
    // Legacy v0.1/v0.2 use the raw logistic; v0.3 applies T=0.824 temperature.
    // Frozen so locked calls reproduce exactly (see scripts/audit/drift-check.ts).
    winProbA = applyTemperature ? temperatureRecalibrate(baseWinProbA) : baseWinProbA;
  }

  // Backtest-only temperature override for the calibration A/B (T=1 is a no-op).
  if (options?.temperature != null && options.temperature !== 1) {
    winProbA = temperatureRecalibrate(winProbA, options.temperature);
  }
  const winProbB = 1 - winProbA;

  // ── Finish profiles ───────────────────────────────────────────────────────
  const fpA = finishProfile(fighterA);
  const fpB = finishProfile(fighterB);

  // ── Swing factor (highest absolute weighted contribution) ─────────────────
  const factors = [
    {
      label: "grappling control",
      description: `Takedown accuracy vs. takedown defense is the variable that most decides this matchup. If the grappler converts consistently, the fight changes shape and striking range becomes conditional.`,
      contribution: Math.abs(grapplingDelta * grapplingWeight),
    },
    {
      label: "striking volume",
      description: `Landing clean while not getting hit back is the difference here. If the striking volume gap closes through good footwork or pressure, the model result shifts fast.`,
      contribution: Math.abs(strikingDelta * strikingWeight),
    },
    {
      label: "style pressure",
      description: `The style pressure differential is the widest signal the model found. Whoever generates more forward output and forces reaction controls tempo and rounds.`,
      contribution: Math.abs(spiDelta * spiWeight),
    },
    {
      label: "recent form",
      description: `Both fighters' recent shape, meaning momentum, method of recent wins, and opponent quality, can override style signals when the physical matchup is close.`,
      contribution: Math.abs(formDelta * formWeight),
    },
    {
      label: "absorption resistance",
      description: `The fighter who absorbs less clean damage dictates late-round pace. It compounds. Whoever lands the cleaner shot early tends to accumulate a scoring advantage by round 4 or 5.`,
      contribution: Math.abs(absorptionDelta * absorptionWeight),
    },
  ].sort((a, b) => b.contribution - a.contribution);

  const swing = factors[0];

  // ── Build outputs ─────────────────────────────────────────────────────────
  const outcomeA = buildFighterOutcome(fighterA, winProbA, fpA);
  const outcomeB = buildFighterOutcome(fighterB, winProbB, fpB);
  const methodBreakdown = matchupAware
    ? buildMatchupAwareMethodBreakdown(winProbA, fpA, fpB, fighterA, fighterB)
    : buildMethodBreakdown(winProbA, fpA, fpB);
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

  // v0.4: propagate a real missing-data penalty. When a chunk of factor weight
  // was dropped, cap confidence so the view-model read-strength cannot show
  // "strong" on a default-heavy call.
  if (matchupAware) {
    if (coverage < 0.6) confidence = capConfidence(confidence, "low");
    else if (coverage < 0.8) confidence = capConfidence(confidence, "medium");
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
