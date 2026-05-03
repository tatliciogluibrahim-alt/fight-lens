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

## Safety Options

```txt
--refresh              Fetch fresh pages instead of using cached JSON snapshots.
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
```

That writes:

```txt
data/generated/ufcstats/reports/ufc-328-data-report.md
data/generated/ufcstats/reports/ufc-328-data-report.json
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
