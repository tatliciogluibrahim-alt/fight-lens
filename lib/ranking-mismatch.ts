/**
 * Ranking-mismatch detector.
 *
 * Auto-fires a small structural UI signal when the model lean lands on the
 * lower-ranked fighter by a meaningful margin. This is NOT a model override —
 * the locked prediction is untouched. It is presentational: a "ranking note"
 * the reader sees alongside the lean, so an obvious model-vs-résumé disconnect
 * (e.g. Lopes #2 vs Garcia #9 → model says Garcia 75%) is flagged honestly
 * rather than left for the reader to discover.
 *
 * Tiers:
 *   - "strong": rank gap ≥ 4 places AND winner probability ≥ 65%
 *   - "moderate": rank gap ≥ 2 places AND winner probability ≥ 55%
 *   - null: no mismatch worth surfacing
 *
 * Champion ("C") is treated as rank 0, interim champion ("IC") as rank 0.5.
 * Unranked fighters return null (no signal — different fight context).
 */

import type { SourcedFighter } from "@/lib/sourced-event";

export type RankingMismatchTier = "strong" | "moderate";

export interface RankingMismatch {
  tier: RankingMismatchTier;
  /** The fighter the model is leaning toward (the lower-ranked one). */
  modelLeanFighterName: string;
  modelLeanFighterRankLabel: string;
  /** The fighter ranking favors (the higher-ranked one). */
  rankingFavorsFighterName: string;
  rankingFavorsFighterRankLabel: string;
  /** Number of rank places between the two. */
  rankGap: number;
  /** Plain-English copy for the UI chip / line. */
  copy: string;
}

function parseRank(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const v = raw.trim().toUpperCase();
  if (v === "C") return 0;
  if (v === "IC") return 0.5;
  const m = v.match(/^#?(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function rankLabel(raw: string | null | undefined): string {
  if (raw == null) return "unranked";
  const v = raw.trim().toUpperCase();
  if (v === "C") return "C";
  if (v === "IC") return "IC";
  if (/^\d+$/.test(v)) return `#${v}`;
  return v;
}

interface DetectArgs {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  predictedWinnerId: string | null;
  winnerProbability: number | null;
}

export function detectRankingMismatch({
  fighterA,
  fighterB,
  predictedWinnerId,
  winnerProbability,
}: DetectArgs): RankingMismatch | null {
  if (!predictedWinnerId || winnerProbability == null) return null;

  const rankA = parseRank(fighterA.ranking);
  const rankB = parseRank(fighterB.ranking);
  if (rankA == null || rankB == null) return null;

  // Identify the higher-ranked fighter (lower numeric rank value).
  const higherRanked = rankA <= rankB ? fighterA : fighterB;
  const lowerRanked = higherRanked === fighterA ? fighterB : fighterA;
  const higherRankedRank = higherRanked === fighterA ? rankA : rankB;
  const lowerRankedRank = lowerRanked === fighterA ? rankA : rankB;

  // Need a meaningful gap to call it a mismatch at all.
  const rankGap = lowerRankedRank - higherRankedRank;
  if (rankGap < 2) return null;

  // Is the model lean on the lower-ranked side?
  const leanIsOnLowerRanked = predictedWinnerId === lowerRanked.id;
  if (!leanIsOnLowerRanked) return null;

  // Probability gap large enough to be a real disagreement?
  if (winnerProbability < 55) return null;

  const tier: RankingMismatchTier =
    rankGap >= 4 && winnerProbability >= 65 ? "strong" : "moderate";

  const leanLabel = rankLabel(lowerRanked.ranking);
  const favorLabel = rankLabel(higherRanked.ranking);

  const copy =
    tier === "strong"
      ? `Ranking note · model leans ${lowerRanked.name.split(" ").pop()} (${leanLabel}) over higher-ranked ${higherRanked.name.split(" ").pop()} (${favorLabel}). Read the lean knowing the model may be under-weighting opponent tier.`
      : `Ranking note · model lean lands on the lower-ranked fighter (${lowerRanked.name.split(" ").pop()} ${leanLabel} over ${higherRanked.name.split(" ").pop()} ${favorLabel}). Read as directional.`;

  return {
    tier,
    modelLeanFighterName: lowerRanked.name,
    modelLeanFighterRankLabel: leanLabel,
    rankingFavorsFighterName: higherRanked.name,
    rankingFavorsFighterRankLabel: favorLabel,
    rankGap,
    copy,
  };
}
