import type { DataProvenance } from "../types";

export type FightShapeConfidenceLabel = "High" | "Medium" | "Low" | "Insufficient";
export type FightShapeFactorImpact = "positive" | "negative" | "neutral";
export type FightShapeMetricStatus = "ready" | "partial" | "insufficient";

export interface FightShapeFactor {
  label: string;
  value: string;
  impact: FightShapeFactorImpact;
  provenance: DataProvenance | "missing";
}

export interface FightShapeDataConfidence {
  label: FightShapeConfidenceLabel;
  score: number;
  explanation: string;
  factors: FightShapeFactor[];
}

export interface FighterMetricScore {
  key: "stylePressureIndex" | "opponentQualityAdjustedForm" | "pathReliability";
  fighterId: string;
  fighterName: string;
  score: number | null;
  label: string;
  confidence: FightShapeConfidenceLabel;
  status: FightShapeMetricStatus;
  explanation: string;
  factors: FightShapeFactor[];
  provenance: Array<DataProvenance | "missing">;
}

export interface RoundSustainabilityScore {
  key: "roundSustainability";
  fighterId: string;
  fighterName: string;
  earlySignal: number | null;
  middleSignal: number | null;
  lateSignal: number | null;
  sustainabilityScore: number | null;
  label: string;
  confidence: FightShapeConfidenceLabel;
  status: FightShapeMetricStatus;
  explanation: string;
  factors: FightShapeFactor[];
  provenance: Array<DataProvenance | "missing">;
}

export interface ContextSignalScore {
  key: "contextSignalScore";
  score: null;
  label: "Insufficient";
  confidence: "Insufficient";
  status: "insufficient";
  explanation: string;
  factors: FightShapeFactor[];
  provenance: ["missing"];
}

export interface FighterMetricPair<TMetric> {
  fighterA: TMetric;
  fighterB: TMetric;
}

export interface FightShapeModelMetrics {
  stylePressureIndex: FighterMetricPair<FighterMetricScore>;
  opponentQualityAdjustedForm: FighterMetricPair<FighterMetricScore>;
  roundSustainability: FighterMetricPair<RoundSustainabilityScore>;
  pathReliability: FighterMetricPair<FighterMetricScore>;
  contextSignalScore: ContextSignalScore;
}

export interface FightShapeModelOutput {
  matchupId: string;
  fighterA: {
    id: string;
    name: string;
  };
  fighterB: {
    id: string;
    name: string;
  };
  metrics: FightShapeModelMetrics;
  dataConfidence: FightShapeDataConfidence;
  generatedAt: string;
  warnings: string[];
  publicSummary: string;
  debug?: {
    modelVersion: string;
    notes: string[];
  };
}
