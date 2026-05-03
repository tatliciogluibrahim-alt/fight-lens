import type { FightShapeModelOutput } from "./types";

const bannedPublicTerms = [
  "bet",
  "bets",
  "parlay",
  "lock",
  "moneyline",
  "pick",
  "guaranteed",
  "prediction",
  "chance to win"
];

function collectPublicText(output: FightShapeModelOutput) {
  const metricText = Object.values(output.metrics).flatMap((metric) => {
    if ("fighterA" in metric) {
      return [
        metric.fighterA.label,
        metric.fighterA.explanation,
        metric.fighterB.label,
        metric.fighterB.explanation
      ];
    }

    return [metric.label, metric.explanation];
  });

  return [output.publicSummary, ...output.warnings, ...metricText].join(" ").toLowerCase();
}

export function validateFightShapeModelOutput(output: FightShapeModelOutput) {
  const publicText = collectPublicText(output);
  const bannedMatches = bannedPublicTerms.filter((term) => publicText.includes(term));
  const scoreProblems: string[] = [];

  for (const metric of Object.values(output.metrics)) {
    if ("fighterA" in metric) {
      for (const side of [metric.fighterA, metric.fighterB]) {
        const score = "sustainabilityScore" in side ? side.sustainabilityScore : side.score;
        if (score != null && (score < 0 || score > 100)) {
          scoreProblems.push(`${side.fighterName} ${side.key} score out of range`);
        }
      }
    }
  }

  return {
    ok: bannedMatches.length === 0 && scoreProblems.length === 0,
    bannedMatches,
    scoreProblems
  };
}
