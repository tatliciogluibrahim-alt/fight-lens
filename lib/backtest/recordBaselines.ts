import type { AsOfFightFeatures } from "./types";
import type { SourcedFightHistoryItem } from "@/lib/sourced-event";

export type RecordBaselinePick = "fighterA" | "fighterB" | "no-pick";

export interface PreFightRecord {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  totalDirectional: number;
  winPct: number | null;
  netWins: number;
}

export interface RecordBaselineVariant {
  id: string;
  label: string;
  leakageSafe: boolean;
  officialComparison: boolean;
  rule: string;
}

export interface RecordBaselinePrediction {
  id: string;
  label: string;
  leakageSafe: boolean;
  officialComparison: boolean;
  rule: string;
  pick: RecordBaselinePick;
  probabilityA: number;
  reason: string;
  recordA: PreFightRecord;
  recordB: PreFightRecord;
}

export interface RecordBaselineScore {
  id: string;
  label: string;
  leakageSafe: boolean;
  officialComparison: boolean;
  rule: string;
  picked: number;
  noPick: number;
  coverage: number | null;
  correctPicked: number;
  pickAccuracy: number | null;
  allFightAccuracy: number | null;
  brierScore: number | null;
  modelCorrectOnPicked: number;
  modelAccuracyOnPicked: number | null;
  modelVsBaselineDeltaOnPicked: number | null;
}

export const OFFICIAL_RECORD_BASELINE_ID = "asof-ufc-win-pct-any-history";

export const RECORD_BASELINE_VARIANTS: RecordBaselineVariant[] = [
  {
    id: "asof-absolute-wl",
    label: "As-of absolute W-L record",
    leakageSafe: true,
    officialComparison: true,
    rule: "Use filtered pre-fight history only; pick higher wins-minus-losses; no-pick on equal net W-L.",
  },
  {
    id: "asof-win-pct-min3",
    label: "As-of win percentage, min 3 fights each",
    leakageSafe: true,
    officialComparison: true,
    rule: "Use filtered pre-fight history only; require at least 3 directional fights for each fighter; pick higher W-L win percentage.",
  },
  {
    id: OFFICIAL_RECORD_BASELINE_ID,
    label: "As-of UFC win percentage, any history",
    leakageSafe: true,
    officialComparison: true,
    rule: "Use filtered UFCStats history only; compare W-L win percentage, treating no prior directional history as 0% to mirror the legacy fallback behavior.",
  },
  {
    id: "asof-win-pct-no-small-edge",
    label: "As-of win percentage, no small edge",
    leakageSafe: true,
    officialComparison: true,
    rule: "Use filtered pre-fight history only; require at least 1 directional fight each and a win-rate gap above 5 points.",
  },
];

export function recordFromHistory(history: SourcedFightHistoryItem[]): PreFightRecord {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let noContests = 0;

  for (const item of history) {
    const result = String(item.result ?? "").toLowerCase();
    if (result.startsWith("win") || result === "w") wins++;
    else if (result.startsWith("loss") || result === "l") losses++;
    else if (result.startsWith("draw") || result === "d") draws++;
    else if (result.includes("nc") || result.includes("no contest")) noContests++;
  }

  const totalDirectional = wins + losses;
  return {
    wins,
    losses,
    draws,
    noContests,
    totalDirectional,
    winPct: totalDirectional > 0 ? wins / totalDirectional : null,
    netWins: wins - losses,
  };
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function probabilityForPick(pick: RecordBaselinePick): number {
  if (pick === "fighterA") return 0.6;
  if (pick === "fighterB") return 0.4;
  return 0.5;
}

function winPctOrZero(record: PreFightRecord): number {
  return record.winPct ?? 0;
}

function pickFromWinPct(
  variant: RecordBaselineVariant,
  recordA: PreFightRecord,
  recordB: PreFightRecord,
  options: { minFightsPerFighter?: number; minDiffPct?: number; noHistoryAsZero?: boolean } = {},
): RecordBaselinePrediction {
  const min = options.minFightsPerFighter ?? 0;
  if (recordA.totalDirectional < min || recordB.totalDirectional < min) {
    return prediction(variant, "no-pick", recordA, recordB, `below minimum fight threshold (${min})`);
  }

  const pctA = options.noHistoryAsZero ? winPctOrZero(recordA) : recordA.winPct;
  const pctB = options.noHistoryAsZero ? winPctOrZero(recordB) : recordB.winPct;
  if (pctA == null || pctB == null) {
    return prediction(variant, "no-pick", recordA, recordB, "one or both fighters have no pre-fight W-L record");
  }

  const diff = pctA - pctB;
  const minDiff = (options.minDiffPct ?? 0) / 100;
  if (Math.abs(diff) <= minDiff) {
    return prediction(variant, "no-pick", recordA, recordB, `win percentage difference within ${options.minDiffPct ?? 0} points`);
  }

  return prediction(variant, diff > 0 ? "fighterA" : "fighterB", recordA, recordB, "higher pre-fight win percentage");
}

function prediction(
  variant: RecordBaselineVariant,
  pick: RecordBaselinePick,
  recordA: PreFightRecord,
  recordB: PreFightRecord,
  reason: string,
): RecordBaselinePrediction {
  return {
    ...variant,
    pick,
    probabilityA: probabilityForPick(pick),
    reason,
    recordA,
    recordB,
  };
}

export function recordBaselinePrediction(
  features: AsOfFightFeatures,
  id: string,
): RecordBaselinePrediction {
  const variant = RECORD_BASELINE_VARIANTS.find((candidate) => candidate.id === id);
  if (!variant) throw new Error(`Unknown record baseline variant: ${id}`);

  const recordA = recordFromHistory(features.fighterA.filteredHistory);
  const recordB = recordFromHistory(features.fighterB.filteredHistory);

  if (id === "asof-absolute-wl") {
    const delta = recordA.netWins - recordB.netWins;
    if (delta === 0) return prediction(variant, "no-pick", recordA, recordB, "equal pre-fight net W-L record");
    return prediction(variant, delta > 0 ? "fighterA" : "fighterB", recordA, recordB, "better absolute pre-fight W-L record");
  }

  if (id === "asof-win-pct-min3") {
    return pickFromWinPct(variant, recordA, recordB, { minFightsPerFighter: 3 });
  }

  if (id === OFFICIAL_RECORD_BASELINE_ID) {
    return pickFromWinPct(variant, recordA, recordB, { noHistoryAsZero: true });
  }

  if (id === "asof-win-pct-no-small-edge") {
    return pickFromWinPct(variant, recordA, recordB, { minFightsPerFighter: 1, minDiffPct: 5 });
  }

  throw new Error(`Unhandled record baseline variant: ${id}`);
}

export function recordBaselinePredictions(
  features: AsOfFightFeatures,
): Record<string, RecordBaselinePrediction> {
  return Object.fromEntries(
    RECORD_BASELINE_VARIANTS.map((variant) => [variant.id, recordBaselinePrediction(features, variant.id)]),
  );
}

export function scoreRecordBaseline(
  id: string,
  rows: Array<{
    outcomeWinner: "fighterA" | "fighterB";
    modelCorrect: boolean;
    baseline: RecordBaselinePrediction;
  }>,
): RecordBaselineScore {
  const variant = RECORD_BASELINE_VARIANTS.find((candidate) => candidate.id === id);
  if (!variant) throw new Error(`Unknown record baseline variant: ${id}`);

  const picked = rows.filter((row) => row.baseline.pick !== "no-pick");
  const correctPicked = picked.filter((row) => row.baseline.pick === row.outcomeWinner).length;
  const modelCorrectOnPicked = picked.filter((row) => row.modelCorrect).length;
  const briers = rows.map((row) => {
    const actual = row.outcomeWinner === "fighterA" ? 1 : 0;
    return (row.baseline.probabilityA - actual) ** 2;
  });

  const pickAccuracy = pct(correctPicked, picked.length);
  const modelAccuracyOnPicked = pct(modelCorrectOnPicked, picked.length);

  return {
    ...variant,
    picked: picked.length,
    noPick: rows.length - picked.length,
    coverage: pct(picked.length, rows.length),
    correctPicked,
    pickAccuracy,
    allFightAccuracy: pct(correctPicked, rows.length),
    brierScore: avg(briers) == null ? null : Number((avg(briers) ?? 0).toFixed(3)),
    modelCorrectOnPicked,
    modelAccuracyOnPicked,
    modelVsBaselineDeltaOnPicked: modelAccuracyOnPicked == null || pickAccuracy == null
      ? null
      : modelAccuracyOnPicked - pickAccuracy,
  };
}
