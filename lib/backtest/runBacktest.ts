/**
 * runBacktest — run the outcome model on as-of features
 *
 * Reconstructs a minimal SourcedFight object from AsOfFightFeatures so that
 * buildFightShapeModel and buildFightOutcomeModel can be used without modification.
 *
 * The model is deterministic: same inputs → same output every time.
 */

import { buildFightShapeModel } from "@/lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "@/lib/fight-outcome-model/model";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { AsOfFightFeatures, AsOfFighterFeatures, BacktestPrediction } from "./types";

// Default backtest version = the current SHIPPED live model. The backtest now
// evaluates the configuration that actually ships (v0.4: raw logistic, no
// temperature, matchup-aware method, missing-data handling). The before/after
// A/B overrides this via env (BACKTEST_VERSION / BACKTEST_TEMP, handled in
// scripts/backtest/run.ts) to score older configs (v0.2 raw, v0.3 temperature).
const BACKTEST_MODEL_VERSION = "outcome-v0.4";

export interface RunBacktestOptions {
  /** Override the model version the outcome model runs at (default: shipped live). */
  modelVersion?: string;
  /** Temperature override for the calibration A/B (T=1 is a no-op). */
  temperature?: number | null;
  /**
   * When explicitly false, measure layoff against today (the pre-fix live
   * behavior) instead of the fight date. Only used to isolate the as-of fix in
   * the before/after comparison. Defaults to the corrected as-of behavior.
   */
  layoffAsOf?: boolean;
}

// ─── Reconstruct a minimal SourcedFighter from as-of features ────────────────
//
// The model reads:
//   - fighter.aggregateStats (for slpm, sapm, strikingDefense, etc.)
//   - fighter.lastFive (for form scoring and finish profile)
//   - fighter.fightHistory (for layoff shrinkage and round model)
//   - fighter.dataCompleteness (for confidence gating)
//
// We pass filteredHistory as both fightHistory and lastFive (capped at 5).
// This means form scoring, finish profiling, and layoff shrinkage all use
// the correct as-of data — no future leakage, no fallback to UFC averages.

function reconstructFighter(features: AsOfFighterFeatures): SourcedFighter {
  const history = features.filteredHistory;
  const lastFive = history.slice(0, 5);

  // Compute round stats from last five for the round model
  const allRoundStats = lastFive.flatMap((f) => f.roundStats ?? []);
  const lateRoundStats = allRoundStats.filter((r) => r.round >= 4);
  const hasFightTotals = lastFive.some((f) => f.totals?.totals != null);

  return {
    id: features.fighterId,
    ufcstatsId: features.fighterId,
    name: features.name,
    nickname: null,
    ranking: null,
    record: null,
    height: null,
    weight: null,
    reach: null,
    stance: null,
    dob: null,
    country: null,
    image: { url: null, status: "missing", credit: null },
    ufcstatsUrl: "",
    source: "ufcstats",
    sourceUrl: "",
    scrapedAt: null,
    // As-of aggregate stats — recomputed from filtered history (no leakage)
    aggregateStats: features.aggregateStats,
    styleProfile: null,
    // Filtered history — ensures form scoring uses only pre-fight data
    fightHistory: history,
    lastFive,
    resumeHeat: null,
    roundModel: {
      roundSampleCount: allRoundStats.length,
      lateRoundSampleCount: lateRoundStats.length,
      earlyThreat: null,
      lateEvidence: null,
      roundScores: [],
      hasEnoughForTrend: lateRoundStats.length >= 3,
      interpretation: `${allRoundStats.length} round samples (${lateRoundStats.length} late-round) from as-of history.`,
      averageFightTime: null,
    },
    dataCompleteness: {
      hasProfile: features.aggregateStats.slpm != null,
      hasFightHistory: history.length > 0,
      hasFightTotals,
      hasRoundStats: allRoundStats.length > 0,
      lastFiveCount: lastFive.length,
      roundSampleCount: allRoundStats.length,
      lateRoundSampleCount: lateRoundStats.length,
    },
    sourceCoverage: "backtest-reconstruction",
  };
}

// ─── Reconstruct a minimal SourcedFight ──────────────────────────────────────

function reconstructFight(features: AsOfFightFeatures): SourcedFight {
  const fighterA = reconstructFighter(features.fighterA);
  const fighterB = reconstructFighter(features.fighterB);

  return {
    id: features.fightId,
    ufcstatsFightId: "",
    ufcstatsFightUrl: "",
    cardPlacement: "Main Card",
    rounds: features.rounds,
    weightClass: features.weightClass,
    status: "completed",
    styleClashLabel: null,
    matchupQuestion: null,
    fightShapeSummary: null,
    manualRead: null,
    result: null,
    fighters: { fighterA, fighterB },
    keyEdges: [],
    paths: null,
    sourceMix: {},
  };
}

// ─── Map confidence ───────────────────────────────────────────────────────────

function mapConfidence(
  raw: string,
): BacktestPrediction["confidence"] {
  if (raw === "high") return "high";
  if (raw === "medium") return "medium";
  if (raw === "low") return "low";
  return "insufficient";
}

// ─── Main model run ───────────────────────────────────────────────────────────

/**
 * Run the prediction model on as-of features for a single fight.
 *
 * @param features - Leakage-checked as-of features for both fighters
 * @returns BacktestPrediction with win probabilities and method breakdown
 */
export function runBacktest(
  features: AsOfFightFeatures,
  options?: RunBacktestOptions,
): BacktestPrediction {
  const fight = reconstructFight(features);
  const modelVersion = options?.modelVersion ?? BACKTEST_MODEL_VERSION;

  // Step 1: Build fight shape model (SPI, form, round sustainability).
  // AS-OF FIX: pass the fight date so layoff shrinkage is measured relative to
  // when the fight happened, not today. Without this, older backtest fights get
  // a fake multi-year layoff and their form is wrongly shrunk toward the prior.
  const shapeModel = buildFightShapeModel(fight, {
    asOf: options?.layoffAsOf === false ? null : features.asOfDate,
  });

  // Step 2: Build outcome model (win probabilities, method breakdown) at the
  // requested version, so the backtest can score the shipped live config and
  // the A/B variants.
  const outcomeModel = buildFightOutcomeModel(fight, shapeModel, {
    modelVersion,
    temperature: options?.temperature,
  });

  return {
    fightId: features.fightId,
    asOfDate: features.asOfDate,
    fighterAWinProbability: outcomeModel.fighterA.winProbability,
    fighterBWinProbability: outcomeModel.fighterB.winProbability,
    methodBreakdown: {
      decision: outcomeModel.methodBreakdown.decision,
      koTko: outcomeModel.methodBreakdown.koTko,
      submission: outcomeModel.methodBreakdown.submission,
    },
    confidence: mapConfidence(outcomeModel.confidence),
    modelVersion,
    leakageChecked: true,
    rawDelta: outcomeModel.rawDelta,
  };
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
