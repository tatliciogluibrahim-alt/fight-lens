#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MANUAL_PATH = path.join(REPO_ROOT, "data/manual/islam-jdm.backtest.json");
const OUTPUT_PATH = path.join(REPO_ROOT, "data/normalized/backtests/islam-jdm.json");

const MONTHS = {
  jan: 0,
  "jan.": 0,
  feb: 1,
  "feb.": 1,
  mar: 2,
  "mar.": 2,
  apr: 3,
  "apr.": 3,
  may: 4,
  "may.": 4,
  jun: 5,
  "jun.": 5,
  jul: 6,
  "jul.": 6,
  aug: 7,
  "aug.": 7,
  sep: 8,
  "sep.": 8,
  oct: 9,
  "oct.": 9,
  nov: 10,
  "nov.": 10,
  dec: 11,
  "dec.": 11
};

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function clamp(value, min = 0, max = 100) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function readJson(relativeOrAbsolutePath) {
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(REPO_ROOT, relativeOrAbsolutePath);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJsonAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(tempPath, filePath);
}

function parseUfcStatsDate(value) {
  const text = cleanText(value).replace(",", "");
  const [monthText, dayText, yearText] = text.split(" ");
  const month = MONTHS[monthText?.toLowerCase()];
  const day = Number(dayText);
  const year = Number(yearText);

  if (month == null || !day || !year) return null;
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function timeToSeconds(value) {
  const match = cleanText(value).match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function firstNumber(values) {
  const first = Array.isArray(values) ? values[0] : values;
  const parsed = Number(cleanText(first).match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fightDurationSeconds(fight) {
  return Math.max(0, ((fight.round ?? 1) - 1) * 300 + timeToSeconds(fight.time));
}

function isDecision(method) {
  return /dec/i.test(cleanText(method));
}

function preFightHistory(profile, cutoffDate, actualFightId) {
  return profile.fightHistory
    .map((fight) => ({
      ...fight,
      isoDate: parseUfcStatsDate(fight.event?.date)
    }))
    .filter((fight) => {
      if (!fight.isoDate) return false;
      if (fight.fightId === actualFightId) return false;
      return fight.isoDate < cutoffDate;
    });
}

function buildPreFightModel(profile, manualFighter, history) {
  const wins = history.filter((fight) => fight.result === "win");
  const losses = history.filter((fight) => fight.result === "loss");
  const roundOneWins = wins.filter((fight) => fight.round === 1).length;
  const finishes = wins.filter((fight) => !isDecision(fight.method)).length;
  const lateSamples = history.filter((fight) => (fight.round ?? 0) >= 3).length;
  const durations = history.map(fightDurationSeconds);
  const avgDurationSeconds = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 0;
  const avgSigLanded = history.length
    ? history.reduce((sum, fight) => sum + firstNumber(fight.significantStrikes), 0) / history.length
    : 0;
  const avgTdLanded = history.length
    ? history.reduce((sum, fight) => sum + firstNumber(fight.takedowns), 0) / history.length
    : 0;
  const avgSubAttempts = history.length
    ? history.reduce((sum, fight) => sum + firstNumber(fight.submissions), 0) / history.length
    : 0;
  const winRate = wins.length / Math.max(1, history.length);
  const roundOneWinRate = roundOneWins / Math.max(1, wins.length);
  const finishRate = finishes / Math.max(1, wins.length);
  const lateSampleRate = lateSamples / Math.max(1, history.length);
  const strikingActivity = clamp(avgSigLanded * 1.35 + winRate * 18);
  const priors = manualFighter.priors ?? {};
  const p4pBonus = priors.poundForPoundRank ? Math.max(0, 12 - priors.poundForPoundRank * 2) : 0;
  const opponentQualityAdjustment = ((priors.opponentQuality ?? 70) - 70) * 0.25;
  const strikingSignal = clamp(
    strikingActivity * 0.55 +
      (priors.strikingSkill ?? strikingActivity) * 0.35 +
      p4pBonus +
      opponentQualityAdjustment
  );

  return {
    id: profile.id,
    name: manualFighter.displayName,
    shortName: manualFighter.shortName,
    role: manualFighter.role,
    country: manualFighter.country ?? null,
    priors,
    image: manualFighter.image,
    sourceRecord: profile.record,
    sample: {
      cutoffDate: history[0]?.isoDate ? "before fight date" : "limited",
      fights: history.length,
      wins: wins.length,
      losses: losses.length,
      roundOneWins,
      finishes,
      lateSamples,
      averageFightSeconds: avgDurationSeconds
    },
    rawTendencies: {
      avgSigLanded: Number(avgSigLanded.toFixed(1)),
      avgTdLanded: Number(avgTdLanded.toFixed(1)),
      avgSubAttempts: Number(avgSubAttempts.toFixed(1)),
      winRate: Number((winRate * 100).toFixed(1)),
      roundOneWinRate: Number((roundOneWinRate * 100).toFixed(1)),
      finishRate: Number((finishRate * 100).toFixed(1)),
      lateSampleRate: Number((lateSampleRate * 100).toFixed(1)),
      strikingActivity
    },
    modelScores: {
      strikingVolume: strikingSignal,
      wrestlingPressure: clamp(avgTdLanded * 24 + avgSubAttempts * 12 + winRate * 18),
      finishUrgency: clamp(roundOneWinRate * 68 + finishRate * 32),
      lateEvidence: clamp(lateSampleRate * 62 + Math.min(38, avgDurationSeconds / 36)),
      controlReliability: clamp(avgTdLanded * 22 + lateSampleRate * 24 + winRate * 16)
    },
    modelScoreNotes: {
      strikingVolume: "Context-adjusted striking signal = 55% sourced striking activity + 35% manual striking-skill prior + small pound-for-pound/opponent-quality adjustment."
    },
    lastFiveBeforeFight: history.slice(0, 5).map((fight) => ({
      result: fight.result,
      opponent: fight.opponent?.name ?? null,
      method: fight.method,
      round: fight.round,
      time: fight.time,
      event: fight.event?.name ?? null,
      date: fight.event?.date ?? null
    }))
  };
}

function statForFighter(fightDetail, fighterId, field) {
  return fightDetail.totals?.stats?.find((item) => item.fighter?.id === fighterId)?.[field] ?? null;
}

function landedFor(value) {
  return value?.landed ?? 0;
}

function buildActualResult(fightDetail, islamId, jdmId) {
  const islamTotals = fightDetail.totals.stats.find((item) => item.fighter.id === islamId);
  const jdmTotals = fightDetail.totals.stats.find((item) => item.fighter.id === jdmId);

  const rounds = fightDetail.roundStats.map((round) => {
    const islam = round.stats.find((item) => item.fighter.id === islamId);
    const jdm = round.stats.find((item) => item.fighter.id === jdmId);
    const islamScore =
      landedFor(islam?.significantStrikes) + (islam?.controlSeconds ?? 0) / 30 + landedFor(islam?.takedowns) * 5;
    const jdmScore =
      landedFor(jdm?.significantStrikes) + (jdm?.controlSeconds ?? 0) / 30 + landedFor(jdm?.takedowns) * 5;

    return {
      round: round.round,
      islamScore: Number(islamScore.toFixed(1)),
      jdmScore: Number(jdmScore.toFixed(1)),
      marginToIslam: Number((islamScore - jdmScore).toFixed(1)),
      islam: {
        sigLanded: landedFor(islam?.significantStrikes),
        takedowns: landedFor(islam?.takedowns),
        controlSeconds: islam?.controlSeconds ?? 0
      },
      jdm: {
        sigLanded: landedFor(jdm?.significantStrikes),
        takedowns: landedFor(jdm?.takedowns),
        controlSeconds: jdm?.controlSeconds ?? 0
      }
    };
  });

  return {
    method: fightDetail.result.method,
    round: fightDetail.result.round,
    time: fightDetail.result.time,
    title: fightDetail.title,
    totals: {
      islam: {
        sigLanded: landedFor(statForFighter(fightDetail, islamId, "significantStrikes")),
        sigAttempts: statForFighter(fightDetail, islamId, "significantStrikes")?.attempted ?? 0,
        totalLanded: landedFor(statForFighter(fightDetail, islamId, "totalStrikes")),
        takedowns: landedFor(statForFighter(fightDetail, islamId, "takedowns")),
        takedownAttempts: statForFighter(fightDetail, islamId, "takedowns")?.attempted ?? 0,
        controlSeconds: islamTotals.controlSeconds ?? 0
      },
      jdm: {
        sigLanded: landedFor(statForFighter(fightDetail, jdmId, "significantStrikes")),
        sigAttempts: statForFighter(fightDetail, jdmId, "significantStrikes")?.attempted ?? 0,
        totalLanded: landedFor(statForFighter(fightDetail, jdmId, "totalStrikes")),
        takedowns: landedFor(statForFighter(fightDetail, jdmId, "takedowns")),
        takedownAttempts: statForFighter(fightDetail, jdmId, "takedowns")?.attempted ?? 0,
        controlSeconds: jdmTotals.controlSeconds ?? 0
      }
    },
    rounds
  };
}

function buildComparisons(islamModel, jdmModel, actual) {
  const preFight = [
    {
      label: "striking signal",
      islam: islamModel.modelScores.strikingVolume,
      jdm: jdmModel.modelScores.strikingVolume,
      actualIslam: actual.totals.islam.sigLanded,
      actualJdm: actual.totals.jdm.sigLanded,
      unit: "sig"
    },
    {
      label: "wrestling pressure",
      islam: islamModel.modelScores.wrestlingPressure,
      jdm: jdmModel.modelScores.wrestlingPressure,
      actualIslam: actual.totals.islam.takedowns,
      actualJdm: actual.totals.jdm.takedowns,
      unit: "td"
    },
    {
      label: "control reliability",
      islam: islamModel.modelScores.controlReliability,
      jdm: jdmModel.modelScores.controlReliability,
      actualIslam: Math.round(actual.totals.islam.controlSeconds / 60),
      actualJdm: Math.round(actual.totals.jdm.controlSeconds / 60),
      unit: "min ctrl"
    },
    {
      label: "late evidence",
      islam: islamModel.modelScores.lateEvidence,
      jdm: jdmModel.modelScores.lateEvidence,
      actualIslam: actual.rounds.filter((round) => round.marginToIslam > 0).length,
      actualJdm: actual.rounds.filter((round) => round.marginToIslam < 0).length,
      unit: "rounds"
    }
  ];

  return preFight.map((row) => ({
    ...row,
    preFightLeader: row.islam >= row.jdm ? "Islam" : "JDM",
    actualLeader: row.actualIslam >= row.actualJdm ? "Islam" : "JDM",
    read:
      row.islam >= row.jdm === row.actualIslam >= row.actualJdm
        ? "confirmed"
        : "missed or flipped under fight conditions"
  }));
}

async function main() {
  const manual = await readJson(MANUAL_PATH);
  const event = await readJson(manual.eventFile);
  const fightDetail = await readJson(manual.fightFile);
  const islamProfile = await readJson(manual.fighterFiles.islam);
  const jdmProfile = await readJson(manual.fighterFiles.jdm);

  const islamHistory = preFightHistory(islamProfile, manual.cutoffDate, manual.actualFightId);
  const jdmHistory = preFightHistory(jdmProfile, manual.cutoffDate, manual.actualFightId);
  const islamModel = buildPreFightModel(islamProfile, manual.fighters.islam, islamHistory);
  const jdmModel = buildPreFightModel(jdmProfile, manual.fighters.jdm, jdmHistory);
  const actual = buildActualResult(fightDetail, islamProfile.id, jdmProfile.id);

  const backtest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    id: manual.id,
    title: manual.title,
    event: {
      name: event.name,
      date: event.date,
      location: event.location,
      source: event.source
    },
    fight: {
      id: manual.actualFightId,
      source: fightDetail.source,
      cutoffDate: manual.cutoffDate,
      question: manual.manualContext.question,
      keyRead: manual.manualContext.keyRead,
      modelCaveat: manual.manualContext.modelCaveat
    },
    fighters: {
      islam: islamModel,
      jdm: jdmModel
    },
    comparisons: buildComparisons(islamModel, jdmModel, actual),
    actual,
    modelingNotes: [
      "The pre-fight model excludes the Islam vs JDM fight and any later fights from fighter histories.",
      "Round-one wins raise finish urgency but do not create a late-round weakness.",
      "Striking signal is context-adjusted so low-volume grappling wins are not scored as low-skill striking.",
      "Late evidence is a confidence measure based on sampled rounds and fight duration.",
      "Actual dominance score per round = sig strikes landed + control seconds / 30 + takedowns * 5."
    ]
  };

  await writeJsonAtomic(OUTPUT_PATH, backtest);
  console.log(`Wrote backtest: ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error("\nBacktest normalization stopped safely.");
  console.error(error.message);
  process.exitCode = 1;
});
