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
 */

import type {
  SourcedFighter,
  SourcedFightHistoryItem,
  SourcedRoundStat,
} from "@/lib/sourced-event";
import type { AsOfFightFeatures, AsOfFighterFeatures } from "./types";

// ─── Date parsing ────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, "jan.": 0,
  feb: 1, "feb.": 1,
  mar: 2, "mar.": 2,
  apr: 3, "apr.": 3,
  may: 4, "may.": 4,
  jun: 5, "jun.": 5,
  jul: 6, "jul.": 6,
  aug: 7, "aug.": 7,
  sep: 8, "sep.": 8,
  oct: 9, "oct.": 9,
  nov: 10, "nov.": 10,
  dec: 11, "dec.": 11,
};

/**
 * Parse UFCStats date format ("Jul. 10, 2021", "Mar. 07, 2026") → ISO "YYYY-MM-DD"
 * Returns null if unparseable.
 */
function parseUfcDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(",", "").replace(/\s+/g, " ").trim();
  const [monthText, dayText, yearText] = cleaned.split(" ");
  const month = MONTH_MAP[monthText?.toLowerCase()];
  const day = Number(dayText);
  const year = Number(yearText);
  if (month == null || !day || !year) return null;
  // Zero-pad to YYYY-MM-DD
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Strictly-before comparison.
 * Returns true if historyDate < cutoffDate (string comparison works for ISO dates).
 */
function isBeforeDate(historyDate: string, cutoffDate: string): boolean {
  return historyDate < cutoffDate;
}

// ─── Duration helper ─────────────────────────────────────────────────────────

function clockToSeconds(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function fightDurationSeconds(item: SourcedFightHistoryItem): number | null {
  const clock = clockToSeconds(item.time);
  if (clock == null || !item.round) return null;
  return (item.round - 1) * 300 + clock;
}

// ─── As-of aggregate stat computation ────────────────────────────────────────
//
// The existing model reads these keys from aggregateStats:
//   slpm, strikingAccuracy, sapm, strikingDefense,
//   takedownAverage, takedownAccuracy, takedownDefense, submissionAverage
//
// We recompute them from per-fight totals in filtered fightHistory.
//
// Rates:
//   slpm (significant strikes landed per minute) — total landed / total minutes
//   strikingAccuracy (%) — total landed / total attempted × 100
//   sapm (strikes absorbed per minute) — opponent sig landed / total minutes
//   strikingDefense (%) — 100 - (opponent sig landed / opponent sig attempted × 100)
//   takedownAverage (per 15 min) — total TD landed / total minutes × 15
//   takedownAccuracy (%) — total TD landed / total TD attempted × 100
//   takedownDefense (%) — 100 - (opponent TD landed / opponent TD attempted × 100)
//   submissionAverage (per 15 min) — total sub attempts / total minutes × 15
//
// "opponent" stats: the model's fight totals store [fighter, opponent] values.
// In SourcedFightHistoryItem.totals, "totals" is the fighter's own totals.
// Opponent totals are NOT stored directly. We infer them from roundStats where
// both sides appear, or we mark the stat as unavailable.
//
// Fallback: if a stat cannot be computed, we return null and flag it.

interface RawStatAccumulator {
  totalMinutes: number;
  sigLanded: number;
  sigAttempted: number;
  // Opponent sig: inferred from the fact that the normalized JSON has
  // the fighter's defensive stats. We compute opp sig from strikingDefense
  // data if available in individual fights, otherwise leave null.
  oppSigLanded: number | null;
  oppSigAttempted: number | null;
  tdLanded: number;
  tdAttempted: number;
  oppTdLanded: number | null;
  oppTdAttempted: number | null;
  subAttempts: number;
  fightCount: number;
}

/**
 * Accumulate raw stats from a single fight history item.
 * We only accumulate stats from fights that have totals data.
 */
function accumulateFight(acc: RawStatAccumulator, item: SourcedFightHistoryItem): void {
  const dur = fightDurationSeconds(item);
  const totals = item.totals?.totals;

  if (!totals || dur == null || dur <= 0) return;

  const minutes = dur / 60;
  acc.totalMinutes += minutes;
  acc.fightCount += 1;

  // Own sig strikes
  const sigL = totals.significantStrikes?.landed;
  const sigA = totals.significantStrikes?.attempted;
  if (typeof sigL === "number") acc.sigLanded += sigL;
  if (typeof sigA === "number") acc.sigAttempted += sigA;

  // Takedowns
  const tdL = totals.takedowns?.landed;
  const tdA = totals.takedowns?.attempted;
  if (typeof tdL === "number") acc.tdLanded += tdL;
  if (typeof tdA === "number") acc.tdAttempted += tdA;

  // Submission attempts
  if (typeof totals.submissionAttempts === "number") {
    acc.subAttempts += totals.submissionAttempts;
  }

  // Opponent totals — now stored in fightHistory as opponentTotals (added May 2026).
  // Use them to accumulate sapm / strikingDefense / takedownDefense data.
  const oppTotals = item.opponentTotals?.totals;
  if (oppTotals) {
    const oppSigL = oppTotals.significantStrikes?.landed;
    const oppSigA = oppTotals.significantStrikes?.attempted;
    const oppTdL = oppTotals.takedowns?.landed;
    const oppTdA = oppTotals.takedowns?.attempted;

    if (typeof oppSigL === "number") {
      acc.oppSigLanded = (acc.oppSigLanded ?? 0) + oppSigL;
    }
    if (typeof oppSigA === "number") {
      acc.oppSigAttempted = (acc.oppSigAttempted ?? 0) + oppSigA;
    }
    if (typeof oppTdL === "number") {
      acc.oppTdLanded = (acc.oppTdLanded ?? 0) + oppTdL;
    }
    if (typeof oppTdA === "number") {
      acc.oppTdAttempted = (acc.oppTdAttempted ?? 0) + oppTdA;
    }
  }
}

/**
 * Compute aggregate stats from accumulated raw counts.
 * Returns null for any stat that requires opponent data we don't have.
 */
function computeAggregateStats(
  acc: RawStatAccumulator,
  warnings: string[],
): Record<string, number | null> {
  if (acc.totalMinutes <= 0 || acc.fightCount === 0) {
    warnings.push("No fight totals available — all aggregate stats are null.");
    return {
      slpm: null,
      strikingAccuracy: null,
      sapm: null,
      strikingDefense: null,
      takedownAverage: null,
      takedownAccuracy: null,
      takedownDefense: null,
      submissionAverage: null,
    };
  }

  const slpm = acc.sigLanded / acc.totalMinutes;
  const strikingAccuracy =
    acc.sigAttempted > 0 ? (acc.sigLanded / acc.sigAttempted) * 100 : null;
  const tdAvg = (acc.tdLanded / acc.totalMinutes) * 15;
  const tdAcc =
    acc.tdAttempted > 0 ? (acc.tdLanded / acc.tdAttempted) * 100 : null;
  const subAvg = (acc.subAttempts / acc.totalMinutes) * 15;

  // Opponent data is not stored in fightHistory — null, model uses defaults
  if (acc.oppSigLanded === null) {
    warnings.push("Opponent striking data not in history — sapm and strikingDefense use model defaults.");
  }
  if (acc.oppTdLanded === null) {
    warnings.push("Opponent takedown data not in history — takedownDefense uses model default.");
  }

  const sapm = acc.oppSigLanded != null && acc.totalMinutes > 0
    ? acc.oppSigLanded / acc.totalMinutes
    : null;
  const strikingDefense =
    acc.oppSigAttempted != null && acc.oppSigAttempted > 0 && acc.oppSigLanded != null
      ? 100 - (acc.oppSigLanded / acc.oppSigAttempted) * 100
      : null;
  const tdDefense =
    acc.oppTdAttempted != null && acc.oppTdAttempted > 0 && acc.oppTdLanded != null
      ? 100 - (acc.oppTdLanded / acc.oppTdAttempted) * 100
      : null;

  return {
    slpm: Number(slpm.toFixed(2)),
    strikingAccuracy: strikingAccuracy != null ? Math.round(strikingAccuracy) : null,
    sapm: sapm != null ? Number(sapm.toFixed(2)) : null,
    strikingDefense: strikingDefense != null ? Math.round(strikingDefense) : null,
    takedownAverage: Number(tdAvg.toFixed(2)),
    takedownAccuracy: tdAcc != null ? Math.round(tdAcc) : null,
    takedownDefense: tdDefense != null ? Math.round(tdDefense) : null,
    submissionAverage: Number(subAvg.toFixed(2)),
  };
}

// ─── dataCompleteness rebuild ─────────────────────────────────────────────────

function buildDataCompleteness(filtered: SourcedFightHistoryItem[]) {
  const lastFive = filtered.slice(0, 5);
  const hasFightTotals = lastFive.some((f) => f.totals?.totals != null);
  const allRoundStats: SourcedRoundStat[] = lastFive.flatMap((f) => f.roundStats ?? []);
  const lateRounds = allRoundStats.filter((r) => r.round >= 4);

  return {
    hasProfile: true,
    hasFightHistory: filtered.length > 0,
    hasFightTotals,
    hasRoundStats: allRoundStats.length > 0,
    lastFiveCount: Math.min(filtered.length, 5),
    roundSampleCount: allRoundStats.length,
    lateRoundSampleCount: lateRounds.length,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build as-of fighter features for a single fighter.
 *
 * Filters fightHistory to fights strictly before asOfDate, then recomputes
 * aggregate stats from those filtered fights only.
 *
 * @param fighter - The SourcedFighter from the normalized JSON (contains full history)
 * @param asOfDate - ISO date "YYYY-MM-DD" — only fights before this date are used
 * @returns AsOfFighterFeatures with recomputed stats, or null if no history at all
 */
export function buildAsOfFighterFeaturesDirect(
  fighter: SourcedFighter,
  asOfDate: string,
): AsOfFighterFeatures {
  const warnings: string[] = [];

  // ── 1. Filter fightHistory to fights strictly before asOfDate ──────────────
  const filteredHistory: SourcedFightHistoryItem[] = [];
  const unknownDateFights: string[] = [];

  for (const item of fighter.fightHistory) {
    const parsed = parseUfcDate(item.date);
    if (parsed == null) {
      // Cannot determine date — conservative: exclude to avoid leakage
      const tag = item.opponentName ?? item.eventName ?? "unknown fight";
      unknownDateFights.push(tag);
      continue;
    }
    if (isBeforeDate(parsed, asOfDate)) {
      filteredHistory.push(item);
    }
    // If parsed >= asOfDate, the fight happened on/after the target — exclude
  }

  if (unknownDateFights.length > 0) {
    warnings.push(
      `${unknownDateFights.length} fight(s) excluded (date unknown — leakage risk): ${unknownDateFights.join(", ")}`,
    );
  }

  // ── 2. Leakage check: verify every included fight is before asOfDate ───────
  for (const item of filteredHistory) {
    const parsed = parseUfcDate(item.date);
    if (parsed != null && !isBeforeDate(parsed, asOfDate)) {
      warnings.push(
        `LEAKAGE: Fight vs ${item.opponentName ?? "?"} on ${parsed} is on or after asOfDate ${asOfDate} — BUG in filter logic.`,
      );
    }
  }

  // ── 3. Accumulate raw stats from filtered fights ───────────────────────────
  const acc: RawStatAccumulator = {
    totalMinutes: 0,
    sigLanded: 0,
    sigAttempted: 0,
    oppSigLanded: null,
    oppSigAttempted: null,
    tdLanded: 0,
    tdAttempted: 0,
    oppTdLanded: null,
    oppTdAttempted: null,
    subAttempts: 0,
    fightCount: 0,
  };

  for (const item of filteredHistory) {
    accumulateFight(acc, item);
  }

  // ── 4. Compute aggregate stats ─────────────────────────────────────────────
  const aggregateStats = computeAggregateStats(acc, warnings);

  // ── 5. Data quality warnings ───────────────────────────────────────────────
  const hasEnoughData = filteredHistory.length >= 2 && acc.fightCount >= 1;
  if (!hasEnoughData) {
    warnings.push(
      `Only ${filteredHistory.length} fight(s) before ${asOfDate} — predictions will be unreliable.`,
    );
  }

  return {
    fighterId: fighter.id,
    name: fighter.name,
    asOfDate,
    fightHistoryCount: filteredHistory.length,
    aggregateStats,
    // Pass filtered history so runBacktest can use it for lastFive / form scoring
    filteredHistory,
    hasEnoughData,
    dataWarnings: warnings,
  };
}

/**
 * Build as-of fight features for both fighters in a SourcedFight.
 * This is the main entry point for the backtest pipeline.
 *
 * @param fight - The SourcedFight object from the normalized event JSON
 * @param asOfDate - ISO date "YYYY-MM-DD" — only fights before this date are used
 * @returns AsOfFightFeatures for both fighters
 */
export function buildAsOfFeaturesFromSourcedFight(
  fight: { id: string; rounds: 3 | 5; weightClass: string | null; fighters: { fighterA: SourcedFighter; fighterB: SourcedFighter } },
  eventName: string,
  asOfDate: string,
): AsOfFightFeatures {
  const fighterA = buildAsOfFighterFeaturesDirect(fight.fighters.fighterA, asOfDate);
  const fighterB = buildAsOfFighterFeaturesDirect(fight.fighters.fighterB, asOfDate);

  return {
    fightId: fight.id,
    event: eventName,
    asOfDate,
    fighterA,
    fighterB,
    weightClass: fight.weightClass,
    rounds: fight.rounds,
  };
}

// ─── Stub compatibility — async API kept for type compatibility ───────────────

export async function buildAsOfFeatures(
  fightId: string,
  asOfDate: string,
): Promise<AsOfFightFeatures | null> {
  // This async version is kept for future use with dynamic data loading.
  // The synchronous version (buildAsOfFeaturesFromSourcedFight) is used
  // by the backtest script which already has the normalized JSON loaded.
  void fightId;
  void asOfDate;
  throw new Error(
    "buildAsOfFeatures (async): use buildAsOfFeaturesFromSourcedFight for the current backtest pipeline.",
  );
}

export async function buildAsOfFighterFeatures(
  fighterId: string,
  asOfDate: string,
): Promise<AsOfFighterFeatures | null> {
  void fighterId;
  void asOfDate;
  return null;
}
