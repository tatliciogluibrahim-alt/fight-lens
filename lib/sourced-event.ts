import normalizedEventJson from "@/data/normalized/events/ufc-328.json";
import type { CardPlacement, DataProvenance, FightPath, StyleProfile } from "./types";

export type CompletenessState = "sourced" | "partial" | "missing" | "manual" | "derived" | "manual-required";
export type StyleMetricProvenance = DataProvenance | "missing";
export type ContextualNoteType =
  | "weight-class-up"
  | "weight-class-down"
  | "major-weight-cut"
  | "short-notice"
  | "long-layoff"
  | "age-mileage"
  | "durability"
  | "power-carry"
  | "speed-cardio-risk"
  | "late-replacement"
  | "debut-or-promotion-jump"
  | "recent-ko-loss"
  | "injury-return";

export interface ContextualFightNote {
  type: ContextualNoteType;
  fighter: string;
  title: string;
  explanation: string;
  confidence: "low" | "medium" | "high";
  impactDirection: "helps" | "hurts" | "unclear";
  modelImpact: "not included in model" | "manual context only";
}

/**
 * Model-sanity layer — manual, per-fight transparency metadata that wraps the
 * model lean without ever changing it. Authored in the event overrides file,
 * passed through normalization verbatim. Everything here is context AROUND
 * the prediction: confidence labeling, blind-spot flags, market sanity checks,
 * and analyst direction. The locked model output stays untouched.
 */
export type ModelConfidenceLabel = "Strong" | "Medium" | "Medium-low" | "Low" | "Data caution";

export type ModelDataFlag =
  | "small_sample"
  | "opponent_tier_mismatch"
  | "ranking_mismatch"
  | "age_mileage"
  | "division_change"
  | "short_notice"
  | "outdoor_environment"
  | "market_divergence"
  | "style_specific_blindspot";

export type AnalystCheckDirection =
  | "back_model_direction"
  | "fade_model_direction"
  | "pass_or_reduce_confidence"
  | "model_underconfident"
  | "model_overconfident";

export interface FightMarketContext {
  marketFavorite: string;
  marketImpliedSummary: string;
  modelVsMarket: string;
  displayCopy: string;
  /** When the market pricing was observed, e.g. "May 2026". Pricing moves — date the snapshot. */
  asOf?: string | null;
}

export interface FightModelSanity {
  modelConfidenceLabel: ModelConfidenceLabel;
  dataFlags: ModelDataFlag[];
  strongestInsight: string | null;
  analystCheck: AnalystCheckDirection[];
  analystCheckCopy: string | null;
  marketContext: FightMarketContext | null;
  /** When present, the fight renders a visible model-warning banner. */
  modelWarning?: string | null;
}

/**
 * Post-fight receipt — the honest, manual post-result layer that wraps a
 * scored fight. It NEVER changes the locked pre-fight prediction. Winner /
 * finish-bucket correctness is computed live from the locked prediction plus
 * the recorded outcome (see predictionViewModel: modelCorrect / methodCorrect),
 * so this object carries only the qualitative read: the editorial label, what
 * the model got right and missed, the lesson, and the vNext signals.
 *
 * "Predict the fight. Show the blind spots. Keep the receipt." — this is the
 * receipt. Misses are shown, not hidden; wins are not overclaimed.
 */
export type ReceiptLabel =
  | "Clean Read"
  | "Correct, Method Miss"
  | "Correct, Underconfident"
  | "Correct, Overconfident"
  | "Partial Read"
  | "Missed Read"
  | "Model Miss, Warning Correct"
  | "Model Miss";

export type FightShapeGrade = "clean" | "partial" | "missed" | "not_scored";

export type WarningLayerGrade = "correct_warning" | "missed_warning" | "not_applicable";

export type ReceiptQaStatus = "verified" | "needs_stats_review" | "needs_source_review";

export interface PostFightReceipt {
  receiptLabel: ReceiptLabel;
  fightShapeGrade: FightShapeGrade;
  warningLayerGrade: WarningLayerGrade;
  /** Surfaces an "Underconfident" supporting badge when true. */
  underconfident?: boolean;
  receiptSummary: string;
  whatModelGotRight: string[];
  whatModelMissed: string[];
  modelLesson: string;
  vNextSignals: string[];
  mediaNarrative: string | null;
  statSummary: string | null;
  qaStatus: ReceiptQaStatus;
}

export interface CardReceipt {
  status: "scored";
  rawWinnerRecord: { correct: number; total: number };
  finishBucketRecord: { correct: number; total: number };
  cleanReadCount: number;
  missedReadCount: number;
  /** Contrarian warnings vindicated — a manual warning that challenged the model lean and proved right. */
  warningCorrectCount: number;
  biggestModelWin: string;
  biggestModelMiss: string;
  bestTransparencyMoment: string;
  summary: string;
  mainLessons: string[];
  qaStatus: ReceiptQaStatus;
}

export interface SourcedLandedAttempted {
  landed: number | null;
  attempted: number | null;
  raw: string | null;
}

export interface SourcedTotals {
  kd: number | null;
  significantStrikes: SourcedLandedAttempted | null;
  significantStrikePercent: number | null;
  totalStrikes: SourcedLandedAttempted | null;
  takedowns: SourcedLandedAttempted | null;
  takedownPercent: number | null;
  submissionAttempts: number | null;
  reversals: number | null;
  control: string | null;
  controlSeconds: number | null;
}

export interface SourcedSignificantTotals {
  significantStrikes: SourcedLandedAttempted | null;
  significantStrikePercent: number | null;
  head: SourcedLandedAttempted | null;
  body: SourcedLandedAttempted | null;
  leg: SourcedLandedAttempted | null;
  distance: SourcedLandedAttempted | null;
  clinch: SourcedLandedAttempted | null;
  ground: SourcedLandedAttempted | null;
}

export interface SourcedRoundStat {
  round: number;
  totals: SourcedTotals | null;
  significant?: SourcedSignificantTotals | null;
}

export interface SourcedFightHistoryItem {
  opponentName: string | null;
  opponentUrl: string | null;
  eventName: string | null;
  eventUrl: string | null;
  date: string | null;
  result: string | null;
  method: string | null;
  round: number | null;
  time: string | null;
  fightUrl: string;
  totals: {
    totals: SourcedTotals | null;
    significant?: SourcedSignificantTotals | null;
  } | null;
  /**
   * Opponent's totals for this fight — stored so backtests can compute
   * sapm, strikingDefense, and takedownDefense as-of without leakage.
   * Null when the fight detail was unavailable at normalization time.
   */
  opponentTotals: {
    totals: SourcedTotals | null;
    significant?: SourcedSignificantTotals | null;
  } | null;
  roundStats: SourcedRoundStat[];
  source: "ufcstats";
  sourceUrl: string;
}

export interface SourcedStyleProfile extends Record<keyof StyleProfile, number | null> {
  provenance: Record<keyof StyleProfile, StyleMetricProvenance>;
  note: string;
}

export interface SourcedRoundScore {
  round: number;
  sampleCount: number;
  score: number | null;
}

export interface SourcedRoundModel {
  roundSampleCount: number;
  lateRoundSampleCount: number;
  earlyThreat: number | null;
  lateEvidence: number | null;
  roundScores: SourcedRoundScore[];
  hasEnoughForTrend: boolean;
  interpretation: string;
  averageFightTime: string | null;
}

export interface DataCompleteness {
  hasProfile: boolean;
  hasFightHistory: boolean;
  hasFightTotals: boolean;
  hasRoundStats: boolean;
  lastFiveCount: number;
  roundSampleCount: number;
  lateRoundSampleCount: number;
}

export interface SourcedFighter {
  id: string;
  ufcstatsId: string;
  name: string;
  nickname: string | null;
  ranking: string | null;
  record: string | null;
  height: string | null;
  weight: string | null;
  reach: string | null;
  stance: string | null;
  dob: string | null;
  country: {
    code?: string;
    label?: string;
    colors?: string[];
  } | null;
  image: {
    url: string | null;
    status: string;
    credit: string | null;
  };
  ufcstatsUrl: string;
  source: "ufcstats";
  sourceUrl: string;
  scrapedAt: string | null;
  aggregateStats: Record<string, number | null> | null;
  styleProfile: SourcedStyleProfile | null;
  fightHistory: SourcedFightHistoryItem[];
  lastFive: SourcedFightHistoryItem[];
  resumeHeat: null;
  roundModel: SourcedRoundModel;
  dataCompleteness: DataCompleteness | null;
  sourceCoverage: string;
}

export interface SourcedKeyEdge {
  shortLabel: string;
  label: string;
  fighterA: number | null;
  fighterB: number | null;
  provenance: "sourced" | "missing";
}

export interface SourcedFight {
  id: string;
  ufcstatsFightId: string;
  ufcstatsFightUrl: string;
  cardPlacement: CardPlacement;
  rounds: 3 | 5;
  weightClass: string | null;
  status: "scheduled" | "completed" | "mixed";
  styleClashLabel?: string | null;
  matchupQuestion: string | null;
  fightShapeSummary: string | null;
  manualRead: string | null;
  contextNotes?: ContextualFightNote[] | null;
  modelSanity?: FightModelSanity | null;
  postFightReceipt?: PostFightReceipt | null;
  result?: {
    winner: string;
    method: string;
    round: number | null;
  } | null;
  fighters: {
    fighterA: SourcedFighter;
    fighterB: SourcedFighter;
  };
  keyEdges: SourcedKeyEdge[];
  paths: {
    fighterA: FightPath[];
    fighterB: FightPath[];
  } | null;
  sourceMix: Record<string, CompletenessState>;
}

export interface SourcedEvent {
  schemaVersion: number;
  generatedAt: string;
  event: {
    id: string;
    ufcstatsId: string;
    name: string;
    shortName?: string;
    date: string | null;
    location: string | null;
    venue?: string | null;
    broadcast?: string | null;
    mainCardTime?: string | null;
    mainEvent?: { fighterA: string; fighterB: string } | null;
    featuredBouts?: Array<{ fighterA: string; fighterB: string }>;
    promotion: string;
    /** Card-level model-sanity read — one compact paragraph, manual. */
    cardSummary?: string | null;
    /** Card-level model blind spots, manual. Short noun phrases. */
    cardBlindSpots?: string[] | null;
    /** Environment note (e.g. outdoor venue). Outside model, manual. */
    environmentNote?: string | null;
    /** Card-level post-fight receipt — present only once the event is scored. */
    cardReceipt?: CardReceipt | null;
  };
  modeling: {
    principle: string;
    formulas: Record<string, string>;
  };
  fights: SourcedFight[];
}

export const sourcedEvent = normalizedEventJson as SourcedEvent;
export const sourcedFights = sourcedEvent.fights;

export function getSourcedFight(fightId: string): SourcedFight | undefined {
  return sourcedFights.find((fight) => fight.id === fightId);
}

export function getAllSourcedFighters() {
  const fighters = sourcedFights.flatMap((fight) => [fight.fighters.fighterA, fight.fighters.fighterB]);
  return Array.from(new Map(fighters.map((fighter) => [fighter.ufcstatsId, fighter])).values());
}
