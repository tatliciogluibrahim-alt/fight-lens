/**
 * Opponent-tier adjustment — EXPERIMENTAL v0.3 CANDIDATE. **DORMANT.**
 *
 * This file is NOT imported by the live outcome model. It exists so the v0.3
 * opponent-tier idea can be measured against real results (see
 * scripts/backtest/v03-candidate-comparison.mjs) before any decision to ship.
 * Nothing here changes a single locked prediction.
 *
 * The idea (from docs/model-vnext-ufc-freedom-250.md, Priority 1):
 *   opponentQualityScore currently has ZERO weight in win probability. v0.3
 *   would fold the résumé-strength delta between the two fighters into the
 *   probability so that facing tougher competition counts.
 *
 * The naive form below is deliberately simple — a flat logit nudge by the
 * résumé delta — precisely so the comparison harness can show *where it breaks*.
 * Spoiler (validated on Freedom 250): a flat résumé delta credits fighters with
 * old elite résumés who are now declining (Chandler, Lewis) and would flip
 * correct calls. opponentQuality measures *who you fought*, not *how good you
 * are now*. Do not ship this without the elite-loss-discount nuance.
 */

/** Résumé-strength delta in [-1, 1]; positive favors fighter A. */
export function resumeStrengthDelta(oppQualityA: number | null, oppQualityB: number | null): number {
  if (oppQualityA == null || oppQualityB == null) return 0;
  return (oppQualityA - oppQualityB) / 100;
}

function logit(p: number): number {
  const clamped = Math.min(0.999, Math.max(0.001, p));
  return Math.log(clamped / (1 - clamped));
}
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * v0.3-candidate adjusted win probability for fighter A (0–100), given the
 * locked v0.2 probability and the two résumé scores. `gain` is the logit-space
 * weight on the résumé delta. Returns a rounded 0–100 integer to match the
 * locked-prediction format.
 *
 * EXPERIMENTAL. Not wired into buildFightOutcomeModel.
 */
export function v03CandidateWinProbA(
  v02WinProbA: number,
  oppQualityA: number | null,
  oppQualityB: number | null,
  gain = 2.5,
): number {
  const delta = resumeStrengthDelta(oppQualityA, oppQualityB);
  const adjusted = sigmoid(logit(v02WinProbA / 100) + gain * delta);
  return Math.round(adjusted * 100);
}
