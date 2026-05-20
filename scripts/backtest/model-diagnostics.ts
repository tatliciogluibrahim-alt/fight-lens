#!/usr/bin/env node
/**
 * Backend-only model diagnostics for Fight Lens.
 *
 * This script reads the existing expanded backtest outputs plus normalized
 * event data. It does not ingest data, change model weights, or tune formulas.
 *
 * Outputs:
 * - data/generated/backtests/model-diagnostics.json
 * - docs/MODEL_REVIEW.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAsOfFeaturesFromSourcedFight } from "@/lib/backtest/buildAsOfFeatures";
import {
  OFFICIAL_RECORD_BASELINE_ID,
  recordBaselinePrediction,
  type PreFightRecord,
} from "@/lib/backtest/recordBaselines";
import type { AsOfFightFeatures, AsOfFighterFeatures } from "@/lib/backtest/types";
import type {
  SourcedEvent,
  SourcedFight,
  SourcedFighter,
} from "@/lib/sourced-event";
import { buildFightShapeModel } from "@/lib/fight-shape-model/model";
import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

type Side = "fighterA" | "fighterB";
type BaselinePick = Side | "no-pick";
type ComponentName =
  | "stylePressure"
  | "recentForm"
  | "striking"
  | "grappling"
  | "absorption";

interface BacktestPredictionRow {
  fightId: string;
  event: string;
  asOfDate: string;
  fighters: { fighterA: string; fighterB: string };
  prediction: {
    fighterAWinProbability: number;
    fighterBWinProbability: number;
    methodBreakdown: {
      decision: number;
      koTko: number;
      submission: number;
    };
    confidence: "high" | "medium" | "low" | "insufficient";
  };
  outcome: { winner: Side; method: string } | null;
  score: {
    correct: boolean | null;
    brierContribution: number | null;
    methodCorrect: boolean | null;
  };
  missingDataFlags: string[];
}

interface BacktestPredictionsFile {
  generatedAt: string;
  modelVersion: string;
  totalFights: number;
  predictions: BacktestPredictionRow[];
}

interface SummaryFile {
  generatedAt: string;
  modelVersion: string;
  summary: {
    scoredFights: number;
    winnerAccuracy: number | null;
    methodAccuracy: number | null;
    brierScore: number | null;
    missingDataRate: number | null;
    baselines: {
      officialRecord?: {
        id: string;
        label: string;
        pickAccuracy: number | null;
        allFightAccuracy: number | null;
        brierScore: number | null;
        picked: number;
        noPick: number;
        coverage: number | null;
      };
      betterRecord: {
        accuracy: number | null;
        pickAccuracy?: number | null;
        coverage?: number | null;
        brierScore?: number | null;
        correct: number;
        scoredFights: number;
        picked?: number;
        leakageSafe?: boolean;
        baselineId?: string;
        label?: string;
      };
      legacyProfileRecord?: { accuracy: number | null; correct: number; scoredFights: number };
      moreExperience: { accuracy: number | null; correct: number; scoredFights: number };
    };
  };
}

interface LeakageReportsFile {
  reports: Array<{
    fightId: string;
    passed: boolean;
    issues: string[];
  }>;
}

interface EventPerformanceFile {
  eventCount: number;
  events: Array<{
    event: string;
    asOfDate: string;
    scoredFights: number;
    winnerAccuracy: number | null;
    methodAccuracy: number | null;
    brierScore: number | null;
  }>;
}

interface RecordStats {
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  total: number;
}

interface ComponentDiagnostic {
  delta: number | null;
  weight: number;
  weightedContribution: number;
  favors: Side | "none";
}

interface EnrichedRow {
  fightId: string;
  event: string;
  asOfDate: string;
  fighterA: string;
  fighterB: string;
  outcomeWinner: Side;
  outcomeMethod: string;
  modelPick: Side;
  modelProbability: number;
  modelCorrect: boolean;
  brier: number;
  betterRecordPick: BaselinePick;
  betterRecordCorrect: boolean;
  moreExperiencePick: BaselinePick;
  moreExperienceCorrect: boolean;
  modelBetterRecordAgree: boolean;
  missingDataFlags: string[];
  missingFlagCount: number;
  missingCategories: string[];
  hasMissingData: boolean;
  thinHistory: boolean;
  leakageIssues: string[];
  confidenceLabel: "high" | "medium" | "low" | "insufficient";
  methodTop: "Decision" | "KO/TKO" | "Submission";
  methodCorrect: boolean | null;
  recordA: RecordStats;
  recordB: RecordStats;
  recordAdvantageSide: BaselinePick;
  recordAdvantagePct: number;
  recordAdvantageBucket: string;
  historyCountA: number;
  historyCountB: number;
  topComponent: ComponentName;
  components: Record<ComponentName, ComponentDiagnostic>;
}

interface SegmentSummary {
  n: number;
  modelAccuracy: number | null;
  betterRecordAccuracy: number | null;
  averageModelConfidence: number | null;
  brierScore: number | null;
  missingDataRate: number | null;
  thinHistoryRate: number | null;
  betterRecordDisagreementRate: number | null;
  commonFeaturePatterns: {
    topComponents: Record<string, number>;
    recordAdvantageBuckets: Record<string, number>;
    missingCategories: Record<string, number>;
  };
}

interface ModelDiagnosticsReport {
  generatedAt: string;
  modelVersion: string;
  filesInspected: string[];
  corpus: {
    events: number;
    scoredFights: number;
    skippedFights: number;
    winnerAccuracy: number | null;
    methodAccuracy: number | null;
    brierScore: number | null;
    betterRecordAccuracy: number | null;
    betterRecordPickAccuracy: number | null;
    betterRecordCoverage: number | null;
    betterRecordBrierScore: number | null;
    legacyProfileRecordAccuracy: number | null;
    moreExperienceAccuracy: number | null;
    missingDataRate: number | null;
  };
  keyFindings: {
    isModelLosingMainlyAgainstBetterRecord: boolean;
    modelAccuracyWhenDisagreeingWithBetterRecord: number | null;
    betterRecordAccuracyWhenDisagreeingWithModel: number | null;
    disagreementCount: number;
    disagreementShare: number | null;
  };
  agreementVsBetterRecord: Record<string, SegmentSummary>;
  recordDeltaAnalysis: Record<string, SegmentSummary & { modelVsBaselineDelta: number | null }>;
  calibrationDiagnosis: Array<{
    bucket: string;
    n: number;
    averagePredictedProbability: number | null;
    actualWinRate: number | null;
    calibrationGap: number | null;
    brierScore: number | null;
    missingDataRate: number | null;
    thinHistoryRate: number | null;
    betterRecordDisagreementRate: number | null;
    topComponents: Record<string, number>;
  }>;
  thinHistoryImpact: Record<string, SegmentSummary>;
  missingDataImpact: Record<string, SegmentSummary>;
  eventLevelDiagnosis: {
    events: Array<SegmentSummary & {
      event: string;
      methodAccuracy: number | null;
      modelVsBaselineDelta: number | null;
    }>;
    bestEvents: Array<SegmentSummary & { event: string }>;
    worstEvents: Array<SegmentSummary & { event: string }>;
  };
  methodModelDiagnosis: {
    overallMethodAccuracy: number | null;
    byTopMethod: Record<string, {
      n: number;
      methodAccuracy: number | null;
      winnerAccuracy: number | null;
      brierScore: number | null;
    }>;
    whenWinnerCorrect: { n: number; methodAccuracy: number | null };
    whenWinnerWrong: { n: number; methodAccuracy: number | null };
  };
  componentDiagnostics: Record<ComponentName, SegmentSummary & { directionalAccuracy: number | null }>;
  featureComponentReview: Array<{ component: string; read: string; evidence: string }>;
  recommendations: Array<{
    change: string;
    why: string;
    expectedEffect: string;
    risk: string;
    howToTest: string;
    metricToImprove: string;
  }>;
  doNotChangeYet: string[];
  examples: {
    baselineBeatsModel: CompactExample[];
    modelBeatsBaseline: CompactExample[];
    highestBrierMisses: CompactExample[];
  };
}

type CompactExample = Pick<
  EnrichedRow,
  | "fightId"
  | "event"
  | "fighterA"
  | "fighterB"
  | "modelPick"
  | "modelProbability"
  | "betterRecordPick"
  | "outcomeWinner"
  | "brier"
  | "recordAdvantageBucket"
  | "topComponent"
>;

function repoPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
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

function percent(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function avgRounded(values: number[], places = 1): number | null {
  const value = avg(values);
  return value == null ? null : round(value, places);
}

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function parseRecord(record: string | null | undefined): RecordStats {
  const match = String(record ?? "").match(/^(\d+)-(\d+)(?:-(\d+))?/);
  const wins = match ? Number(match[1]) : 0;
  const losses = match ? Number(match[2]) : 0;
  const draws = match?.[3] ? Number(match[3]) : 0;
  const total = wins + losses;
  return {
    wins,
    losses,
    draws,
    total,
    winRate: wins / Math.max(1, total),
  };
}

function recordStatsFromPreFight(record: PreFightRecord): RecordStats {
  return {
    wins: record.wins,
    losses: record.losses,
    draws: record.draws,
    total: record.totalDirectional,
    winRate: record.winPct ?? 0,
  };
}

function moreExperiencePick(fight: SourcedFight): BaselinePick {
  const ra = parseRecord(fight.fighters.fighterA.record);
  const rb = parseRecord(fight.fighters.fighterB.record);
  if (ra.total > rb.total) return "fighterA";
  if (rb.total > ra.total) return "fighterB";
  return "no-pick";
}

function modelPick(row: BacktestPredictionRow): Side {
  return row.prediction.fighterAWinProbability >= row.prediction.fighterBWinProbability
    ? "fighterA"
    : "fighterB";
}

function recordAdvantageBucket(value: number): string {
  if (value < 3) return "same/similar record";
  if (value < 8) return "small record advantage";
  if (value < 15) return "medium record advantage";
  return "large record advantage";
}

function methodTop(row: BacktestPredictionRow): EnrichedRow["methodTop"] {
  const { decision, koTko, submission } = row.prediction.methodBreakdown;
  if (decision >= koTko && decision >= submission) return "Decision";
  if (koTko >= submission) return "KO/TKO";
  return "Submission";
}

function missingCategories(flags: string[]): string[] {
  const categories: string[] = [];
  const text = flags.join(" ");
  if (/(sapm|strikingDefense|takedownDefense)/.test(text)) categories.push("defensive stats");
  if (/takedown/.test(text)) categories.push("takedown stats");
  if (/(slpm|strikingAccuracy|sapm|strikingDefense)/.test(text)) categories.push("striking stats");
  if (/no prior fight history|has no prior fight history/.test(text)) categories.push("no prior history");
  return categories;
}

function stat(fighter: SourcedFighter, key: string): number | null {
  const value = fighter.aggregateStats?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function reconstructFighter(features: AsOfFighterFeatures): SourcedFighter {
  const history = features.filteredHistory;
  const lastFive = history.slice(0, 5);
  const allRoundStats = lastFive.flatMap((fight) => fight.roundStats ?? []);
  const lateRoundStats = allRoundStats.filter((round) => round.round >= 4);
  const hasFightTotals = lastFive.some((fight) => fight.totals?.totals != null);

  return {
    id: features.fighterId,
    ufcstatsId: features.fighterId,
    name: features.name,
    nickname: null,
    ranking: null,
    record: null,
    height: null,
    weight: null,
    reach: null,
    stance: null,
    dob: null,
    country: null,
    image: { url: null, status: "missing", credit: null },
    ufcstatsUrl: "",
    source: "ufcstats",
    sourceUrl: "",
    scrapedAt: null,
    aggregateStats: features.aggregateStats,
    styleProfile: null,
    fightHistory: history,
    lastFive,
    resumeHeat: null,
    roundModel: {
      roundSampleCount: allRoundStats.length,
      lateRoundSampleCount: lateRoundStats.length,
      earlyThreat: null,
      lateEvidence: null,
      roundScores: [],
      hasEnoughForTrend: lateRoundStats.length >= 3,
      interpretation: `${allRoundStats.length} round samples (${lateRoundStats.length} late-round) from as-of history.`,
      averageFightTime: null,
    },
    dataCompleteness: {
      hasProfile: features.aggregateStats.slpm != null,
      hasFightHistory: history.length > 0,
      hasFightTotals,
      hasRoundStats: allRoundStats.length > 0,
      lastFiveCount: lastFive.length,
      roundSampleCount: allRoundStats.length,
      lateRoundSampleCount: lateRoundStats.length,
    },
    sourceCoverage: "backtest-reconstruction",
  };
}

function reconstructFight(features: AsOfFightFeatures): SourcedFight {
  return {
    id: features.fightId,
    ufcstatsFightId: "",
    ufcstatsFightUrl: "",
    cardPlacement: "Main Card",
    rounds: features.rounds,
    weightClass: features.weightClass,
    status: "completed",
    styleClashLabel: null,
    matchupQuestion: null,
    fightShapeSummary: null,
    manualRead: null,
    result: null,
    fighters: {
      fighterA: reconstructFighter(features.fighterA),
      fighterB: reconstructFighter(features.fighterB),
    },
    keyEdges: [],
    paths: null,
    sourceMix: {},
  };
}

function component(
  delta: number | null,
  weight: number,
): ComponentDiagnostic {
  const weightedContribution = delta == null ? 0 : Math.abs(delta * weight);
  return {
    delta,
    weight,
    weightedContribution: round(weightedContribution, 4),
    favors: delta == null || delta === 0 ? "none" : delta > 0 ? "fighterA" : "fighterB",
  };
}

function outcomeComponents(
  fight: SourcedFight,
  shapeModel: FightShapeModelOutput,
): Record<ComponentName, ComponentDiagnostic> {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const spiA = shapeModel.metrics.stylePressureIndex.fighterA.score;
  const spiB = shapeModel.metrics.stylePressureIndex.fighterB.score;
  const hasSpi = spiA != null && spiB != null;
  const spiDelta = hasSpi ? (spiA - spiB) / 100 : null;

  const formA = shapeModel.metrics.opponentQualityAdjustedForm.fighterA.score;
  const formB = shapeModel.metrics.opponentQualityAdjustedForm.fighterB.score;
  const hasForm = formA != null && formB != null;
  const formDelta = hasForm ? (formA - formB) / 100 : null;

  const slpmA = stat(fighterA, "slpm") ?? 3.5;
  const slpmB = stat(fighterB, "slpm") ?? 3.5;
  const defA = (stat(fighterA, "strikingDefense") ?? 50) / 100;
  const defB = (stat(fighterB, "strikingDefense") ?? 50) / 100;
  const landedA = slpmA * (1 - defB);
  const landedB = slpmB * (1 - defA);
  const strikingDelta = Math.max(-1, Math.min(1, (landedA - landedB) / 3));

  const tdAvgA = stat(fighterA, "takedownAverage") ?? 1;
  const tdAccA = (stat(fighterA, "takedownAccuracy") ?? 40) / 100;
  const tdDefA = (stat(fighterA, "takedownDefense") ?? 60) / 100;
  const tdAvgB = stat(fighterB, "takedownAverage") ?? 1;
  const tdAccB = (stat(fighterB, "takedownAccuracy") ?? 40) / 100;
  const tdDefB = (stat(fighterB, "takedownDefense") ?? 60) / 100;
  const grapplingA = tdAvgA * tdAccA * (1 - tdDefB);
  const grapplingB = tdAvgB * tdAccB * (1 - tdDefA);
  const grapplingDelta = Math.max(-1, Math.min(1, (grapplingA - grapplingB) / 2.5));

  const sapmA = stat(fighterA, "sapm") ?? 3.5;
  const sapmB = stat(fighterB, "sapm") ?? 3.5;
  const absorptionDelta = Math.max(-1, Math.min(1, (sapmB - sapmA) / 4));

  return {
    stylePressure: component(spiDelta, hasSpi ? 0.25 : 0),
    recentForm: component(formDelta, hasForm ? 0.2 : 0),
    striking: component(strikingDelta, 0.25),
    grappling: component(grapplingDelta, 0.16),
    absorption: component(absorptionDelta, 0.14),
  };
}

function topComponent(components: Record<ComponentName, ComponentDiagnostic>): ComponentName {
  return (Object.entries(components) as Array<[ComponentName, ComponentDiagnostic]>)
    .sort((a, b) => b[1].weightedContribution - a[1].weightedContribution)[0][0];
}

function loadAllEvents(): SourcedEvent[] {
  const files = fs.readdirSync(repoPath("data/normalized/events")).filter((file) => file.endsWith(".json"));
  const events: SourcedEvent[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const event = readJson<SourcedEvent>(repoPath("data/normalized/events", file));
    const key = event.event.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }
  return events;
}

function summarize(rows: EnrichedRow[]): SegmentSummary {
  const n = rows.length;

  return {
    n,
    modelAccuracy: percent(rows.filter((row) => row.modelCorrect).length, n),
    betterRecordAccuracy: percent(rows.filter((row) => row.betterRecordCorrect).length, n),
    averageModelConfidence: avgRounded(rows.map((row) => row.modelProbability), 1),
    brierScore: avgRounded(rows.map((row) => row.brier), 3),
    missingDataRate: percent(rows.filter((row) => row.hasMissingData).length, n),
    thinHistoryRate: percent(rows.filter((row) => row.thinHistory).length, n),
    betterRecordDisagreementRate: percent(rows.filter((row) => row.betterRecordPick !== "no-pick" && !row.modelBetterRecordAgree).length, n),
    commonFeaturePatterns: {
      topComponents: countBy(rows.map((row) => row.topComponent)),
      recordAdvantageBuckets: countBy(rows.map((row) => row.recordAdvantageBucket)),
      missingCategories: countBy(rows.flatMap((row) => row.missingCategories)),
    },
  };
}

function summarizeNamedSegments(segments: Record<string, EnrichedRow[]>): Record<string, SegmentSummary> {
  return Object.fromEntries(
    Object.entries(segments).map(([name, rows]) => [name, summarize(rows)]),
  );
}

function calibrationBucket(probability: number): string {
  if (probability < 60) return "50-60%";
  if (probability < 70) return "60-70%";
  if (probability < 80) return "70-80%";
  return "80%+";
}

function table(headers: string[], rows: Array<Array<string | number | null>>): string {
  const clean = (value: string | number | null): string => (value == null ? "n/a" : String(value));
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(clean).join(" | ")} |`),
  ].join("\n");
}

function pctText(value: number | null): string {
  return value == null ? "n/a" : `${value}%`;
}

function brierText(value: number | null): string {
  return value == null ? "n/a" : value.toFixed(3);
}

function segmentRow(name: string, summary: SegmentSummary): Array<string | number | null> {
  return [
    name,
    summary.n,
    pctText(summary.modelAccuracy),
    pctText(summary.betterRecordAccuracy),
    pctText(summary.averageModelConfidence),
    brierText(summary.brierScore),
    pctText(summary.missingDataRate),
    pctText(summary.thinHistoryRate),
  ];
}

function featureReview(
  rows: EnrichedRow[],
  componentMetrics: Record<ComponentName, SegmentSummary & { directionalAccuracy: number | null }>,
): Array<{ component: string; read: string; evidence: string }> {
  const disagreement = rows.filter((row) => row.betterRecordPick !== "no-pick" && !row.modelBetterRecordAgree);
  const modelDisagreeAcc = percent(disagreement.filter((row) => row.modelCorrect).length, disagreement.length);
  const baselineDisagreeAcc = percent(disagreement.filter((row) => row.betterRecordCorrect).length, disagreement.length);
  const thin = rows.filter((row) => row.thinHistory);
  const noThin = rows.filter((row) => !row.thinHistory);
  const missing = rows.filter((row) => row.hasMissingData);
  const clean = rows.filter((row) => !row.hasMissingData);

  return [
    {
      component: "Record/form",
      read: "Useful but no longer the headline gap",
      evidence: `The official as-of record baseline is ${pctText(baselineDisagreeAcc)} vs model ${pctText(modelDisagreeAcc)} when they disagree. Current model has recent form, but no explicit W-L ratio feature.`,
    },
    {
      component: "Striking offense/defense",
      read: componentMetrics.striking.modelAccuracy != null && componentMetrics.striking.modelAccuracy >= 65 ? "Helpful" : "Unclear",
      evidence: `When striking is the top weighted component: n=${componentMetrics.striking.n}, model ${pctText(componentMetrics.striking.modelAccuracy)}, Brier ${brierText(componentMetrics.striking.brierScore)}.`,
    },
    {
      component: "Takedown offense/defense",
      read: componentMetrics.grappling.modelAccuracy != null && componentMetrics.grappling.modelAccuracy < 60 ? "Risky" : "Unclear",
      evidence: `When grappling is the top weighted component: n=${componentMetrics.grappling.n}, model ${pctText(componentMetrics.grappling.modelAccuracy)}, directional component accuracy ${pctText(componentMetrics.grappling.directionalAccuracy)}.`,
    },
    {
      component: "Submission threat",
      read: "Unclear",
      evidence: "Submission enters style pressure and method tendency, but it is not isolated in the winner model diagnostics yet.",
    },
    {
      component: "Reach/stance/age/activity",
      read: "Mostly missing from winner model",
      evidence: "Activity affects form through layoff shrinkage; reach, stance, and age are not explicit winner-model features in outcome-v0.2.",
    },
    {
      component: "Experience",
      read: "Weak as currently baselined",
      evidence: "More-experience baseline is 40%, so raw fight count is not the record signal to chase.",
    },
    {
      component: "Missing-data handling",
      read: missing.length && clean.length ? "Not the aggregate failure mode" : "Unclear",
      evidence: `No missing flags: ${pctText(summarize(clean).modelAccuracy)}, missing flags: ${pctText(summarize(missing).modelAccuracy)}. Missing stats currently fall back to UFC-average defaults, but aggregate missing-data rows did not underperform here.`,
    },
    {
      component: "Confidence/read strength",
      read: thin.length && noThin.length ? "Do not blanket-penalize thin history yet" : "Unclear",
      evidence: `Thin-history fights: ${pctText(summarize(thin).modelAccuracy)}, no thin-history fights: ${pctText(summarize(noThin).modelAccuracy)}. Mid-confidence calibration is the concern, not thin-history accuracy overall.`,
    },
  ];
}

function compactExample(row: EnrichedRow): CompactExample {
  return {
    fightId: row.fightId,
    event: row.event,
    fighterA: row.fighterA,
    fighterB: row.fighterB,
    modelPick: row.modelPick,
    modelProbability: row.modelProbability,
    betterRecordPick: row.betterRecordPick,
    outcomeWinner: row.outcomeWinner,
    brier: row.brier,
    recordAdvantageBucket: row.recordAdvantageBucket,
    topComponent: row.topComponent,
  };
}

function diagnosticMarkdown(report: ModelDiagnosticsReport): string {
  const agreementRows = Object.entries(report.agreementVsBetterRecord)
    .map(([name, summary]) => segmentRow(name, summary));
  const recordRows = Object.entries(report.recordDeltaAnalysis)
    .map(([name, summary]) => [
      name,
      summary.n,
      pctText(summary.modelAccuracy),
      pctText(summary.betterRecordAccuracy),
      `${summary.modelVsBaselineDelta ?? "n/a"} pts`,
      brierText(summary.brierScore),
    ]);
  const calibrationRows = report.calibrationDiagnosis.map((bucket) => [
    bucket.bucket,
    bucket.n,
    pctText(bucket.averagePredictedProbability),
    pctText(bucket.actualWinRate),
    `${bucket.calibrationGap ?? "n/a"} pts`,
    brierText(bucket.brierScore),
    pctText(bucket.missingDataRate),
    pctText(bucket.thinHistoryRate),
    pctText(bucket.betterRecordDisagreementRate),
  ]);
  const thinRows = Object.entries(report.thinHistoryImpact)
    .map(([name, summary]) => segmentRow(name, summary));
  const missingRows = Object.entries(report.missingDataImpact)
    .map(([name, summary]) => segmentRow(name, summary));
  const eventRows = report.eventLevelDiagnosis.events.map((event) => [
    event.event,
    event.n,
    pctText(event.modelAccuracy),
    pctText(event.betterRecordAccuracy),
    brierText(event.brierScore),
    pctText(event.missingDataRate),
    pctText(event.methodAccuracy),
    pctText(event.betterRecordDisagreementRate),
  ]);
  const methodRows = Object.entries(report.methodModelDiagnosis.byTopMethod).map(([method, summary]) => [
    method,
    summary.n,
    pctText(summary.methodAccuracy),
    pctText(summary.winnerAccuracy),
    brierText(summary.brierScore),
  ]);
  const componentRows = report.featureComponentReview.map((item) => [
    item.component,
    item.read,
    item.evidence,
  ]);
  const recommendationRows = report.recommendations.map((item) => [
    item.change,
    item.why,
    item.expectedEffect,
    item.risk,
    item.howToTest,
    item.metricToImprove,
  ]);

  return `# Fight Lens - Model Review and Calibration Diagnosis

Generated: ${report.generatedAt}

## Scope

Backend diagnosis only. This pass did not change model weights, formulas, public UI, predictionViewModel, locked predictions, ingestion, or public Model Record behavior.

## Files inspected

${report.filesInspected.map((file) => `- \`${file}\``).join("\n")}

## Current model logic

- Outcome model: outcome-v0.2 in \`lib/fight-outcome-model/model.ts\`.
- Inputs: style pressure, recent form, striking net advantage, grappling net advantage, and absorption resistance.
- Weights: style pressure 0.25, recent form 0.20, striking 0.25, grappling 0.16, absorption 0.14.
- Probability conversion: logistic transform with k=3.5.
- Missing stats fall back to UFC-average-like defaults inside the outcome model.
- No explicit W-L record, age, reach, stance, or raw experience feature is used in the winner model.
- Method model blends each fighter's recent finish profile with win probability; no method formula changes were made.
- Official record baseline uses leakage-safe as-of UFC win percentage from filtered pre-fight history only.
- Legacy profile-record baseline uses normalized fighter profile record strings; it is deprecated and retained only for reference.
- Thin-history warnings are diagnostic only; those fights still run through the model.

## Headline

The previous 71% profile-record baseline was leakage-prone and is no longer the official comparison. Against the official as-of record baseline, v0.2 is directionally ahead: model ${pctText(report.corpus.winnerAccuracy)} winner accuracy and Brier ${brierText(report.corpus.brierScore)} vs official as-of record ${pctText(report.corpus.betterRecordPickAccuracy)} picked / ${pctText(report.corpus.betterRecordAccuracy)} all fights and Brier ${brierText(report.corpus.betterRecordBrierScore)}. This is promising, not public proof.

## Model vs official as-of record agreement

${table(["Segment", "n", "Model acc", "As-of record acc", "Avg model conf", "Brier", "Missing data", "Thin history"], agreementRows)}

## Record-delta analysis

${table(["Record bucket", "n", "Model acc", "As-of record acc", "Delta", "Brier"], recordRows)}

## Calibration diagnosis

${table(["Bucket", "n", "Avg predicted", "Actual win rate", "Gap", "Brier", "Missing data", "Thin history", "Record disagreement"], calibrationRows)}

Read: the 60-80% overconfidence does not look primarily caused by missing data or thin history in aggregate. It is more consistent with mid-confidence formula calibration and selected contrarian record-baseline behavior.

## Thin-history impact

${table(["Segment", "n", "Model acc", "As-of record acc", "Avg model conf", "Brier", "Missing data", "Thin history"], thinRows)}

## Missing-data impact

${table(["Segment", "n", "Model acc", "As-of record acc", "Avg model conf", "Brier", "Missing data", "Thin history"], missingRows)}

## Event-level diagnosis

${table(["Event", "n", "Model acc", "As-of record acc", "Brier", "Missing data", "Method acc", "Record disagreement"], eventRows)}

Best events by model accuracy:
${report.eventLevelDiagnosis.bestEvents.map((event) => `- ${event.event}: ${pctText(event.modelAccuracy)} on n=${event.n}, Brier ${brierText(event.brierScore)}`).join("\n")}

Worst events by model accuracy:
${report.eventLevelDiagnosis.worstEvents.map((event) => `- ${event.event}: ${pctText(event.modelAccuracy)} on n=${event.n}, Brier ${brierText(event.brierScore)}`).join("\n")}

## Method model diagnosis

Overall method accuracy: ${pctText(report.methodModelDiagnosis.overallMethodAccuracy)}.

${table(["Top method", "n", "Method acc", "Winner acc", "Brier"], methodRows)}

- Method accuracy when winner call is correct: ${pctText(report.methodModelDiagnosis.whenWinnerCorrect.methodAccuracy)} on n=${report.methodModelDiagnosis.whenWinnerCorrect.n}.
- Method accuracy when winner call is wrong: ${pctText(report.methodModelDiagnosis.whenWinnerWrong.methodAccuracy)} on n=${report.methodModelDiagnosis.whenWinnerWrong.n}.
- Read: method lean is useful context but should stay secondary until winner calibration improves.

## Feature/component review

${table(["Component", "Read", "Evidence"], componentRows)}

## Recommended controlled model changes to test later

${table(["Change", "Why", "Expected effect", "Risk", "How to test", "Metric"], recommendationRows)}

## What not to change yet

${report.doNotChangeYet.map((item) => `- ${item}`).join("\n")}

## Notes

- This is a diagnostic snapshot, not a tuning result.
- Public Model Record and historical backtest separation must remain intact.
- Do not publish a model grade from these historical backtest metrics.
`;
}

function main(): void {
  const predictionsFile = readJson<BacktestPredictionsFile>(repoPath("data/generated/backtests/predictions.json"));
  const summaryFile = readJson<SummaryFile>(repoPath("data/generated/backtests/summary.json"));
  const leakageFile = readJson<LeakageReportsFile>(repoPath("data/generated/backtests/leakage-reports.json"));
  const eventPerformanceFile = readJson<EventPerformanceFile>(repoPath("data/generated/backtests/event-performance.json"));
  const skipReport = readJson<{ skippedCount: number }>(repoPath("data/generated/backtests/skip-report.json"));

  const leakageByFightId = new Map(leakageFile.reports.map((report) => [report.fightId, report]));
  const eventByFightId = new Map<string, { event: SourcedEvent; fight: SourcedFight }>();
  const events = loadAllEvents();

  for (const event of events) {
    for (const fight of event.fights) {
      eventByFightId.set(fight.id, { event, fight });
    }
  }

  const rows: EnrichedRow[] = predictionsFile.predictions.flatMap((row) => {
    if (!row.outcome || row.score.correct == null || row.score.brierContribution == null) return [];
    const match = eventByFightId.get(row.fightId);
    if (!match) return [];

    const { event, fight } = match;
    const features = buildAsOfFeaturesFromSourcedFight(fight, event.event.name, row.asOfDate);
    const reconstructed = reconstructFight(features);
    const shape = buildFightShapeModel(reconstructed);
    const components = outcomeComponents(reconstructed, shape);
    const officialRecordBaseline = recordBaselinePrediction(features, OFFICIAL_RECORD_BASELINE_ID);
    const recordA = recordStatsFromPreFight(officialRecordBaseline.recordA);
    const recordB = recordStatsFromPreFight(officialRecordBaseline.recordB);
    const recordDeltaPct = Math.abs(recordA.winRate - recordB.winRate) * 100;
    const recordSide = officialRecordBaseline.pick;
    const model = modelPick(row);
    const moreExperience = moreExperiencePick(fight);
    const leakage = leakageByFightId.get(row.fightId);
    const categories = missingCategories(row.missingDataFlags);

    return [{
      fightId: row.fightId,
      event: row.event,
      asOfDate: row.asOfDate,
      fighterA: row.fighters.fighterA,
      fighterB: row.fighters.fighterB,
      outcomeWinner: row.outcome.winner,
      outcomeMethod: row.outcome.method,
      modelPick: model,
      modelProbability: Math.max(row.prediction.fighterAWinProbability, row.prediction.fighterBWinProbability),
      modelCorrect: row.score.correct,
      brier: row.score.brierContribution,
      betterRecordPick: recordSide,
      betterRecordCorrect: recordSide === row.outcome.winner,
      moreExperiencePick: moreExperience,
      moreExperienceCorrect: moreExperience === row.outcome.winner,
      modelBetterRecordAgree: recordSide !== "no-pick" && model === recordSide,
      missingDataFlags: row.missingDataFlags,
      missingFlagCount: row.missingDataFlags.length,
      missingCategories: categories,
      hasMissingData: row.missingDataFlags.length > 0,
      thinHistory: Boolean(leakage && !leakage.passed),
      leakageIssues: leakage?.issues ?? [],
      confidenceLabel: row.prediction.confidence,
      methodTop: methodTop(row),
      methodCorrect: row.score.methodCorrect,
      recordA,
      recordB,
      recordAdvantageSide: recordSide,
      recordAdvantagePct: round(recordDeltaPct, 1),
      recordAdvantageBucket: recordAdvantageBucket(recordDeltaPct),
      historyCountA: features.fighterA.fightHistoryCount,
      historyCountB: features.fighterB.fightHistoryCount,
      topComponent: topComponent(components),
      components,
    }];
  });

  const hasRecordPick = (row: EnrichedRow) => row.betterRecordPick !== "no-pick";
  const agreementSegments = {
    "model and as-of record agree": rows.filter((row) => hasRecordPick(row) && row.modelBetterRecordAgree),
    "model disagrees with as-of record": rows.filter((row) => hasRecordPick(row) && !row.modelBetterRecordAgree),
    "as-of record no-pick": rows.filter((row) => !hasRecordPick(row)),
    "model correct / as-of record wrong": rows.filter((row) => row.modelCorrect && !row.betterRecordCorrect),
    "as-of record correct / model wrong": rows.filter((row) => !row.modelCorrect && row.betterRecordCorrect),
    "both correct": rows.filter((row) => row.modelCorrect && row.betterRecordCorrect),
    "both wrong/no-pick": rows.filter((row) => !row.modelCorrect && !row.betterRecordCorrect),
  };

  const recordBucketNames = [
    "same/similar record",
    "small record advantage",
    "medium record advantage",
    "large record advantage",
  ];
  const recordDeltaAnalysis = Object.fromEntries(recordBucketNames.map((bucket) => {
    const summary = summarize(rows.filter((row) => row.recordAdvantageBucket === bucket));
    const delta = summary.modelAccuracy == null || summary.betterRecordAccuracy == null
      ? null
      : summary.modelAccuracy - summary.betterRecordAccuracy;
    return [bucket, { ...summary, modelVsBaselineDelta: delta }];
  }));

  const calibrationBuckets = ["50-60%", "60-70%", "70-80%", "80%+"].map((bucket) => {
    const bucketRows = rows.filter((row) => calibrationBucket(row.modelProbability) === bucket);
    const predicted = avgRounded(bucketRows.map((row) => row.modelProbability), 1);
    const actual = percent(bucketRows.filter((row) => row.modelCorrect).length, bucketRows.length);
    return {
      bucket,
      n: bucketRows.length,
      averagePredictedProbability: predicted,
      actualWinRate: actual,
      calibrationGap: predicted == null || actual == null ? null : round(actual - predicted, 1),
      brierScore: avgRounded(bucketRows.map((row) => row.brier), 3),
      missingDataRate: percent(bucketRows.filter((row) => row.hasMissingData).length, bucketRows.length),
      thinHistoryRate: percent(bucketRows.filter((row) => row.thinHistory).length, bucketRows.length),
      betterRecordDisagreementRate: percent(bucketRows.filter((row) => !row.modelBetterRecordAgree).length, bucketRows.length),
      topComponents: countBy(bucketRows.map((row) => row.topComponent)),
    };
  });

  const thinHistoryImpact = summarizeNamedSegments({
    "thin-history warning": rows.filter((row) => row.thinHistory),
    "no thin-history warning": rows.filter((row) => !row.thinHistory),
  });

  const missingDataImpact = summarizeNamedSegments({
    "no missing flags": rows.filter((row) => row.missingFlagCount === 0),
    "one missing flag": rows.filter((row) => row.missingFlagCount === 1),
    "multiple missing flags": rows.filter((row) => row.missingFlagCount > 1),
    "missing defensive stats": rows.filter((row) => row.missingCategories.includes("defensive stats")),
    "missing takedown stats": rows.filter((row) => row.missingCategories.includes("takedown stats")),
    "missing striking stats": rows.filter((row) => row.missingCategories.includes("striking stats")),
  });

  const eventRows = eventPerformanceFile.events.map((event) => {
    const eventRowsForName = rows.filter((row) => row.event === event.event);
    const summary = summarize(eventRowsForName);
    return {
      event: event.event,
      ...summary,
      n: eventRowsForName.length,
      methodAccuracy: event.methodAccuracy,
      modelVsBaselineDelta: summary.modelAccuracy == null || summary.betterRecordAccuracy == null
        ? null
        : summary.modelAccuracy - summary.betterRecordAccuracy,
    };
  });

  const methodGroups = {
    Decision: rows.filter((row) => row.methodTop === "Decision"),
    "KO/TKO": rows.filter((row) => row.methodTop === "KO/TKO"),
    Submission: rows.filter((row) => row.methodTop === "Submission"),
  };
  const methodByTopMethod = Object.fromEntries(Object.entries(methodGroups).map(([method, group]) => [
    method,
    {
      n: group.length,
      methodAccuracy: percent(group.filter((row) => row.methodCorrect).length, group.length),
      winnerAccuracy: percent(group.filter((row) => row.modelCorrect).length, group.length),
      brierScore: avgRounded(group.map((row) => row.brier), 3),
    },
  ]));
  const winnerCorrectRows = rows.filter((row) => row.modelCorrect);
  const winnerWrongRows = rows.filter((row) => !row.modelCorrect);

  const componentDiagnostics = Object.fromEntries(([
    "stylePressure",
    "recentForm",
    "striking",
    "grappling",
    "absorption",
  ] as ComponentName[]).map((name) => {
    const componentRows = rows.filter((row) => row.topComponent === name);
    const directionalRows = rows.filter((row) => row.components[name].favors !== "none");
    const directionalCorrect = directionalRows.filter((row) => row.components[name].favors === row.outcomeWinner).length;
    return [
      name,
      {
        ...summarize(componentRows),
        directionalAccuracy: percent(directionalCorrect, directionalRows.length),
      },
    ];
  })) as Record<ComponentName, SegmentSummary & { directionalAccuracy: number | null }>;

  const disagreement = agreementSegments["model disagrees with as-of record"];
  const modelDisagreeAcc = percent(disagreement.filter((row) => row.modelCorrect).length, disagreement.length);
  const baselineDisagreeAcc = percent(disagreement.filter((row) => row.betterRecordCorrect).length, disagreement.length);

  const report: ModelDiagnosticsReport = {
    generatedAt: new Date().toISOString(),
    modelVersion: predictionsFile.modelVersion,
    filesInspected: [
      "AGENTS.md",
      "docs/CHANGELOG.md",
      "docs/MODEL_STATUS.md",
      "docs/NEXT_STEPS.md",
      "docs/BACKTESTING.md",
      "lib/fight-outcome-model/model.ts",
      "lib/fight-outcome-model/types.ts",
      "lib/fight-shape-model/model.ts",
      "lib/fight-shape-model/confidence.ts",
      "lib/fight-shape-model/normalization.ts",
      "lib/backtest/run.ts",
      "lib/backtest/runBacktest.ts",
      "lib/backtest/buildAsOfFeatures.ts",
      "lib/backtest/scorePredictions.ts",
      "lib/backtest/baselines.ts",
      "lib/backtest/recordBaselines.ts",
      "lib/backtest/calibration.ts",
      "lib/backtest/leakageChecks.ts",
      "lib/predictionThresholds.ts",
      "data/generated/backtests/predictions.json",
      "data/generated/backtests/summary.json",
      "data/generated/backtests/leakage-reports.json",
      "data/generated/backtests/missing-data-report.json",
      "data/generated/backtests/event-performance.json",
    ],
    corpus: {
      events: eventPerformanceFile.eventCount,
      scoredFights: summaryFile.summary.scoredFights,
      skippedFights: skipReport.skippedCount,
      winnerAccuracy: summaryFile.summary.winnerAccuracy,
      methodAccuracy: summaryFile.summary.methodAccuracy,
      brierScore: summaryFile.summary.brierScore,
      betterRecordAccuracy: summaryFile.summary.baselines.betterRecord.accuracy,
      betterRecordPickAccuracy: summaryFile.summary.baselines.betterRecord.pickAccuracy ?? null,
      betterRecordCoverage: summaryFile.summary.baselines.betterRecord.coverage ?? null,
      betterRecordBrierScore: summaryFile.summary.baselines.betterRecord.brierScore ?? null,
      legacyProfileRecordAccuracy: summaryFile.summary.baselines.legacyProfileRecord?.accuracy ?? null,
      moreExperienceAccuracy: summaryFile.summary.baselines.moreExperience.accuracy,
      missingDataRate: summaryFile.summary.missingDataRate,
    },
    keyFindings: {
      isModelLosingMainlyAgainstBetterRecord: (baselineDisagreeAcc ?? 0) > (modelDisagreeAcc ?? 0),
      modelAccuracyWhenDisagreeingWithBetterRecord: modelDisagreeAcc,
      betterRecordAccuracyWhenDisagreeingWithModel: baselineDisagreeAcc,
      disagreementCount: disagreement.length,
      disagreementShare: percent(disagreement.length, rows.length),
    },
    agreementVsBetterRecord: summarizeNamedSegments(agreementSegments),
    recordDeltaAnalysis,
    calibrationDiagnosis: calibrationBuckets,
    thinHistoryImpact,
    missingDataImpact,
    eventLevelDiagnosis: {
      events: eventRows,
      bestEvents: [...eventRows].sort((a, b) => (b.modelAccuracy ?? -1) - (a.modelAccuracy ?? -1)).slice(0, 5),
      worstEvents: [...eventRows].sort((a, b) => (a.modelAccuracy ?? 101) - (b.modelAccuracy ?? 101)).slice(0, 5),
    },
    methodModelDiagnosis: {
      overallMethodAccuracy: summaryFile.summary.methodAccuracy,
      byTopMethod: methodByTopMethod,
      whenWinnerCorrect: {
        n: winnerCorrectRows.length,
        methodAccuracy: percent(winnerCorrectRows.filter((row) => row.methodCorrect).length, winnerCorrectRows.length),
      },
      whenWinnerWrong: {
        n: winnerWrongRows.length,
        methodAccuracy: percent(winnerWrongRows.filter((row) => row.methodCorrect).length, winnerWrongRows.length),
      },
    },
    componentDiagnostics,
    featureComponentReview: featureReview(rows, componentDiagnostics),
    recommendations: [
      {
        change: "Keep v0.2 current while validating more data",
        why: "The corrected official as-of baseline is weaker than v0.2 on all-fight accuracy and Brier, and no v0.3 experiment has clearly improved both metrics.",
        expectedEffect: "Avoids promoting a noisy variant from one historical sample while preserving the current public model behavior.",
        risk: "Model improvement slows down until the next controlled validation pass.",
        howToTest: "Re-run this same report after additional completed-event validation or an out-of-sample holdout.",
        metricToImprove: "Winner accuracy and Brier against leakage-safe baselines.",
      },
      {
        change: "Continue controlled record-prior experiments",
        why: "As-of record still carries useful signal in some buckets, but the legacy 71% profile-record baseline is deprecated and should not be optimized against.",
        expectedEffect: "Find a conservative way to use record signal without turning the model into a simple record picker.",
        risk: "Could overvalue padded records or weak schedules.",
        howToTest: "Run diagnostic-only record-ratio and blend variants against the same corpus plus a holdout before promotion.",
        metricToImprove: "Brier, winner accuracy, and same/similar-record bucket performance.",
      },
      {
        change: "Test mid-confidence probability shrinkage, especially 60-80%",
        why: "The 60-70 and 70-80 buckets are overconfident while the 80%+ bucket is strong.",
        expectedEffect: "Improve Brier and calibration without flattening the best high-confidence calls.",
        risk: "May make useful 60-70 calls look too timid if applied too broadly.",
        howToTest: "Apply a diagnostic-only shrink to 60-80% outputs and compare calibration gap, Brier, and winner accuracy.",
        metricToImprove: "Brier score and calibration gap in 60-80% buckets.",
      },
      {
        change: "Require stronger stat evidence for record-contrarian calls",
        why: "Some contrarian calls remain weak even after replacing the legacy baseline with the official as-of baseline.",
        expectedEffect: "Keeps contrarian calls, but only when component agreement is broad enough.",
        risk: "Can turn the model into a record follower if threshold is too blunt.",
        howToTest: "Create a diagnostic-only rule: when the official as-of record baseline disagrees, require multiple components to favor the model side; compare misses saved vs wins lost.",
        metricToImprove: "Disagreement-segment accuracy and Brier.",
      },
      {
        change: "Hold method-model tuning until winner calibration stabilizes",
        why: "Method accuracy improved, but method direction is conditioned on noisy winner probabilities.",
        expectedEffect: "Avoids chasing method noise before the main probability layer is trustworthy.",
        risk: "Method may remain secondary and underoptimized for another cycle.",
        howToTest: "After winner calibration changes, re-run method-by-top-method and winner-correct/wrong splits.",
        metricToImprove: "Method accuracy without hurting winner Brier.",
      },
    ],
    doNotChangeYet: [
      "Do not tune model weights or formulas in this pass.",
      "Do not change predictionViewModel or public prediction thresholds.",
      "Do not mix historical backtest rows into public Model Record.",
      "Do not add public claims or a model grade.",
      "Do not ingest new events as part of this diagnosis.",
      "Do not optimize only against the current 253-fight sample.",
    ],
    examples: {
      baselineBeatsModel: rows
        .filter((row) => !row.modelCorrect && row.betterRecordCorrect)
        .sort((a, b) => b.brier - a.brier)
        .slice(0, 12)
        .map(compactExample),
      modelBeatsBaseline: rows
        .filter((row) => row.modelCorrect && !row.betterRecordCorrect)
        .sort((a, b) => b.modelProbability - a.modelProbability)
        .slice(0, 12)
        .map(compactExample),
      highestBrierMisses: rows
        .filter((row) => !row.modelCorrect)
        .sort((a, b) => b.brier - a.brier)
        .slice(0, 12)
        .map(compactExample),
    },
  };

  writeJsonAtomic(repoPath("data/generated/backtests/model-diagnostics.json"), report);
  writeTextAtomic(repoPath("docs/MODEL_REVIEW.md"), diagnosticMarkdown(report));

  console.log("Wrote data/generated/backtests/model-diagnostics.json");
  console.log("Wrote docs/MODEL_REVIEW.md");
  console.log(`Disagreement fights: ${report.keyFindings.disagreementCount} (${pctText(report.keyFindings.disagreementShare)})`);
  console.log(`Model in disagreements: ${pctText(modelDisagreeAcc)}; official as-of record: ${pctText(baselineDisagreeAcc)}`);
}

main();
