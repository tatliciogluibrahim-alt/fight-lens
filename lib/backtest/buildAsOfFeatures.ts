/**
 * buildAsOfFeatures — construct fighter feature snapshots as of a given date
 *
 * This is the leakage firewall. All historical backtests must pass through
 * this function. It filters a fighter's fight history to only include fights
 * completed strictly before `asOfDate`, then recomputes aggregate stats.
 *
 * DO NOT read post-fight stats (aggregateStats from the current normalized JSON)
 * directly into a backtest — those include results from after the fight being
 * tested, which leaks future information into the model.
 *
 * TODO: Implement using the raw UFCStats fight-by-fight data in
 *   data/generated/ufcstats/fights/
 * The islam-jdm.json in data/normalized/backtests/ is a hand-crafted example
 * of what this function should produce automatically.
 */

import type { AsOfFightFeatures, AsOfFighterFeatures } from "./types";

/**
 * Build as-of feature snapshots for both fighters in a historical fight.
 *
 * @param fightId - The fight ID to reconstruct (must exist in data/normalized/events/)
 * @param asOfDate - ISO date string: only data strictly before this date is used
 * @returns As-of features for both fighters, or null if data is insufficient
 *
 * @throws Error if the fight is not found or asOfDate is in the future
 *
 * @example
 * const features = await buildAsOfFeatures("chimaev-strickland", "2025-05-10");
 * if (features) {
 *   const prediction = runBacktest(features);
 * }
 */
export async function buildAsOfFeatures(
  fightId: string,
  asOfDate: string,
): Promise<AsOfFightFeatures | null> {
  // TODO: Implement
  // Steps:
  // 1. Load the fight definition from the event registry
  // 2. For each fighter, load their full fight history from data/generated/ufcstats/
  // 3. Filter history to fights completed before asOfDate
  // 4. Recompute aggregate stats from filtered history only
  // 5. Run data quality checks (hasFightTotals, hasRoundStats, etc.)
  // 6. Return AsOfFightFeatures

  void fightId;
  void asOfDate;

  throw new Error("buildAsOfFeatures: not yet implemented. See TODO in this file.");
}

/**
 * Build as-of features for a single fighter.
 * Internal helper — use buildAsOfFeatures for full fight snapshots.
 */
export async function buildAsOfFighterFeatures(
  fighterId: string,
  asOfDate: string,
): Promise<AsOfFighterFeatures | null> {
  // TODO: Implement
  void fighterId;
  void asOfDate;
  return null;
}
