/**
 * Version-aware drift check.
 *
 * For every locked future-event prediction, re-run the outcome model AT THE
 * VERSION THE CALL WAS LOCKED UNDER and confirm it still reproduces the locked
 * numbers. A v0.2 call is verified against frozen v0.2 logic (raw logistic, 52%
 * threshold); a v0.3 call against current logic (T=0.824 recalibration, 58%).
 *
 * This is the integrity guarantee for forward-only model versioning: shipping a
 * new model version must never change what an older locked call reproduces.
 */
import { readFileSync } from "fs";
import path from "path";
import { buildFightShapeModel } from "../../lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "../../lib/fight-outcome-model/model";

const ROOT = path.resolve(__dirname, "../..");
const events = ["ufc-freedom-250", "ufc-329", "ufc-vegas-119"];
let drifts = 0,
  checked = 0;
const byVersion: Record<string, { checked: number; drifted: number }> = {};

for (const ev of events) {
  const event = JSON.parse(readFileSync(`${ROOT}/data/normalized/events/${ev}.json`, "utf8"));
  for (const fight of event.fights) {
    let locked: any;
    try {
      locked = JSON.parse(readFileSync(`${ROOT}/data/predictions/${fight.id}.json`, "utf8"));
    } catch {
      continue;
    }
    const version: string = locked.modelVersion ?? "outcome-v0.2";
    const shape = buildFightShapeModel(fight);
    const out = buildFightOutcomeModel(fight, shape, { modelVersion: version });
    checked++;
    byVersion[version] ??= { checked: 0, drifted: 0 };
    byVersion[version].checked++;

    const lA = locked.prediction.fighterAWinProbability,
      lB = locked.prediction.fighterBWinProbability;
    const fA = out.fighterA.winProbability,
      fB = out.fighterB.winProbability;
    const m = locked.prediction.methodBreakdown,
      fm = out.methodBreakdown;
    const winDrift = lA !== fA || lB !== fB;
    const methodDrift = m.decision !== fm.decision || m.koTko !== fm.koTko || m.submission !== fm.submission;
    if (winDrift || methodDrift) {
      drifts++;
      byVersion[version].drifted++;
      console.log(
        `DRIFT ${fight.id} [${version}]: locked ${lA}/${lB} [${m.koTko}ko/${m.decision}dec/${m.submission}sub] → fresh ${fA}/${fB} [${fm.koTko}ko/${fm.decision}dec/${fm.submission}sub]`,
      );
    } else {
      console.log(`  ok  ${fight.id} [${version}]: ${lA}/${lB}`);
    }
  }
}

console.log("");
for (const [v, s] of Object.entries(byVersion)) {
  console.log(`  ${v}: ${s.checked} checked · ${s.drifted} drifted`);
}
console.log(`\n${checked} checked · ${drifts} drifted`);
if (drifts > 0) process.exitCode = 1;
