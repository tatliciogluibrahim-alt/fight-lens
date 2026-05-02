# Fight Lens Data Ingestion Plan

This is the safe architecture plan for replacing mock data with public data where possible. It is intentionally documentation-only. Do not add scraping code until the TODO checklist is completed.

## Goals

- Keep the app fast and stable by serving normalized local data, not live scraped pages.
- Use public sources only where the data is actually available and appropriate.
- Preserve the Fight Lens product line: no odds, no picks, no betting language.
- Clearly label every value as `sourced`, `manual`, `derived`, or `mock`.
- Allow manual overrides for context that cannot be reliably scraped.

## Recommended Sources

### 1. UFCStats

Primary use: historical fight results, fighter stat profiles, fight-level totals, and round-level stats.

Useful pages:

- Completed events index: `https://www.ufcstats.com/statistics/events/completed?page=all`
- Fighter profile pages: `https://www.ufcstats.com/fighter-details/{fighterId}`
- Fight detail pages: `https://www.ufcstats.com/fight-details/{fightId}`

Data UFCStats can provide:

- completed event name, date, location
- fighter height, reach, stance, date of birth, record
- career stats such as SLpM, striking accuracy, SApM, striking defense, takedown average, takedown accuracy, takedown defense, submission average
- fight result, method, round, and time
- fight totals for knockdowns, significant strikes, total strikes, takedowns, submission attempts, reversals, and control time
- per-round totals for the same core fight stats
- significant strike splits by target, position, and round

Best Fight Lens uses:

- Last 5 Trend
- Key Edges
- Resume Heat inputs
- Style Clash numeric axes
- round trend and dominance score after a fight has happened

Limitations:

- It is strongest for completed fights. Upcoming card structure may be incomplete or represented differently.
- Page markup can change.
- Fighter matching by name needs manual review for duplicates, accents, spelling changes, and renamed athletes.
- It does not provide tactical style tags, opponent tier labels, or context notes.

### 2. UFC.com Event Pages

Primary use: upcoming event structure and public card metadata.

Useful pages:

- Events index: `https://www.ufc.com/events`
- Event page example: `https://www.ufc.com/event/ufc-328`

Data UFC.com event pages can provide:

- event name
- event date and local start time
- venue and city
- card buckets such as main card, prelims, and early prelims
- listed bouts, weight classes, title-bout labels, fighter countries, and some rankings
- broadcast/start-time metadata

Best Fight Lens uses:

- Card Dashboard
- matchup route generation
- fight order and card placement
- event header metadata

Do not ingest:

- odds, betting widgets, sportsbook labels, or any market data shown on UFC pages
- marketing copy that would make Fight Lens feel promotional
- images for v1, because the product uses abstract FighterMark blocks

Limitations:

- Upcoming cards change frequently.
- The same page may include live/result placeholders before, during, and after the event.
- Some content may be client-rendered, duplicated, localized, or repeated in markup.
- Fight order should be reviewed manually before publishing.

### 3. Manual Override Files

Primary use: Fight Lens editorial context and values that public sources do not reliably provide.

Manual data should include:

- current rankings if not confidently sourced
- style tags such as `control storm vs pressure jab`
- opponent tier labels such as `top 10`, `ranked`, `unranked`
- matchup questions
- context notes
- card placement fixes
- fighter name aliases and accent handling
- route labels for Paths to Victory
- preferred display names
- corrections for missing or obviously wrong source values

Manual data is not a failure mode. It is part of the product. Fight Lens is an editorial analysis surface, not a raw stats mirror.

## What Should Stay Manual

These fields should not be treated as reliably scrapable in v1:

- style-clash labels
- tactical route labels
- opponent tier labels
- matchup questions
- pressure-point notes
- ranking snapshots unless an approved source is added
- injury/context notes
- fight-order confidence when pages disagree
- analyst copy
- derived chart language
- any qualitative claim

## Current Lightweight Utility

A first UFCStats-only utility now exists at `scripts/ingest/ufcstats.mjs`.

It is intentionally separate from the app and writes to `data/generated/ufcstats`. The app still reads mock data from `lib/data.ts`, so failed or missing ingestion output will not break the UI.

Run instructions live in `scripts/ingest/README.md`.

## Proposed File Structure

Keep ingestion isolated from the app as it grows.

```txt
docs/
  INGESTION_PLAN.md
  TODO_DATA_INGESTION.md

data/
  manual/
    README.md
    fighter-aliases.json
    fighter-overrides.json
    event-overrides/
      ufc-328.json
  raw/
    README.md
    ufcstats/
      events/
      fighters/
      fights/
    ufc/
      events/
  normalized/
    README.md
    events/
      ufc-328.json
    fighters.json
    fights.json

scripts/
  ingest/
    README.md
    sources/
      ufcstats.ts
      ufcEventPage.ts
      manualOverrides.ts
    normalize/
      normalizeEvent.ts
      normalizeFight.ts
      normalizeFighter.ts
    validate/
      schemas.ts
      validateIngestion.ts
    runIngestion.ts
```

The app should eventually read from `data/normalized`, not from source-specific raw files.

## Data Flow

```txt
source page
  -> raw html/json snapshot
  -> source parser
  -> normalized source records
  -> manual overrides
  -> validation
  -> app-ready data file
```

Important rule: never scrape during page render. Ingestion should be a separate command run by a human or scheduled job.

## Caching Strategy

Use a snapshot cache before parsing.

Recommended cache behavior:

- store raw responses under `data/raw`
- include source URL, fetched timestamp, HTTP status, parser version, and content hash
- do not refetch a cached URL unless a `--refresh` flag is passed
- use long cache windows for completed fights because they rarely change
- use shorter cache windows for upcoming event pages because cards change often
- commit small normalized data files, but do not commit large raw HTML snapshots unless needed for fixture tests

Suggested cache windows:

| Data type | Cache window |
| --- | --- |
| Completed UFCStats fight detail | 30 days or manual refresh |
| UFCStats fighter profile | 7 days |
| Completed event metadata | 30 days |
| Upcoming UFC.com event page | 6-12 hours during fight week |
| Manual overrides | immediate |

## Validation Strategy

Validation should happen after normalization and after manual overrides.

Recommended checks:

- every fight has a stable `id`
- every fight references two existing fighters
- every fighter has a display name and source label
- numeric stats are within expected ranges
- round arrays match the scheduled or completed round count
- result fields use a fixed enum
- card placement uses a fixed enum
- sourced values include source URL and fetched timestamp
- manual values include a short reason or owner note
- no banned betting fields are present in normalized app data

Validation should fail the ingestion command but not break the app. The app should continue using the last valid normalized data file.

## Missing Data Behavior

The app should degrade gracefully.

Recommended UI fallbacks:

- show `not available` for missing numeric values
- hide a chart row if both fighters are missing the value
- show a compact empty state if a whole module lacks data
- keep the matchup page renderable if one module fails
- show a `manual review needed` badge in internal/admin views, not public creator cards
- never invent a precise sourced number

Recommended code behavior:

- normalized data should include optional fields, not fake zeros
- chart components should accept missing values and skip safely
- pages should load from the last known good data file
- ingestion should write to a temp file first, validate, then atomically replace the normalized file

## Source Labels

Every field that reaches the app should carry provenance.

Recommended field shape:

```ts
type DataProvenance = "sourced" | "manual" | "derived" | "mock";

interface ProvenancedValue<T> {
  value: T;
  provenance: DataProvenance;
  sourceName?: "ufcstats" | "ufc.com" | "manual";
  sourceUrl?: string;
  fetchedAt?: string;
  note?: string;
}
```

UI label rules:

- `mock`: show `Prototype data`
- `manual`: show `Manual note` where the value is editorial or internal
- `sourced`: show `Source: UFCStats` or `Source: UFC.com` in small metadata
- `derived`: show `Derived from sourced stats` and document the formula

For the public app, a single visible badge per module is usually enough. Do not clutter every number with a label.

## Risk And Limitations

- Public pages can change markup without warning.
- Automated access may be blocked or restricted. Respect robots.txt, terms, and rate limits before implementation.
- UFC.com pages can include betting odds. Fight Lens must explicitly filter them out.
- UFCStats values are historical and may not exist for upcoming fights.
- Fighter names require alias handling because accents, nicknames, and spelling can differ by source.
- Rankings are time-sensitive and may need a snapshot date.
- Manual context can introduce bias. Keep notes short, sourced where possible, and easy to review.
- Derived metrics can look more official than they are. Label formulas clearly.
- Source pages may disagree on fight order or card placement.
- Scraping should not become a runtime dependency for the app.

## Recommended First Implementation Milestone

The first ingestion milestone should not fetch the whole web.

Build this order:

1. Create manual override files and schemas.
2. Create normalized JSON shape that matches current `lib/types.ts`.
3. Add a validator that checks local files only.
4. Convert the current mock data into normalized JSON with `mock` provenance.
5. Add one parser fixture from a saved UFCStats page.
6. Add one parser fixture from a saved UFC.com event page.
7. Only then add live fetch commands with caching, rate limiting, and manual review.
