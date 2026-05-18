export type MethodType = "decision" | "ko_tko" | "submission" | "other";
export type FighterSide = "fighterA" | "fighterB";

export interface PredictionMethodBreakdown {
  decision: number;  // 0–100
  koTko: number;     // 0–100
  submission: number; // 0–100
}

export interface FightOutcome {
  /** Which fighter won */
  winner: FighterSide | "draw" | "nc";
  /** How the fight ended */
  method: MethodType;
  round: number;
  time: string;
  /** ISO timestamp when outcome was recorded */
  recordedAt: string;
}

export interface PredictionRecord {
  /** Matches the fight id in sourced-event */
  fightId: string;
  event: string;
  fighters: {
    fighterA: string;
    fighterB: string;
  };
  generatedAt: string;
  modelVersion: string;
  /** If true, this prediction was reconstructed after the fight for calibration purposes */
  isBacktestReconstruction?: boolean;
  prediction: {
    /** 0–100 win probability for Fighter A */
    fighterAWinProbability: number;
    /** 0–100 win probability for Fighter B */
    fighterBWinProbability: number;
    methodBreakdown: PredictionMethodBreakdown;
  };
  /** null = fight hasn't happened yet */
  outcome: FightOutcome | null;
}

// ─── Accuracy metrics ─────────────────────────────────────────────────────────

export interface CalibrationBucket {
  rangeLabel: string;
  /** Midpoint of the predicted probability bucket */
  predictedMidpoint: number;
  /** Actual win rate within this bucket */
  actualWinRate: number;
  count: number;
}

export type ModelGrade = "A" | "B" | "C" | "D" | "F";

export interface AccuracyMetrics {
  /** Total prediction files loaded */
  totalPredictions: number;
  /** Fights with a recorded outcome */
  resolvedCount: number;
  /** % of fights where model's top pick was correct (0–100) */
  winnerAccuracy: number | null;
  /** % of fights where predicted method type matched (0–100) */
  methodAccuracy: number | null;
  /**
   * Brier Score — mean squared error of win probabilities.
   * Range: 0 (perfect) to 0.25 (random / 50:50 always).
   * Lower is better.
   */
  brierScore: number | null;
  calibrationBuckets: CalibrationBucket[];
  /** Overall model grade derived from Brier score + winner accuracy */
  grade: ModelGrade | null;
  /** ISO timestamp of the most recently scored fight */
  lastUpdated: string | null;
}
