#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_EVENT_ID = "ufc-328";
const GENERATED_ROOT = path.join(REPO_ROOT, "data/generated/ufcstats");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text.endsWith("\n") ? text : `${text}\n`);
}

function fighterReport(fighter) {
  return {
    id: fighter.id,
    ufcstatsId: fighter.ufcstatsId,
    name: fighter.name,
    matchedUfcStats: fighter.dataCompleteness.hasProfile,
    hasFightHistory: fighter.dataCompleteness.hasFightHistory,
    hasFightTotals: fighter.dataCompleteness.hasFightTotals,
    hasRoundStats: fighter.dataCompleteness.hasRoundStats,
    lastFiveCount: fighter.dataCompleteness.lastFiveCount,
    roundSampleCount: fighter.dataCompleteness.roundSampleCount,
    lateRoundSampleCount: fighter.dataCompleteness.lateRoundSampleCount,
    sourceUrl: fighter.sourceUrl
  };
}

function moduleState(fight) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  return {
    fightShape: fight.fightShapeSummary ? "display" : "empty",
    styleClash: Object.values(fighterA.styleProfile.provenance).some((value) => value !== "missing") &&
      Object.values(fighterB.styleProfile.provenance).some((value) => value !== "missing")
      ? "display"
      : "empty",
    formResume: fighterA.dataCompleteness.lastFiveCount > 0 || fighterB.dataCompleteness.lastFiveCount > 0
      ? "display"
      : "empty",
    roundTrend: fighterA.roundModel.hasEnoughForTrend && fighterB.roundModel.hasEnoughForTrend
      ? "display"
      : "empty",
    tacticalRoutes: fight.paths ? "display" : "empty",
    resumeHeat: "empty"
  };
}

function buildReport(eventData) {
  const fighters = eventData.fights.flatMap((fight) => [fight.fighters.fighterA, fight.fighters.fighterB]);
  const uniqueFighters = Array.from(new Map(fighters.map((fighter) => [fighter.ufcstatsId, fighter])).values());

  return {
    eventId: eventData.event.id,
    eventName: eventData.event.name,
    generatedAt: new Date().toISOString(),
    normalizedGeneratedAt: eventData.generatedAt,
    summary: {
      fights: eventData.fights.length,
      fighters: uniqueFighters.length,
      matchedFighters: uniqueFighters.filter((fighter) => fighter.dataCompleteness.hasProfile).length,
      fightersWithHistory: uniqueFighters.filter((fighter) => fighter.dataCompleteness.hasFightHistory).length,
      fightersWithRoundStats: uniqueFighters.filter((fighter) => fighter.dataCompleteness.hasRoundStats).length
    },
    fighterSlugMap: Object.fromEntries(uniqueFighters.map((fighter) => [fighter.id, fighter.name])),
    fightCardMap: Object.fromEntries(
      eventData.fights.map((fight) => [
        fight.id,
        {
          fighterA: fight.fighters.fighterA.name,
          fighterB: fight.fighters.fighterB.name,
          ufcstatsFightUrl: fight.ufcstatsFightUrl,
          cardPlacement: fight.cardPlacement
        }
      ])
    ),
    missingFighterReport: uniqueFighters
      .filter((fighter) => !fighter.dataCompleteness.hasProfile)
      .map((fighter) => fighterReport(fighter)),
    fighters: uniqueFighters.map(fighterReport),
    fights: eventData.fights.map((fight) => ({
      id: fight.id,
      label: `${fight.fighters.fighterA.name} vs. ${fight.fighters.fighterB.name}`,
      modules: moduleState(fight),
      fighterA: fighterReport(fight.fighters.fighterA),
      fighterB: fighterReport(fight.fighters.fighterB)
    }))
  };
}

function markdownReport(report) {
  const lines = [
    `# ${report.eventName} UFCStats Data Report`,
    "",
    `Generated: ${report.generatedAt}`,
    `Normalized data generated: ${report.normalizedGeneratedAt}`,
    "",
    "## Summary",
    "",
    `- Fights: ${report.summary.fights}`,
    `- Fighters: ${report.summary.fighters}`,
    `- UFCStats profile matches: ${report.summary.matchedFighters}/${report.summary.fighters}`,
    `- Fighters with sourced fight history: ${report.summary.fightersWithHistory}/${report.summary.fighters}`,
    `- Fighters with fetched round stats: ${report.summary.fightersWithRoundStats}/${report.summary.fighters}`,
    "",
    "## Fighters",
    "",
    "| Fighter | Profile | History | Round samples | Late samples |",
    "| --- | --- | --- | ---: | ---: |",
    ...report.fighters.map((fighter) =>
      `| ${fighter.name} | ${fighter.matchedUfcStats ? "matched" : "missing"} | ${fighter.lastFiveCount} recent | ${fighter.roundSampleCount} | ${fighter.lateRoundSampleCount} |`
    ),
    "",
    "## Module Display Plan",
    "",
    "| Fight | Fight Shape | Style Clash | Form + Resume | Round Trend | Routes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.fights.map((fight) =>
      `| ${fight.label} | ${fight.modules.fightShape} | ${fight.modules.styleClash} | ${fight.modules.formResume} | ${fight.modules.roundTrend} | ${fight.modules.tacticalRoutes} |`
    )
  ];

  if (report.missingFighterReport.length) {
    lines.push("", "## Missing Fighters", "");
    for (const fighter of report.missingFighterReport) {
      lines.push(`- ${fighter.name}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const eventId = process.argv.includes("--event")
    ? process.argv[process.argv.indexOf("--event") + 1]
    : DEFAULT_EVENT_ID;
  const eventData = await readJson(path.join(REPO_ROOT, "data/normalized/events", `${eventId}.json`));
  const report = buildReport(eventData);

  const reportJsonPath = path.join(GENERATED_ROOT, "reports", `${eventId}-data-report.json`);
  const reportMdPath = path.join(GENERATED_ROOT, "reports", `${eventId}-data-report.md`);
  const indexPath = path.join(GENERATED_ROOT, "index", `${eventId}.index.json`);

  await writeJson(reportJsonPath, report);
  await writeText(reportMdPath, markdownReport(report));
  await writeJson(indexPath, {
    eventId: report.eventId,
    eventName: report.eventName,
    generatedAt: report.generatedAt,
    fighterSlugMap: report.fighterSlugMap,
    fightCardMap: report.fightCardMap,
    missingFighterReport: report.missingFighterReport
  });

  console.log(`Wrote report: ${path.relative(REPO_ROOT, reportMdPath)}`);
  console.log(`Wrote report data: ${path.relative(REPO_ROOT, reportJsonPath)}`);
  console.log(`Wrote index: ${path.relative(REPO_ROOT, indexPath)}`);
}

main().catch((error) => {
  console.error("\nReport generation stopped safely.");
  console.error(error.message);
  process.exitCode = 1;
});
