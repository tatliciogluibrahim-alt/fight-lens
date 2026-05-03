#!/usr/bin/env node

import * as cheerio from "cheerio";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_ROOT = path.join(REPO_ROOT, "data/generated/ufcstats");
const CACHE_DIR = path.join(OUTPUT_ROOT, "cache");
const UFCSTATS_BASE = "http://www.ufcstats.com";
const DEFAULT_DELAY_MS = 900;
const DEFAULT_MAX_REQUESTS = 12;

const state = {
  networkRequests: 0,
  lastRequestAt: 0
};

function showHelp() {
  console.log(`
Fight Lens UFCStats ingestion

Usage:
  npm run ingest:ufcstats -- --event-url <url> [--include-fights] [--include-fighters]
  npm run ingest:ufcstats -- --fighter-url <url>
  npm run ingest:ufcstats -- --fight-url <url>

Safe defaults:
  --refresh              Fetch fresh pages instead of using cached JSON snapshots.
  --delay-ms 900         Wait between public website requests.
  --max-requests 12      Stop before too many network requests happen.
  --max-fights 3         Limit detail fetches from an event page.
  --max-fighters 6       Limit fighter profile fetches from an event page.
  --include-history-fights
                         Fetch recent completed fight detail pages from fighter profiles.
  --max-history-fights-per-fighter 5
                         Recent completed fight links to consider per fighter.
  --max-history-fight-details 40
                         Total unique history fight detail pages to fetch.
`);
}

function parseArgs(argv) {
  const args = {
    refresh: false,
    includeFights: false,
    includeFighters: false,
    delayMs: DEFAULT_DELAY_MS,
    maxRequests: DEFAULT_MAX_REQUESTS,
    maxFights: 3,
    maxFighters: 6,
    includeHistoryFights: false,
    maxHistoryFightsPerFighter: 5,
    maxHistoryFightDetails: 40
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--refresh") {
      args.refresh = true;
    } else if (arg === "--include-fights") {
      args.includeFights = true;
    } else if (arg === "--include-fighters") {
      args.includeFighters = true;
    } else if (arg === "--event-url") {
      args.eventUrl = next;
      index += 1;
    } else if (arg === "--fighter-url") {
      args.fighterUrl = next;
      index += 1;
    } else if (arg === "--fight-url") {
      args.fightUrl = next;
      index += 1;
    } else if (arg === "--delay-ms") {
      args.delayMs = Number(next);
      index += 1;
    } else if (arg === "--max-requests") {
      args.maxRequests = Number(next);
      index += 1;
    } else if (arg === "--max-fights") {
      args.maxFights = Number(next);
      index += 1;
    } else if (arg === "--max-fighters") {
      args.maxFighters = Number(next);
      index += 1;
    } else if (arg === "--include-history-fights") {
      args.includeHistoryFights = true;
    } else if (arg === "--max-history-fights-per-fighter") {
      args.maxHistoryFightsPerFighter = Number(next);
      index += 1;
    } else if (arg === "--max-history-fight-details") {
      args.maxHistoryFightDetails = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUfcStatsUrl(url) {
  const parsed = new URL(url, UFCSTATS_BASE);

  // UFCStats serves these pages reliably over HTTP in this environment.
  // HTTPS may refuse connections, so source URLs are normalized before fetch.
  parsed.protocol = "http:";

  if (parsed.hostname === "ufcstats.com") {
    parsed.hostname = "www.ufcstats.com";
  }

  return parsed.toString();
}

function idFromUrl(url) {
  const parsed = new URL(normalizeUfcStatsUrl(url));
  return parsed.pathname.split("/").filter(Boolean).at(-1) ?? slugify(url);
}

function cachePathForUrl(url) {
  const hash = crypto.createHash("sha1").update(normalizeUfcStatsUrl(url)).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function fetchHtml(url, options) {
  const normalizedUrl = normalizeUfcStatsUrl(url);
  const cachePath = cachePathForUrl(normalizedUrl);
  const cached = await readJsonIfExists(cachePath);

  if (cached && !options.refresh) {
    return {
      body: cached.body,
      metadata: cached.metadata
    };
  }

  if (state.networkRequests >= options.maxRequests) {
    throw new Error(`Stopped before fetching ${normalizedUrl}; --max-requests=${options.maxRequests} was reached.`);
  }

  const elapsed = Date.now() - state.lastRequestAt;
  if (state.lastRequestAt && elapsed < options.delayMs) {
    await sleep(options.delayMs - elapsed);
  }

  state.networkRequests += 1;
  state.lastRequestAt = Date.now();

  const response = await fetch(normalizedUrl, {
    headers: {
      "user-agent": "Fight Lens UFCStats ingestion (local development)",
      accept: "text/html,application/xhtml+xml"
    }
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`UFCStats request failed: ${response.status} ${response.statusText} for ${normalizedUrl}`);
  }

  const metadata = {
    url: normalizedUrl,
    fetchedAt: new Date().toISOString(),
    status: response.status,
    contentType: response.headers.get("content-type"),
    parserVersion: 1
  };

  await writeJson(cachePath, { metadata, body });

  return { body, metadata };
}

function sourceFor(url, fetchedAt) {
  return {
    provenance: "sourced",
    sourceName: "ufcstats",
    sourceUrl: normalizeUfcStatsUrl(url),
    fetchedAt
  };
}

function textWithoutFirstLabel($, element) {
  const clone = $(element).clone();
  clone.find("i").first().remove();
  return cleanText(clone.text());
}

function parseInfoList($) {
  const info = {};

  $(".b-list__box-list-item").each((_, item) => {
    const label = cleanText($(item).find("i").first().text()).replace(/:$/, "");
    const value = textWithoutFirstLabel($, item);
    if (label && value) info[label] = value;
  });

  return info;
}

function cellLines($, cell) {
  const lines = $(cell)
    .find(".b-fight-details__table-text, a, .b-flag__text")
    .map((_, node) => cleanText($(node).text()))
    .get()
    .filter(Boolean);

  // Keep duplicate values. UFCStats often has one value per fighter in a
  // single table cell, and both fighters can legitimately have the same value.
  return lines;
}

function firstFightUrl($, row) {
  const dataLink = $(row).attr("data-link");
  if (dataLink) return normalizeUfcStatsUrl(dataLink);

  const onclick = $(row).attr("onclick") ?? "";
  const onclickMatch = onclick.match(/https?:\/\/[^'"]+fight-details\/[a-z0-9]+/i);
  if (onclickMatch) return normalizeUfcStatsUrl(onclickMatch[0]);

  const href = $(row).find('a[href*="/fight-details/"]').first().attr("href");
  return href ? normalizeUfcStatsUrl(href) : null;
}

function fighterLinksFrom($, element) {
  return $(element)
    .find('a[href*="/fighter-details/"]')
    .map((_, anchor) => ({
      id: idFromUrl($(anchor).attr("href")),
      name: cleanText($(anchor).text()),
      url: normalizeUfcStatsUrl($(anchor).attr("href"))
    }))
    .get()
    .filter((fighter) => fighter.name && fighter.url);
}

function parseNumber(value) {
  const text = cleanText(value);
  if (!text || text === "---") return null;
  const number = Number(text.replace("%", ""));
  return Number.isFinite(number) ? number : null;
}

function parseLandedAttempted(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d+)\s+of\s+(\d+)$/i);
  if (!match) return { raw: text || null };
  return {
    landed: Number(match[1]),
    attempted: Number(match[2]),
    raw: text
  };
}

function parseTimeToSeconds(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseTwoFighterStatsRow($, row, kind = "totals") {
  const cells = $(row).find("td").toArray();
  if (cells.length < 10) return null;

  const fighters = fighterLinksFrom($, cells[0]);
  const valuesByCell = cells.map((cell) => cellLines($, cell));

  const build = (lineIndex) => ({
    fighter: fighters[lineIndex] ?? null,
    kd: parseNumber(valuesByCell[1]?.[lineIndex]),
    significantStrikes: parseLandedAttempted(valuesByCell[2]?.[lineIndex]),
    significantStrikePercent: parseNumber(valuesByCell[3]?.[lineIndex]),
    totalStrikes: parseLandedAttempted(valuesByCell[4]?.[lineIndex]),
    takedowns: parseLandedAttempted(valuesByCell[5]?.[lineIndex]),
    takedownPercent: parseNumber(valuesByCell[6]?.[lineIndex]),
    submissionAttempts: parseNumber(valuesByCell[7]?.[lineIndex]),
    reversals: parseNumber(valuesByCell[8]?.[lineIndex]),
    control: cleanText(valuesByCell[9]?.[lineIndex]) || null,
    controlSeconds: parseTimeToSeconds(valuesByCell[9]?.[lineIndex])
  });

  return {
    kind,
    fighters,
    stats: [build(0), build(1)]
  };
}

function parseTwoFighterSignificantStrikeRow($, row, kind = "significantStrikes") {
  const cells = $(row).find("td").toArray();
  if (cells.length < 9) return null;

  const fighters = fighterLinksFrom($, cells[0]);
  const valuesByCell = cells.map((cell) => cellLines($, cell));

  const build = (lineIndex) => ({
    fighter: fighters[lineIndex] ?? null,
    significantStrikes: parseLandedAttempted(valuesByCell[1]?.[lineIndex]),
    significantStrikePercent: parseNumber(valuesByCell[2]?.[lineIndex]),
    head: parseLandedAttempted(valuesByCell[3]?.[lineIndex]),
    body: parseLandedAttempted(valuesByCell[4]?.[lineIndex]),
    leg: parseLandedAttempted(valuesByCell[5]?.[lineIndex]),
    distance: parseLandedAttempted(valuesByCell[6]?.[lineIndex]),
    clinch: parseLandedAttempted(valuesByCell[7]?.[lineIndex]),
    ground: parseLandedAttempted(valuesByCell[8]?.[lineIndex])
  });

  return {
    kind,
    fighters,
    stats: [build(0), build(1)]
  };
}

function parseRoundTable($, table, rowParser) {
  const rounds = [];
  let currentRound = null;

  $(table)
    // UFCStats has invalid table markup with Round headers inserted between
    // tbody tags. Cheerio repairs that markup into sibling thead/tbody nodes,
    // so we walk direct children instead of assuming one clean tbody.
    .children()
    .each((_, child) => {
      const text = cleanText($(child).text());
      const roundMatch = text.match(/^Round\s+(\d+)/i);

      if (roundMatch) {
        currentRound = Number(roundMatch[1]);
        return;
      }

      if (currentRound && child.tagName === "tbody") {
        const row = $(child).find("tr.b-fight-details__table-row").first();
        const parsed = row.length ? rowParser($, row, "round") : null;
        if (parsed) rounds.push({ round: currentRound, ...parsed });
        currentRound = null;
      }

      if (currentRound && child.tagName === "tr") {
        const parsed = rowParser($, child, "round");
        if (parsed) rounds.push({ round: currentRound, ...parsed });
        currentRound = null;
      }
    });

  return rounds;
}

function parseEventPage(html, url, fetchedAt) {
  const $ = cheerio.load(html);
  const title = cleanText($(".b-content__title-highlight").first().text()) || cleanText($(".b-content__title").first().text());
  const info = parseInfoList($);
  const fights = [];

  $('tr[data-link*="/fight-details/"], tr.js-fight-details-click').each((_, row) => {
    const fightUrl = firstFightUrl($, row);
    if (!fightUrl) return;

    const cells = $(row).find("td").toArray();
    const fighterLinks = fighterLinksFrom($, cells[1]);
    if (fighterLinks.length < 2) return;

    const method = cleanText($(cells[7]).text()) || null;
    const round = parseNumber($(cells[8]).text());
    const time = cleanText($(cells[9]).text()) || null;
    const resultFlags = $(cells[0])
      .find(".b-flag__text")
      .map((__, node) => cleanText($(node).text()).toLowerCase())
      .get();

    fights.push({
      id: idFromUrl(fightUrl),
      url: fightUrl,
      fighterA: fighterLinks[0],
      fighterB: fighterLinks[1],
      weightClass: cleanText($(cells[6]).text()) || null,
      method,
      round,
      time,
      resultFlags,
      status: method || round || time ? "completed" : "scheduled",
      source: sourceFor(url, fetchedAt)
    });
  });

  const completedCount = fights.filter((fight) => fight.status === "completed").length;

  return {
    id: idFromUrl(url),
    name: title,
    date: info.Date ?? null,
    location: info.Location ?? null,
    status: completedCount === 0 ? "scheduled" : completedCount === fights.length ? "completed" : "mixed",
    fights,
    source: sourceFor(url, fetchedAt)
  };
}

function parseFighterProfile(html, url, fetchedAt) {
  const $ = cheerio.load(html);
  const name = cleanText($(".b-content__title-highlight").first().text());
  const record = cleanText($(".b-content__title-record").first().text()).replace(/^Record:\s*/i, "");
  const info = parseInfoList($);
  const history = [];

  $(".b-fight-details__table_type_event-details tbody tr").each((_, row) => {
    const fightUrl = firstFightUrl($, row);
    if (!fightUrl) return;

    const cells = $(row).find("td").toArray();
    if (cells.length < 10) return;

    const fighters = fighterLinksFrom($, cells[1]);
    const eventLink = $(cells[6]).find('a[href*="/event-details/"]').first();
    const result = cleanText($(cells[0]).find(".b-flag__text").first().text()).toLowerCase() || null;

    history.push({
      fightId: idFromUrl(fightUrl),
      fightUrl,
      result,
      fighters,
      opponent: fighters.find((fighter) => fighter.id !== idFromUrl(url)) ?? fighters[1] ?? null,
      knockdowns: cellLines($, cells[2]),
      significantStrikes: cellLines($, cells[3]),
      takedowns: cellLines($, cells[4]),
      submissions: cellLines($, cells[5]),
      event: {
        id: eventLink.attr("href") ? idFromUrl(eventLink.attr("href")) : null,
        name: cleanText(eventLink.text()) || null,
        url: eventLink.attr("href") ? normalizeUfcStatsUrl(eventLink.attr("href")) : null,
        date: cleanText($(cells[6]).find(".b-fight-details__table-text").last().text()) || null
      },
      method: cleanText($(cells[7]).text()) || null,
      round: parseNumber($(cells[8]).text()),
      time: cleanText($(cells[9]).text()) || null
    });
  });

  return {
    id: idFromUrl(url),
    name,
    record: record || null,
    nickname: cleanText($(".b-content__Nickname").first().text()) || null,
    height: info.Height ?? null,
    weight: info.Weight ?? null,
    reach: info.Reach ?? null,
    stance: info.STANCE ?? null,
    dob: info.DOB ?? null,
    careerStats: {
      slpm: parseNumber(info.SLpM),
      strikingAccuracy: parseNumber(info["Str. Acc."]),
      sapm: parseNumber(info.SApM),
      strikingDefense: parseNumber(info["Str. Def"]),
      takedownAverage: parseNumber(info["TD Avg."]),
      takedownAccuracy: parseNumber(info["TD Acc."]),
      takedownDefense: parseNumber(info["TD Def."]),
      submissionAverage: parseNumber(info["Sub. Avg."])
    },
    fightHistory: history,
    source: sourceFor(url, fetchedAt)
  };
}

function parsePreviewTable($) {
  const table = $(".b-fight-details__table").first();
  const fighterHeaders = table
    .find("thead a")
    .map((_, anchor) => ({
      id: idFromUrl($(anchor).attr("href")),
      name: cleanText($(anchor).text()),
      url: normalizeUfcStatsUrl($(anchor).attr("href"))
    }))
    .get();

  const rows = [];
  table.find("tr.b-fight-details__table-row-preview").each((_, row) => {
    const cells = $(row).find("td").toArray();
    if (cells.length < 3) return;

    rows.push({
      label: cleanText($(cells[0]).text()),
      fighterA: cleanText($(cells[1]).text()) || null,
      fighterB: cleanText($(cells[2]).text()) || null
    });
  });

  return { fighters: fighterHeaders, rows };
}

function parseFightDetails(html, url, fetchedAt) {
  const $ = cheerio.load(html);
  const eventLink = $('.b-content__title a[href*="/event-details/"]').first();
  const persons = $(".b-fight-details__person")
    .map((_, person) => {
      const link = $(person).find('a[href*="/fighter-details/"]').first();
      return {
        id: link.attr("href") ? idFromUrl(link.attr("href")) : null,
        name: cleanText(link.text()),
        url: link.attr("href") ? normalizeUfcStatsUrl(link.attr("href")) : null,
        nickname: cleanText($(person).find(".b-fight-details__person-title").text()).replace(/^"|"$/g, "") || null,
        result: cleanText($(person).find(".b-fight-details__person-status").text()) || null
      };
    })
    .get()
    .filter((fighter) => fighter.name);

  const details = {};
  $(".b-fight-details__text-item, .b-fight-details__text-item_first").each((_, item) => {
    const label = cleanText($(item).find(".b-fight-details__label").first().text()).replace(/:$/, "");
    const value = textWithoutFirstLabel($, item);
    if (label && value) details[label] = value;
  });

  const tables = $("table").toArray();
  const totalsTable = tables.find((table) => {
    const head = $(table).find("thead").first();
    return cleanText(head.text()).includes("KD") && !head.hasClass("b-fight-details__table-head_rnd");
  });
  const significantTable = tables.find((table) => {
    const head = $(table).find("thead").first();
    return cleanText(head.text()).includes("Head") && !head.hasClass("b-fight-details__table-head_rnd");
  });
  const roundTotalsTable = tables.find((table) => {
    const head = $(table).find("thead").first();
    return head.hasClass("b-fight-details__table-head_rnd") && cleanText(head.text()).includes("KD");
  });
  const roundSignificantTable = tables.find(
    (table) => $(table).find(".b-fight-details__table-head_rnd").length > 0 && cleanText($(table).find("thead").first().text()).includes("Head")
  );

  const hasCompletedStats = Boolean(totalsTable);
  const preview = hasCompletedStats ? null : parsePreviewTable($);

  return {
    id: idFromUrl(url),
    url: normalizeUfcStatsUrl(url),
    event: {
      id: eventLink.attr("href") ? idFromUrl(eventLink.attr("href")) : null,
      name: cleanText(eventLink.text()) || null,
      url: eventLink.attr("href") ? normalizeUfcStatsUrl(eventLink.attr("href")) : null
    },
    title: cleanText($(".b-fight-details__fight-title").first().text()) || null,
    status: hasCompletedStats ? "completed" : "scheduled",
    fighters: persons,
    result: {
      method: details.Method ?? null,
      round: parseNumber(details.Round),
      time: details.Time ?? null,
      timeFormat: details["Time format"] ?? null,
      referee: details.Referee ?? null,
      details: details.Details ?? null
    },
    matchupPreview: preview,
    totals: totalsTable ? parseTwoFighterStatsRow($, $(totalsTable).find("tbody tr").first(), "totals") : null,
    roundStats: roundTotalsTable ? parseRoundTable($, roundTotalsTable, parseTwoFighterStatsRow) : [],
    significantStrikes: significantTable ? parseTwoFighterSignificantStrikeRow($, $(significantTable).find("tbody tr").first(), "significantStrikes") : null,
    significantStrikesByRound: roundSignificantTable ? parseRoundTable($, roundSignificantTable, parseTwoFighterSignificantStrikeRow) : [],
    source: sourceFor(url, fetchedAt)
  };
}

function summarizeParse(record, label) {
  if (label === "event") return `${record.name}: ${record.fights.length} fight rows`;
  if (label === "fighter") return `${record.name}: ${record.fightHistory.length} history rows`;
  if (label === "fight") return `${record.id}: ${record.status}, ${record.roundStats.length} round rows`;
  return record.id;
}

async function ingestEvent(url, options) {
  const fetched = await fetchHtml(url, options);
  const event = parseEventPage(fetched.body, url, fetched.metadata.fetchedAt);
  const eventPath = path.join(OUTPUT_ROOT, "events", `${slugify(event.name || event.id)}.json`);
  await writeJson(eventPath, event);

  console.log(`Wrote event: ${path.relative(REPO_ROOT, eventPath)} (${summarizeParse(event, "event")})`);

  if (options.includeFights) {
    for (const fight of event.fights.slice(0, options.maxFights)) {
      await ingestFight(fight.url, options);
    }
  }

  const ingestedProfiles = [];

  if (options.includeFighters) {
    const uniqueFighters = new Map();
    for (const fight of event.fights) {
      uniqueFighters.set(fight.fighterA.id, fight.fighterA);
      uniqueFighters.set(fight.fighterB.id, fight.fighterB);
    }

    for (const fighter of [...uniqueFighters.values()].slice(0, options.maxFighters)) {
      ingestedProfiles.push(await ingestFighter(fighter.url, options));
    }
  }

  if (options.includeHistoryFights) {
    await ingestHistoryFightDetails(ingestedProfiles, options);
  }
}

async function ingestFighter(url, options) {
  const fetched = await fetchHtml(url, options);
  const fighter = parseFighterProfile(fetched.body, url, fetched.metadata.fetchedAt);
  const fighterPath = path.join(OUTPUT_ROOT, "fighters", `${slugify(fighter.name || fighter.id)}.json`);
  await writeJson(fighterPath, fighter);

  console.log(`Wrote fighter: ${path.relative(REPO_ROOT, fighterPath)} (${summarizeParse(fighter, "fighter")})`);
  return fighter;
}

async function ingestFight(url, options) {
  const fetched = await fetchHtml(url, options);
  const fight = parseFightDetails(fetched.body, url, fetched.metadata.fetchedAt);
  const fightTitle = `${fight.event.name || "event"}-${fight.fighters.map((fighter) => fighter.name).join("-vs-")}`;
  const fightPath = path.join(OUTPUT_ROOT, "fights", `${slugify(fightTitle) || fight.id}.json`);
  await writeJson(fightPath, fight);

  console.log(`Wrote fight: ${path.relative(REPO_ROOT, fightPath)} (${summarizeParse(fight, "fight")})`);
  return fight;
}

function isCompletedHistoryFight(fight) {
  const result = cleanText(fight?.result).toLowerCase();
  return Boolean(fight?.fightUrl && result && result !== "next");
}

async function ingestHistoryFightDetails(profiles, options) {
  const uniqueFightUrls = new Map();

  for (const profile of profiles) {
    for (const fight of (profile?.fightHistory ?? [])
      .filter(isCompletedHistoryFight)
      .slice(0, options.maxHistoryFightsPerFighter)) {
      uniqueFightUrls.set(fight.fightId, fight.fightUrl);
    }
  }

  const selectedUrls = [...uniqueFightUrls.values()].slice(0, options.maxHistoryFightDetails);
  console.log(`Fetching ${selectedUrls.length} recent history fight detail pages.`);

  for (const fightUrl of selectedUrls) {
    await ingestFight(fightUrl, options);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  if (!options.eventUrl && !options.fighterUrl && !options.fightUrl) {
    showHelp();
    throw new Error("Provide --event-url, --fighter-url, or --fight-url.");
  }

  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });

  if (options.eventUrl) await ingestEvent(options.eventUrl, options);
  if (options.fighterUrl) await ingestFighter(options.fighterUrl, options);
  if (options.fightUrl) await ingestFight(options.fightUrl, options);

  console.log(`Done. Network requests this run: ${state.networkRequests}. Cached pages were reused when available.`);
}

main().catch((error) => {
  console.error("\nIngestion stopped safely.");
  console.error(error.message);
  console.error("\nGenerated app data was not normalized. The last valid normalized JSON remains in place.");
  process.exitCode = 1;
});
