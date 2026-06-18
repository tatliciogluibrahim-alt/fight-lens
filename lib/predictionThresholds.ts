// Named-call threshold — the minimum top win probability for the model to name
// a winner. Below it, the fight is "too close to call": no named winner,
// excluded from accuracy tracking.
//
// The threshold is VERSIONED. A locked prediction is evaluated against the
// threshold of the model version it was locked under, so historical calls never
// shift when the live model changes:
//   - v0.1 / v0.2 (legacy): 52%, raw logistic, no temperature recalibration.
//   - v0.3+ (current): 58%, applied to the temperature-recalibrated probability.
export const NAMED_CALL_MIN_PROBABILITY = 58; // current model (v0.3+)
export const LEGACY_NAMED_CALL_MIN_PROBABILITY = 52; // v0.2 and earlier

/** Minor version at which the v0.3 calibration (T=0.824 + 58% threshold) begins. */
export const CALIBRATED_MODEL_MINOR = 3;

export type PredictionSide = "fighterA" | "fighterB";

/** Parse a model version string ("outcome-v0.3", "v0.2") to its minor number. */
export function parseModelMinorVersion(modelVersion?: string | null): number | null {
  if (!modelVersion) return null;
  const match = modelVersion.match(/v0\.(\d+)/i);
  return match ? Number(match[1]) : null;
}

/**
 * The named-call threshold for a given locked model version. Unknown or missing
 * version → current model threshold (used for live/unlocked predictions).
 */
export function resolveNamedCallThreshold(modelVersion?: string | null): number {
  const minor = parseModelMinorVersion(modelVersion);
  if (minor == null) return NAMED_CALL_MIN_PROBABILITY;
  return minor < CALIBRATED_MODEL_MINOR
    ? LEGACY_NAMED_CALL_MIN_PROBABILITY
    : NAMED_CALL_MIN_PROBABILITY;
}

export function getNamedCallSide(
  fighterAWinProbability: number,
  fighterBWinProbability: number,
  minProbability: number = NAMED_CALL_MIN_PROBABILITY,
): PredictionSide | null {
  const topProbability = Math.max(fighterAWinProbability, fighterBWinProbability);
  if (topProbability < minProbability) return null;
  if (fighterAWinProbability === fighterBWinProbability) return null;
  return fighterAWinProbability > fighterBWinProbability ? "fighterA" : "fighterB";
}

export function isTooCloseToCall(
  fighterAWinProbability: number,
  fighterBWinProbability: number,
  minProbability: number = NAMED_CALL_MIN_PROBABILITY,
): boolean {
  return getNamedCallSide(fighterAWinProbability, fighterBWinProbability, minProbability) === null;
}
