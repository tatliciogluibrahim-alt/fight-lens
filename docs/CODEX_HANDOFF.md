# Fight Lens Codex Handoff

## Product Summary

Fight Lens is a signal-based UFC matchup intelligence product. Before each card it publishes a model call (predicted winner + win probability, method lean, fight shape), logs the call publicly, and scores the result after the fight. It is not a betting product. Language is always signal-based and directional — never a guarantee.

The stack is Next.js 16 App Router with full static generation. All prediction data lives in JSON files under `data/`. There is no API server, no database, and no runtime prediction compute.

---

## Current State

- **Model version:** outcome-v0.2 (no v0.3 promoted)
- **Backtest corpus:** 20 completed UFC events, 253 scored fights
- **Winner accuracy:** 66% | **Method accuracy:** 58% | **Brier:** 0.219
- **Public logged calls:** separate from backtest — only `getLockedPredictions()` counts
- **Static pages:** 36 (verified via `npm run build`)
- **Prediction audit:** 24/24 routes pass (verified via the audit script; local `tsx` CLI can hit named-pipe EPERM in this sandbox)
- **Lint:** 0 warnings
- **`opponentTotals` pipeline:** active; ~60% item-level coverage

---

## Non-Negotiable Rules

1. **All prediction display goes through `buildPredictionViewModelBundle()`** in `lib/predictionViewModel.ts`. Never compute a winner, probability, or method lean independently in a component.
2. **52% threshold is immutable.** Below 52%, show "Too close to call". Do not change `lib/predictionThresholds.ts`.
3. **Public Model Record ≠ backtest.** `getLockedPredictions()` feeds the record page and accuracy metrics. `getHistoricalBacktestReconstructions()` feeds the backtest section only. Never mix them.
4. **Locked prediction JSON files are read-only.** No edits after a fight result is known.
5. **Winner forecast and fight shape are separate.** Shape copy never names a winner. `buildShapeNarrative()` enforces this.
6. **No betting language.** Forbidden: lock, odds, parlay, wager, unit, guaranteed, best bet, pick.
7. **No forbidden UI phrases.** Forbidden: "matchup stress", "pressure point", "style-pressure read", "Limited pressure signal".
8. **`opponentTotals` must not regress.** Any ingestion or normalization change must verify coverage remains ~60% or better.

---

## Key Routes

| Route | Notes |
|---|---|
| `/` | Homepage — guided path: product hero, current-card module, compact Public Model Record strip, selected-event chooser, then secondary how-to guide. Pulls `buildPredictionViewModelBundle` only when the selected/current card has fight data. |
| `/events` | Events index — Next Card, Upcoming forecast cards, and Past Scored cards. Shell events render pending states without fake calls. |
| `/events/[eventId]` | Event page — choose-a-fight flow via `EventHero` + `FightCard`; empty event shells show a pending card instead of filters. |
| `/events/[eventId]/[fightId]` | Fight page — one scroll page: fighter hero → snapshot → model call → fight shape → details. Hash anchors `#section-call`, `#section-shape`, `#section-details` work for deep links. No tab switching required. |
| `/record` | Model Record — two clearly labeled sections: public logged calls vs. historical backtest. |
| `/methodology` | How it works — 3-card scan grid, model row descriptions. |
| `/backtests/islam-jdm` | One-off backtest reconstruction, not a public logged call. |

---

## Key Files

### Prediction pipeline (read before touching anything)

| File | Purpose |
|---|---|
| `lib/predictionViewModel.ts` | **Canonical source of truth** for all fight-page prediction state. Read this first. |
| `lib/predictionThresholds.ts` | 52% named-call threshold. Do not touch. |
| `lib/accuracy/index.ts` | `getLockedPredictions()` (public record) vs. `getHistoricalBacktestReconstructions()` (backtest). |
| `lib/events/registry.ts` | `getEvent()`, `getEventFight()`, `getAllFightParams()` — event/fight lookup. |

### Model and shape

| File | Purpose |
|---|---|
| `lib/fight-shape-model/model.ts` | Shape model math — computes style pressure scores. Do not change formulas. |
| `lib/fight-shape-model/shape-narrative.ts` | Analyst-style copy generator. Returns `{ headline, cards, caveat }`. Never names a winner. |
| `lib/fight-shape-model/explain.ts` | `pressureLabel()` and `explainPressure()` — style edge label text. |
| `lib/fight-shape.ts` | 8 radar axis definitions and `NullableStyleProfile` type. |
| `lib/style-radar.ts` | `getStyleRadarDimensions()` — converts `styleProfile` to scored radar dimensions. |

### UI components (prediction-consuming)

| File | Purpose |
|---|---|
| `components/FightReadSnapshot.tsx` | At-a-glance strip between hero and analysis sections. Reads only from `viewModel`. No read-strength pill. |
| `components/FighterNamePlate.tsx` | Fighter hero name — word-boundary-only line breaks (`whitespace-nowrap` per word). Both fight page routes use this. |
| `components/TheCall.tsx` | "call detail." section — method lean (text-row list) + scenario cards. **No ProbabilityBar** — snapshot handles the primary call display. |
| `components/ProbabilityBar.tsx` | File exists but is **not rendered on fight pages**. Do not re-add to TheCall — would create a second winner/probability display. |
| `components/FightShapeSummary.tsx` | **Not currently rendered.** File exists but is not used in any fight page. Do not re-add without removing `StyleComparisonBars` — they would duplicate the "fight shape." title. |
| `components/StyleComparisonBars.tsx` | **The single fight shape section.** Overlay radar → insight cards → collapsed axis breakdown. Does not accept `modelOutput` or `styleClashLabel` props. |
| `components/FightPageTabs.tsx` | Section anchor wrapper only — no visible nav row. Assigns `id="section-{id}"` and `scroll-mt-24` to each section. |
| `components/FightCard.tsx` | Event page matchup row — call, proportional method lean bars, result chip. |
| `components/ContextualNotes.tsx` | Optional manual context-note renderer. Renders only when `fight.contextNotes` exists; notes do not affect prediction math. |
| `components/HomeEventSelector.tsx` | Homepage selected-event chooser. Shows one event preview at a time and links to `/events` for full browsing. |

### Data

| Path | Purpose |
|---|---|
| `data/events/` | Source event JSON files (one per UFC event). |
| `data/predictions/` | Locked public prediction JSON files (read-only post-call). |
| `data/generated/` | Generated normalized events and backtest outputs. |
| `data/normalized/events/ufc-freedom-250.json` | Manual upcoming event shell with event-level details for UFC Freedom 250: Topuria vs. Gaethje. No fights, fighter stats, predictions, or public calls yet. |

### Scripts

| Script | Purpose |
|---|---|
| `scripts/audit/predictions.ts` | Checks 24 fight pages for prediction contradictions. Must always pass 24/24. |
| `scripts/backtest/run.ts` | Runs historical validation on 253 fights. |
| `scripts/ingest/` | Data ingestion from UFCStats. Touch only for new event ingestion. |

---

## Prediction Consistency Contract

Every surface that shows a predicted winner, win probability, or method lean **must** read from `buildPredictionViewModelBundle()`. The view model returns a `PredictionViewModel` which contains:

- `callState` — `"lockedCall" | "currentCall" | "noLean" | "tooClose" | "pending"`
- `predictedWinner` — `{ id, name }` or `null`
- `winnerProbability` — number (0–100) or `null`
- `methodLean` — string label or `null`
- `isScored` — bool
- `readStrength` — `"strong" | "moderate" | "limited" | "thin"`

Components must never re-derive any of these fields. If a component needs the predicted winner ID, it reads `vm.predictedWinner?.id`.

Run `npm run audit:predictions` after any change that touches prediction display. 24/24 must pass.

---

## Public Record vs Backtest Contract

```
getLockedPredictions()          → public Model Record, accuracy metrics, homepage prediction log
getHistoricalBacktestReconstructions() → /record backtest section only
getAccuracyMetrics()            → reads locked-only (correct)
```

The `/record` page renders two visually distinct sections labeled "Public Model Record" and "Historical Backtest". These must never be merged or conflated. `isBacktestReconstruction: true` on a prediction record means it never appears in the public accuracy count.

---

## Current Model and Backtest Status

- v0.2 is the only production model. No v0.3 experiment has been promoted.
- 20 UFC events, 253 scored fights in the backtest corpus.
- Official leakage-safe baseline: 63% pick accuracy / 58% all fights / Brier 0.235 (as-of UFC win percentage).
- v0.2 vs baseline: +3pp on picked subset, +8pp all fights, Brier 0.016 lower.
- Chronological Elo baseline (K=32): 58% pick accuracy but only 24% coverage (cold-start problem). Kept as a tracked baseline only — not a production model feature.
- Calibration concern: 60–80% confidence buckets show 61–64% actual accuracy (overconfident). Not yet addressed.
- Missing data rate: 40% (fighters with thin history).
- `opponentTotals` item-level coverage: ~60% of selected corpus history items.
- Recommendation: cautious. Expand data before tuning model weights. Do not publish a model grade yet.

---

## Recent Visual / Copy Changes

The recent passes below changed **zero** model math, prediction values, locked predictions, backtest logic, or public record behavior.

1. **Early sticky tab experiment (superseded)** — fight-page tabs are no longer sticky/fixed; `FightPageTabs` is plain in-page anchor navigation.
2. **Events index** — new `app/events/page.tsx` with current card feature treatment.
3. **FightReadSnapshot** — new component above tabs; reads only from `viewModel`.
4. **Homepage rebuild** — 2-column hero; live next-card preview from canonical viewModel.
5. **CSS motion system** — `fl-animate-fade-up`, `fl-radar-bloom`, `fl-tab-panel`, `fl-delay-*` in `globals.css`; all disabled under `prefers-reduced-motion`.
6. **Shape narrative** — `lib/fight-shape-model/shape-narrative.ts`; analyst-style copy replacing robotic `publicSummary` in `FightShapeSummary`. Never names a winner.
7. **"What the shape says" cards** — `StyleComparisonBars` now renders `biggest-edge`, `closest`, and `swing`/`watching` cards above the axis bars.
8. **Language cleanup** — all "matchup stress", "pressure point", "style-pressure read", and "Limited pressure signal" occurrences removed from UI.
9. **Fighter hero stabilization** — `FighterNamePlate` gives fight pages a consistent two-line name plate.
10. **Non-sticky section navigation hotfix** — `FightPageTabs` now renders Call, Shape, and Details as real anchored sections with simple in-page anchor links. The tab row is normal document flow, has no sticky/fixed positioning, no scrollspy, and no manual `scrollIntoView` behavior.
11. **Model-call display semantics** — `ProbabilityBar` now uses a call-first layout with the non-called side labeled `Live path`. Amber belongs only to the canonical model-called side; no-call fights remain neutral.
12. **Fight-read final QA** — source/static route checks verified home, events, fight pages, record, and methodology. Event-row expanded details were neutralized so amber is not used as a generic chart/comparison color.
13. **Non-sticky tab verification** — proof grep and static route checks confirmed `FightPageTabs` has no sticky/fixed/blur/scrollIntoView behavior and still renders stable Call, Shape, and Details anchors.
14. **Homepage/event discovery clarity** — homepage keeps one primary current-card action, `/events` labels the active card as forecast live, and `EventHero` now uses a single main-event read CTA so users move from card to fight read without early shape/call CTA clutter. Static build-output checks verified home, events, UFC 329, UFC 329 main-event fight read, UFC 328 Chimaev/Strickland, record, and methodology content.
15. **Final pre-commit fight-page polish** — replaced internal live-path phrasing, simplified the shape tab into style edge → neutral fingerprint radar → three insight cards → collapsed axis breakdown, and tightened details copy to `recent form` without touching model/data/backtest files.
16. **Color system — Midnight Signal palette** — replaced amber/gold accent (`#f59e0b`) with icy blue (`#8FD7F7`). All color changes are token-only in `app/globals.css`. All Tailwind utilities (`text-accent`, `bg-accent`, etc.) propagate automatically. No amber remains anywhere in the codebase.
18. **Analysis hygiene pass** — narrative guardrails added to `lib/fight-shape-model/shape-narrative.ts`: swing/watching cards suppressed when leading absolute score < 45 or delta < 6; biggest-edge body copy softened when overall signal is weak; no model math changed. Method lean in `TheCall.tsx` now shows proportional fill bars (top method = accent, secondary = muted, thin = dot only). `PathsToVictory.tsx` suppresses duplicate empty path cards when both fighters have no path data — empty path modules are omitted completely. Heading now uses "alternate path." for named-call fights.
17. **Event discovery and mobile readability pass** — homepage hero has one dominant CTA only ("Open card", no "View main event read" competing); events page `EventCard` is a single-column card (no two-panel grid, no "View read →" inside card); `EventHero` is a single card (no two-column lg layout); `FightCard` mobile-first with fighters always side-by-side and "View read" button full-width on mobile; `FightReadSnapshot` fixed to `grid-cols-2` from all widths (not just sm+).
19. **Homepage/event discovery + record compaction** — homepage Public Model Record is now a compact proof strip with 24/13/10/77% stats and a subtle accuracy bar; `/record` leads with 77% call accuracy and 10/13 scored calls while method read stays secondary; `/events` groups Next Card, Upcoming, and Past Scored; UFC Freedom 250 exists as an event shell before UFC 329 with pending copy only and no fake predictions.
20. **Event discovery + Freedom 250 details + context notes** — homepage event discovery now uses `HomeEventSelector` so only one selected event preview renders at a time; mobile hero no longer repeats the same event card. UFC Freedom 250 now has real event-level metadata (Topuria/Gaethje, South Lawn of the White House, Washington, DC, Paramount+, 8:00 PM ET, Pereira/Gane listed) but still has no fights, stats, calls, or percentages. `ContextualNotes` and `contextNotes` types exist as manual explanatory notes only; they are not model inputs. `PathsToVictory` returns null for empty path data, method bars are proportional, and weak shape edges are softened as thin/relative context.
21. **Product-level sequencing overhaul** — homepage now follows Hero → Current Card → Compact Record → Event Selector → secondary guide. `/events` has compact mobile event cards with one primary CTA. Mobile fight reads no longer use a left-origin probability rail; they show call first and live path second. `TheCall` now reads as "why the model leans this way." `StyleComparisonBars` surfaces the radar as the signature visual with a plain-English takeaway and collapsed axis detail. `FormResumeModule` consolidates double adjusted-form pending states into one compact note. Shape/swing copy guardrails continue to avoid overstating weak relative edges.

---

## Known Issues

| Issue | Location | Severity |
|---|---|---|
| Radar axis labels may clip at 375 px viewport (iPhone SE) | `components/StyleRadar.tsx` — `LABEL_RADIUS=148`, `SIZE=360` | P0 — verify on device |
| `FightCard` expand (+) panel: method bar height `h-[3px]` is very thin on high-DPI screens | `components/FightCard.tsx` `MethodBar` | P2 — cosmetic only |
| SVG `<title>` tooltips don't fire on touch | `StyleRadar.tsx` data dot `<title>` elements | P1 — replace with pointer-event tooltip |
| No automated test for `prefers-reduced-motion` behavior | `app/globals.css` reduced-motion block | P0 — manual device QA only |
| Hash anchor landings (`#section-call`, `#section-shape`, `#section-details`) should be verified in a real browser after the scroll-page restructure | Both fight page routes | P1 — manual QA only |
| 60–80% calibration buckets are overconfident | `lib/backtest/calibration.ts` | P2 — diagnostics only, no math changes yet |
| Elo baseline has 76% no-picks due to cold start | `scripts/backtest/elo-baseline.ts` | P3 — experiment with warm seeding |

---

## Recommended Next Tickets

**P0 — Manual device QA (reduced motion + mobile radar)**
Check that animations disable under Reduce Motion on iOS Safari. Check that radar labels don't clip at 375 px. Files: `app/globals.css`, `components/StyleRadar.tsx`.

**P1 — Radar touch tooltips**
Native SVG `<title>` doesn't fire on tap. Add a pointer-event handler on the data dot `<circle>` and render a small React tooltip. File: `components/StyleRadar.tsx`. Do not change axis keys, scores, or `getStyleRadarDimensions()`.

**P1 — FightReadSnapshot mobile QA**
Keep the snapshot and fight tabs in normal document flow. Check mobile spacing, tap targets, and section anchor landings after any future fight-page copy/layout edits. Files: `components/FightReadSnapshot.tsx`, `components/FightPageTabs.tsx`, `app/events/[eventId]/[fightId]/page.tsx`. Must not add independent prediction compute.

**P2 — Data coverage expansion**
Ingest additional completed UFC events. Backend-only. Do not change model math. Re-run `npm run backtest` after each event and verify missing-data rate trends down and `opponentTotals` coverage holds.

**P2 — Calibration diagnostics**
Sub-bucket the 60–80% confidence range and identify which fight type / weight class drives overconfidence. Diagnosis only — no model weight changes. Document findings in `docs/MODEL_EXPERIMENTS.md`.

**P3 — True mobile fight-read mode**
Build a compact mobile fight intelligence card that replaces the current long-scroll desktop read on small screens. Each layer (Call → Why → Method → Flip path → Shape → Form) is an expandable accordion section with a single-line summary and a tap-to-expand detail block. This avoids dumping five full desktop modules into a single scroll and makes the read feel native on mobile. No model math changes, no new prediction compute — all content comes from the existing `PredictionViewModel` and fight shape data.

**P3 — Event page grouping/filter polish**
The top-level `/events` discovery flow is now grouped. A future small pass could make individual event pages clearer once cards become larger: main event first, prelim groups collapsed by default, and lightweight filters by weight class/card placement. No new data sources required — all data comes from the existing event registry.

---

## QA Commands

```bash
npm run audit:predictions   # Must pass 24/24. Run after any prediction-display change.
npm run backtest            # Must complete on 253 fights. Run after any model or ingestion change.
npm run lint                # Must pass with 0 warnings.
npm run build               # Must produce 36 static pages.
```

---

## Do Not Touch Unless Asked

- `lib/predictionThresholds.ts` — 52% threshold is immutable
- `lib/predictionViewModel.ts` — only extend, never remove fields the UI depends on
- `lib/fight-shape-model/model.ts` — model formulas (score weights, axis calculations)
- `data/predictions/*.json` — locked prediction files; read-only
- `scripts/backtest/` — backtest logic; only modify for new instrumentation, never for result changes
- `scripts/ingest/` — ingestion scripts; only modify when explicitly adding a new event
- `lib/accuracy/index.ts` — `getLockedPredictions()` / `getHistoricalBacktestReconstructions()` split
- Any file whose change would cause `npm run audit:predictions` to drop below 24/24
