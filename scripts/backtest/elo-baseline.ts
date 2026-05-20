#!/usr/bin/env node
/**
 * Leakage-safe chronological Elo baseline for Fight Lens backtests.
 *
 * Reads the current scored backtest output, sorts fights by as-of fight date,
 * predicts each fight with pre-fight Elo only, then updates ratings after the
 * fight. This does not affect production model outputs or public UI.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const INITIAL_ELO = 1500;
const DEFAULT_K = 32;
const K_VALUES = [24, 32, 40] as const;

type Side = "fighterA" | "fighterB";
type EloPick = Side | "no-pick";

interface BacktestPredictionRow {
  fightId: string;
  event: string;
  asOfDate: string;
  fighters: { fighterA: string; fighterB: string };
  prediction: { fighterAWinProbability: number; fighterBWinProbability: number };
  outcome: {
    winner: Side | "draw" | "nc";
    method: string;
    round?: number | null;
    time?: string | null;
  } | null;
  score: { correct: boolean | null; brierContribution: number | null };
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
    brierScore: number | null;
    baselines: {
      officialRecord?: {
        label: string;
        pickAccuracy: number | null;
        allFightAccuracy: number | null;
        brierScore: number | null;
        coverage: number | null;
      };
      betterRecord: {
        label?: string;
        accuracy: number | null;
        pickAccuracy?: number | null;
        brierScore?: number | null;
        coverage?: number | null;
      };
    };
  };
}

interface NormalizedEvent {
  event: {
    id: string;
    ufcstatsId?: string | null;
    name: string;
    date: string;
  };
  fights: Array<{
    id: string;
    ufcstatsFightId?: string | null;
    cardPlacement?: string | null;
    fighters: {
      fighterA: { id: string; ufcstatsId?: string | null; name: string };
      fighterB: { id: string; ufcstatsId?: string | null; name: string };
    };
  }>;
}

interface FightLookupValue {
  eventId: string;
  eventName: string;
  eventUfcstatsId: string | null;
  eventDateRaw: string;
  fightOrder: number;
  cardPlacement: string | null;
  ufcstatsFightId: string | null;
  fighterAId: string;
  fighterBId: string;
  fighterAUfcstatsId: string | null;
  fighterBUfcstatsId: string | null;
}

interface LedgerFight {
  eventId: string;
  eventName: string;
  eventUfcstatsId: string | null;
  fightDate: string;
  fightId: string;
  ufcstatsFightId: string | null;
  fightOrder: number;
  fightOrderSource: string;
  cardPlacement: string | null;
  fighterA: string;
  fighterB: string;
  fighterAKey: string;
  fighterBKey: string;
  winner: Side;
  method: string;
  round: number | null;
  time: string | null;
  modelPick: Side;
  modelCorrect: boolean;
  modelProbabilityA: number;
  modelBrier: number | null;
}

interface EloFight extends LedgerFight {
  fighterAEloBefore: number;
  fighterBEloBefore: number;
  eloDiff: number;
  eloExpectedA: number;
  eloExpectedB: number;
  eloPick: EloPick;
  eloCorrect: boolean | null;
  eloBrier: number;
  fighterAEloAfter: number;
  fighterBEloAfter: number;
}

interface EloAgreementSummary {
  modelAndEloAgree: number;
  modelAndEloDisagree: number;
  eloCorrectModelWrong: number;
  modelCorrectEloWrong: number;
  bothCorrect: number;
  bothWrong: number;
  eloNoPick: number;
  eloNoPickModelCorrect: number;
  eloNoPickModelWrong: number;
}

interface EloVariantSummary {
  kFactor: number;
  initialElo: number;
  totalFights: number;
  picked: number;
  noPick: number;
  coverage: number | null;
  correctPicked: number;
  pickAccuracy: number | null;
  allFightAccuracy: number | null;
  brierScore: number | null;
  averageAbsoluteEloDiff: number | null;
  agreement: EloAgreementSummary;
}

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

function modelPick(row: BacktestPredictionRow): Side {
  return row.prediction.fighterAWinProbability >= row.prediction.fighterBWinProbability
    ? "fighterA"
    : "fighterB";
}

function fighterKey(id: string, ufcstatsId: string | null | undefined, name: string): string {
  return ufcstatsId || id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function loadFightLookup(): Map<string, FightLookupValue> {
  const eventsDir = repoPath("data/normalized/events");
  const files = fs.readdirSync(eventsDir).filter((fileName) => fileName.endsWith(".json"));
  const seenEvents = new Set<string>();
  const lookup = new Map<string, FightLookupValue>();

  for (const fileName of files) {
    const event = readJson<NormalizedEvent>(path.join(eventsDir, fileName));
    const eventKey = event.event.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenEvents.has(eventKey)) continue;
    seenEvents.add(eventKey);

    event.fights.forEach((fight, index) => {
      lookup.set(fight.id, {
        eventId: event.event.id,
        eventName: event.event.name,
        eventUfcstatsId: event.event.ufcstatsId ?? null,
        eventDateRaw: event.event.date,
        fightOrder: index + 1,
        cardPlacement: fight.cardPlacement ?? null,
        ufcstatsFightId: fight.ufcstatsFightId ?? null,
        fighterAId: fight.fighters.fighterA.id,
        fighterBId: fight.fighters.fighterB.id,
        fighterAUfcstatsId: fight.fighters.fighterA.ufcstatsId ?? null,
        fighterBUfcstatsId: fight.fighters.fighterB.ufcstatsId ?? null,
      });
    });
  }

  return lookup;
}

function buildLedger(predictionsFile: BacktestPredictionsFile): LedgerFight[] {
  const fightLookup = loadFightLookup();
  const ledger = predictionsFile.predictions.flatMap<LedgerFight>((row) => {
    if (!row.outcome || row.outcome.winner === "draw" || row.outcome.winner === "nc") return [];
    if (row.score.correct == null) return [];
    const fight = fightLookup.get(row.fightId);
    if (!fight) return [];

    return [{
      eventId: fight.eventId,
      eventName: row.event,
      eventUfcstatsId: fight.eventUfcstatsId,
      fightDate: row.asOfDate,
      fightId: row.fightId,
      ufcstatsFightId: fight.ufcstatsFightId,
      fightOrder: fight.fightOrder,
      fightOrderSource: "normalized event fights array order; exact intra-event bout chronology is not separately available",
      cardPlacement: fight.cardPlacement,
      fighterA: row.fighters.fighterA,
      fighterB: row.fighters.fighterB,
      fighterAKey: fighterKey(fight.fighterAId, fight.fighterAUfcstatsId, row.fighters.fighterA),
      fighterBKey: fighterKey(fight.fighterBId, fight.fighterBUfcstatsId, row.fighters.fighterB),
      winner: row.outcome.winner,
      method: row.outcome.method,
      round: row.outcome.round ?? null,
      time: row.outcome.time ?? null,
      modelPick: modelPick(row),
      modelCorrect: row.score.correct,
      modelProbabilityA: row.prediction.fighterAWinProbability / 100,
      modelBrier: row.score.brierContribution,
    }];
  });

  return ledger.sort((a, b) => (
    a.fightDate.localeCompare(b.fightDate)
    || a.eventName.localeCompare(b.eventName)
    || a.fightOrder - b.fightOrder
    || a.fightId.localeCompare(b.fightId)
  ));
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function brier(probabilityA: number, winner: Side): number {
  const actualA = winner === "fighterA" ? 1 : 0;
  return (probabilityA - actualA) ** 2;
}

function evaluateElo(ledger: LedgerFight[], kFactor: number): { fights: EloFight[]; summary: EloVariantSummary } {
  const ratings = new Map<string, number>();
  const getRating = (key: string) => ratings.get(key) ?? INITIAL_ELO;
  const fights: EloFight[] = [];

  for (const fight of ledger) {
    const ratingA = getRating(fight.fighterAKey);
    const ratingB = getRating(fight.fighterBKey);
    const expectedA = expectedScore(ratingA, ratingB);
    const expectedB = 1 - expectedA;
    const actualA = fight.winner === "fighterA" ? 1 : 0;
    const pick: EloPick = Math.abs(expectedA - expectedB) < 0.000001
      ? "no-pick"
      : expectedA > expectedB
        ? "fighterA"
        : "fighterB";
    const correct = pick === "no-pick" ? null : pick === fight.winner;
    const nextA = ratingA + kFactor * (actualA - expectedA);
    const nextB = ratingB + kFactor * ((1 - actualA) - expectedB);

    fights.push({
      ...fight,
      fighterAEloBefore: round(ratingA, 1),
      fighterBEloBefore: round(ratingB, 1),
      eloDiff: round(ratingA - ratingB, 1),
      eloExpectedA: round(expectedA, 4),
      eloExpectedB: round(expectedB, 4),
      eloPick: pick,
      eloCorrect: correct,
      eloBrier: round(brier(expectedA, fight.winner), 4),
      fighterAEloAfter: round(nextA, 1),
      fighterBEloAfter: round(nextB, 1),
    });

    ratings.set(fight.fighterAKey, nextA);
    ratings.set(fight.fighterBKey, nextB);
  }

  return { fights, summary: summarizeElo(fights, kFactor) };
}

function summarizeElo(fights: EloFight[], kFactor: number): EloVariantSummary {
  const picked = fights.filter((fight) => fight.eloPick !== "no-pick");
  const correctPicked = picked.filter((fight) => fight.eloCorrect === true).length;
  const modelAndEloAgree = picked.filter((fight) => fight.modelPick === fight.eloPick).length;
  const modelAndEloDisagree = picked.length - modelAndEloAgree;
  const bothCorrect = picked.filter((fight) => fight.modelCorrect && fight.eloCorrect === true).length;
  const bothWrong = picked.filter((fight) => !fight.modelCorrect && fight.eloCorrect === false).length;
  const eloCorrectModelWrong = picked.filter((fight) => !fight.modelCorrect && fight.eloCorrect === true).length;
  const modelCorrectEloWrong = picked.filter((fight) => fight.modelCorrect && fight.eloCorrect === false).length;
  const noPick = fights.filter((fight) => fight.eloPick === "no-pick");

  return {
    kFactor,
    initialElo: INITIAL_ELO,
    totalFights: fights.length,
    picked: picked.length,
    noPick: noPick.length,
    coverage: pct(picked.length, fights.length),
    correctPicked,
    pickAccuracy: pct(correctPicked, picked.length),
    allFightAccuracy: pct(correctPicked, fights.length),
    brierScore: avgRounded(fights.map((fight) => fight.eloBrier), 3),
    averageAbsoluteEloDiff: avgRounded(fights.map((fight) => Math.abs(fight.eloDiff)), 1),
    agreement: {
      modelAndEloAgree,
      modelAndEloDisagree,
      eloCorrectModelWrong,
      modelCorrectEloWrong,
      bothCorrect,
      bothWrong,
      eloNoPick: noPick.length,
      eloNoPickModelCorrect: noPick.filter((fight) => fight.modelCorrect).length,
      eloNoPickModelWrong: noPick.filter((fight) => !fight.modelCorrect).length,
    },
  };
}

function recommendation(defaultSummary: EloVariantSummary, modelBrier: number | null, modelAccuracy: number | null): { choice: "A" | "B" | "C" | "D"; label: string; rationale: string[] } {
  const beatsModelBrier = modelBrier != null && defaultSummary.brierScore != null && defaultSummary.brierScore < modelBrier;
  const beatsModelAccuracy = modelAccuracy != null && defaultSummary.pickAccuracy != null && defaultSummary.pickAccuracy >= modelAccuracy;

  if (beatsModelBrier && beatsModelAccuracy) {
    return {
      choice: "B",
      label: "model feature candidate",
      rationale: [
        "The simple chronological Elo baseline beats or matches v0.2 on both pick accuracy and Brier in this corpus.",
        "Do not promote it directly; test as a controlled v0.3 feature candidate first.",
      ],
    };
  }

  if ((defaultSummary.coverage ?? 0) < 85) {
    return {
      choice: "D",
      label: "needs larger sample",
      rationale: [
        "The simple Elo baseline has too many cold-start/no-pick fights on this corpus to treat as stable.",
        "Keep it as a tracked baseline and revisit after more chronological history is available.",
      ],
    };
  }

  return {
    choice: "A",
    label: "baseline only",
    rationale: [
      "The simple chronological Elo baseline is leakage-safe and useful context, but it does not clearly beat v0.2 on this corpus.",
      "Keep it in backend validation reports without changing production model outputs.",
    ],
  };
}

function main(): void {
  const predictionsFile = readJson<BacktestPredictionsFile>(repoPath("data/generated/backtests/predictions.json"));
  const summaryFile = readJson<SummaryFile>(repoPath("data/generated/backtests/summary.json"));
  const ledger = buildLedger(predictionsFile);
  const evaluated = Object.fromEntries(K_VALUES.map((k) => [String(k), evaluateElo(ledger, k)]));
  const defaultRun = evaluated[String(DEFAULT_K)];
  if (!defaultRun) throw new Error(`Missing default Elo K=${DEFAULT_K} run.`);

  const officialRecord = summaryFile.summary.baselines.officialRecord ?? summaryFile.summary.baselines.betterRecord;
  const comparison = {
    modelV02: {
      accuracy: summaryFile.summary.winnerAccuracy,
      brierScore: summaryFile.summary.brierScore,
      scoredFights: summaryFile.summary.scoredFights,
    },
    officialAsOfRecord: {
      label: officialRecord.label ?? "As-of UFC win percentage, any history",
      pickAccuracy: officialRecord.pickAccuracy ?? null,
      allFightAccuracy: "allFightAccuracy" in officialRecord ? officialRecord.allFightAccuracy : officialRecord.accuracy,
      coverage: officialRecord.coverage ?? null,
      brierScore: officialRecord.brierScore ?? null,
    },
    eloK32: {
      pickAccuracy: defaultRun.summary.pickAccuracy,
      allFightAccuracy: defaultRun.summary.allFightAccuracy,
      coverage: defaultRun.summary.coverage,
      brierScore: defaultRun.summary.brierScore,
    },
  };

  const generatedAt = new Date().toISOString();
  const baselineOutput = {
    generatedAt,
    modelVersion: predictionsFile.modelVersion,
    scope: "Backend-only chronological Elo baseline; not wired to production model or public UI.",
    settings: {
      initialElo: INITIAL_ELO,
      defaultKFactor: DEFAULT_K,
      testedKFactors: [...K_VALUES],
      expectedProbabilityFormula: "1 / (1 + 10 ^ ((EloB - EloA) / 400))",
      updateFormula: "newRating = oldRating + K * (actual - expected)",
    },
    ledger: {
      totalScoredFights: ledger.length,
      sortOrder: ["fightDate ascending", "eventName", "normalized event fights array order", "fightId"],
      limitation: "Exact intra-event bout chronology is not separately available; fight order uses the normalized event fights array. Fighters appear once per event in this corpus, so same-day ordering does not affect future-event ratings.",
    },
    summary: defaultRun.summary,
    fights: defaultRun.fights,
  };

  const summaryOutput = {
    generatedAt,
    modelVersion: predictionsFile.modelVersion,
    settings: baselineOutput.settings,
    ledger: baselineOutput.ledger,
    comparison,
    kSensitivity: K_VALUES.map((k) => evaluated[String(k)].summary),
    agreementDisagreement: defaultRun.summary.agreement,
    recommendation: recommendation(defaultRun.summary, summaryFile.summary.brierScore, summaryFile.summary.winnerAccuracy),
  };

  writeJsonAtomic(repoPath("data/generated/backtests/elo-baseline.json"), baselineOutput);
  writeJsonAtomic(repoPath("data/generated/backtests/elo-summary.json"), summaryOutput);

  console.log("Wrote data/generated/backtests/elo-baseline.json");
  console.log("Wrote data/generated/backtests/elo-summary.json");
  console.log(`Ledger fights: ${ledger.length}`);
  for (const k of K_VALUES) {
    const result = evaluated[String(k)].summary;
    console.log(
      `K=${k}: ${result.pickAccuracy ?? "n/a"}% picked / ${result.allFightAccuracy ?? "n/a"}% all fights` +
      ` · coverage ${result.coverage ?? "n/a"}% · Brier ${result.brierScore ?? "n/a"}`,
    );
  }
}

main();

