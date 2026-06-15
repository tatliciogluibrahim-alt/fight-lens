/**
 * v03-candidate-comparison.ts — measure the dormant opponent-tier v0.3 candidate.
 *
 * Scores v0.2 (locked) vs the v0.3 candidate on the REAL UFC Freedom 250
 * results (winner accuracy + Brier), and previews what v0.3 would do to the
 * still-unfought UFC 329 forecasts. Changes NOTHING — read-only analysis.
 *
 * Run: npx tsx scripts/backtest/v03-candidate-comparison.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { v03CandidateWinProbA, resumeStrengthDelta } from "../../lib/fight-shape-model/opponent-tier-adjustment";

const ROOT = path.resolve(__dirname, "../..");
const GAIN = 2.5;

type Row = { id: string; aName: string; bName: string; qa: number | null; qb: number | null; v02A: number; outcomeWinner: "fighterA" | "fighterB" | null };

function loadEvent(eventId: string): Row[] {
  const ev = JSON.parse(readFileSync(path.join(ROOT, "data/normalized/events", `${eventId}.json`), "utf8"));
  return ev.fights.map((f: any) => {
    const pred = JSON.parse(readFileSync(path.join(ROOT, "data/predictions", `${f.id}.json`), "utf8"));
    return {
      id: f.id,
      aName: f.fighters.fighterA.name,
      bName: f.fighters.fighterB.name,
      qa: f.fighters.fighterA.styleProfile?.opponentQuality ?? null,
      qb: f.fighters.fighterB.styleProfile?.opponentQuality ?? null,
      v02A: pred.prediction.fighterAWinProbability,
      outcomeWinner: pred.outcome?.winner === "fighterA" || pred.outcome?.winner === "fighterB" ? pred.outcome.winner : null,
    };
  });
}

const NAMED = 52;
function named(a: number): "fighterA" | "fighterB" | null {
  const b = 100 - a;
  if (Math.max(a, b) < NAMED) return null;
  return a > b ? "fighterA" : "fighterB";
}
function brier(probA: number, winner: "fighterA" | "fighterB"): number {
  const pA = probA / 100, pB = 1 - pA;
  const pWin = winner === "fighterA" ? pA : pB;
  const pLose = winner === "fighterA" ? pB : pA;
  return (Math.pow(pWin - 1, 2) + Math.pow(pLose - 0, 2)) / 2;
}

function short(n: string) { return n.split(" ").pop() ?? n; }
function pad(s: string, n: number) { return s.padEnd(n).slice(0, n); }

console.log(`\n=== v0.3 opponent-tier candidate (gain=${GAIN}) — DORMANT, read-only ===\n`);

// ── Freedom 250: scored out-of-sample test ──
console.log("UFC FREEDOM 250 (scored) — does v0.3 beat v0.2 against real results?\n");
console.log(pad("fight", 18), pad("v0.2", 12), pad("v0.3", 12), pad("actual", 9), "v0.2 / v0.3");
const f250 = loadEvent("ufc-freedom-250");
let v02Correct = 0, v03Correct = 0, v02Brier = 0, v03Brier = 0, scored = 0, flips: string[] = [];
for (const r of f250) {
  if (!r.outcomeWinner) continue;
  scored++;
  const v03A = v03CandidateWinProbA(r.v02A, r.qa, r.qb, GAIN);
  const c02 = named(r.v02A) === r.outcomeWinner;
  const c03 = named(v03A) === r.outcomeWinner;
  if (c02) v02Correct++;
  if (c03) v03Correct++;
  v02Brier += brier(r.v02A, r.outcomeWinner);
  v03Brier += brier(v03A, r.outcomeWinner);
  const moveNote = c02 && !c03 ? "  ⚠ v0.3 BREAKS" : !c02 && c03 ? "  ✓ v0.3 FIXES" : "";
  if (moveNote) flips.push(`${r.id}:${moveNote.trim()}`);
  console.log(
    pad(r.id, 18),
    pad(`${short(r.aName)} ${r.v02A}`, 12),
    pad(`${short(r.aName)} ${v03A}`, 12),
    pad(short(r.outcomeWinner === "fighterA" ? r.aName : r.bName), 9),
    `${c02 ? "✓" : "✗"} / ${c03 ? "✓" : "✗"}${moveNote}`,
  );
}
console.log(`\n  winner accuracy:  v0.2 ${v02Correct}/${scored}   v0.3 ${v03Correct}/${scored}`);
console.log(`  brier (lower=better):  v0.2 ${(v02Brier / scored).toFixed(3)}   v0.3 ${(v03Brier / scored).toFixed(3)}`);
console.log(`  verdict: ${
  v03Correct > v02Correct && v03Brier <= v02Brier ? "v0.3 IMPROVES — worth a full backtest" :
  v03Correct < v02Correct ? "v0.3 REGRESSES winner accuracy — DO NOT SHIP" :
  v03Brier > v02Brier ? "v0.3 worsens calibration — DO NOT SHIP as-is" :
  "v0.3 is a wash — not worth the risk as-is"
}`);
if (flips.length) console.log("  movement: " + flips.join("  |  "));

// ── 329: forecast preview (unfought, not scored) ──
console.log(`\nUFC 329 (unfought) — what v0.3 WOULD do (preview only, nothing changes):\n`);
console.log(pad("fight", 22), pad("v0.2 call", 20), pad("v0.3 call", 20), "résumé Δ");
for (const r of loadEvent("ufc-329")) {
  const v03A = v03CandidateWinProbA(r.v02A, r.qa, r.qb, GAIN);
  const c02 = named(r.v02A), c03 = named(v03A);
  const lbl = (side: "fighterA" | "fighterB" | null, a: number) =>
    side == null ? `too close (${a})` : `${short(side === "fighterA" ? r.aName : r.bName)} ${side === "fighterA" ? a : 100 - a}`;
  const delta = resumeStrengthDelta(r.qa, r.qb);
  const flip = c02 !== c03 ? "  ⇄ call changes" : "";
  console.log(pad(r.id, 22), pad(lbl(c02, r.v02A), 20), pad(lbl(c03, v03A), 20), `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}${flip}`);
}
console.log("\n(Read-only. No locked prediction, model, or live forecast was modified.)\n");
