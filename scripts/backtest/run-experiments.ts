#!/usr/bin/env node
/**
 * Controlled Fight Lens baseline validation + experiment harness.
 *
 * Backend-only. Reads the existing leakage-safe backtest output and normalized
 * event data, validates as-of record baselines, then evaluates experiment-only
 * probability transforms. Nothing here is imported by public UI or the live
 * outcome model.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAsOfFeaturesFromSourcedFight } from "@/lib/backtest/buildAsOfFeatures";
import type { SourcedEvent, SourcedFight, SourcedFightHistoryItem } from "@/lib/sourced-event";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CALL_THRESHOLD = 0.52;

type Side = "fighterA" | "fighterB";
type BaselinePick = Side | "no-pick";
type RecordBucket = "same/similar record" | "small record advantage" | "medium record advantage" | "large record advantage";

interface BacktestPredictionRow {
  fightId: string;
  event: string;
  asOfDate: string;
  fighters: { fighterA: string; fighterB: string };
  prediction: {
    fighterAWinProbability: number;
    fighterBWinProbability: number;
    methodBreakdown: { decision: number; koTko: number; submission: number };
    confidence: "high" | "medium" | "low" | "insufficient";
  };
  outcome: { winner: Side | "draw" | "nc"; method: string } | null;
  score: { correct: boolean | null; brierContribution: number | null; methodCorrect: boolean | null };
  missingDataFlags: string[];
}

interface BacktestPredictionsFile {
  modelVersion: string;
  totalFights: number;
  predictions: BacktestPredictionRow[];
}

interface SummaryFile {
  summary: {
    scoredFights: number;
    winnerAccuracy: number | null;
    methodAccuracy: number | null;
    brierScore: number | null;
    baselines: {
      betterRecord: {
        accuracy: number | null;
        pickAccuracy?: number | null;
        coverage?: number | null;
        brierScore?: number | null;
        scoredFights: number;
        correct: number;
      };
      legacyProfileRecord?: { accuracy: number | null; scoredFights: number; correct: number };
      moreExperience: { accuracy: number | null; scoredFights: number; correct: number };
    };
  };
}

interface PreFightRecord {
  wins: number;
  losses: number;
  draws: number;
  noContests: number;
  totalDirectional: number;
  winPct: number | null;
  netWins: number;
}

interface ExperimentRow {
  fightId: string;
  event: string;
  asOfDate: string;
  fighterA: string;
  fighterB: string;
  outcomeWinner: Side;
  v02ProbabilityA: number;
  v02Pick: Side;
  v02PublicCall: Side | "noLean";
  v02Correct: boolean;
  methodCorrect: boolean | null;
  missingDataFlags: string[];
  hasMissingData: boolean;
  thinHistory: boolean;
  currentRecordA: PreFightRecord;
  currentRecordB: PreFightRecord;
  preFightRecordA: PreFightRecord;
  preFightRecordB: PreFightRecord;
  preFightWinPctDelta: number;
  preFightRecordBucket: RecordBucket;
}

interface BaselinePrediction {
  pick: BaselinePick;
  probabilityA: number;
}

interface BaselineResult {
  id: string;
  label: string;
  leakageSafe: boolean;
  rule: string;
  nTotal: number;
  nPicked: number;
  nNoPick: number;
  coverage: number | null;
  accuracyOnPicked: number | null;
  accuracyAllNoPicksAsMisses: number | null;
  brierAll: number | null;
  brierPicked: number | null;
  agreementWithV02: number | null;
  disagreementN: number;
  baselineAccuracyWhenDisagreeingWithV02: number | null;
  v02AccuracyWhenDisagreeingWithBaseline: number | null;
  v02AccuracyOnPickedSubset: number | null;
  modelVsBaselineDeltaOnPickedSubset: number | null;
}

interface SegmentResult {
  n: number;
  accuracy: number | null;
  brier: number | null;
}

interface ExperimentResult {
  id: string;
  label: string;
  description: string;
  winnerAccuracy: number | null;
  namedCallAccuracy: number | null;
  brierScore: number | null;
  methodAccuracy: number | null;
  betterRecordComparison: {
    baselineId: string;
    baselineAccuracyAllNoPicksAsMisses: number | null;
    deltaVsBaseline: number | null;
  };
  calibrationBuckets: Array<{
    bucket: string;
    n: number;
    averagePredictedProbability: number | null;
    actualWinRate: number | null;
    brier: number | null;
  }>;
  agreementVsBetterRecord: {
    agree: SegmentResult;
    disagree: SegmentResult;
    noPickBaseline: SegmentResult;
  };
  recordBuckets: Record<RecordBucket, SegmentResult>;
  noLeanCount: number;
  noLeanRate: number | null;
  callsChangedVsV02: number;
  callsChangedRate: number | null;
  winnerSideChangedVsV02: number;
  overfittingFlags: string[];
}

interface EloSummaryFile {
  ledger: {
    totalScoredFights: number;
    sortOrder: string[];
    limitation: string;
  };
  comparison: {
    modelV02: { accuracy: number | null; brierScore: number | null; scoredFights: number };
    officialAsOfRecord: { pickAccuracy: number | null; allFightAccuracy: number | null; coverage: number | null; brierScore: number | null };
    eloK32: { pickAccuracy: number | null; allFightAccuracy: number | null; coverage: number | null; brierScore: number | null };
  };
  kSensitivity: Array<{
    kFactor: number;
    totalFights: number;
    picked: number;
    noPick: number;
    coverage: number | null;
    pickAccuracy: number | null;
    allFightAccuracy: number | null;
    brierScore: number | null;
    agreement: {
      modelAndEloAgree: number;
      modelAndEloDisagree: number;
      eloCorrectModelWrong: number;
      modelCorrectEloWrong: number;
      bothCorrect: number;
      bothWrong: number;
      eloNoPick: number;
    };
  }>;
  agreementDisagreement: {
    modelAndEloAgree: number;
    modelAndEloDisagree: number;
    eloCorrectModelWrong: number;
    modelCorrectEloWrong: number;
    bothCorrect: number;
    bothWrong: number;
    eloNoPick: number;
  };
  recommendation: { choice: string; label: string; rationale: string[] };
}

interface ExperimentReport {
  generatedAt: string;
  scope: string;
  filesInspected: string[];
  baselineAudit: {
    legacyProfileRecordBaseline: {
      implementation: string;
      sourceFields: string[];
      leakageSafe: false;
      finding: string;
    };
    validatedPrimaryAsOfBaselineId: string;
    fixedProbabilityForBaselineBrier: string;
    variants: BaselineResult[];
  };
  corpus: {
    scoredFights: number;
    v02WinnerAccuracy: number | null;
    v02MethodAccuracy: number | null;
    v02Brier: number | null;
    officialRecordBaseline: {
      allFightAccuracy: number | null;
      pickAccuracy: number | null;
      coverage: number | null;
      brierScore: number | null;
    };
    legacyProfileRecordAccuracy: number | null;
  };
  eloBaseline?: EloSummaryFile | null;
  experiments: ExperimentResult[];
  recommendation: {
    choice: "A" | "B" | "C" | "D" | "E";
    label: string;
    rationale: string[];
  };
  guardrails: string[];
}

function repoPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readOptionalJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return readJson<T>(filePath);
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

function writeTextAtomic(filePath: string, data: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

function round(value: number, places = 0): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function avgRounded(values: number[], places = 3): number | null {
  const value = avg(values);
  return value == null ? null : round(value, places);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, "jan.": 0, january: 0,
  feb: 1, "feb.": 1, february: 1,
  mar: 2, "mar.": 2, march: 2,
  apr: 3, "apr.": 3, april: 3,
  may: 4,
  jun: 5, "jun.": 5, june: 5,
  jul: 6, "jul.": 6, july: 6,
  aug: 7, "aug.": 7, august: 7,
  sep: 8, "sep.": 8, september: 8,
  oct: 9, "oct.": 9, october: 9,
  nov: 10, "nov.": 10, november: 10,
  dec: 11, "dec.": 11, december: 11,
};

function parseEventDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(",", "").replace(/\s+/g, " ").trim();
  const [monthText, dayText, yearText] = cleaned.split(" ");
  const month = MONTH_MAP[monthText?.toLowerCase()];
  const day = Number(dayText);
  const year = Number(yearText);
  if (month == null || !day || !year) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function loadAllEvents(): SourcedEvent[] {
  const eventsDir = repoPath("data/normalized/events");
  const files = fs.readdirSync(eventsDir).filter((file) => file.endsWith(".json"));
  const seenNames = new Set<string>();
  const events: SourcedEvent[] = [];

  for (const file of files) {
    const event = readJson<SourcedEvent>(path.join(eventsDir, file));
    const nameKey = event.event.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    events.push(event);
  }

  return events;
}

function recordFromHistory(history: SourcedFightHistoryItem[]): PreFightRecord {
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

function recordFromString(record: string | null | undefined): PreFightRecord {
  const match = String(record ?? "").match(/^(\d+)-(\d+)(?:-(\d+))?/);
  const wins = match ? Number(match[1]) : 0;
  const losses = match ? Number(match[2]) : 0;
  const draws = match?.[3] ? Number(match[3]) : 0;
  const totalDirectional = wins + losses;
  return {
    wins,
    losses,
    draws,
    noContests: 0,
    totalDirectional,
    winPct: totalDirectional > 0 ? wins / totalDirectional : null,
    netWins: wins - losses,
  };
}

function winPctOrZero(record: PreFightRecord): number {
  return record.winPct ?? 0;
}

function probabilityForPick(pick: BaselinePick): number {
  if (pick === "fighterA") return 0.6;
  if (pick === "fighterB") return 0.4;
  return 0.5;
}

function pickFromWinPct(
  recordA: PreFightRecord,
  recordB: PreFightRecord,
  options: { minFightsPerFighter?: number; minDiffPct?: number; noHistoryAsZero?: boolean } = {},
): BaselinePrediction {
  const min = options.minFightsPerFighter ?? 0;
  if (recordA.totalDirectional < min || recordB.totalDirectional < min) {
    return { pick: "no-pick", probabilityA: 0.5 };
  }

  const pctA = options.noHistoryAsZero ? winPctOrZero(recordA) : recordA.winPct;
  const pctB = options.noHistoryAsZero ? winPctOrZero(recordB) : recordB.winPct;
  if (pctA == null || pctB == null) return { pick: "no-pick", probabilityA: 0.5 };

  const diff = pctA - pctB;
  const minDiff = (options.minDiffPct ?? 0) / 100;
  if (Math.abs(diff) <= minDiff) return { pick: "no-pick", probabilityA: 0.5 };

  const pick = diff > 0 ? "fighterA" : "fighterB";
  return { pick, probabilityA: probabilityForPick(pick) };
}

function topPick(probabilityA: number): Side {
  return probabilityA >= 0.5 ? "fighterA" : "fighterB";
}

function publicCall(probabilityA: number): Side | "noLean" {
  const maxProb = Math.max(probabilityA, 1 - probabilityA);
  if (maxProb < CALL_THRESHOLD) return "noLean";
  return topPick(probabilityA);
}

function brier(probabilityA: number, winner: Side): number {
  const actual = winner === "fighterA" ? 1 : 0;
  return (probabilityA - actual) ** 2;
}

function recordBucket(absWinPctDelta: number): RecordBucket {
  const pctDelta = absWinPctDelta * 100;
  if (pctDelta < 3) return "same/similar record";
  if (pctDelta < 8) return "small record advantage";
  if (pctDelta < 15) return "medium record advantage";
  return "large record advantage";
}

function thinHistory(
  row: BacktestPredictionRow,
  asOfCounts: { fighterA: number; fighterB: number },
): boolean {
  if (row.missingDataFlags.some((flag) => flag.includes("no prior fight history"))) return true;
  return Math.min(asOfCounts.fighterA, asOfCounts.fighterB) < 2;
}

function buildRows(): { rows: ExperimentRow[]; summary: SummaryFile } {
  const predictionsFile = readJson<BacktestPredictionsFile>(repoPath("data/generated/backtests/predictions.json"));
  const summary = readJson<SummaryFile>(repoPath("data/generated/backtests/summary.json"));
  const events = loadAllEvents();
  const fightLookup = new Map<string, { event: SourcedEvent; fight: SourcedFight }>();

  for (const event of events) {
    for (const fight of event.fights) fightLookup.set(fight.id, { event, fight });
  }

  const rows = predictionsFile.predictions.flatMap<ExperimentRow>((row) => {
    if (!row.outcome || row.outcome.winner === "draw" || row.outcome.winner === "nc") return [];
    const matched = fightLookup.get(row.fightId);
    if (!matched) return [];
    const { event, fight } = matched;
    const asOfDate = row.asOfDate || parseEventDate(event.event.date);
    if (!asOfDate) return [];

    const features = buildAsOfFeaturesFromSourcedFight(fight, event.event.name, asOfDate);
    const preFightRecordA = recordFromHistory(features.fighterA.filteredHistory);
    const preFightRecordB = recordFromHistory(features.fighterB.filteredHistory);
    const currentRecordA = recordFromString(fight.fighters.fighterA.record);
    const currentRecordB = recordFromString(fight.fighters.fighterB.record);
    const v02ProbabilityA = row.prediction.fighterAWinProbability / 100;
    const delta = Math.abs(winPctOrZero(preFightRecordA) - winPctOrZero(preFightRecordB));

    return [{
      fightId: row.fightId,
      event: row.event,
      asOfDate,
      fighterA: row.fighters.fighterA,
      fighterB: row.fighters.fighterB,
      outcomeWinner: row.outcome.winner,
      v02ProbabilityA,
      v02Pick: topPick(v02ProbabilityA),
      v02PublicCall: publicCall(v02ProbabilityA),
      v02Correct: row.score.correct === true,
      methodCorrect: row.score.methodCorrect,
      missingDataFlags: row.missingDataFlags,
      hasMissingData: row.missingDataFlags.length > 0,
      thinHistory: thinHistory(row, {
        fighterA: features.fighterA.fightHistoryCount,
        fighterB: features.fighterB.fightHistoryCount,
      }),
      currentRecordA,
      currentRecordB,
      preFightRecordA,
      preFightRecordB,
      preFightWinPctDelta: delta,
      preFightRecordBucket: recordBucket(delta),
    }];
  });

  return { rows, summary };
}

const BASELINE_VARIANTS = [
  {
    id: "legacy-normalized-win-pct",
    label: "Legacy normalized record-string baseline",
    leakageSafe: false,
    rule: "Compare SourcedFighter.record W-L win percentage from normalized fighter profiles.",
  },
  {
    id: "asof-absolute-wl",
    label: "As-of absolute W-L record",
    leakageSafe: true,
    rule: "Use filtered pre-fight history; pick higher wins-minus-losses; no-pick on equal net W-L.",
  },
  {
    id: "asof-win-pct-min3",
    label: "As-of win percentage, min 3 fights each",
    leakageSafe: true,
    rule: "Use filtered pre-fight history; require at least 3 directional fights for each fighter.",
  },
  {
    id: "asof-ufc-win-pct-any-history",
    label: "As-of UFC win percentage, any history",
    leakageSafe: true,
    rule: "Use filtered UFCStats history; compare W-L win percentage, treating no prior directional history as 0% to mirror the legacy fallback.",
  },
  {
    id: "asof-win-pct-no-small-edge",
    label: "As-of win percentage, no small edge",
    leakageSafe: true,
    rule: "Use filtered pre-fight history; require at least 1 directional fight each and a win-rate gap above 5 points.",
  },
] as const;

function baselinePrediction(row: ExperimentRow, id: string): BaselinePrediction {
  if (id === "legacy-normalized-win-pct") return pickFromWinPct(row.currentRecordA, row.currentRecordB, { noHistoryAsZero: true });
  if (id === "asof-absolute-wl") {
    const delta = row.preFightRecordA.netWins - row.preFightRecordB.netWins;
    if (delta === 0) return { pick: "no-pick", probabilityA: 0.5 };
    const pick = delta > 0 ? "fighterA" : "fighterB";
    return { pick, probabilityA: probabilityForPick(pick) };
  }
  if (id === "asof-win-pct-min3") return pickFromWinPct(row.preFightRecordA, row.preFightRecordB, { minFightsPerFighter: 3 });
  if (id === "asof-ufc-win-pct-any-history") return pickFromWinPct(row.preFightRecordA, row.preFightRecordB, { noHistoryAsZero: true });
  if (id === "asof-win-pct-no-small-edge") return pickFromWinPct(row.preFightRecordA, row.preFightRecordB, { minFightsPerFighter: 1, minDiffPct: 5 });
  throw new Error(`Unknown baseline variant: ${id}`);
}

function evaluateBaseline(rows: ExperimentRow[], id: string): BaselineResult {
  const meta = BASELINE_VARIANTS.find((variant) => variant.id === id);
  if (!meta) throw new Error(`Missing baseline metadata for ${id}`);

  const predictions = rows.map((row) => ({ row, baseline: baselinePrediction(row, id) }));
  const picked = predictions.filter(({ baseline }) => baseline.pick !== "no-pick");
  const correctPicked = picked.filter(({ row, baseline }) => baseline.pick === row.outcomeWinner).length;
  const disagreement = picked.filter(({ row, baseline }) => baseline.pick !== row.v02Pick);
  const agreement = picked.filter(({ row, baseline }) => baseline.pick === row.v02Pick);
  const v02CorrectPicked = picked.filter(({ row }) => row.v02Correct).length;
  const baselineDelta = picked.length > 0
    ? (pct(v02CorrectPicked, picked.length) ?? 0) - (pct(correctPicked, picked.length) ?? 0)
    : null;

  return {
    id,
    label: meta.label,
    leakageSafe: meta.leakageSafe,
    rule: meta.rule,
    nTotal: rows.length,
    nPicked: picked.length,
    nNoPick: rows.length - picked.length,
    coverage: pct(picked.length, rows.length),
    accuracyOnPicked: pct(correctPicked, picked.length),
    accuracyAllNoPicksAsMisses: pct(correctPicked, rows.length),
    brierAll: avgRounded(predictions.map(({ row, baseline }) => brier(baseline.probabilityA, row.outcomeWinner)), 3),
    brierPicked: avgRounded(picked.map(({ row, baseline }) => brier(baseline.probabilityA, row.outcomeWinner)), 3),
    agreementWithV02: pct(agreement.length, picked.length),
    disagreementN: disagreement.length,
    baselineAccuracyWhenDisagreeingWithV02: pct(disagreement.filter(({ row, baseline }) => baseline.pick === row.outcomeWinner).length, disagreement.length),
    v02AccuracyWhenDisagreeingWithBaseline: pct(disagreement.filter(({ row }) => row.v02Correct).length, disagreement.length),
    v02AccuracyOnPickedSubset: pct(v02CorrectPicked, picked.length),
    modelVsBaselineDeltaOnPickedSubset: baselineDelta,
  };
}

function recordPriorProbabilityA(row: ExperimentRow): number {
  const baseline = baselinePrediction(row, "asof-ufc-win-pct-any-history");
  if (baseline.pick === "no-pick") return 0.5;
  const diff = winPctOrZero(row.preFightRecordA) - winPctOrZero(row.preFightRecordB);
  const strength = clamp(Math.abs(diff) * 0.35, 0.06, 0.18);
  return baseline.pick === "fighterA" ? 0.5 + strength : 0.5 - strength;
}

function shrinkTowardFifty(probabilityA: number, amount: number): number {
  return 0.5 + (probabilityA - 0.5) * (1 - amount);
}

const EXPERIMENTS = [
  { id: "v02-current", label: "Current v0.2", description: "Production outcome-v0.2 probabilities from the existing backtest output." },
  { id: "exp-a-record-ratio-feature", label: "Experiment A - record-ratio feature", description: "Experiment-only shift toward the as-of record prior." },
  { id: "exp-b-disagreement-penalty", label: "Experiment B - better-record disagreement penalty", description: "If v0.2 disagrees with as-of better-record below 70% support, shrink toward 50." },
  { id: "exp-c-mid-confidence-shrinkage", label: "Experiment C - mid-confidence shrinkage", description: "Shrink 60-80% outputs toward 50 while leaving 80%+ untouched." },
  { id: "exp-d-thin-support-contrarian-guardrail", label: "Experiment D - thin-support contrarian guardrail", description: "If v0.2 disagrees with as-of better-record and support is thin/missing, shrink toward 50." },
  { id: "exp-e-record-blend-10", label: "Experiment E - 10% record-prior blend", description: "Blend v0.2 probability with the as-of record prior at 10%." },
  { id: "exp-e-record-blend-20", label: "Experiment E - 20% record-prior blend", description: "Blend v0.2 probability with the as-of record prior at 20%." },
  { id: "exp-e-record-blend-30", label: "Experiment E - 30% record-prior blend", description: "Blend v0.2 probability with the as-of record prior at 30%." },
] as const;

function transformProbability(row: ExperimentRow, id: string): number {
  const base = row.v02ProbabilityA;
  const baseline = baselinePrediction(row, "asof-ufc-win-pct-any-history");
  const modelDisagrees = baseline.pick !== "no-pick" && baseline.pick !== row.v02Pick;
  const maxProb = Math.max(base, 1 - base);

  if (id === "v02-current") return base;
  if (id === "exp-a-record-ratio-feature") return clamp(base + (recordPriorProbabilityA(row) - 0.5) * 0.35, 0.05, 0.95);
  if (id === "exp-b-disagreement-penalty") return modelDisagrees && maxProb < 0.7 ? shrinkTowardFifty(base, 0.4) : base;
  if (id === "exp-c-mid-confidence-shrinkage") return maxProb >= 0.6 && maxProb < 0.8 ? shrinkTowardFifty(base, 0.25) : base;
  if (id === "exp-d-thin-support-contrarian-guardrail") return modelDisagrees && (row.thinHistory || row.hasMissingData) ? shrinkTowardFifty(base, 0.6) : base;

  const blend = id.match(/^exp-e-record-blend-(10|20|30)$/);
  if (blend) {
    const weight = Number(blend[1]) / 100;
    return clamp(base * (1 - weight) + recordPriorProbabilityA(row) * weight, 0.05, 0.95);
  }

  throw new Error(`Unknown experiment: ${id}`);
}

function segmentResult(rows: Array<{ row: ExperimentRow; probabilityA: number }>): SegmentResult {
  return {
    n: rows.length,
    accuracy: pct(rows.filter(({ row, probabilityA }) => topPick(probabilityA) === row.outcomeWinner).length, rows.length),
    brier: avgRounded(rows.map(({ row, probabilityA }) => brier(probabilityA, row.outcomeWinner)), 3),
  };
}

function calibrationFor(rows: Array<{ row: ExperimentRow; probabilityA: number }>) {
  return [
    { bucket: "50-60%", min: 0.5, max: 0.6 },
    { bucket: "60-70%", min: 0.6, max: 0.7 },
    { bucket: "70-80%", min: 0.7, max: 0.8 },
    { bucket: "80%+", min: 0.8, max: 1.01 },
  ].map(({ bucket, min, max }) => {
    const bucketRows = rows.filter(({ probabilityA }) => {
      const confidence = Math.max(probabilityA, 1 - probabilityA);
      return confidence >= min && confidence < max;
    });
    return {
      bucket,
      n: bucketRows.length,
      averagePredictedProbability: avgRounded(bucketRows.map(({ probabilityA }) => Math.max(probabilityA, 1 - probabilityA) * 100), 1),
      actualWinRate: pct(bucketRows.filter(({ row, probabilityA }) => topPick(probabilityA) === row.outcomeWinner).length, bucketRows.length),
      brier: avgRounded(bucketRows.map(({ row, probabilityA }) => brier(probabilityA, row.outcomeWinner)), 3),
    };
  });
}

function overfittingFlags(result: Omit<ExperimentResult, "overfittingFlags">, v02: ExperimentResult | null): string[] {
  const flags: string[] = [];
  if (!v02 || result.id === "v02-current") return flags;
  if (result.winnerAccuracy != null && v02.winnerAccuracy != null && result.winnerAccuracy > v02.winnerAccuracy && result.brierScore != null && v02.brierScore != null && result.brierScore > v02.brierScore) {
    flags.push("Accuracy improves while Brier gets worse.");
  }
  if (result.recordBuckets["same/similar record"].accuracy != null && v02.recordBuckets["same/similar record"].accuracy != null && result.recordBuckets["same/similar record"].accuracy < v02.recordBuckets["same/similar record"].accuracy) {
    flags.push("Hurts same/similar-record bucket where v0.2 had relative strength.");
  }
  if (result.noLeanCount > v02.noLeanCount + 20) flags.push("Increases noLean count aggressively.");
  if (result.callsChangedRate != null && result.callsChangedRate >= 25) flags.push("Changes at least a quarter of public-call states.");
  if (result.agreementVsBetterRecord.disagree.n < v02.agreementVsBetterRecord.disagree.n * 0.75) flags.push("May be copying the as-of record baseline too much by suppressing disagreement cases.");
  return flags;
}

function evaluateExperiment(rows: ExperimentRow[], id: string, methodAccuracy: number | null, primaryBaseline: BaselineResult, v02: ExperimentResult | null): ExperimentResult {
  const meta = EXPERIMENTS.find((experiment) => experiment.id === id);
  if (!meta) throw new Error(`Missing experiment metadata for ${id}`);

  const predictions = rows.map((row) => ({ row, probabilityA: transformProbability(row, id) }));
  const namedCalls = predictions.filter(({ probabilityA }) => publicCall(probabilityA) !== "noLean");
  const noLeanCount = predictions.length - namedCalls.length;
  const baselinePredictions = predictions.map((prediction) => ({ ...prediction, baseline: baselinePrediction(prediction.row, "asof-ufc-win-pct-any-history") }));
  const agree = baselinePredictions.filter(({ baseline, probabilityA }) => baseline.pick !== "no-pick" && baseline.pick === topPick(probabilityA));
  const disagree = baselinePredictions.filter(({ baseline, probabilityA }) => baseline.pick !== "no-pick" && baseline.pick !== topPick(probabilityA));
  const noPickBaseline = baselinePredictions.filter(({ baseline }) => baseline.pick === "no-pick");
  const winnerAccuracy = pct(predictions.filter(({ row, probabilityA }) => topPick(probabilityA) === row.outcomeWinner).length, predictions.length);
  const recordBuckets = Object.fromEntries(([
    "same/similar record",
    "small record advantage",
    "medium record advantage",
    "large record advantage",
  ] as const).map((bucket) => [bucket, segmentResult(predictions.filter(({ row }) => row.preFightRecordBucket === bucket))])) as Record<RecordBucket, SegmentResult>;
  const callsChanged = predictions.filter(({ row, probabilityA }) => publicCall(probabilityA) !== row.v02PublicCall).length;

  const baseResult = {
    id,
    label: meta.label,
    description: meta.description,
    winnerAccuracy,
    namedCallAccuracy: pct(namedCalls.filter(({ row, probabilityA }) => topPick(probabilityA) === row.outcomeWinner).length, namedCalls.length),
    brierScore: avgRounded(predictions.map(({ row, probabilityA }) => brier(probabilityA, row.outcomeWinner)), 3),
    methodAccuracy,
    betterRecordComparison: {
      baselineId: primaryBaseline.id,
      baselineAccuracyAllNoPicksAsMisses: primaryBaseline.accuracyAllNoPicksAsMisses,
      deltaVsBaseline: primaryBaseline.accuracyAllNoPicksAsMisses == null || winnerAccuracy == null ? null : winnerAccuracy - primaryBaseline.accuracyAllNoPicksAsMisses,
    },
    calibrationBuckets: calibrationFor(predictions),
    agreementVsBetterRecord: {
      agree: segmentResult(agree),
      disagree: segmentResult(disagree),
      noPickBaseline: segmentResult(noPickBaseline),
    },
    recordBuckets,
    noLeanCount,
    noLeanRate: pct(noLeanCount, predictions.length),
    callsChangedVsV02: callsChanged,
    callsChangedRate: pct(callsChanged, predictions.length),
    winnerSideChangedVsV02: predictions.filter(({ row, probabilityA }) => topPick(probabilityA) !== row.v02Pick).length,
  };

  return { ...baseResult, overfittingFlags: overfittingFlags(baseResult, v02) };
}

function table(headers: string[], rows: Array<Array<string | number | null>>): string {
  const safe = (value: string | number | null) => value == null ? "n/a" : String(value);
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

function pctText(value: number | null): string {
  return value == null ? "n/a" : `${value}%`;
}

function brierText(value: number | null): string {
  return value == null ? "n/a" : value.toFixed(3);
}

function renderMarkdown(report: ExperimentReport): string {
  const baselineRows = report.baselineAudit.variants.map((variant) => [
    variant.label,
    variant.leakageSafe ? "yes" : "no",
    variant.nPicked,
    variant.nNoPick,
    pctText(variant.coverage),
    pctText(variant.accuracyOnPicked),
    pctText(variant.accuracyAllNoPicksAsMisses),
    brierText(variant.brierAll),
    pctText(variant.modelVsBaselineDeltaOnPickedSubset),
  ]);
  const eloSection = report.eloBaseline ? renderEloSection(report.eloBaseline) : "";
  const experimentRows = report.experiments.map((experiment) => [
    experiment.label,
    pctText(experiment.winnerAccuracy),
    pctText(experiment.namedCallAccuracy),
    brierText(experiment.brierScore),
    experiment.noLeanCount,
    pctText(experiment.callsChangedRate),
    pctText(experiment.agreementVsBetterRecord.disagree.accuracy),
    pctText(experiment.recordBuckets["same/similar record"].accuracy),
    pctText(experiment.recordBuckets["large record advantage"].accuracy),
  ]);
  const calibrationRows = report.experiments.map((experiment) => [
    experiment.label,
    ...experiment.calibrationBuckets.map((bucket) => `${bucket.n} / ${pctText(bucket.actualWinRate)} / ${brierText(bucket.brier)}`),
  ]);
  const flags = report.experiments
    .filter((experiment) => experiment.overfittingFlags.length > 0)
    .flatMap((experiment) => experiment.overfittingFlags.map((flag) => `- ${experiment.label}: ${flag}`));

  return `# Fight Lens - Baseline Validation and Model Experiments

Generated: ${report.generatedAt}

## Scope

Backend/model-validation only. This pass did not change public UI, production model outputs, locked predictions, ingestion, public copy, or public Model Record behavior.

## Record baseline audit

- Legacy implementation: ${report.baselineAudit.legacyProfileRecordBaseline.implementation}
- Source fields: ${report.baselineAudit.legacyProfileRecordBaseline.sourceFields.join("; ")}
- Legacy profile-record leakage-safe: no
- Finding: ${report.baselineAudit.legacyProfileRecordBaseline.finding}

Primary leakage-safe comparator for experiments: \`${report.baselineAudit.validatedPrimaryAsOfBaselineId}\`.

Baseline Brier convention: ${report.baselineAudit.fixedProbabilityForBaselineBrier}

${table(["Baseline", "Leakage-safe", "Picked", "No-pick", "Coverage", "Pick acc", "All-fight acc", "Brier", "v0.2 delta on picked"], baselineRows)}

${eloSection}## Experiment results

All experiments use the same ${report.corpus.scoredFights}-fight corpus and leave method predictions unchanged.

${table(["Experiment", "Winner acc", "Named-call acc", "Brier", "NoLean", "Calls changed", "Disagree acc", "Same-record acc", "Large-record acc"], experimentRows)}

## Calibration snapshot

Cells are \`n / actual win rate / Brier\`.

${table(["Experiment", "50-60", "60-70", "70-80", "80+"], calibrationRows)}

## Risks and overfitting flags

${flags.length ? flags.join("\n") : "- No automated overfitting flags fired, but this remains one 253-fight sample."}

## Recommendation

${report.recommendation.choice}. ${report.recommendation.label}

${report.recommendation.rationale.map((item) => `- ${item}`).join("\n")}

## Guardrails

${report.guardrails.map((item) => `- ${item}`).join("\n")}
`;
}

function renderEloSection(elo: EloSummaryFile): string {
  const kRows = elo.kSensitivity.map((variant) => [
    variant.kFactor,
    variant.picked,
    variant.noPick,
    pctText(variant.coverage),
    pctText(variant.pickAccuracy),
    pctText(variant.allFightAccuracy),
    brierText(variant.brierScore),
  ]);
  const a = elo.agreementDisagreement;

  return `## Chronological Elo Baseline

Simple global Elo is leakage-safe here: every fighter starts at 1500, ratings are read before each fight, then updated only after the result.

Ledger: ${elo.ledger.totalScoredFights} scored fights sorted by ${elo.ledger.sortOrder.join(" -> ")}. Limitation: ${elo.ledger.limitation}

${table(["K", "Picked", "No-pick", "Coverage", "Pick acc", "All-fight acc", "Brier"], kRows)}

Default K=32 comparison: v0.2 ${pctText(elo.comparison.modelV02.accuracy)} accuracy / Brier ${brierText(elo.comparison.modelV02.brierScore)}; official as-of record ${pctText(elo.comparison.officialAsOfRecord.pickAccuracy)} picked / ${pctText(elo.comparison.officialAsOfRecord.allFightAccuracy)} all-fight / Brier ${brierText(elo.comparison.officialAsOfRecord.brierScore)}; Elo ${pctText(elo.comparison.eloK32.pickAccuracy)} picked / ${pctText(elo.comparison.eloK32.allFightAccuracy)} all-fight / Brier ${brierText(elo.comparison.eloK32.brierScore)}.

Agreement at K=32: model and Elo agree on ${a.modelAndEloAgree} picked fights, disagree on ${a.modelAndEloDisagree}; Elo correct/model wrong ${a.eloCorrectModelWrong}; model correct/Elo wrong ${a.modelCorrectEloWrong}; both correct ${a.bothCorrect}; both wrong ${a.bothWrong}; Elo no-pick ${a.eloNoPick}.

Recommendation: ${elo.recommendation.choice}. ${elo.recommendation.label}. ${elo.recommendation.rationale.join(" ")}

`;
}

async function main() {
  const { rows, summary } = buildRows();
  const baselineResults = BASELINE_VARIANTS.map((variant) => evaluateBaseline(rows, variant.id));
  const primaryBaseline = baselineResults.find((baseline) => baseline.id === "asof-ufc-win-pct-any-history");
  if (!primaryBaseline) throw new Error("Primary baseline missing.");

  const experimentResults: ExperimentResult[] = [];
  for (const experiment of EXPERIMENTS) {
    const v02 = experimentResults.find((result) => result.id === "v02-current") ?? null;
    experimentResults.push(evaluateExperiment(rows, experiment.id, summary.summary.methodAccuracy, primaryBaseline, v02));
  }

  const v02 = experimentResults.find((experiment) => experiment.id === "v02-current");
  const bestBrier = experimentResults.reduce((best, experiment) => {
    if (experiment.id === "v02-current" || experiment.brierScore == null) return best;
    if (!best || (best.brierScore != null && experiment.brierScore < best.brierScore)) return experiment;
    return best;
  }, null as ExperimentResult | null);

  const eloBaseline = readOptionalJson<EloSummaryFile>(repoPath("data/generated/backtests/elo-summary.json"));

  const report: ExperimentReport = {
    generatedAt: new Date().toISOString(),
    scope: "Backend-only baseline validation and experiment harness. No production prediction changes.",
    filesInspected: [
      "AGENTS.md",
      "docs/CHANGELOG.md",
      "docs/MODEL_STATUS.md",
      "docs/NEXT_STEPS.md",
      "docs/BACKTESTING.md",
      "docs/MODEL_REVIEW.md",
      "scripts/backtest/run.ts",
      "scripts/backtest/elo-baseline.ts",
      "lib/backtest/buildAsOfFeatures.ts",
      "lib/backtest/runBacktest.ts",
      "lib/backtest/scorePredictions.ts",
      "scripts/ingest/ufcstats.mjs",
      "scripts/ingest/build-normalized-event.mjs",
      "data/generated/backtests/predictions.json",
      "data/generated/backtests/summary.json",
      "data/generated/backtests/elo-summary.json",
    ],
    baselineAudit: {
      legacyProfileRecordBaseline: {
        implementation: "scripts/backtest/run.ts parses fight.fighters.fighterA.record and fighterB.record, compares W-L win percentage, and counts coin-flips as misses in the aggregate denominator.",
        sourceFields: [
          "scripts/ingest/ufcstats.mjs scrapes fighter profile record text",
          "scripts/ingest/build-normalized-event.mjs copies profile.record or event-preview Wins/Losses/Draws into SourcedFighter.record",
          "scripts/backtest/run.ts reads SourcedFighter.record directly",
        ],
        leakageSafe: false,
        finding: "The normalized record strings are scrape/profile snapshots, not records recomputed from each target fight's filtered pre-fight history. They can include target or later results for historical events, so the prior 71% baseline should not be treated as validated.",
      },
      validatedPrimaryAsOfBaselineId: "asof-ufc-win-pct-any-history",
      fixedProbabilityForBaselineBrier: "Baseline Brier uses 60/40 on picked fights and 50/50 on no-picks. Accuracy-on-picked excludes no-picks; all-fight accuracy counts no-picks as misses for direct coverage comparison.",
      variants: baselineResults,
    },
    corpus: {
      scoredFights: rows.length,
      v02WinnerAccuracy: summary.summary.winnerAccuracy,
      v02MethodAccuracy: summary.summary.methodAccuracy,
      v02Brier: summary.summary.brierScore,
      officialRecordBaseline: {
        allFightAccuracy: summary.summary.baselines.betterRecord.accuracy,
        pickAccuracy: summary.summary.baselines.betterRecord.pickAccuracy ?? null,
        coverage: summary.summary.baselines.betterRecord.coverage ?? null,
        brierScore: summary.summary.baselines.betterRecord.brierScore ?? null,
      },
      legacyProfileRecordAccuracy: summary.summary.baselines.legacyProfileRecord?.accuracy ?? null,
    },
    eloBaseline,
    experiments: experimentResults,
    recommendation: {
      choice: "A",
      label: "keep v0.2 unchanged",
      rationale: [
        "The legacy 71% better-record baseline is not leakage-safe and is retained only as a deprecated profile-record reference.",
        `The official as-of record baseline produced ${pctText(primaryBaseline.accuracyOnPicked)} pick accuracy / ${pctText(primaryBaseline.accuracyAllNoPicksAsMisses)} all-fight accuracy with ${pctText(primaryBaseline.coverage)} coverage and Brier ${brierText(primaryBaseline.brierAll)}.`,
        v02
          ? `Current v0.2 remains stronger on the headline run: ${pctText(v02.winnerAccuracy)} winner accuracy and Brier ${brierText(v02.brierScore)}.`
          : "Current v0.2 remains the production comparison point.",
        bestBrier && v02
          ? `Best experiment by Brier was ${bestBrier.label} at ${brierText(bestBrier.brierScore)} vs v0.2 at ${brierText(v02.brierScore)}, but it did not clearly improve both accuracy and Brier enough for promotion.`
          : "No experiment has enough evidence for automatic promotion.",
      ],
    },
    guardrails: [
      "Do not promote a model from this single run.",
      "Do not change production outcome-v0.2 outputs yet.",
      "Do not change predictionViewModel or public noLean threshold.",
      "Keep public Model Record separate from historical backtests.",
      "Do not tune method model until winner probability calibration stabilizes.",
    ],
  };

  const outDir = repoPath("data/generated/backtests");
  writeJsonAtomic(path.join(outDir, "experiments.json"), report);
  writeJsonAtomic(path.join(outDir, "experiment-summary.json"), {
    generatedAt: report.generatedAt,
    corpus: report.corpus,
    baselineVariants: baselineResults,
    eloBaseline,
    experiments: experimentResults.map((experiment) => ({
      id: experiment.id,
      label: experiment.label,
      winnerAccuracy: experiment.winnerAccuracy,
      namedCallAccuracy: experiment.namedCallAccuracy,
      brierScore: experiment.brierScore,
      noLeanCount: experiment.noLeanCount,
      callsChangedRate: experiment.callsChangedRate,
      overfittingFlags: experiment.overfittingFlags,
    })),
    recommendation: report.recommendation,
  });
  writeTextAtomic(repoPath("docs/MODEL_EXPERIMENTS.md"), renderMarkdown(report));

  console.log("Wrote data/generated/backtests/experiments.json");
  console.log("Wrote data/generated/backtests/experiment-summary.json");
  console.log("Wrote docs/MODEL_EXPERIMENTS.md");
  console.log(`Primary as-of baseline: ${pctText(primaryBaseline.accuracyAllNoPicksAsMisses)} all-fight accuracy, ${pctText(primaryBaseline.coverage)} coverage`);
  for (const experiment of experimentResults) {
    console.log(`${experiment.label}: acc ${pctText(experiment.winnerAccuracy)}, brier ${brierText(experiment.brierScore)}, noLean ${experiment.noLeanCount}`);
  }
}

void main();
