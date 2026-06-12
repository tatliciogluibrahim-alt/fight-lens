/**
 * One-off drift check: do the locked future-event predictions match what
 * outcome-v0.2 produces fresh on today's normalized data?
 */
import { readFileSync } from "fs";
import path from "path";
import { buildFightShapeModel } from "../../lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "../../lib/fight-outcome-model/model";

const ROOT = path.resolve(__dirname, "../..");
const events = ["ufc-freedom-250", "ufc-329"];
let drifts = 0, checked = 0;

for (const ev of events) {
  const event = JSON.parse(readFileSync(`${ROOT}/data/normalized/events/${ev}.json`, "utf8"));
  for (const fight of event.fights) {
    let locked: any;
    try { locked = JSON.parse(readFileSync(`${ROOT}/data/predictions/${fight.id}.json`, "utf8")); }
    catch { continue; }
    const shape = buildFightShapeModel(fight);
    const out = buildFightOutcomeModel(fight, shape);
    checked++;
    const lA = locked.prediction.fighterAWinProbability, lB = locked.prediction.fighterBWinProbability;
    const fA = out.fighterA.winProbability, fB = out.fighterB.winProbability;
    const m = locked.prediction.methodBreakdown, fm = out.methodBreakdown;
    const winDrift = lA !== fA || lB !== fB;
    const methodDrift = m.decision !== fm.decision || m.koTko !== fm.koTko || m.submission !== fm.submission;
    if (winDrift || methodDrift) {
      drifts++;
      console.log(`DRIFT ${fight.id}: locked ${lA}/${lB} [${m.koTko}ko/${m.decision}dec/${m.submission}sub] → fresh ${fA}/${fB} [${fm.koTko}ko/${fm.decision}dec/${fm.submission}sub]`);
    } else {
      console.log(`  ok  ${fight.id}: ${lA}/${lB}`);
    }
  }
}
console.log(`\n${checked} checked · ${drifts} drifted`);
