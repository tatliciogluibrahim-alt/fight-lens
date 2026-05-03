#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_EVENT_ID = "ufc-328";
const REPORT_ROOT = path.join(REPO_ROOT, "data/generated/ufcstats/reports");

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

function hasAggregateStats(fighter) {
  return Boolean(
    fighter.aggregateStats &&
      fighter.aggregateStats.slpm != null &&
      fighter.aggregateStats.strikingDefense != null &&
      fighter.aggregateStats.takedownAverage != null &&
      fighter.aggregateStats.takedownDefense != null
  );
}

function fighterReadiness(fighter) {
  return {
    name: fighter.name,
    stylePressure: hasAggregateStats(fighter) ? "real" : "insufficient",
    adjustedForm: fighter.dataCompleteness.lastFiveCount >= 3 ? "partial" : "insufficient",
    roundSustainability:
      fighter.dataCompleteness.roundSampleCount >= 8 && fighter.dataCompleteness.lateRoundSampleCount >= 3
        ? "real"
        : "insufficient",
    contextSignal: "deferred",
    historyCount: fighter.dataCompleteness.lastFiveCount,
    roundSampleCount: fighter.dataCompleteness.roundSampleCount,
    lateRoundSampleCount: fighter.dataCompleteness.lateRoundSampleCount
  };
}

function fightReadiness(fight) {
  const fighterA = fighterReadiness(fight.fighters.fighterA);
  const fighterB = fighterReadiness(fight.fighters.fighterB);
  const styleReady = fighterA.stylePressure === "real" && fighterB.stylePressure === "real";
  const formReady = fighterA.adjustedForm !== "insufficient" && fighterB.adjustedForm !== "insufficient";
  const roundReady = fighterA.roundSustainability === "real" && fighterB.roundSustainability === "real";

  return {
    id: fight.id,
    label: `${fighterA.name} vs. ${fighterB.name}`,
    fighterA,
    fighterB,
    metrics: {
      stylePressureIndex: styleReady ? "real" : "insufficient",
      opponentQualityAdjustedForm: formReady ? "partial" : "insufficient",
      roundSustainability: roundReady ? "real" : "insufficient",
      pathReliability: styleReady && formReady && roundReady ? "partial" : "insufficient",
      contextSignalScore: "deferred"
    }
  };
}

function buildReport(eventData) {
  const fights = eventData.fights.map(fightReadiness);

  return {
    eventId: eventData.event.id,
    eventName: eventData.event.name,
    generatedAt: new Date().toISOString(),
    summary: {
      fights: fights.length,
      stylePressureReady: fights.filter((fight) => fight.metrics.stylePressureIndex === "real").length,
      adjustedFormReady: fights.filter((fight) => fight.metrics.opponentQualityAdjustedForm !== "insufficient").length,
      roundSustainabilityReady: fights.filter((fight) => fight.metrics.roundSustainability === "real").length,
      pathReliabilityReady: fights.filter((fight) => fight.metrics.pathReliability !== "insufficient").length,
      contextSignalsReady: 0
    },
    fights
  };
}

function markdown(report) {
  return [
    `# ${report.eventName} Fight Shape Model Report`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Fights: ${report.summary.fights}`,
    `- Style Pressure Index ready: ${report.summary.stylePressureReady}/${report.summary.fights}`,
    `- Opponent Quality Adjusted Form ready: ${report.summary.adjustedFormReady}/${report.summary.fights}`,
    `- Round Sustainability ready: ${report.summary.roundSustainabilityReady}/${report.summary.fights}`,
    `- Path Reliability ready: ${report.summary.pathReliabilityReady}/${report.summary.fights}`,
    `- Context Signal Score ready: ${report.summary.contextSignalsReady}/${report.summary.fights}`,
    "",
    "## Fight Readiness",
    "",
    "| Fight | Pressure | Form | Sustainability | Path | Context |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.fights.map((fight) =>
      `| ${fight.label} | ${fight.metrics.stylePressureIndex} | ${fight.metrics.opponentQualityAdjustedForm} | ${fight.metrics.roundSustainability} | ${fight.metrics.pathReliability} | ${fight.metrics.contextSignalScore} |`
    )
  ].join("\n");
}

async function main() {
  const eventId = process.argv.includes("--event")
    ? process.argv[process.argv.indexOf("--event") + 1]
    : DEFAULT_EVENT_ID;
  const eventData = await readJson(path.join(REPO_ROOT, "data/normalized/events", `${eventId}.json`));
  const report = buildReport(eventData);
  const jsonPath = path.join(REPORT_ROOT, `${eventId}-fight-shape-model-report.json`);
  const mdPath = path.join(REPORT_ROOT, `${eventId}-fight-shape-model-report.md`);

  await writeJson(jsonPath, report);
  await writeText(mdPath, markdown(report));

  console.log(`Wrote report: ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`Wrote report data: ${path.relative(REPO_ROOT, jsonPath)}`);
}

main().catch((error) => {
  console.error("\nFight Shape Model report stopped safely.");
  console.error(error.message);
  process.exitCode = 1;
});
