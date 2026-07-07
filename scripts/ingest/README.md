# UFCStats Ingestion Utility

This folder contains the UFCStats ingestion scripts for Fight Lens.

It is intentionally separate from the Next.js app. Running it writes JSON files under `data/generated/ufcstats`; the UI reads app-ready normalized JSON from `data/normalized`.

## What It Can Fetch

The script can read UFCStats pages and normalize:

- event-level fight rows and fight-detail links
- fighter profile links from event pages
- fighter profile stats and fight history tables
- fight detail pages
- round-level totals and significant-strike rows when UFCStats has completed-fight stats
- matchup preview tables for upcoming fights when full stats do not exist yet

## Run

Event page:

```txt
npm run ingest:ufcstats -- --event-url http://www.ufcstats.com/event-details/9eedac48b497de5a
```

Event page with a tiny detail sample:

```txt
npm run ingest:ufcstats -- --event-url http://www.ufcstats.com/event-details/9eedac48b497de5a --include-fights --include-fighters --max-fights 1 --max-fighters 2
```

UFC 328 card refresh:

```txt
npm run ingest:ufcstats -- --event-url http://www.ufcstats.com/event-details/9eedac48b497de5a --include-fights --include-fighters --include-history-fights --max-fights 13 --max-fighters 26 --max-history-fights-per-fighter 5 --max-history-fight-details 80 --max-requests 150 --delay-ms 450
```

Fighter profile:

```txt
npm run ingest:ufcstats -- --fighter-url http://www.ufcstats.com/fighter-details/767755fd74662dbf
```

Completed fight detail with round-level stats:

```txt
npm run ingest:ufcstats -- --fight-url http://www.ufcstats.com/fight-details/394b0347b0438622
```

## Headless Mode (JS anti-bot challenge)

As of July 2026 ufcstats.com serves a JavaScript "proof-of-work" anti-bot gate
to plain HTTP clients. A normal fetch gets a ~3KB stub that reads
"Checking your browser… This site requires JavaScript" and contains **zero fight
rows**. You can confirm it yourself:

```txt
curl -s 'http://www.ufcstats.com/event-details/fccb0fee256b7b4d' | head -c 200
```

When that happens, add `--headless`. It fetches through a real headless Chromium
(Playwright) that runs the challenge JS, solves the nonce, and returns the real
HTML. The same cheerio parsing, cache, and output pipeline run unchanged — only
the transport differs. There is a ready-made script that bakes in the flag:

```txt
npm run ingest:ufcstats:headless -- --event-url http://www.ufcstats.com/event-details/fccb0fee256b7b4d
```

Or add `--headless` to any normal invocation:

```txt
npm run ingest:ufcstats -- --headless --fighter-url http://www.ufcstats.com/fighter-details/767755fd74662dbf
```

Notes:

- **One-time setup:** `npm install` then `npx playwright install chromium` (a
  Chromium binary, ~150MB, downloads to your machine cache, not the repo).
- The challenge is solved **once per run**. The browser context stays alive, so
  every page after the first reuses the cookie and skips the challenge (about
  0.5s per page instead of ~1.5s). Solving once for a full card is normal.
- A cached challenge stub is **never** treated as a valid cache hit. If an older
  plain-fetch run poisoned the cache with a "Checking your browser…" page, the
  headless run ignores it and re-fetches automatically (even without `--refresh`).
- If the challenge does not resolve (site down, slow, or the challenge changed),
  the run **throws a clear error and writes no data** rather than saving an empty
  page. Retry, or raise `--headless-timeout-ms`.
- `--refresh` still forces a fresh fetch; a good cached page still short-circuits
  the browser otherwise.

Dry-run to a scratch folder (does not touch committed `data/`):

```txt
UFCSTATS_OUTPUT_DIR=/tmp/ufcstats-dry npm run ingest:ufcstats:headless -- --event-url <url>
```

## Safety Options

```txt
--refresh              Fetch fresh pages instead of using cached JSON snapshots.
--headless             Fetch via a real headless browser that solves the JS
                       anti-bot challenge. Use when plain fetch returns a
                       "Checking your browser…" stub with 0 fight rows.
--headless-timeout-ms 30000
                       Max wait for the challenge to resolve per page.
--delay-ms 900         Wait between public website requests.
--max-requests 12      Stop before too many network requests happen.
--max-fights 3         Limit detail fetches from an event page.
--max-fighters 6       Limit fighter profile fetches from an event page.
--include-history-fights
                       Fetch recent completed fight details from fighter profiles.
--max-history-fights-per-fighter 5
                       Recent completed fight links to consider per fighter.
--max-history-fight-details 40
                       Total unique history fight detail pages to fetch.
```

## Output

```txt
data/generated/ufcstats/
  cache/       cached response snapshots as JSON
  events/      normalized event files
  fighters/    normalized fighter profile files
  fights/      normalized fight detail files
```

Each normalized record includes a `source` object with `provenance`, `sourceName`, `sourceUrl`, and `fetchedAt`.

## Build App-Ready Data

After fetching UFCStats data, run:

```txt
npm run normalize:data
```

That reads:

- `data/generated/ufcstats`
- `data/manual/ufc-328.overrides.json`

Then writes:

```txt
data/normalized/events/ufc-328.json
```

The normalizer adds a readable model layer. For example, round-one wins become an early-threat signal, but a limited late-round sample becomes lower confidence, not a claim that the fighter is weak late.

Then generate the readable report and data index:

```txt
npm run data:report
npm run model:report
```

That writes:

```txt
data/generated/ufcstats/reports/ufc-328-data-report.md
data/generated/ufcstats/reports/ufc-328-data-report.json
data/generated/ufcstats/reports/ufc-328-fight-shape-model-report.md
data/generated/ufcstats/reports/ufc-328-fight-shape-model-report.json
data/generated/ufcstats/index/ufc-328.index.json
```

## Fighter Images

The UI now has fighter image slots, but the ingestion utility does not scrape photos. Add only licensed or user-provided image URLs in manual override files.

## Important Notes

- Do not scrape from the app runtime.
- Do not ingest odds or betting fields.
- Do not scrape or copy fighter photos into the repo unless you have rights to use them.
- Upcoming UFCStats fight pages may only provide a matchup preview, not round-level stats.
- Completed fight pages are where round-level stats are usually available.
- If UFCStats markup changes, the script should fail visibly instead of inventing data.
- If a fetch returns 0 fight rows, UFCStats is likely serving its JS anti-bot
  challenge to plain HTTP. Re-run with `--headless` (see "Headless Mode" above).
