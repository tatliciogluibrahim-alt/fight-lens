/**
 * validate-freedom-250-receipts.ts
 *
 * Asserts the UFC Freedom 250 post-fight layer is honest and consistent:
 *   - locked pre-fight predictions are unchanged
 *   - every fight has a recorded outcome + a receipt label
 *   - authored receipt labels match correctness COMPUTED from prediction + outcome
 *   - card-level record (5/7 winner, 6/7 finish) matches the computed totals
 *   - Lopes/Garcia = raw miss + warning correct; Topuria = miss; Gane = clean read
 *   - no betting language in visible receipt copy
 *
 * Reads JSON directly (no Next aliases). Run: npx tsx scripts/validate-freedom-250-receipts.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const EVENT = "ufc-freedom-250";

const failures: string[] = [];
const ok = (cond: boolean, msg: string) => { if (!cond) failures.push(msg); };

// ── Immutable locked pre-fight probabilities (must never change) ──────────────
const LOCKED: Record<string, [number, number]> = {
  "topuria-gaethje": [65, 35],
  "pereira-gane": [40, 60],
  "o-malley-zahabi": [56, 44],
  "hokit-lewis": [71, 29],
  "ruffy-chandler": [58, 42],
  "nickal-daukaus": [63, 37],
  "lopes-garcia": [25, 75],
};

const NAMED_CALL_THRESHOLD = 52;
function namedSide(a: number, b: number): "fighterA" | "fighterB" | null {
  if (Math.max(a, b) < NAMED_CALL_THRESHOLD) return null;
  return a > b ? "fighterA" : "fighterB";
}
function topBucket(m: { decision: number; koTko: number; submission: number }) {
  return (["decision", "koTko", "submission"] as const)
    .map((k) => ({ k, v: m[k] }))
    .sort((x, y) => y.v - x.v)[0].k;
}
function isFinishMethod(method: string) {
  return method === "ko_tko" || method === "submission";
}

const event = JSON.parse(readFileSync(path.join(ROOT, "data/normalized/events", `${EVENT}.json`), "utf8"));
const fightsByRoute: Record<string, any> = {};
for (const f of event.fights) fightsByRoute[f.id] = f;

// 3. Registry / normalized resolves with 7 fights
ok(event.fights.length === 7, `expected 7 fights, got ${event.fights.length}`);
// 4. Event renders scored
ok(event.event.cardReceipt?.status === "scored", "cardReceipt.status should be 'scored'");

let winnerCorrectCount = 0;
let finishCorrectCount = 0;

for (const fightId of Object.keys(LOCKED)) {
  const pred = JSON.parse(readFileSync(path.join(ROOT, "data/predictions", `${fightId}.json`), "utf8"));
  const fight = fightsByRoute[fightId];
  const receipt = fight?.postFightReceipt;

  // 8. Pre-fight predictions unchanged
  const [eA, eB] = LOCKED[fightId];
  ok(pred.prediction.fighterAWinProbability === eA && pred.prediction.fighterBWinProbability === eB,
    `${fightId}: locked probability changed (${pred.prediction.fighterAWinProbability}/${pred.prediction.fighterBWinProbability}, expected ${eA}/${eB})`);

  // 5. Has an official result
  ok(pred.outcome != null, `${fightId}: missing outcome`);
  // 6. Has a receipt label
  ok(!!receipt?.receiptLabel, `${fightId}: missing postFightReceipt.receiptLabel`);
  if (!pred.outcome || !receipt) continue;

  // Compute correctness from data
  const call = namedSide(pred.prediction.fighterAWinProbability, pred.prediction.fighterBWinProbability);
  const winnerCorrect = call != null && pred.outcome.winner === call;
  const predictedFinish = topBucket(pred.prediction.methodBreakdown) !== "decision";
  const finishBucketCorrect = predictedFinish === isFinishMethod(pred.outcome.method);
  if (winnerCorrect) winnerCorrectCount++;
  if (finishBucketCorrect) finishCorrectCount++;

  // Label ⟷ computed-correctness consistency
  const label = receipt.receiptLabel;
  const winnerMissLabels = ["Missed Read", "Model Miss", "Model Miss, Warning Correct"];
  if (winnerMissLabels.includes(label)) {
    ok(!winnerCorrect, `${fightId}: label "${label}" implies a winner miss but the call was correct`);
  } else {
    ok(winnerCorrect, `${fightId}: label "${label}" implies a correct winner but the call was wrong`);
  }
  if (label === "Clean Read") {
    ok(winnerCorrect && finishBucketCorrect, `${fightId}: "Clean Read" requires winner AND finish correct`);
  }
  if (label === "Correct, Method Miss") {
    ok(winnerCorrect && !finishBucketCorrect, `${fightId}: "Correct, Method Miss" requires winner correct + finish wrong`);
  }
  if (label === "Model Miss, Warning Correct") {
    ok(receipt.warningLayerGrade === "correct_warning", `${fightId}: warning-correct label requires warningLayerGrade=correct_warning`);
  }
}

// 9/10. Card totals match computed
ok(winnerCorrectCount === 5, `expected 5 winner calls correct, computed ${winnerCorrectCount}`);
ok(finishCorrectCount === 6, `expected 6 finish buckets correct, computed ${finishCorrectCount}`);
ok(event.event.cardReceipt?.rawWinnerRecord?.correct === winnerCorrectCount, "cardReceipt rawWinnerRecord.correct mismatch");
ok(event.event.cardReceipt?.finishBucketRecord?.correct === finishCorrectCount, "cardReceipt finishBucketRecord.correct mismatch");

// 11/12. Lopes/Garcia = raw miss + warning correct
{
  const r = fightsByRoute["lopes-garcia"].postFightReceipt;
  const p = JSON.parse(readFileSync(path.join(ROOT, "data/predictions/lopes-garcia.json"), "utf8"));
  const call = namedSide(p.prediction.fighterAWinProbability, p.prediction.fighterBWinProbability);
  ok(call === "fighterB" && p.outcome.winner === "fighterA", "Lopes/Garcia should be a raw winner miss (called Garcia, Lopes won)");
  ok(r.warningLayerGrade === "correct_warning", "Lopes/Garcia warningLayerGrade should be correct_warning");
  ok(r.receiptLabel === "Model Miss, Warning Correct", "Lopes/Garcia label should be 'Model Miss, Warning Correct'");
}
// 13. Topuria/Gaethje = winner miss
{
  const p = JSON.parse(readFileSync(path.join(ROOT, "data/predictions/topuria-gaethje.json"), "utf8"));
  const call = namedSide(p.prediction.fighterAWinProbability, p.prediction.fighterBWinProbability);
  ok(call === "fighterA" && p.outcome.winner === "fighterB", "Topuria/Gaethje should be a winner miss (called Topuria, Gaethje won)");
  ok(fightsByRoute["topuria-gaethje"].postFightReceipt.receiptLabel === "Missed Read", "Topuria/Gaethje label should be 'Missed Read'");
}
// 14. Gane/Pereira = clean read
{
  const p = JSON.parse(readFileSync(path.join(ROOT, "data/predictions/pereira-gane.json"), "utf8"));
  ok(p.outcome.winner === "fighterB", "Pereira/Gane outcome should be Gane (fighterB)");
  ok(fightsByRoute["pereira-gane"].postFightReceipt.receiptLabel === "Clean Read", "Pereira/Gane label should be 'Clean Read'");
}

// 15. No betting language in visible receipt copy
const BANNED = /\b(lock|odds|parlay|wager|wagers|unit|units|guaranteed|bet|bets|betting|stake|stakes|payout|payouts|profit|cash|moneyline|spread)\b/i;
function scanCopy(label: string, s: unknown) {
  if (typeof s !== "string") return;
  const m = s.match(BANNED);
  if (m) failures.push(`banned word "${m[0]}" in ${label}: "${s.slice(0, 60)}…"`);
}
for (const f of event.fights) {
  const r = f.postFightReceipt;
  if (!r) continue;
  scanCopy(`${f.id}.receiptSummary`, r.receiptSummary);
  scanCopy(`${f.id}.modelLesson`, r.modelLesson);
  scanCopy(`${f.id}.mediaNarrative`, r.mediaNarrative);
  scanCopy(`${f.id}.statSummary`, r.statSummary);
  (r.whatModelGotRight ?? []).forEach((x: string, i: number) => scanCopy(`${f.id}.right[${i}]`, x));
  (r.whatModelMissed ?? []).forEach((x: string, i: number) => scanCopy(`${f.id}.missed[${i}]`, x));
}
scanCopy("cardReceipt.summary", event.event.cardReceipt?.summary);
(event.event.cardReceipt?.mainLessons ?? []).forEach((x: string, i: number) => scanCopy(`cardReceipt.lesson[${i}]`, x));

// ── Report ────────────────────────────────────────────────────────────────────
console.log("=== UFC Freedom 250 receipt validation ===\n");
if (failures.length === 0) {
  console.log(`PASS — all checks passed (winner ${winnerCorrectCount}/7, finish ${finishCorrectCount}/7).`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures.length} issue(s):`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
