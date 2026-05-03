import type { FightShapeConfidenceLabel, FightShapeFactor, FightShapeMetricStatus } from "./types";

export function metricStatus(score: number | null, confidence: FightShapeConfidenceLabel): FightShapeMetricStatus {
  if (score == null || confidence === "Insufficient") return "insufficient";
  return confidence === "Low" ? "partial" : "ready";
}

export function pressureLabel(score: number | null) {
  if (score == null) return "Insufficient";
  if (score >= 78) return "High pressure signal";
  if (score >= 62) return "Medium pressure signal";
  if (score >= 45) return "Limited pressure signal";
  return "Thin pressure signal";
}

export function formLabel(score: number | null) {
  if (score == null) return "Insufficient";
  if (score >= 72) return "Strong recent shape";
  if (score >= 58) return "Positive recent shape";
  if (score >= 44) return "Mixed recent shape";
  return "Limited recent shape";
}

export function sustainabilityLabel(score: number | null) {
  if (score == null) return "Insufficient";
  if (score >= 76) return "Durable round shape";
  if (score >= 62) return "Stable round shape";
  if (score >= 46) return "Uneven round shape";
  return "Thin late-round shape";
}

export function pathReliabilityLabel(score: number | null) {
  if (score == null) return "Insufficient";
  if (score >= 76) return "Clear repeatability";
  if (score >= 62) return "Emerging repeatability";
  if (score >= 46) return "Limited repeatability";
  return "Thin path signal";
}

export function topFactor(factors: FightShapeFactor[]) {
  return factors.find((factor) => factor.impact === "positive") ?? factors[0] ?? null;
}

export function explainPressure(fighterName: string, factors: FightShapeFactor[], confidence: FightShapeConfidenceLabel) {
  const top = topFactor(factors);
  if (!top || confidence === "Insufficient") {
    return "The current sourced sample is not enough to identify a reliable pressure point.";
  }

  return `${fighterName}'s clearest matchup stress comes through ${top.label.toLowerCase()}. Confidence is ${confidence.toLowerCase()} because the read depends on profile rates and recent sourced samples.`;
}

export function explainForm(fighterName: string, confidence: FightShapeConfidenceLabel) {
  if (confidence === "Insufficient") {
    return "There are not enough recent sourced fights to calculate adjusted form.";
  }

  return `${fighterName}'s form signal uses recent sourced results and method context. Opponent tiers are not modeled yet, so this stays conservative.`;
}

export function explainSustainability(fighterName: string, confidence: FightShapeConfidenceLabel) {
  if (confidence === "Insufficient") {
    return "Not enough late-round evidence is available for a sustainability read.";
  }

  return `${fighterName}'s sustainability signal compares early, middle, and late round output from fetched round stats.`;
}

export function explainPath(fighterName: string, description: string, confidence: FightShapeConfidenceLabel) {
  if (confidence === "Insufficient") {
    return "The model is holding path reliability back until pressure, form, and round samples are all usable.";
  }

  return `${fighterName}'s most repeatable visible path is: ${description}`;
}
