/**
 * Lock fresh predictions for an event's fights from current model output.
 *
 * Unlike relock-event.ts (which only updates files that already exist), this
 * CREATES prediction files for fights that don't have one yet, under the
 * current model version. It is safe to run on a partially-built card:
 *   - fights with a recorded outcome are skipped (append-only).
 *   - fights the model can't read (insufficient data — e.g. a fighter missing
 *     from the cache) are skipped and left as data-pending: no number is
 *     fabricated.
 *
 * Usage: npx tsx scripts/audit/lock-event.ts <event-id>
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { buildFightShapeModel } from "../../lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "../../lib/fight-outcome-model/model";

const ROOT = path.resolve(__dirname, "../..");
const eventId = process.argv[2];
if (!eventId) {
  console.error("usage: lock-event.ts <event-id>");
  process.exit(1);
}

const event = JSON.parse(readFileSync(`${ROOT}/data/normalized/events/${eventId}.json`, "utf8"));
const now = new Date().toISOString();
let locked = 0;
let skipped = 0;

for (const fight of event.fights) {
  const file = `${ROOT}/data/predictions/${fight.id}.json`;
  if (existsSync(file)) {
    const existing = JSON.parse(readFileSync(file, "utf8"));
    if (existing.outcome !== null) {
      console.log(`SKIP ${fight.id} — outcome recorded (append-only)`);
      skipped++;
      continue;
    }
  }

  let out;
  try {
    const shape = buildFightShapeModel(fight);
    out = buildFightOutcomeModel(fight, shape);
  } catch (error: any) {
    console.log(`SKIP ${fight.id} — model error: ${error?.message ?? error} (data pending)`);
    skipped++;
    continue;
  }

  if (out.confidence === "insufficient") {
    console.log(`SKIP ${fight.id} — insufficient data, no number locked (data pending)`);
    skipped++;
    continue;
  }

  const next = {
    fightId: fight.id,
    event: event.event.name,
    fighters: {
      fighterA: fight.fighters.fighterA.name,
      fighterB: fight.fighters.fighterB.name,
    },
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
  locked++;
  console.log(
    `locked ${fight.id} [${out.modelVersion}]: ${next.prediction.fighterAWinProbability}/${next.prediction.fighterBWinProbability} (${out.confidence})`,
  );
}

console.log(`\n${locked} locked, ${skipped} skipped at ${now}`);
