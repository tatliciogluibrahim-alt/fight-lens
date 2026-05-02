# Fight Lens Data Ingestion TODO

Status update:
A first lightweight UFCStats utility already exists under `scripts/ingest`. Future work should not treat ingestion as unstarted. The next step is to make the data contract, validation, provenance labels, and app fallback path clearer before expanding scraping.

Do not add new public-source scraping beyond the current lightweight utility until the planning and validation pieces below are done.

## Phase 0: Policy And Product Guardrails

- [ ] Review UFCStats and UFC.com robots.txt and terms before adding live requests.
- [ ] Decide whether raw HTML snapshots can be stored in the repo or only locally.
- [ ] Confirm that odds and betting fields are never saved to normalized app data.
- [ ] Confirm public UI labels for `mock`, `manual`, `sourced`, and `derived`.

## Phase 1: Data Contracts

- [ ] Add a normalized data contract that maps cleanly to the current app.
- [ ] Add provenance shape for field-level or module-level source labels.
- [ ] Add required enums for result, method, card placement, source name, and provenance.
- [ ] Add optional fields instead of fake zero defaults for unknown stats.

## Phase 2: Manual Data

- [ ] Create `data/manual/fighter-aliases.json`.
- [ ] Create `data/manual/fighter-overrides.json`.
- [ ] Create `data/manual/event-overrides/ufc-328.json`.
- [ ] Add style tags, opponent tiers, matchup questions, route labels, and context notes manually.
- [ ] Add review notes for anything editorial.

## Phase 3: Validation

- [ ] Add validation scripts that run without network access.
- [ ] Add one beginner-readable app data loader that prefers normalized data and falls back to prototype data.
- [ ] Validate that every fight references two known fighters.
- [ ] Validate expected numeric ranges.
- [ ] Validate round arrays and fight result fields.
- [ ] Validate that no banned betting fields enter normalized data.
- [ ] Make validation fail ingestion while preserving the last valid normalized data.

## Phase 4: Cached Source Fixtures

- [ ] Save one UFCStats completed event fixture.
- [ ] Save one UFCStats fighter profile fixture.
- [ ] Save one UFCStats fight detail fixture.
- [ ] Save one UFC.com event page fixture.
- [ ] Write parser tests against fixtures before adding live fetches.

## Phase 5: Live Fetching

Current status: `scripts/ingest/ufcstats.mjs` is the first lightweight fetch/parser utility. Expand it carefully instead of adding a second scraping path.

- [ ] Confirm the current UFCStats utility still respects rate limits, caching, and request caps.
- [ ] Add or document a fetch wrapper with rate limiting and a clear user agent.
- [ ] Add cache metadata: source URL, fetched timestamp, HTTP status, parser version, and content hash.
- [ ] Add `--refresh` to bypass cache intentionally.
- [ ] Add backoff and failure logging.
- [ ] Do not fetch from the Next.js runtime.

## Phase 6: App Integration

- [ ] Convert current mock data to normalized JSON with `mock` provenance.
- [ ] Load app data from normalized files.
- [ ] Add module-level source badges.
- [ ] Add graceful empty states for missing module data.
- [ ] Keep the current mock data as a fallback fixture.

## Phase 7: First Real Card Trial

- [ ] Ingest event structure for one upcoming card.
- [ ] Manually review fight order, spelling, rankings, and card buckets.
- [ ] Ingest historical UFCStats data for fighters on that card.
- [ ] Generate matchup pages from normalized data.
- [ ] Review every module for misleading precision before publishing.

