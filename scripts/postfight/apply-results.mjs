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
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const args = process.argv.slice(2);
const eventId = args.includes("--event") ? args[args.indexOf("--event") + 1] : null;
const dryRun = args.includes("--dry-run");
if (!eventId) {
  console.error("usage: apply-results.mjs --event <event-id> [--dry-run]");
  process.exit(1);
}

const resultsPath = path.join(REPO_ROOT, "data/postfight", eventId, "results.json");
const results = JSON.parse(readFileSync(resultsPath, "utf8"));

let applied = 0;
let skipped = 0;
const VALID_METHODS = new Set(["decision", "ko_tko", "submission", "other"]);
const VALID_WINNERS = new Set(["fighterA", "fighterB", "draw", "nc"]);

for (const f of results.fights) {
  const predPath = path.join(REPO_ROOT, "data/predictions", `${f.fightId}.json`);
  let pred;
  try {
    pred = JSON.parse(readFileSync(predPath, "utf8"));
  } catch {
    console.error(`  ✗ ${f.fightId}: no prediction file — skipped`);
    continue;
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

console.log(`\n${applied} ${dryRun ? "would be applied" : "applied"} · ${skipped} already recorded`);
