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

function valueFromPreview(preview, label, fighterIndex) {
  const row = preview?.rows?.find((item) => item.label.toLowerCase() === label.toLowerCase());
  if (!row) return null;
  return fighterIndex === 0 ? row.fighterA : row.fighterB;
}

function scoreFromCareerStats(careerStats = {}, opponentQualityScore = null) {
  const slpm = careerStats.slpm;
  const sapm = careerStats.sapm;
  const strDef = careerStats.strikingDefense;
  const tdAvg = careerStats.takedownAverage;
  const tdAcc = careerStats.takedownAccuracy;
  const tdDef = careerStats.takedownDefense;
  const subAvg = careerStats.submissionAverage;

  return {
    strikingVolume: clamp((slpm / 7) * 100),
    strikingDefense: clamp((strDef ?? 0) * 0.7 + Math.max(0, 100 - (sapm ?? 5) * 14) * 0.3),
    wrestlingOffense: clamp(Math.min(100, (tdAvg / 6) * 100) * 0.65 + (tdAcc ?? 0) * 0.35),
    takedownDefense: clamp(tdDef),
    controlThreat: clamp(Math.min(100, (tdAvg / 6) * 100) * 0.72 + Math.min(100, (subAvg / 2.5) * 100) * 0.28),
    submissionThreat: clamp((subAvg / 2.5) * 100),
    opponentQuality: clamp(opponentQualityScore),
    provenance: "derived",
    note: "Derived from UFCStats career rates plus manual opponent-quality snapshot. Missing source fields stay null."
  };
}

function historyWithoutUpcoming(profile) {
  return (profile?.fightHistory ?? []).filter((fight) => fight.result && fight.result !== "next");
}

function buildRoundModel(profile, averageFightTimeText) {
  const history = historyWithoutUpcoming(profile);
  const wins = history.filter((fight) => fight.result === "win");
  const roundOneWins = wins.filter((fight) => fight.round === 1).length;
  const lateSamples = history.filter((fight) => (fight.round ?? 0) >= 3).length;
  const averageFightSeconds = parseClockToSeconds(averageFightTimeText);

  const earlyThreat = clamp((roundOneWins / Math.max(1, wins.length)) * 70 + Math.min(30, wins.length * 3), 0, 100);
  const lateEvidence = clamp(lateSamples * 18 + Math.min(28, (averageFightSeconds ?? 0) / 45), 0, 100);

  return {
    completedHistoryCount: history.length,
    winCount: wins.length,
    roundOneWinCount: roundOneWins,
    lateRoundSampleCount: lateSamples,
    averageFightTime: averageFightTimeText ?? null,
    earlyThreat,
    lateEvidence,
    interpretation: "Early finishes increase early-threat signal. Low late-round sample lowers confidence only; it is not scored as late-round weakness."
  };
}

function keyEdgesFromProfiles(a, b) {
  const statsA = a.careerStats ?? {};
  const statsB = b.careerStats ?? {};

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

function buildFighter(eventFighter, profile, override, fighterIndex, preview) {
  const averageFightTime = valueFromPreview(preview, "Average Fight Time", fighterIndex);
  const profileScore = scoreFromCareerStats(profile?.careerStats, override?.opponentQualityScore ?? null);

  return {
    id: slugify(override?.displayName ?? profile?.name ?? eventFighter.name),
    ufcstatsId: eventFighter.id,
    name: override?.displayName ?? profile?.name ?? eventFighter.name,
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
    careerStats: profile?.careerStats ?? null,
    styleProfile: profileScore,
    lastFive: historyWithoutUpcoming(profile)
      .slice(0, 5)
      .map((fight) => ({
        result: fight.result,
        opponent: fight.opponent?.name ?? null,
        method: fight.method,
        round: fight.round,
        time: fight.time,
        event: fight.event?.name ?? null,
        date: fight.event?.date ?? null,
        provenance: "sourced"
      })),
    roundModel: buildRoundModel(profile, averageFightTime),
    sourceCoverage: profile ? "ufcstats-profile-and-event" : "ufcstats-event-only"
  };
}

function buildFight(sourceFight, override, profilesById, detailsById, manualFighters) {
  const fightDetails = detailsById.get(sourceFight.id);
  const fighterAProfile = profilesById.get(sourceFight.fighterA.id);
  const fighterBProfile = profilesById.get(sourceFight.fighterB.id);
  const preview = fightDetails?.matchupPreview ?? null;
  const fighterA = buildFighter(sourceFight.fighterA, fighterAProfile, manualFighters[sourceFight.fighterA.id], 0, preview);
  const fighterB = buildFighter(sourceFight.fighterB, fighterBProfile, manualFighters[sourceFight.fighterB.id], 1, preview);

  return {
    id: override?.routeId ?? slugify(`${sourceFight.fighterA.name}-${sourceFight.fighterB.name}`),
    ufcstatsFightId: sourceFight.id,
    ufcstatsFightUrl: sourceFight.url,
    cardPlacement: override?.cardPlacement ?? "Main Card",
    rounds: override?.rounds ?? 3,
    weightClass: sourceFight.weightClass,
    status: sourceFight.status,
    styleClashLabel: override?.styleClashLabel ?? "style data pending",
    matchupQuestion: override?.matchupQuestion ?? "What shape does the source data create?",
    fightShapeSummary: override?.fightShapeSummary ?? "Source facts are available; manual fight-shape copy still needs review.",
    manualRead: override?.manualRead ?? null,
    fighters: { fighterA, fighterB },
    keyEdges: keyEdgesFromProfiles(fighterA, fighterB),
    paths: override?.paths ?? { fighterA: [], fighterB: [] },
    modelNotes: [
      "Round distribution is treated as tendency plus confidence, not as proof of skill or weakness.",
      "Early finish history raises early-threat signal only.",
      "Late-round scarcity means lower evidence, not an automatic late-round penalty."
    ],
    sourceMix: {
      eventStructure: "sourced",
      fighterProfiles: fighterAProfile && fighterBProfile ? "sourced" : "partial",
      styleTags: "manual",
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

  const profilesById = new Map(fighterProfiles.map((profile) => [profile.id, profile]));
  const detailsById = new Map(fightDetails.map((fight) => [fight.id, fight]));

  const normalized = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    event: {
      id: eventId,
      ufcstatsId: sourceEvent.id,
      name: sourceEvent.name,
      date: sourceEvent.date,
      location: sourceEvent.location,
      source: sourceEvent.source
    },
    assetPolicy: overrides.assetPolicy,
    modeling: {
      principle: "Make source stats easy to scan without pretending missing samples prove weakness.",
      formulas: {
        earlyThreat: "round-one wins as a share of sourced wins, softened by total completed sample",
        lateEvidence: "late-round appearances plus average fight time; confidence measure only",
        styleProfile: "UFCStats career rates normalized to 0-100 with manual opponent-quality snapshot"
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
