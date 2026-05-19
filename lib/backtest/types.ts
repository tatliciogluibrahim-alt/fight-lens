/**
 * Backtest types — fight-lens backtest system
 *
 * A backtest reconstructs what the model would have predicted for a historical
 * fight using only the data that was available AS OF that fight date.
 * It is not a retrodiction — it strictly avoids post-fight data leakage.
 *
 * Data provenance chain:
 *   UFCStats snapshot → as-of feature extraction → model run → score → calibration
 */

import type { PredictionRecord } from "@/lib/accuracy/types";

/** Source data cut at a specific date — no future data allowed */
export interface AsOfFighterFeatures {
  fighterId: string;
  name: string;
  /** ISO date of the fight being backtested */
  asOfDate: string;
  /** Fights used for this snapshot (all completed before asOfDate) */
  fightHistoryCount: number;
  /** Derived signals available at that date */
  aggregateStats: Record<string, number | null>;
  /** Whether we have enough history for a confident prediction */
  hasEnoughData: boolean;
  /** Any known data quality issues at that date */
  dataWarnings: string[];
}

export interface AsOfFightFeatures {
  fightId: string;
  event: string;
  asOfDate: string;
  fighterA: AsOfFighterFeatures;
  fighterB: AsOfFighterFeatures;
  weightClass: string | null;
  rounds: 3 | 5;
}

/** The result of running the model on as-of features */
export interface BacktestPrediction {
  fightId: string;
  asOfDate: string;
  fighterAWinProbability: number;
  fighterBWinProbability: number;
  methodBreakdown: {
    decision: number;
    koTko: number;
    submission: number;
  };
  confidence: "high" | "medium" | "low" | "insufficient";
  modelVersion: string;
  leakageChecked: boolean;
}

/** A scored backtest — actual outcome paired with the prediction */
export interface BacktestResult {
  prediction: BacktestPrediction;
  outcome: PredictionRecord["outcome"];
  /** Was the model's top pick correct? */
  correct: boolean | null;
  /** Brier score contribution for this fight */
  brierContribution: number | null;
  /** Method prediction was directionally correct? */
  methodCorrect: boolean | null;
}

/** Aggregate summary across a set of backtest results */
export interface BacktestSummary {
  totalFights: number;
  scoredFights: number;
  winnerAccuracy: number | null;
  methodAccuracy: number | null;
  brierScore: number | null;
  calibrationBuckets: Array<{
    rangeLabel: string;
    predictedMidpoint: number;
    actualWinRate: number;
    count: number;
  }>;
  generatedAt: string;
  modelVersion: string;
  /** Known limitations of this backtest run */
  caveats: string[];
}

/** Leakage check report — confirms no post-fight data was used */
export interface LeakageCheckReport {
  fightId: string;
  asOfDate: string;
  passed: boolean;
  issues: string[];
}
