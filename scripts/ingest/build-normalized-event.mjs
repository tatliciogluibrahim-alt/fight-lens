#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_EVENT_ID = "ufc-328";
const GENERATED_ROOT = path.join(REPO_ROOT, "data/generated/ufcstats");
const NORMALIZED_ROOT = path.join(REPO_ROOT, "data/normalized/events");
const BANNED_NORMALIZED_KEYS = ["odds", "bet", "parlay", "lock", "moneyline", "spread"];

const styleMetricKeys = [
  "strikingVolume",
  "strikingDefense",
  "wrestlingOffense",
  "takedownDefense",
  "controlThreat",
  "submissionThreat",
  "cardioConsistency",
  "opponentQuality"
];

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath);
    const records = [];

    for (const entry of entries.filter((name) => name.endsWith(".json"))) {
      records.push(await readJson(path.join(dirPath, entry)));
    }

    return records;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(tempPath, filePath);
}

function parseClockToSeconds(value) {
  const match = cleanText(value).match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clamp(value, min = 0, max = 100) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function valueFromPreview(preview, label, fighterIndex) {
  const row = preview?.rows?.find((item) => item.label.toLowerCase() === label.toLowerCase());
  if (!row) return null;
  return fighterIndex === 0 ? row.fighterA : row.fighterB;
}

function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function scored(value, sourceFields) {
  const hasInput = sourceFields.some(hasNumber);
  return {
    value: hasInput ? clamp(value) : null,
    provenance: hasInput ? "derived" : "missing"
  };
}

function scoreFromCareerStats(careerStats = {}, opponentQualityScore = null) {
  const slpm = careerStats?.slpm;
  const sapm = careerStats?.sapm;
  const strDef = careerStats?.strikingDefense;
  const tdAvg = careerStats?.takedownAverage;
  const tdAcc = careerStats?.takedownAccuracy;
  const tdDef = careerStats?.takedownDefense;
  const subAvg = careerStats?.submissionAverage;

  const strikingVolume = scored((slpm / 7) * 100, [slpm]);
  const strikingDefense = scored((strDef ?? 0) * 0.7 + Math.max(0, 100 - (sapm ?? 5) * 14) * 0.3, [strDef, sapm]);
  const wrestlingOffense = scored(Math.min(100, ((tdAvg ?? 0) / 6) * 100) * 0.65 + (tdAcc ?? 0) * 0.35, [tdAvg, tdAcc]);
  const takedownDefense = scored(tdDef, [tdDef]);
  const controlThreat = scored(Math.min(100, ((tdAvg ?? 0) / 6) * 100) * 0.72 + Math.min(100, ((subAvg ?? 0) / 2.5) * 100) * 0.28, [tdAvg, subAvg]);
  const submissionThreat = scored(((subAvg ?? 0) / 2.5) * 100, [subAvg]);
  const cardioConsistency = scored((100 - Math.min(100, (sapm ?? 5) * 12)) * 0.35 + (strDef ?? 0) * 0.25 + Math.min(100, (slpm ?? 0) * 10) * 0.4, [slpm, sapm, strDef]);
  const opponentQuality = {
    value: clamp(opponentQualityScore),
    provenance: opponentQualityScore != null ? "manual" : "missing"
  };

  const metrics = {
    strikingVolume,
    strikingDefense,
    wrestlingOffense,
    takedownDefense,
    controlThreat,
    submissionThreat,
    cardioConsistency,
    opponentQuality
  };

  return {
    ...Object.fromEntries(styleMetricKeys.map((key) => [key, metrics[key].value])),
    provenance: Object.fromEntries(styleMetricKeys.map((key) => [key, metrics[key].provenance])),
    note: "Career-rate metrics are derived from UFCStats. Opponent quality remains manual until rankings/opponent tiers are modeled."
  };
}

function historyWithoutUpcoming(profile) {
  return (profile?.fightHistory ?? []).filter((fight) => fight.result && fight.result !== "next");
}

function statForFighter(row, fighterId) {
  return row?.stats?.find((stat) => stat?.fighter?.id === fighterId) ?? null;
}

function normalizeLandedAttempted(value) {
  if (!value) return null;
  return {
    landed: hasNumber(value.landed) ? value.landed : null,
    attempted: hasNumber(value.attempted) ? value.attempted : null,
    raw: value.raw ?? null
  };
}

function normalizeTotalsStat(stat) {
  if (!stat) return null;

  return {
    kd: stat.kd ?? null,
    significantStrikes: normalizeLandedAttempted(stat.significantStrikes),
    significantStrikePercent: stat.significantStrikePercent ?? null,
    totalStrikes: normalizeLandedAttempted(stat.totalStrikes),
    takedowns: normalizeLandedAttempted(stat.takedowns),
    takedownPercent: stat.takedownPercent ?? null,
    submissionAttempts: stat.submissionAttempts ?? null,
    reversals: stat.reversals ?? null,
    control: stat.control ?? null,
    controlSeconds: stat.controlSeconds ?? null
  };
}

function normalizeSignificantStat(stat) {
  if (!stat) return null;

  return {
    significantStrikes: normalizeLandedAttempted(stat.significantStrikes),
    significantStrikePercent: stat.significantStrikePercent ?? null,
    head: normalizeLandedAttempted(stat.head),
    body: normalizeLandedAttempted(stat.body),
    leg: normalizeLandedAttempted(stat.leg),
    distance: normalizeLandedAttempted(stat.distance),
    clinch: normalizeLandedAttempted(stat.clinch),
    ground: normalizeLandedAttempted(stat.ground)
  };
}

function totalsForFighter(detail, fighterId) {
  const totals = normalizeTotalsStat(statForFighter(detail?.totals, fighterId));
  const significant = normalizeSignificantStat(statForFighter(detail?.significantStrikes, fighterId));
  if (!totals && !significant) return null;
  return { totals, significant };
}

function roundStatsForFighter(detail, fighterId) {
  if (!detail?.roundStats?.length) return [];

  return detail.roundStats
    .map((roundRow) => {
      const sigRound = detail.significantStrikesByRound?.find((item) => item.round === roundRow.round);
      const totals = normalizeTotalsStat(statForFighter(roundRow, fighterId));
      const significant = normalizeSignificantStat(statForFighter(sigRound, fighterId));
      if (!totals && !significant) return null;
      return {
        round: roundRow.round,
        totals,
        significant
      };
    })
    .filter(Boolean);
}

/**
 * Find the opponent's fighter ID from a fight detail object.
 * The detail has stats for both fighters; we return the one that is NOT fighterId.
 */
function opponentIdFromDetail(detail, fighterId) {
  const stat = detail?.totals?.stats?.find(
    (s) => s?.fighter?.id && s.fighter.id !== fighterId
  );
  return stat?.fighter?.id ?? null;
}

function buildHistoryItem(fight, detail, fighterId) {
  const roundStats = roundStatsForFighter(detail, fighterId);
  const opponentId = opponentIdFromDetail(detail, fighterId);

  return {
    opponentName: fight.opponent?.name ?? null,
    opponentUrl: fight.opponent?.url ?? null,
    eventName: fight.event?.name ?? null,
    eventUrl: fight.event?.url ?? null,
    date: fight.event?.date ?? null,
    result: fight.result ?? null,
    method: fight.method ?? null,
    round: fight.round ?? null,
    time: fight.time ?? null,
    fightUrl: fight.fightUrl,
    totals: totalsForFighter(detail, fighterId),
    // Opponent totals — stored for as-of backtest computation of sapm, strikingDefense, takedownDefense.
    // Null when fight detail is unavailable or opponent ID cannot be identified.
    opponentTotals: opponentId ? totalsForFighter(detail, opponentId) : null,
    roundStats,
    source: "ufcstats",
    sourceUrl: fight.fightUrl
  };
}

function roundSignal(round) {
  const totals = round?.totals;
  if (!totals) return null;

  const significantLanded = totals.significantStrikes?.landed ?? 0;
  const totalLanded = totals.totalStrikes?.landed ?? 0;
  const takedownsLanded = totals.takedowns?.landed ?? 0;
  const controlSeconds = totals.controlSeconds ?? 0;
  const knockdowns = totals.kd ?? 0;
  const submissions = totals.submissionAttempts ?? 0;

  return significantLanded + totalLanded * 0.25 + takedownsLanded * 5 + controlSeconds / 25 + knockdowns * 8 + submissions * 5;
}

function normalizeRoundSignal(value) {
  return clamp(18 + value * 2.15);
}

function buildRoundModel(historyItems, scheduledRounds) {
  const detailedRounds = historyItems.flatMap((fight) => fight.roundStats ?? []);
  const roundSampleCount = detailedRounds.length;
  const roundScores = [];

  for (let round = 1; round <= scheduledRounds; round += 1) {
    const signals = detailedRounds
      .filter((item) => item.round === round)
      .map(roundSignal)
      .filter(hasNumber);
    const avgSignal = average(signals);

    roundScores.push({
      round,
      sampleCount: signals.length,
      score: avgSignal == null ? null : normalizeRoundSignal(avgSignal)
    });
  }

  const roundOneScore = roundScores.find((item) => item.round === 1);
  const lateRoundSamples = detailedRounds.filter((item) => item.round >= 3).length;
  const lateSignals = detailedRounds
    .filter((item) => item.round >= 3)
    .map(roundSignal)
    .filter(hasNumber);
  const averageLateSignal = average(lateSignals);

  return {
    roundSampleCount,
    lateRoundSampleCount: lateRoundSamples,
    earlyThreat: roundOneScore?.score ?? null,
    lateEvidence: averageLateSignal == null ? null : clamp(24 + lateRoundSamples * 5 + averageLateSignal * 1.2),
    roundScores,
    hasEnoughForTrend: Boolean(roundOneScore?.score != null && lateRoundSamples >= 3),
    interpretation: "Round trend uses fetched UFCStats fight-detail rounds only. Missing rounds stay missing."
  };
}

function keyEdgesFromProfiles(a, b) {
  const statsA = a.aggregateStats ?? {};
  const statsB = b.aggregateStats ?? {};

  return [
    ["SLpM", "strikes landed/min", statsA.slpm, statsB.slpm],
    ["Str. Def", "striking defense", statsA.strikingDefense, statsB.strikingDefense],
    ["TD Avg", "takedowns/15", statsA.takedownAverage, statsB.takedownAverage],
    ["TD Acc", "takedown accuracy", statsA.takedownAccuracy, statsB.takedownAccuracy],
    ["TD Def", "takedown defense", statsA.takedownDefense, statsB.takedownDefense],
    ["Sub Avg", "sub attempts/15", statsA.submissionAverage, statsB.submissionAverage]
  ].map(([shortLabel, label, fighterA, fighterB]) => ({
    shortLabel,
    label,
    fighterA: fighterA ?? null,
    fighterB: fighterB ?? null,
    provenance: fighterA != null || fighterB != null ? "sourced" : "missing"
  }));
}

function buildDataCompleteness(profile, historyItems, roundModel) {
  const lastFiveCount = historyItems.slice(0, 5).length;
  const hasFightTotals = historyItems.some((fight) => Boolean(fight.totals?.totals));
  const hasRoundStats = roundModel.roundSampleCount > 0;

  return {
    hasProfile: Boolean(profile),
    hasFightHistory: historyItems.length > 0,
    hasFightTotals,
    hasRoundStats,
    lastFiveCount,
    roundSampleCount: roundModel.roundSampleCount,
    lateRoundSampleCount: roundModel.lateRoundSampleCount
  };
}

function buildFighter(eventFighter, profile, override, fighterIndex, preview, detailsById, scheduledRounds) {
  const historyItems = historyWithoutUpcoming(profile).map((fight) =>
    buildHistoryItem(fight, detailsById.get(fight.fightId), eventFighter.id)
  );
  const averageFightTime = valueFromPreview(preview, "Average Fight Time", fighterIndex);
  const roundModel = buildRoundModel(historyItems.slice(0, 5), scheduledRounds);

  return {
    id: slugify(override?.displayName ?? profile?.name ?? eventFighter.name),
    ufcstatsId: eventFighter.id,
    name: override?.displayName ?? profile?.name ?? eventFighter.name,
    nickname: profile?.nickname ?? null,
    ranking: override?.ranking ?? null,
    record: profile?.record ?? valueFromPreview(preview, "Wins/Losses/Draws", fighterIndex) ?? null,
    height: profile?.height ?? valueFromPreview(preview, "Height", fighterIndex) ?? null,
    weight: profile?.weight ?? valueFromPreview(preview, "Weight", fighterIndex) ?? null,
    reach: profile?.reach ?? valueFromPreview(preview, "Reach", fighterIndex) ?? null,
    stance: profile?.stance ?? valueFromPreview(preview, "Stance", fighterIndex) ?? null,
    dob: profile?.dob ?? valueFromPreview(preview, "DOB", fighterIndex) ?? null,
    country: override?.country ?? null,
    image: override?.image ?? {
      url: null,
      status: "pending_licensed_asset",
      credit: null
    },
    ufcstatsUrl: eventFighter.url,
    source: "ufcstats",
    sourceUrl: eventFighter.url,
    scrapedAt: profile?.source?.fetchedAt ?? null,
    aggregateStats: profile?.careerStats ?? null,
    styleProfile: scoreFromCareerStats(profile?.careerStats, override?.opponentQualityScore ?? null),
    fightHistory: historyItems,
    lastFive: historyItems.slice(0, 5),
    resumeHeat: null,
    roundModel: {
      ...roundModel,
      averageFightTime: averageFightTime ?? null
    },
    dataCompleteness: buildDataCompleteness(profile, historyItems, roundModel),
    sourceCoverage: profile ? "ufcstats-profile-and-event" : "ufcstats-event-only"
  };
}

function buildFight(sourceFight, override, profilesById, detailsById, manualFighters) {
  const fightDetails = detailsById.get(sourceFight.id);
  const rounds = override?.rounds ?? 3;
  const preview = fightDetails?.matchupPreview ?? null;
  const fighterA = buildFighter(sourceFight.fighterA, profilesById.get(sourceFight.fighterA.id), manualFighters[sourceFight.fighterA.id], 0, preview, detailsById, rounds);
  const fighterB = buildFighter(sourceFight.fighterB, profilesById.get(sourceFight.fighterB.id), manualFighters[sourceFight.fighterB.id], 1, preview, detailsById, rounds);

  return {
    id: override?.routeId ?? slugify(`${sourceFight.fighterA.name}-${sourceFight.fighterB.name}`),
    ufcstatsFightId: sourceFight.id,
    ufcstatsFightUrl: sourceFight.url,
    cardPlacement: override?.cardPlacement ?? "Main Card",
    rounds,
    weightClass: override?.weightClass ?? sourceFight.weightClass,
    status: sourceFight.status,
    styleClashLabel: override?.styleClashLabel ?? null,
    matchupQuestion: override?.matchupQuestion ?? null,
    fightShapeSummary: override?.fightShapeSummary ?? null,
    manualRead: override?.manualRead ?? null,
    contextNotes: override?.contextNotes ?? null,
    fighters: { fighterA, fighterB },
    keyEdges: keyEdgesFromProfiles(fighterA, fighterB),
    paths: override?.paths ?? null,
    sourceMix: {
      eventStructure: "sourced",
      fighterProfiles: fighterA.dataCompleteness.hasProfile && fighterB.dataCompleteness.hasProfile ? "sourced" : "partial",
      styleMetrics: "derived",
      styleTags: override?.styleClashLabel ? "manual" : "missing",
      fightShapeCopy: override?.fightShapeSummary ? "manual" : "missing",
      paths: override?.paths ? "manual" : "missing",
      images: "manual-required"
    }
  };
}

function validateNormalizedEvent(event) {
  const errors = [];
  const serialized = JSON.stringify(event).toLowerCase();

  for (const bannedKey of BANNED_NORMALIZED_KEYS) {
    if (serialized.includes(`"${bannedKey}"`)) {
      errors.push(`Normalized data contains banned key: ${bannedKey}`);
    }
  }

  if (!event.fights.length) errors.push("Event has no fights.");

  for (const fight of event.fights) {
    if (!fight.id) errors.push("Fight is missing id.");
    if (!fight.fighters?.fighterA?.name || !fight.fighters?.fighterB?.name) {
      errors.push(`Fight ${fight.id} is missing fighter names.`);
    }
    if (!fight.fighters?.fighterA?.dataCompleteness || !fight.fighters?.fighterB?.dataCompleteness) {
      errors.push(`Fight ${fight.id} is missing data completeness.`);
    }
    if (!fight.sourceMix) errors.push(`Fight ${fight.id} is missing sourceMix.`);
  }

  if (errors.length) {
    throw new Error(`Normalized event failed validation:\n- ${errors.join("\n- ")}`);
  }
}

async function buildNormalizedEvent(eventId) {
  const overridePath = path.join(REPO_ROOT, "data/manual", `${eventId}.overrides.json`);
  const overrides = await readJson(overridePath);
  const sourceEvent = await readJson(path.join(REPO_ROOT, overrides.sourceEventFile));
  const fighterProfiles = await readJsonFiles(path.join(GENERATED_ROOT, "fighters"));
  const fightDetails = await readJsonFiles(path.join(GENERATED_ROOT, "fights"));
  const eventOverride = overrides.event ?? {};

  const profilesById = new Map(fighterProfiles.map((profile) => [profile.id, profile]));
  const detailsById = new Map(fightDetails.map((fight) => [fight.id, fight]));

  const normalized = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    event: {
      id: eventId,
      ufcstatsId: sourceEvent.id,
      shortName: eventOverride.shortName,
      name: eventOverride.name ?? sourceEvent.name,
      date: eventOverride.date ?? sourceEvent.date,
      location: eventOverride.location ?? sourceEvent.location,
      venue: eventOverride.venue,
      broadcast: eventOverride.broadcast,
      mainCardTime: eventOverride.mainCardTime,
      mainEvent: eventOverride.mainEvent,
      featuredBouts: eventOverride.featuredBouts,
      promotion: "UFC",
      source: eventOverride.source ?? sourceEvent.source
    },
    assetPolicy: overrides.assetPolicy,
    modeling: {
      principle: "Use sourced UFCStats values where available, derived signals where formulas are documented, manual context where public sources do not provide it, and empty states where evidence is insufficient.",
      formulas: {
        styleProfile: "Career-rate metrics are normalized to 0-100 from UFCStats profile rates. Opponent quality remains manual.",
        roundTrend: "Fetched fight-detail rounds only: significant strikes + total strikes * 0.25 + takedowns * 5 + control seconds / 25 + knockdowns * 8 + submission attempts * 5.",
        roundTrendGate: "A round trend chart requires earlyThreat plus at least 3 late-round samples for each fighter."
      }
    },
    fights: sourceEvent.fights.map((sourceFight) =>
      buildFight(
        sourceFight,
        overrides.fights[sourceFight.id],
        profilesById,
        detailsById,
        overrides.fighters
      )
    )
  };

  validateNormalizedEvent(normalized);

  const outputPath = path.join(NORMALIZED_ROOT, `${eventId}.json`);
  await writeJsonAtomic(outputPath, normalized);
  console.log(`Wrote normalized event: ${path.relative(REPO_ROOT, outputPath)} (${normalized.fights.length} fights)`);
}

const eventId = process.argv.includes("--event")
  ? process.argv[process.argv.indexOf("--event") + 1]
  : DEFAULT_EVENT_ID;

buildNormalizedEvent(eventId).catch((error) => {
  console.error("\nNormalization stopped safely.");
  console.error(error.message);
  process.exitCode = 1;
});
