# UFCStats Ingestion

Fight Lens keeps public data ingestion separate from the Next.js UI. The app reads normalized local JSON; it does not scrape during page render.

## Refresh UFC 328

Use this command when you intentionally want to refresh the UFCStats cache for UFC 328:

```bash
npm run ingest:ufcstats -- --event-url http://www.ufcstats.com/event-details/9eedac48b497de5a --include-fights --include-fighters --include-history-fights --max-fights 13 --max-fighters 26 --max-history-fights-per-fighter 5 --max-history-fight-details 80 --max-requests 150 --delay-ms 450
```

What it does:

- fetches or reuses the cached UFC 328 event page
- fetches the 13 scheduled fight detail pages
- fetches all 26 fighter profile pages from the card
- optionally fetches capped recent historical fight detail pages for round-level evidence
- writes generated JSON under `data/generated/ufcstats`

The cache lives under `data/generated/ufcstats/cache`. Omit `--refresh` unless you really need fresh public pages.

## Normalize For The App

After ingestion, rebuild the app-ready event file:

```bash
npm run normalize:data
```

This writes:

```text
data/normalized/events/ufc-328.json
```

The normalized file includes source URLs, scrape timestamps, data completeness, sourced fight history, fetched totals/round stats where available, and manual context where public sources do not provide it.

## Generate The Data Report

Run:

```bash
npm run data:report
```

This writes:

```text
data/generated/ufcstats/reports/ufc-328-data-report.md
data/generated/ufcstats/reports/ufc-328-data-report.json
data/generated/ufcstats/index/ufc-328.index.json
```

The Markdown report is the fastest way to see which fighters matched, which have sourced fight history, which have round stats, and which modules should display or stay empty.

## Guardrails

- Do not put UFCStats fetching inside React components or route render paths.
- Do not invent missing fights, rows, or round bars.
- If a fighter has no sourced history, the UI should show the clean empty state.
- If round data is insufficient, the UI should show: `Not enough data to see the shape of this fight by round.`
- Keep provenance/debug details behind `NEXT_PUBLIC_DEBUG_MODE`.
- Do not ingest market data or sportsbook fields.
