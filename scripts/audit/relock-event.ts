/**
 * Re-lock predictions for an event from fresh model output.
 *
 * ONLY legitimate before publication and before any result is known.
 * Freedom-250 untouched (zero drift). Preserves the exact file shape.
 * Usage: npx tsx scripts/audit/relock-event.ts <event-id>
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { buildFightShapeModel } from "../../lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "../../lib/fight-outcome-model/model";

const ROOT = path.resolve(__dirname, "../..");
const eventId = process.argv[2];
if (!eventId) { console.error("usage: relock-event.ts <event-id>"); process.exit(1); }

const event = JSON.parse(readFileSync(`${ROOT}/data/normalized/events/${eventId}.json`, "utf8"));
const now = new Date().toISOString();
let relocked = 0;

for (const fight of event.fights) {
  const file = `${ROOT}/data/predictions/${fight.id}.json`;
  let existing: any;
  try { existing = JSON.parse(readFileSync(file, "utf8")); } catch { continue; }
  if (existing.outcome !== null) {
    console.log(`SKIP ${fight.id} — outcome already recorded, append-only`);
    continue;
  }
  const shape = buildFightShapeModel(fight);
  const out = buildFightOutcomeModel(fight, shape);
  const next = {
    fightId: fight.id,
    event: event.event.name,
    fighters: { fighterA: fight.fighters.fighterA.name, fighterB: fight.fighters.fighterB.name },
    generatedAt: now,
    modelVersion: out.modelVersion,
    isBacktestReconstruction: false,
    prediction: {
      fighterAWinProbability: out.fighterA.winProbability,
      fighterBWinProbability: out.fighterB.winProbability,
      methodBreakdown: out.methodBreakdown,
    },
    outcome: null,
  };
  writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
  relocked++;
  console.log(`relocked ${fight.id}: ${next.prediction.fighterAWinProbability}/${next.prediction.fighterBWinProbability}`);
}
console.log(`\n${relocked} predictions re-locked at ${now}`);
