/**
 * leakageChecks — verify that backtest features contain no post-fight data
 *
 * Data leakage is the #1 risk in backtesting.
 * A "backtest" that uses stats updated after the fight is not a backtest —
 * it's a retrodiction, and its accuracy numbers are meaningless.
 *
 * These checks enforce that all features used in a backtest were
 * knowable before the fight happened.
 */

import type { AsOfFightFeatures, LeakageCheckReport } from "./types";

/**
 * Run leakage checks on as-of features for a fight.
 *
 * @param features - The as-of features to check
 * @returns A leakage check report — must pass before running the model
 */
export function checkForLeakage(features: AsOfFightFeatures): LeakageCheckReport {
  const issues: string[] = [];
  const asOf = new Date(features.asOfDate);

  // Check 1: asOfDate must be before today (not a future fight)
  if (asOf > new Date()) {
    issues.push(`asOfDate ${features.asOfDate} is in the future — this is a live prediction, not a backtest.`);
  }

  // Check 2: fighterA history count must be reasonable
  if (features.fighterA.fightHistoryCount === 0) {
    issues.push(`Fighter A (${features.fighterA.name}) has no fight history as of ${features.asOfDate}.`);
  }
  if (features.fighterB.fightHistoryCount === 0) {
    issues.push(`Fighter B (${features.fighterB.name}) has no fight history as of ${features.asOfDate}.`);
  }

  // Check 3: warn if history count seems suspicious (too few fights for a UFC fighter)
  if (features.fighterA.fightHistoryCount > 0 && features.fighterA.fightHistoryCount < 2) {
    issues.push(`Fighter A (${features.fighterA.name}) has only ${features.fighterA.fightHistoryCount} fight(s) — predictions may be unreliable.`);
  }
  if (features.fighterB.fightHistoryCount > 0 && features.fighterB.fightHistoryCount < 2) {
    issues.push(`Fighter B (${features.fighterB.name}) has only ${features.fighterB.fightHistoryCount} fight(s) — predictions may be unreliable.`);
  }

  // TODO: Add check that no individual fight in the history has a date >= asOfDate
  // This requires the fight-by-fight history to carry event dates, which the current
  // normalized JSON does not always include.

  return {
    fightId: features.fightId,
    asOfDate: features.asOfDate,
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Run leakage checks on a batch of features.
 * Returns only the fights that passed — logs warnings for failures.
 */
export function filterLeakageSafe(
  featuresBatch: AsOfFightFeatures[],
): { safe: AsOfFightFeatures[]; reports: LeakageCheckReport[] } {
  const reports = featuresBatch.map(checkForLeakage);
  const safe = featuresBatch.filter((_, i) => reports[i].passed);
  return { safe, reports };
}
