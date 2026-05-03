import type { SourcedFighter } from "../sourced-event";
import type { FightShapeConfidenceLabel, FightShapeDataConfidence, FightShapeFactor } from "./types";
import { clampScore } from "./normalization";

const confidenceRank: Record<FightShapeConfidenceLabel, number> = {
  Insufficient: 0,
  Low: 1,
  Medium: 2,
  High: 3
};

export function scoreToConfidence(score: number | null | undefined): FightShapeConfidenceLabel {
  if (score == null || score < 35) return "Insufficient";
  if (score < 60) return "Low";
  if (score < 80) return "Medium";
  return "High";
}

export function minConfidence(labels: FightShapeConfidenceLabel[]) {
  return labels.reduce<FightShapeConfidenceLabel>((lowest, label) => (
    confidenceRank[label] < confidenceRank[lowest] ? label : lowest
  ), "High");
}

export function lowerConfidence(label: FightShapeConfidenceLabel, steps = 1) {
  const labels: FightShapeConfidenceLabel[] = ["Insufficient", "Low", "Medium", "High"];
  const index = labels.indexOf(label);
  return labels[Math.max(0, index - steps)];
}

function factor(label: string, value: string, impact: FightShapeFactor["impact"] = "neutral"): FightShapeFactor {
  return {
    label,
    value,
    impact,
    provenance: "sourced"
  };
}

export function fighterBaseConfidence(fighter: SourcedFighter): FightShapeDataConfidence {
  if (!fighter.dataCompleteness.hasProfile) {
    return {
      label: "Insufficient",
      score: 0,
      explanation: "No sourced profile is available for this fighter.",
      factors: [factor("profile", "missing", "negative")]
    };
  }

  const historyScore = Math.min(fighter.dataCompleteness.lastFiveCount, 5) * 7;
  const roundScore = Math.min(fighter.dataCompleteness.roundSampleCount, 15) * 1.5;
  const lateScore = Math.min(fighter.dataCompleteness.lateRoundSampleCount, 5) * 4;
  const totalScore = fighter.dataCompleteness.hasFightTotals ? 12 : 0;
  const score = clampScore(28 + historyScore + roundScore + lateScore + totalScore) ?? 0;

  return {
    label: scoreToConfidence(score),
    score,
    explanation: "Confidence reflects profile coverage, recent history, fight totals, and round samples.",
    factors: [
      factor("profile", "matched", "positive"),
      factor("recent history", `${fighter.dataCompleteness.lastFiveCount} rows`, fighter.dataCompleteness.lastFiveCount >= 3 ? "positive" : "negative"),
      factor("round sample", `${fighter.dataCompleteness.roundSampleCount} rounds`, fighter.dataCompleteness.roundSampleCount >= 8 ? "positive" : "neutral"),
      factor("late sample", `${fighter.dataCompleteness.lateRoundSampleCount} late rounds`, fighter.dataCompleteness.lateRoundSampleCount >= 3 ? "positive" : "negative")
    ]
  };
}

export function profileMetricConfidence(fighter: SourcedFighter, opponent: SourcedFighter) {
  if (!fighter.aggregateStats || !opponent.aggregateStats) return "Insufficient";

  const baseScore = Math.min(
    fighterBaseConfidence(fighter).score,
    fighterBaseConfidence(opponent).score
  );

  return scoreToConfidence(Math.max(35, baseScore));
}

export function formMetricConfidence(fighter: SourcedFighter) {
  if (fighter.dataCompleteness.lastFiveCount < 3) return "Insufficient";
  const base = 42 + Math.min(fighter.dataCompleteness.lastFiveCount, 5) * 7 + (fighter.dataCompleteness.hasFightTotals ? 8 : 0);
  const label = scoreToConfidence(base);

  // Opponent tiers are intentionally not modeled yet, so the first form metric is capped.
  return label === "High" ? "Medium" : label;
}

export function roundMetricConfidence(fighter: SourcedFighter) {
  const roundCount = fighter.dataCompleteness.roundSampleCount;
  const lateCount = fighter.dataCompleteness.lateRoundSampleCount;

  if (roundCount < 8 || lateCount < 3) return "Insufficient";
  if (roundCount >= 15 && lateCount >= 5) return "High";
  if (roundCount >= 10 && lateCount >= 3) return "Medium";
  return "Low";
}

export function matchupDataConfidence(fighterA: SourcedFighter, fighterB: SourcedFighter): FightShapeDataConfidence {
  const a = fighterBaseConfidence(fighterA);
  const b = fighterBaseConfidence(fighterB);
  const score = clampScore((a.score + b.score) / 2) ?? 0;

  return {
    label: minConfidence([a.label, b.label, scoreToConfidence(score)]),
    score,
    explanation: "Matchup confidence is the combined coverage of both fighters, not an outcome rating.",
    factors: [
      ...a.factors.slice(0, 2).map((item) => ({ ...item, label: `${fighterA.name}: ${item.label}` })),
      ...b.factors.slice(0, 2).map((item) => ({ ...item, label: `${fighterB.name}: ${item.label}` }))
    ]
  };
}
