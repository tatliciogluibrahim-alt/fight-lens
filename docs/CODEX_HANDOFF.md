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
- **Static pages:** 35 (verified via `npm run build`)
- **Prediction audit:** 24/24 routes pass (verified via `npm run audit:predictions`)
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
| `/` | Homepage — 2-column hero. Pulls `buildPredictionViewModelBundle` for live next-card preview. |
| `/events` | Events index — current card featured, past cards listed. |
| `/events/[eventId]` | Event page — fight card grid via `EventHero` + `FightCard`. |
| `/events/[eventId]/[fightId]` | Fight page — fighter hero, `FightReadSnapshot`, tabs (call / shape / details). |
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
| `components/FightReadSnapshot.tsx` | At-a-glance strip — reads only from `viewModel`. |
| `components/FighterNamePlate.tsx` | Fight-page hero name plate — splits names into stable full-word hero typography without touching prediction data. Never allow character-level breaks. |
| `components/TheCall.tsx` | Main call card — winner + probability bar + method lean. |
| `components/ProbabilityBar.tsx` | Call-first model-call display — called fighter, win probability, and Live Path side; no horizontal winner rail. |
| `components/FightShapeSummary.tsx` | Shape section on call tab — uses `buildShapeNarrative()`. |
| `components/StyleComparisonBars.tsx` | Shape tab — neutral radar, plain-English takeaway, shape insight cards, and collapsed axis breakdown. |
| `components/FightPageTabs.tsx` | Sticky tab bar — call / shape / details tabs. |
| `components/FightCard.tsx` | Event page matchup row — shows call, read strength, method lean, result chip; expanded details use neutral comparison bars. |

### Data

| Path | Purpose |
|---|---|
| `data/events/` | Source event JSON files (one per UFC event). |
| `data/predictions/` | Locked public prediction JSON files (read-only post-call). |
| `data/generated/` | Generated normalized events and backtest outputs. |

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

The recent passes below changed **zero** model math, locked predictions, backtest logic, or public record behavior.

1. **Sticky tab bar** — fixed at `top-16 z-20`; `scroll-mt-32` on all anchored sections.
2. **Events index** — new `app/events/page.tsx` with current card feature treatment.
3. **FightReadSnapshot** — new component above tabs; reads only from `viewModel`.
4. **Homepage rebuild** — 2-column hero; live next-card preview from canonical viewModel.
5. **CSS motion system** — `fl-animate-fade-up`, `fl-radar-bloom`, `fl-tab-panel`, `fl-delay-*` in `globals.css`; all disabled under `prefers-reduced-motion`.
6. **Shape narrative** — `lib/fight-shape-model/shape-narrative.ts`; analyst-style copy replacing robotic `publicSummary` in `FightShapeSummary`. Never names a winner.
7. **"What the shape says" cards** — `StyleComparisonBars` now renders `biggest-edge`, `closest`, and `swing`/`watching` cards above the axis bars.
8. **Language cleanup** — all "matchup stress", "pressure point", "style-pressure read", and "Limited pressure signal" occurrences removed from UI.
9. **Fighter hero stabilization** — `FighterNamePlate` gives fight pages a consistent two-line name plate; `FightPageTabs` owns `#section-call`, `#section-shape`, and `#section-details` and scrolls after panel mount so sticky tabs do not hide headings.
10. **Model-call display semantics** — `ProbabilityBar` now uses a call-first layout with the non-called side labeled `Live path`. Amber belongs only to the canonical model-called side; no-call fights remain neutral.
11. **Fight-read final QA** — source/static route checks verified home, events, fight pages, record, and methodology. Event-row expanded details were neutralized so amber is not used as a generic chart/comparison color. Browser/device hash landing still needs a local manual spot-check outside the Codex sandbox.

---

## Known Issues

| Issue | Location | Severity |
|---|---|---|
| Radar axis labels may clip at 375 px viewport (iPhone SE) | `components/StyleRadar.tsx` — `LABEL_RADIUS=148`, `SIZE=360` | P0 — verify on device |
| SVG `<title>` tooltips don't fire on touch | `StyleRadar.tsx` data dot `<title>` elements | P1 — replace with pointer-event tooltip |
| No automated test for `prefers-reduced-motion` behavior | `app/globals.css` reduced-motion block | P0 — manual device QA only |
| Browser-level hash landing still needs device confirmation | `#section-call`, `#section-shape`, `#section-details` — source/static checks pass; Codex sandbox cannot bind local dev server (`listen EPERM`) | P1 — manual local browser QA |
| 60–80% calibration buckets are overconfident | `lib/backtest/calibration.ts` | P2 — diagnostics only, no math changes yet |
| Elo baseline has 76% no-picks due to cold start | `scripts/backtest/elo-baseline.ts` | P3 — experiment with warm seeding |

---

## Recommended Next Tickets

**P0 — Manual device QA (reduced motion + mobile radar)**
Check that animations disable under Reduce Motion on iOS Safari. Check that radar labels don't clip at 375 px. Files: `app/globals.css`, `components/StyleRadar.tsx`.

**P1 — Radar touch tooltips**
Native SVG `<title>` doesn't fire on tap. Add a pointer-event handler on the data dot `<circle>` and render a small React tooltip. File: `components/StyleRadar.tsx`. Do not change axis keys, scores, or `getStyleRadarDimensions()`.

**P1 — FightReadSnapshot sticky scroll**
Pin the snapshot strip above the tab bar once the fighter hero scrolls out of view. File: `components/FightReadSnapshot.tsx`, `app/events/[eventId]/[fightId]/page.tsx`. Must not add independent prediction compute.

**P2 — Data coverage expansion**
Ingest additional completed UFC events. Backend-only. Do not change model math. Re-run `npm run backtest` after each event and verify missing-data rate trends down and `opponentTotals` coverage holds.

**P2 — Calibration diagnostics**
Sub-bucket the 60–80% confidence range and identify which fight type / weight class drives overconfidence. Diagnosis only — no model weight changes. Document findings in `docs/MODEL_EXPERIMENTS.md`.

---

## QA Commands

```bash
npm run audit:predictions   # Must pass 24/24. Run after any prediction-display change.
npm run backtest            # Must complete on 253 fights. Run after any model or ingestion change.
npm run lint                # Must pass with 0 warnings.
npm run build               # Must produce 35 static pages.
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
