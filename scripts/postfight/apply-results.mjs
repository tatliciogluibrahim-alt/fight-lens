/**
 * apply-results.mjs — append official outcomes onto locked prediction files.
 *
 * Reads data/postfight/<event>/results.json and writes the `outcome` block
 * onto each data/predictions/<fightId>.json. APPEND-ONLY: it refuses to
 * overwrite an outcome that is already recorded, and it NEVER touches the
 * `prediction` block. This is the post-fight scoring step — it does not
 * change history, it completes it.
 *
 * Usage: node scripts/postfight/apply-results.mjs --event ufc-freedom-250
 *        node scripts/postfight/apply-results.mjs --event ufc-freedom-250 --dry-run
 *        node scripts/postfight/apply-results.mjs --event ufc-vegas-119 --allow-missing rodriguez-amil,baghdasaryan-magomedov
 *
 * By default the script FAILS LOUDLY (exit 1, writes nothing) if any results
 * fight has no matching data/predictions/<fightId>.json, because a mistyped
 * fightId would otherwise silently drop a real outcome. When a bout was
 * genuinely never predicted, acknowledge it explicitly with --allow-missing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const args = process.argv.slice(2);
const eventId = args.includes("--event") ? args[args.indexOf("--event") + 1] : null;
const dryRun = args.includes("--dry-run");
const allowMissing = new Set(
  (args.includes("--allow-missing") ? args[args.indexOf("--allow-missing") + 1] ?? "" : "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
if (!eventId) {
  console.error("usage: apply-results.mjs --event <event-id> [--dry-run] [--allow-missing id1,id2]");
  process.exit(1);
}

const resultsPath = path.join(REPO_ROOT, "data/postfight", eventId, "results.json");
const results = JSON.parse(readFileSync(resultsPath, "utf8"));

const predPathFor = (fightId) => path.join(REPO_ROOT, "data/predictions", `${fightId}.json`);

// ── Pre-flight: every results fight must map to a prediction (or be allowed) ──
// Runs BEFORE any write, and for --dry-run too, so a typo is caught up front.
const unmatched = results.fights
  .map((f) => f.fightId)
  .filter((id) => !existsSync(predPathFor(id)) && !allowMissing.has(id));

if (unmatched.length) {
  console.error(`\n✗ ${unmatched.length} results fight(s) in ${eventId} have no matching prediction file:`);
  for (const id of unmatched) console.error(`    • ${id}  (expected data/predictions/${id}.json)`);
  console.error(`\nA mistyped fightId silently drops a real outcome, so nothing was written.`);
  console.error(`Fix the fightId(s) in data/postfight/${eventId}/results.json, or — if a bout`);
  console.error(`was genuinely never predicted — re-run acknowledging it explicitly:`);
  console.error(`    node scripts/postfight/apply-results.mjs --event ${eventId} --allow-missing ${[...allowMissing, ...unmatched].join(",")}`);
  process.exit(1);
}

let applied = 0;
let skipped = 0;
let allowedMissing = 0;
const VALID_METHODS = new Set(["decision", "ko_tko", "submission", "other"]);
const VALID_WINNERS = new Set(["fighterA", "fighterB", "draw", "nc"]);

for (const f of results.fights) {
  const predPath = predPathFor(f.fightId);

  if (!existsSync(predPath)) {
    // Guaranteed to be in allowMissing by the pre-flight check above: a bout
    // that was intentionally never predicted. Nothing to append an outcome to.
    allowedMissing++;
    console.log(`  · ${f.fightId}: no prediction on file — skipped (allowed via --allow-missing)`);
    continue;
  }

  let pred;
  try {
    pred = JSON.parse(readFileSync(predPath, "utf8"));
  } catch (err) {
    // The file exists but is unreadable/corrupt — fail loudly rather than drop.
    console.error(`  ✗ ${f.fightId}: prediction file is unreadable/corrupt — ${err.message}`);
    process.exit(1);
  }

  if (!VALID_WINNERS.has(f.winner)) throw new Error(`${f.fightId}: invalid winner "${f.winner}"`);
  if (!VALID_METHODS.has(f.method)) throw new Error(`${f.fightId}: invalid method "${f.method}"`);

  if (pred.outcome !== null && pred.outcome !== undefined) {
    skipped++;
    console.log(`  · ${f.fightId}: outcome already recorded — left untouched (append-only)`);
    continue;
  }

  const outcome = {
    winner: f.winner,
    method: f.method,
    round: f.round,
    time: f.time ?? "",
    recordedAt: results.recordedAt,
  };

  if (dryRun) {
    console.log(`  → ${f.fightId}: would set outcome ${JSON.stringify(outcome)}`);
    applied++;
    continue;
  }

  // Preserve the exact prediction block; only set outcome.
  pred.outcome = outcome;
  writeFileSync(predPath, JSON.stringify(pred, null, 2) + "\n");
  applied++;
  console.log(`  ✓ ${f.fightId}: outcome recorded (${f.winner} · ${f.method} · R${f.round})`);
}

console.log(
  `\n${applied} ${dryRun ? "would be applied" : "applied"} · ${skipped} already recorded` +
    (allowedMissing ? ` · ${allowedMissing} skipped (no prediction, allowed)` : ""),
);
