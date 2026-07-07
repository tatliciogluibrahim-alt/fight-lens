// Named-call threshold — the minimum top win probability for the model to name
// a winner. Below it, the fight is "too close to call": no named winner,
// excluded from accuracy tracking.
//
// The threshold is VERSIONED. A locked prediction is evaluated against the
// threshold of the model version it was locked under, so historical calls never
// shift when the live model changes:
//   - v0.1 / v0.2 (legacy): 52%, raw logistic, no temperature recalibration.
//   - v0.3: 58%, applied to the T=0.824 temperature-recalibrated probability.
//   - v0.4 (current live): 58%, raw logistic, temperature OFF. Adds matchup-aware
//     method head and missing-data weight-dropping. See lib/fight-outcome-model/model.ts
//     and docs/MODEL_STATUS.md for the backtested reconciliation.
export const NAMED_CALL_MIN_PROBABILITY = 58; // current model (v0.3+ / v0.4)
export const LEGACY_NAMED_CALL_MIN_PROBABILITY = 52; // v0.2 and earlier

/** Minor version at which the 58% named-call threshold begins (v0.3 and v0.4). */
export const CALIBRATED_MODEL_MINOR = 3;

// ── Version-scoped MODEL BEHAVIOR gates (not thresholds) ──────────────────────
// These pin which model math each version runs so a locked call always
// reproduces. Changing live behavior means a NEW minor, never editing an
// existing one — that is the forward-only integrity guarantee.
//
// TEMPERATURE_RECAL_MINOR: the ONLY version that applies the T=0.824 logit
// sharpening is v0.3. It was an isolated experiment; the backtest showed it
// hurts calibration on an already-calibrated raw model, so v0.4 turns it off
// (see docs/MODEL_EXPERIMENTS.md). v0.1/v0.2 never used it; v0.4+ does not.
export const TEMPERATURE_RECAL_MINOR = 3;

// MATCHUP_AWARE_METHOD_MINOR: v0.4+ runs the matchup-aware method head (opponent
// finish-resistance + submission floor + deterministic tie-break) and the
// missing-data factor-dropping / shrinkage. v0.1–v0.3 keep the frozen legacy
// method blend and average imputation.
export const MATCHUP_AWARE_METHOD_MINOR = 4;

/** True when this model version applies the T=0.824 temperature recalibration (v0.3 only). */
export function usesTemperatureRecalibration(modelVersion?: string | null): boolean {
  return parseModelMinorVersion(modelVersion) === TEMPERATURE_RECAL_MINOR;
}

/** True when this model version runs the v0.4+ matchup-aware method + missing-data handling. */
export function usesMatchupAwareModel(modelVersion?: string | null): boolean {
  const minor = parseModelMinorVersion(modelVersion);
  return minor != null && minor >= MATCHUP_AWARE_METHOD_MINOR;
}

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
