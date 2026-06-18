#!/usr/bin/env node

/**
 * backfill-from-csv.mjs — fill missing fight-detail files from a public CSV.
 *
 * UFCStats is currently bot-challenging live fetches, so the live scraper
 * (ufcstats.mjs --backfill-history-details) can't pull pages. This script
 * fills the same gap from the Greco1899/scrape_ufc_stats public dataset
 * instead, writing files that conform exactly to the parseFightDetails output
 * shape so the existing normalizer picks them up with zero changes.
 *
 * It does NOT modify ufcstats.mjs, the normalizer, or any existing file.
 * It only downloads CSVs to data/raw/greco1899/ and writes new
 * data/generated/ufcstats/fights/<fightId>.json files for matched fights.
 *
 * Usage:
 *   node scripts/ingest/backfill-from-csv.mjs --dry-run   # match, don't write
 *   node scripts/ingest/backfill-from-csv.mjs             # match + write
 *   node scripts/ingest/backfill-from-csv.mjs --limit 50  # cap fights processed
 *   node scripts/ingest/backfill-from-csv.mjs --refresh   # re-download CSVs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const RAW_DIR = path.join(REPO_ROOT, "data/raw/greco1899");
const FIGHTS_DIR = path.join(REPO_ROOT, "data/generated/ufcstats/fights");
const FIGHTERS_DIR = path.join(REPO_ROOT, "data/generated/ufcstats/fighters");

const SOURCES = {
  stats: {
    url: "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main/ufc_fight_stats.csv",
    file: path.join(RAW_DIR, "ufc_fight_stats.csv"),
  },
  results: {
    url: "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main/ufc_fight_results.csv",
    file: path.join(RAW_DIR, "ufc_fight_results.csv"),
  },
};

// ─── Args ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, refresh: false, limit: Infinity };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--refresh") args.refresh = true;
    else if (arg === "--limit") {
      args.limit = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function cleanText(value) {
  return String(value ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

// Lowercase, strip accents + punctuation, collapse whitespace. Used for
// fuzzy-tolerant matching of names and event titles.
function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function surname(name) {
  const parts = normalize(name).split(" ").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

// The UFCStats fight id is the last path segment of a fight-details URL.
function idFromFightUrl(url) {
  const match = String(url ?? "").match(/fight-details\/([a-z0-9]+)/i);
  return match ? match[1] : null;
}

// "9 of 20" → { landed: 9, attempted: 20, raw: "9 of 20" }; "---"/"" → zeros.
function parseLandedAttempted(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d+)\s+of\s+(\d+)$/i);
  if (!match) return { landed: 0, attempted: 0, raw: text || "0 of 0" };
  return { landed: Number(match[1]), attempted: Number(match[2]), raw: text };
}

function addLA(a, b) {
  const landed = a.landed + b.landed;
  const attempted = a.attempted + b.attempted;
  return { landed, attempted, raw: `${landed} of ${attempted}` };
}

function emptyLA() {
  return { landed: 0, attempted: 0, raw: "0 of 0" };
}

function parseInt0(value) {
  const n = Number(cleanText(value));
  return Number.isFinite(n) ? n : 0;
}

// "1:44" → 104 seconds; "--"/"---"/"" → 0.
function ctrlToSeconds(value) {
  const match = cleanText(value).match(/^(\d+):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function secondsToClock(total) {
  if (!total || total <= 0) return "--";
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pct(landed, attempted) {
  return attempted > 0 ? Math.round((landed / attempted) * 100) : null;
}

function roundNumber(value) {
  const match = cleanText(value).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

// ─── Minimal CSV parser (handles quoted fields with embedded commas) ──────────

function parseCsv(text) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { record.push(field); field = ""; }
    else if (ch === "\n") { record.push(field); rows.push(record); record = []; field = ""; }
    else if (ch === "\r") { /* skip */ }
    else field += ch;
  }
  if (field.length || record.length) { record.push(field); rows.push(record); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => cleanText(h));
  return rows.slice(1).filter((r) => r.length > 1).map((r) => {
    const obj = {};
    header.forEach((key, idx) => { obj[key] = r[idx] ?? ""; });
    return obj;
  });
}

// ─── Download (cache) ─────────────────────────────────────────────────────────

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function downloadIfMissing(source, refresh) {
  if (!refresh && (await fileExists(source.file))) {
    const stat = await fs.stat(source.file);
    console.log(`  cached: ${path.relative(REPO_ROOT, source.file)} (${(stat.size / 1e6).toFixed(1)} MB)`);
    return await fs.readFile(source.file, "utf8");
  }
  console.log(`  downloading: ${source.url}`);
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Download failed ${response.status} for ${source.url}`);
  const text = await response.text();
  await fs.mkdir(path.dirname(source.file), { recursive: true });
  await fs.writeFile(source.file, text);
  console.log(`  saved: ${path.relative(REPO_ROOT, source.file)} (${(text.length / 1e6).toFixed(1)} MB)`);
  return text;
}

// ─── Read scraped fighters + existing fight-detail ids ────────────────────────

async function readJsonDir(dir) {
  let files;
  try { files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")); }
  catch (e) { if (e.code === "ENOENT") return []; throw e; }
  const out = [];
  for (const f of files) {
    try { out.push(JSON.parse(await fs.readFile(path.join(dir, f), "utf8"))); } catch { /* skip bad file */ }
  }
  return out;
}

function isCompletedHistoryFight(fight) {
  const result = cleanText(fight?.result).toLowerCase();
  return Boolean(fight?.fightUrl && result && result !== "next");
}

// ─── Build the parseFightDetails-shaped totals/round blocks from CSV rows ──────
//
// Each CSV row is ONE fighter for ONE round. We assign rows to fighter A/B by
// name, sum across rounds for the fight totals, and keep per-round blocks.

function buildTotalsStat(fighterRef, rows) {
  // rows: all stat rows for this fighter across the fight's rounds
  let kd = 0, sub = 0, rev = 0, ctrl = 0;
  let sig = emptyLA(), tot = emptyLA(), td = emptyLA();
  for (const r of rows) {
    kd += parseInt0(r["KD"]);
    sub += parseInt0(r["SUB.ATT"]);
    rev += parseInt0(r["REV."]);
    ctrl += ctrlToSeconds(r["CTRL"]);
    sig = addLA(sig, parseLandedAttempted(r["SIG.STR."]));
    tot = addLA(tot, parseLandedAttempted(r["TOTAL STR."]));
    td = addLA(td, parseLandedAttempted(r["TD"]));
  }
  return {
    fighter: fighterRef,
    kd,
    significantStrikes: sig,
    significantStrikePercent: pct(sig.landed, sig.attempted),
    totalStrikes: tot,
    takedowns: td,
    takedownPercent: pct(td.landed, td.attempted),
    submissionAttempts: sub,
    reversals: rev,
    control: secondsToClock(ctrl),
    controlSeconds: ctrl > 0 ? ctrl : null,
  };
}

function buildSignificantStat(fighterRef, rows) {
  let sig = emptyLA(), head = emptyLA(), body = emptyLA(), leg = emptyLA(),
    distance = emptyLA(), clinch = emptyLA(), ground = emptyLA();
  for (const r of rows) {
    sig = addLA(sig, parseLandedAttempted(r["SIG.STR."]));
    head = addLA(head, parseLandedAttempted(r["HEAD"]));
    body = addLA(body, parseLandedAttempted(r["BODY"]));
    leg = addLA(leg, parseLandedAttempted(r["LEG"]));
    distance = addLA(distance, parseLandedAttempted(r["DISTANCE"]));
    clinch = addLA(clinch, parseLandedAttempted(r["CLINCH"]));
    ground = addLA(ground, parseLandedAttempted(r["GROUND"]));
  }
  return {
    fighter: fighterRef,
    significantStrikes: sig,
    significantStrikePercent: pct(sig.landed, sig.attempted),
    head, body, leg, distance, clinch, ground,
  };
}

// Group bout rows into rounds and assign each row to fighter A or B by name.
function splitRowsByFighter(rows, refA, refB) {
  const nA = normalize(refA.name), nB = normalize(refB.name);
  const sA = surname(refA.name), sB = surname(refB.name);
  const assign = (row) => {
    const n = normalize(row["FIGHTER"]);
    if (n === nA) return "A";
    if (n === nB) return "B";
    // fall back to surname containment
    if (sA && sA !== sB && n.includes(sA)) return "A";
    if (sB && sB !== sA && n.includes(sB)) return "B";
    return null;
  };
  const aRows = [], bRows = [];
  const byRound = new Map();
  for (const row of rows) {
    const side = assign(row);
    if (side === "A") aRows.push(row);
    else if (side === "B") bRows.push(row);
    else return null; // ambiguous fighter — skip this fight rather than mis-assign
    const rn = roundNumber(row["ROUND"]);
    if (rn == null) continue;
    if (!byRound.has(rn)) byRound.set(rn, {});
    byRound.get(rn)[side] = row;
  }
  if (!aRows.length || !bRows.length) return null;
  return { aRows, bRows, byRound };
}

function buildFightDetail(missing, boutRows, resultRow) {
  const refA = { id: missing.fighterA.id, name: missing.fighterA.name, url: missing.fighterA.url };
  const refB = { id: missing.fighterB.id, name: missing.fighterB.name, url: missing.fighterB.url };

  const split = splitRowsByFighter(boutRows, refA, refB);
  if (!split) return null;
  const { aRows, bRows, byRound } = split;

  const rounds = [...byRound.keys()].sort((a, b) => a - b);

  const roundStats = rounds
    .filter((rn) => byRound.get(rn).A && byRound.get(rn).B)
    .map((rn) => ({
      round: rn,
      kind: "round",
      fighters: [refA, refB],
      stats: [buildTotalsStat(refA, [byRound.get(rn).A]), buildTotalsStat(refB, [byRound.get(rn).B])],
    }));

  const significantStrikesByRound = rounds
    .filter((rn) => byRound.get(rn).A && byRound.get(rn).B)
    .map((rn) => ({
      round: rn,
      kind: "significantStrikes",
      fighters: [refA, refB],
      stats: [buildSignificantStat(refA, [byRound.get(rn).A]), buildSignificantStat(refB, [byRound.get(rn).B])],
    }));

  // Persons (result W/L from result row's OUTCOME, mapped to bout order).
  const outcome = cleanText(resultRow?.["OUTCOME"]); // e.g. "W/L"
  const [firstOutcome, secondOutcome] = outcome.split("/").map((s) => cleanText(s));
  const boutFirstName = normalize((resultRow?.["BOUT"] ?? "").split(/\s+vs\.?\s+/i)[0] ?? "");
  const aIsFirst = boutFirstName && normalize(refA.name).includes(boutFirstName.split(" ").pop());
  const resultA = aIsFirst ? firstOutcome : secondOutcome;
  const resultB = aIsFirst ? secondOutcome : firstOutcome;

  return {
    id: missing.fightId,
    url: missing.fightUrl,
    event: {
      id: missing.event?.id ?? null,
      name: missing.event?.name ?? cleanText(resultRow?.["EVENT"]) ?? null,
      url: missing.event?.url ?? null,
    },
    title: cleanText(resultRow?.["WEIGHTCLASS"]) || null,
    status: "completed",
    fighters: [
      { ...refA, nickname: null, result: resultA || null },
      { ...refB, nickname: null, result: resultB || null },
    ],
    result: {
      method: cleanText(resultRow?.["METHOD"]) || missing.method || null,
      round: roundNumber(resultRow?.["ROUND"]) ?? missing.round ?? null,
      time: cleanText(resultRow?.["TIME"]) || missing.time || null,
      timeFormat: cleanText(resultRow?.["TIME FORMAT"]) || null,
      referee: cleanText(resultRow?.["REFEREE"]) || null,
      details: cleanText(resultRow?.["DETAILS"]) || null,
    },
    matchupPreview: null,
    totals: {
      kind: "totals",
      fighters: [refA, refB],
      stats: [buildTotalsStat(refA, aRows), buildTotalsStat(refB, bRows)],
    },
    roundStats,
    significantStrikes: {
      kind: "significantStrikes",
      fighters: [refA, refB],
      stats: [buildSignificantStat(refA, aRows), buildSignificantStat(refB, bRows)],
    },
    significantStrikesByRound,
    source: {
      provenance: "sourced",
      sourceName: "greco1899/scrape_ufc_stats",
      sourceUrl: SOURCES.stats.url,
      fetchedAt: new Date().toISOString(),
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/ingest/backfill-from-csv.mjs [--dry-run] [--limit N] [--refresh]");
    return;
  }

  console.log(`\n=== Backfill fight details from CSV ${options.dryRun ? "(DRY RUN — no files written)" : ""} ===\n`);

  // 1–2. Download / cache both CSVs.
  await fs.mkdir(RAW_DIR, { recursive: true });
  console.log("CSV sources:");
  const statsText = await downloadIfMissing(SOURCES.stats, options.refresh);
  const resultsText = await downloadIfMissing(SOURCES.results, options.refresh);

  const statsRows = parseCsv(statsText);
  const resultsRows = parseCsv(resultsText);
  console.log(`\nLoaded ${statsRows.length} stat rows · ${resultsRows.length} result rows.`);

  // Index: bout key (event||bout, normalized) → all stat rows for that bout.
  const statsByBout = new Map();
  for (const row of statsRows) {
    const key = `${normalize(row["EVENT"])}||${normalize(row["BOUT"])}`;
    if (!statsByBout.has(key)) statsByBout.set(key, []);
    statsByBout.get(key).push(row);
  }
  // Index: fight id (from URL) → result row, and bout key → result row.
  const resultById = new Map();
  const resultByBout = new Map();
  for (const row of resultsRows) {
    const id = idFromFightUrl(row["URL"]);
    if (id) resultById.set(id, row);
    resultByBout.set(`${normalize(row["EVENT"])}||${normalize(row["BOUT"])}`, row);
  }

  // 3. Collect missing fights from scraped fighter profiles.
  const profiles = await readJsonDir(FIGHTERS_DIR);
  const detailFiles = await readJsonDir(FIGHTS_DIR);
  const existingIds = new Set(detailFiles.map((d) => d.id).filter(Boolean));

  const missing = new Map(); // fightId -> normalized missing-fight record
  for (const profile of profiles) {
    for (const fight of profile?.fightHistory ?? []) {
      if (!isCompletedHistoryFight(fight)) continue;
      if (!fight.fightId || !fight.fightUrl) continue;
      if (existingIds.has(fight.fightId)) continue;
      if (missing.has(fight.fightId)) continue;
      const fighters = fight.fighters ?? [];
      if (fighters.length < 2) continue;
      missing.set(fight.fightId, {
        fightId: fight.fightId,
        fightUrl: fight.fightUrl,
        fighterA: fighters[0],
        fighterB: fighters[1],
        event: fight.event ?? {},
        method: fight.method ?? null,
        round: fight.round ?? null,
        time: fight.time ?? null,
      });
    }
  }

  console.log(`\n${existingIds.size} fight-detail files exist · ${missing.size} missing across ${profiles.length} fighter profiles.\n`);

  // 4–5. Match each missing fight to CSV bout rows and build the detail file.
  let processed = 0, matchedExact = 0, matchedFuzzy = 0, written = 0, stillMissing = 0;
  const sampleMatches = [];

  for (const m of missing.values()) {
    if (processed >= options.limit) break;
    processed += 1;

    // Primary: exact fight-id via results.csv URL → its canonical event||bout key.
    let boutKey = null, matchKind = null, resultRow = resultById.get(m.fightId) ?? null;
    if (resultRow) {
      boutKey = `${normalize(resultRow["EVENT"])}||${normalize(resultRow["BOUT"])}`;
      matchKind = "exact";
    } else {
      // Fallback: fuzzy by event + both fighter surnames against the stats index.
      const evt = normalize(m.event?.name);
      const sA = surname(m.fighterA.name), sB = surname(m.fighterB.name);
      for (const key of statsByBout.keys()) {
        const [keyEvent, keyBout] = key.split("||");
        if (evt && keyEvent !== evt && !keyEvent.includes(evt) && !evt.includes(keyEvent)) continue;
        if (sA && sB && keyBout.includes(sA) && keyBout.includes(sB)) {
          boutKey = key;
          matchKind = "fuzzy";
          resultRow = resultByBout.get(key) ?? null;
          break;
        }
      }
    }

    const boutRows = boutKey ? statsByBout.get(boutKey) : null;
    if (!boutRows || !boutRows.length) { stillMissing += 1; continue; }

    const detail = buildFightDetail(m, boutRows, resultRow);
    if (!detail) { stillMissing += 1; continue; } // ambiguous fighter assignment

    if (matchKind === "exact") matchedExact += 1; else matchedFuzzy += 1;
    if (sampleMatches.length < 8) {
      sampleMatches.push(
        `  [${matchKind}] ${m.fighterA.name} vs ${m.fighterB.name} — ${detail.event.name} ` +
        `(R: A ${detail.totals.stats[0].significantStrikes.raw} sig, ${detail.totals.stats[0].controlSeconds ?? 0}s ctrl)`
      );
    }

    if (!options.dryRun) {
      await fs.mkdir(FIGHTS_DIR, { recursive: true });
      await fs.writeFile(path.join(FIGHTS_DIR, `${m.fightId}.json`), `${JSON.stringify(detail, null, 2)}\n`);
      written += 1;
    }
  }

  // 6. Summary.
  console.log("Sample matches:");
  for (const line of sampleMatches) console.log(line);
  console.log(`\n=== Summary ===`);
  console.log(`CSV rows loaded:        ${statsRows.length} stats · ${resultsRows.length} results`);
  console.log(`Missing fights:         ${missing.size}${Number.isFinite(options.limit) ? ` (processed ${processed} this run, --limit ${options.limit})` : ""}`);
  console.log(`Matched:                ${matchedExact + matchedFuzzy}  (exact id ${matchedExact} · fuzzy name ${matchedFuzzy})`);
  console.log(`${options.dryRun ? "Would write:" : "Written:"}            ${options.dryRun ? matchedExact + matchedFuzzy : written}`);
  console.log(`Still missing (no CSV): ${stillMissing}`);
  if (options.dryRun) console.log(`\nDRY RUN — no files were written. Re-run without --dry-run to commit matches to disk.`);
}

main().catch((error) => {
  console.error("\nBackfill stopped.");
  console.error(error.message);
  process.exitCode = 1;
});
