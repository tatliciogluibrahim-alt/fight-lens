# Fight Lens Codex Handoff

## Product Summary

Fight Lens is a signal-based UFC matchup intelligence product. Before each card it publishes a model call (predicted winner + win probability, method lean, fight shape), logs the call publicly, and scores the result after the fight. It is not a betting product. Language is always signal-based and directional — never a guarantee.

The stack is Next.js 16 App Router with full static generation. All prediction data lives in JSON files under `data/`. There is no API server, no database, and no runtime prediction compute.

---

## Current State (as of 2026-05-22)

- **Model version:** outcome-v0.2
- **Backtest corpus:** 20 completed UFC events, 253 scored fights
- **Public record:** 31 locked calls, 13 scored, 77% winner accuracy, 31% method accuracy, Brier 0.220
- **Public logged calls:** 31 (`isBacktestReconstruction: false`) — UFC 328 (13) + UFC 329 (11) + UFC Freedom 250 (7)
- **Historical backtest records:** 1 (`isBacktestReconstruction: true`) — `islam-jdm`
- **Static pages:** 43 (verified: `npm run build` → 43/43)
- **Prediction audit:** 31/31 routes pass via `npm run audit:predictions`
- **Lint:** 0 warnings
- **`opponentTotals` pipeline:** active; current five-event sweep found no missing `opponentTotals` properties on populated history rows

### Events in registry (newest first)
| Event | Fights | Predictions | Status |
|---|---|---|---|
| UFC Freedom 250: Topuria vs. Gaethje | 7 | 7 | Sourced fighter data available; public forecasts logged, outcomes pending |
| UFC 329: McGregor vs. Holloway 2 | 11 | 11 | Forecast calls logged, outcomes pending |
| UFC 328 | 13 | 13 (+1 backtest) | Forecast calls logged, outcomes pending |

### Latest UI pass — Claude Design translation

- Mobile shell now includes a fixed bottom nav with existing routes only: `/`, `/events`, and `/record`. Desktop top nav remains the primary desktop navigation.
- Homepage hero uses concise forecast/tracking language and the card discovery module now presents compact selectable event cards with one expanded active card.
- Event and fight-card copy avoids unsupported "live" wording; event states use "forecast pending," "calls logged," and "outcomes pending" based on real data.
- Fight reads use "counter path" / "alternate path" language. Existing `viewModel.livePathFighter` naming remains internal for compatibility, but public UI copy should not say "live path."
- `StyleComparisonBars` is now interactive on the client: fighter/both focus toggle plus tap-to-compare radar axes. It still reads only existing style profiles and `buildShapeNarrative()` output.
- `/record` has one primary public named-call accuracy module; historical validation remains computed from backtest reconstruction data and is visually separated.

---

## Immediate Codex Tasks

### Task 1 — UFC Freedom 250 post-lock maintenance

`data/normalized/events/ufc-freedom-250.json` now contains the official UFC-listed card plus sourced UFCStats fighter profiles, fight histories, recent fight totals, round samples, derived style profiles, and key edges. Seven public prediction files were created from the existing production outcome model; all have `outcome: null` and `isBacktestReconstruction: false`.

Confirmed official metadata currently in the event file:
- Date: June 14, 2026
- Venue: South Lawn of the White House, Washington, DC, United States
- Broadcast: Paramount+ · 8:00 PM EDT
- Main event: Ilia Topuria vs. Justin Gaethje, Lightweight Title Bout, 5 rounds
- Featured: Alex Pereira vs. Ciryl Gane, Heavyweight Interim Title Bout, 5 rounds
- Additional listed bouts: O'Malley/Zahabi, Hokit/Lewis, Ruffy/Chandler, Nickal/Daukaus, Lopes/Garcia

UFCStats source IDs:
- Event: `48544433372ecfa6`
- Fight previews: `7208e40818401e88`, `5727d5be8c373346`, `60de0423ae6ed097`, `30cdb851f6c63444`, `9a9b30b3165b62e4`, `00e8d4b961a65d21`, `127ba4a1ccb3d4a6`

To refresh Freedom 250 if the card changes:

```bash
npm run ingest:ufcstats -- --event-url http://www.ufcstats.com/event-details/48544433372ecfa6 --include-fights --include-fighters --include-history-fights --max-fights 7 --max-fighters 14 --max-history-fights-per-fighter 5 --max-history-fight-details 70 --max-requests 120 --delay-ms 350
npm run normalize:data -- --event ufc-freedom-250
```

Guardrails:
- Do not edit existing Freedom 250 `prediction.*` values after the lock.
- If the card changes, remove/replace only affected fights and prediction files after re-running the existing production process.
- When outcomes are official, add only the `outcome` blocks to the seven Freedom 250 prediction files.
- Do not add manual paths, fight-shape copy, or context notes unless they are explicitly sourced and marked as manual display context only.

---

### Task 2 — Full data sweep (all events)

#### UFC 328 — Known gaps

Run the sweep first:
```bash
node -e "
const d = require('./data/normalized/events/ufc-328.json');
d.fights.forEach(f => {
  const fa = f.fighters.fighterA, fb = f.fighters.fighterB;
  const sp = fa.styleProfile || {};
  const nullsA = Object.entries(sp).filter(([k,v]) => v === null && k !== 'provenance' && k !== 'note').length;
  const sp2 = fb.styleProfile || {};
  const nullsB = Object.entries(sp2).filter(([k,v]) => v === null && k !== 'provenance' && k !== 'note').length;
  if (nullsA > 0 || nullsB > 0 || !fa.roundModel.hasEnoughForTrend || !fb.roundModel.hasEnoughForTrend) {
    console.log(f.id + ': A nulls=' + nullsA + ' trend=' + fa.roundModel.hasEnoughForTrend + ' | B nulls=' + nullsB + ' trend=' + fb.roundModel.hasEnoughForTrend);
  }
});
"
```

Current known gaps in UFC 328 (from last sweep):
- `styleNulls=1` across almost all fights — one axis is null per fighter. Likely a specific missing metric (e.g. `takedownDefense` or `submissionAvg`) for fighters with thin data.
- `hasEnoughForTrend=False` for ~60% of fighters — round model won't render a chart for those pairings, showing pending state instead.
- `result=null` for all 13 fights — UFC 328 hasn't happened yet. Do **not** add fake results.

Action items:
1. Re-ingest fighters with null style axes. If the data simply doesn't exist on UFCStats, the null is correct and acceptable — the radar gracefully handles missing axes. Confirm before re-ingesting.
2. Thin round models are expected for UFC debutants or fighters with short records. No action needed unless UFCStats has unretrieved round data.

#### UFC 329 — Known gaps

Current known gaps:
- `mcgregor-holloway`: McGregor `hasEnoughForTrend=False` — only 10 round samples, insufficient for trend. Expected given layoff.
- Multiple other fights have one fighter with `hasEnoughForTrend=False` — expected for fighters with short or interrupted records.
- `contextNotes=0` for all fights — no manual context has been added. Consider adding notes for: McGregor layoff, any short-notice replacements, weight cut concerns.
- `result=null` for all 11 fights — UFC 329 hasn't happened yet.

Action items:
1. Add `contextNotes` manually to fights where fight-week context matters (layoffs, weight cuts, short notice). Schema: see `lib/sourced-event.ts` `ContextualFightNote` interface. These are display-only — they do not affect model math.
2. After the event: add `outcome` blocks to prediction files. **Do not** edit prediction `fighterAWinProbability`, `modelVersion`, or any pre-fight field.

#### Outcome recording format (post-event)

When UFC 328 or 329 results come in, add to each prediction file:
```json
"outcome": {
  "winner": "fighterA",
  "method": "decision",
  "round": 3,
  "time": "5:00",
  "recordedAt": "2026-05-10T04:30:00.000Z"
}
```
Valid values:
- `winner`: `"fighterA"` | `"fighterB"` | `"draw"` | `"nc"`
- `method`: `"ko_tko"` | `"submission"` | `"decision"` | `"other"`
- `round`: integer (1–5)
- `time`: `"M:SS"` string
- `recordedAt`: ISO 8601 timestamp

After adding outcomes, re-run `npm run audit:predictions` and `npm run backtest` to verify accuracy metrics update correctly.

---

### Task 3 — QA checklist

Run all of these before shipping any change:

```bash
npm run lint              # 0 warnings required
npm run build             # 36+ pages, must not decrease
npm run audit:predictions # all fight routes must pass
npm run backtest          # run when model/backtest workflow requires it
```

If `npm run audit:predictions` hits the local `tsx` named-pipe EPERM issue in the Codex sandbox, run the same audit through the cached no-IPC loader:

```bash
NODE_OPTIONS="--import ./.npm-cache/_npx/fd45a72a545557e9/node_modules/tsx/dist/loader.mjs" node scripts/audit/predictions.ts
```

Manual visual QA checklist (spot-check 2–3 fights after any data change):
- [ ] Fight page loads, `FightReadSnapshot` shows pick name + probability correctly
- [ ] `RoundMomentumFlow` renders chart (not pending state) for fights with `hasEnoughForTrend=true` on at least one fighter
- [ ] Tale of the Tape does not render on desktop or mobile fight pages; sourced `keyEdges` stay in data only
- [ ] `CallConfidenceBand` shows the pin at the correct probability on the track
- [ ] Mobile: all sections visible and scroll correctly
- [ ] Desktop: "call" tab → confidence band + round flow; "shape" tab → tape + radar
- [ ] `/record` page: public calls only in top section, backtest in bottom section
- [ ] `findMainEventFight()` resolves to the correct fight (not `fights[0]`) for the event CTA

---

## Non-Negotiable Rules

1. **All prediction display goes through `buildPredictionViewModelBundle()`** in `lib/predictionViewModel.ts`. Never compute a winner, probability, or method lean independently in a component.
2. **52% threshold is immutable.** Below 52%, show "Too close to call". Do not change `lib/predictionThresholds.ts`.
3. **Public Model Record ≠ backtest.** `getLockedPredictions()` feeds the record page and accuracy metrics. `getHistoricalBacktestReconstructions()` feeds the backtest section only. Never mix them.
4. **Locked prediction JSON files are read-only.** No edits to `prediction.*` fields after a fight result is known. Only `outcome` can be added.
5. **Winner forecast and fight shape are separate.** Shape copy never names a winner. `buildShapeNarrative()` enforces this.
6. **No betting language.** Forbidden: lock, odds, parlay, wager, unit, guaranteed, best bet, pick.
7. **No forbidden UI phrases.** Forbidden: "matchup stress", "pressure point", "style-pressure read", "Limited pressure signal".
8. **`opponentTotals` must not regress.** Any ingestion or normalization change must verify coverage remains ~60% or better.
9. **No orange/amber.** Accent color is icy blue (`#8FD7F7` / `var(--accent)`). No amber anywhere. Success = `#34D399`. Wrong = `#F87171`.

---

## Key Routes

| Route | Notes |
|---|---|
| `/` | Homepage — hero → current-card module → compact record strip → event selector → guide. |
| `/events` | Events index — Next Card, Upcoming, Past Scored groups; mobile fight cards render as separate tappable cards. |
| `/events/[eventId]` | Event page — fight list via `EventHero` + `FightCard`. |
| `/events/[eventId]/[fightId]` | Fight page — dual layout: `sm:hidden` mobile + `hidden sm:block` desktop. |
| `/record` | Public logged calls (top) + historical backtest (bottom). Two clearly labeled sections. |
| `/methodology` | How it works — 3-card grid + model row descriptions. |
| `/backtests/islam-jdm` | One-off backtest reconstruction, not a public logged call. |

---

## Key Files

### Prediction pipeline (read before touching anything)

| File | Purpose |
|---|---|
| `lib/predictionViewModel.ts` | **Canonical source of truth** for all fight-page prediction state. Read this first. |
| `lib/predictionThresholds.ts` | 52% named-call threshold. Do not touch. |
| `lib/accuracy/index.ts` | `getLockedPredictions()` vs `getHistoricalBacktestReconstructions()` — never mix. |
| `lib/accuracy/calculator.ts` | `computeAccuracyMetrics()` — exported, used by record/page.tsx for backtest section. |
| `lib/events/registry.ts` | `getEvent()`, `getEventFight()`, `getAllFightParams()`, `findMainEventFight()`. |

### Model and shape

| File | Purpose |
|---|---|
| `lib/fight-shape-model/model.ts` | Shape model math. Do not change formulas. |
| `lib/fight-shape-model/shape-narrative.ts` | Analyst-style copy generator. Never names a winner. |
| `lib/fight-shape.ts` | 8 radar axis definitions and `NullableStyleProfile` type. |
| `lib/style-radar.ts` | `getStyleRadarDimensions()` — converts `styleProfile` to scored radar dimensions. |

### UI components — prediction-consuming

| File | Purpose |
|---|---|
| `components/FightReadSnapshot.tsx` | Desktop at-a-glance strip. Reads only from `viewModel`. |
| `components/TheCall.tsx` | "why the model leans this way." — CallConfidenceBand + method lean + scenarios. |
| `components/CallConfidenceBand.tsx` | **NEW.** Visual probability track with confidence band pin. Used in TheCall (desktop) and MobileCallCard (mobile). All data from `viewModel`. |
| `components/RoundMomentumFlow.tsx` | **NEW.** SVG round-by-round momentum chart from `fighter.roundModel.roundScores`. Shows pending if `!hasEnoughForTrend`. Desktop: call tab. Mobile: after scenarios. |
| `components/TaleOfTape.tsx` | Dual-bar center-meeting metrics comparison. Kept in the repo but no longer rendered on fight pages. |
| `components/MobileFightRead.tsx` | Mobile-only fight read. Flow: matchup → call (CallConfidenceBand) → method lean → scenarios → RoundMomentumFlow → ContextualNotes → shape accordion → record. |
| `components/StyleComparisonBars.tsx` | Fight shape section: compact interactive radar + insight cards + collapsed axis breakdown. Client-side focus/axis UI only; no style math changes. |
| `components/FightPageTabs.tsx` | Desktop section anchor wrapper. Assigns `id="section-{id}"`. |
| `components/FightCard.tsx` | Event page matchup row. |
| `components/AppHeader.tsx` | Desktop top nav plus mobile bottom nav. Mobile labels are home/cards/record and route to existing pages. |
| `components/HomeEventSelector.tsx` | Homepage compact card discovery. Shows real event states only; no prototype data. |
| `components/ContextualNotes.tsx` | Manual context notes renderer. Does not affect prediction math. |
| `components/HomeEventSelector.tsx` | Homepage event picker — pill toggle, replaces native `<select>`. |
| `components/EventHero.tsx` | Event page hero. Uses `findMainEventFight()` for the "View main event read" CTA (not `fights[0]`). |
| `components/FightReadSnapshot.tsx` | Desktop snapshot strip. |
| `components/ProbabilityBar.tsx` | Exists but **not rendered** on fight pages. Do not re-add to TheCall. |
| `components/FightShapeSummary.tsx` | Exists but **not rendered**. Do not re-add without removing StyleComparisonBars. |

### Data

| Path | Purpose |
|---|---|
| `data/events/` | Source event JSON files from UFCStats ingestion. |
| `data/predictions/` | Locked public prediction JSON files. Read-only post-call. |
| `data/normalized/events/ufc-freedom-250.json` | 7 sourced fights, 7 public prediction files, outcomes pending. |
| `data/normalized/events/ufc-329.json` | 11 fights, 11 predictions. Outcomes pending. |
| `data/normalized/events/ufc-328.json` | 13 fights, 13 predictions. Outcomes pending. Some style axis nulls (expected for thin-record fighters). |

### Scripts

| Script | Purpose |
|---|---|
| `scripts/audit/predictions.ts` | Fight page consistency checks. Run after any prediction display change. |
| `scripts/backtest/run.ts` | Historical validation on 253 fights. |
| `scripts/ingest/ufcstats.mjs` | UFCStats data ingestion. Only for new events. |
| `scripts/ingest/build-normalized-event.mjs` | Normalization from raw ingestion. |

---

## Prediction Consistency Contract

Every surface that shows a predicted winner, win probability, or method lean **must** read from `buildPredictionViewModelBundle()`. The view model returns a `PredictionViewModel` which contains:

- `callState` — `"lockedCall" | "currentCall" | "noLean" | "tooClose" | "pending"`
- `predictedWinner` — `{ id, name, winProbability }` or `null`
- `winnerProbability` — number (0–100) or `null`
- `loserProbability` — number (0–100) or `null`
- `fighterA.winProbability` / `fighterB.winProbability` — always present, aligned to fight fighterA/B
- `methodLean` — string label or `null`
- `methodDistribution` — `{ decision, koTko, submission }` all 0–100
- `readStrength` — `"strong" | "usable" | "thin" | "data-pending"`
- `scenarios` — array of scenario cards from outcome model
- `livePathFighter` — the lower-probability fighter reference
- `isScored` / `modelCorrect` — post-result state
- `publicPredictionSource` — short label string

Run `npm run audit:predictions` after any change that touches prediction display. All routes must pass.

---

## Public Record vs Backtest Contract

```
getLockedPredictions()                 → public Model Record, accuracy metrics, homepage
getHistoricalBacktestReconstructions() → /record backtest section only
getAccuracyMetrics()                   → uses locked calls only (correct)
computeAccuracyMetrics(backtestRows)   → used for the backtest footer in record/page.tsx
```

`isBacktestReconstruction: true` means the record never appears in the public accuracy count.

---

## New Components — Design Implementation (2026-05-21)

Three components implemented from a Claude Design mockup. All data flows from existing `viewModel`, `SourcedFighter.roundModel`, and `SourcedFight.keyEdges`. No model math changes. No new data fields required.

### `CallConfidenceBand`
Visual probability display. Shows:
- Predicted winner name (accent) + win probability (large mono)
- Horizontal track 0–100% with gradient fill between model range bounds and a glowing vertical pin at the exact call
- Band half-width derived from `readStrength`: strong ±5%, usable ±9%, thin ±13%
- Counter path card below
- `noLean` state shows both fighters' probabilities side-by-side

### `RoundMomentumFlow`
SVG chart from `fighter.roundModel`. Algorithm: `rawA = baseA × sigA`, `rawB = baseB × sigB`, normalize. Smooth bezier curves, area fills, per-checkpoint dots, end-value labels, round key grid. Shows pending state if `!hasEnoughForTrend` on both fighters. Labeled "Projected from historical round data — not per-round predictions."

### `TaleOfTape`
Three-column dual-bar comparison from `fight.keyEdges`. Bars grow outward from the center label — A extends left, B extends right. Winning side on each metric gets full foreground color + accent bar. Values ≥ 2 formatted as %, values < 2 as decimal. Only renders rows with both sides sourced.

---

## Recent Changes (2026-05-21)

All changes in this session changed **zero** model math, prediction values, locked predictions, or backtest logic.

### 1. findMainEventFight — main event link reliability
- Added `findMainEventFight(event)` to `lib/events/registry.ts` with `lastName()` helper
- Uses last-name matching against `event.event.mainEvent.{fighterA,fighterB}` (handles reversed order)
- Falls back to `fights[0]` only when `mainEvent` metadata is missing
- Applied in `EventHero.tsx` (CTA href), `app/page.tsx` `selectorOption()`, `app/page.tsx` `Home()`
- Fixes silent bug where "View main event read" could link to the wrong fight when `fights[0]` ≠ labeled main event

### 2. Accuracy trust fixes
- **Issue A:** `components/ModelAccuracyCard.tsx` label changed from `call accuracy` → `named-call accuracy` — clarifies that "Too close to call" fights are excluded from denominator
- **Issue B:** `app/record/page.tsx` historical backtest footer: replaced hardcoded `"66% winner accuracy"` with computed value from `computeAccuracyMetrics(backtestReconstructions)`. Label changed from "full validation corpus" → "historical backtest corpus". Falls back to "accuracy pending outcomes" if no outcomes are resolved.

### 3. Design implementation (CallConfidenceBand, RoundMomentumFlow, TaleOfTape)
- Three new components (see above)
- `TheCall.tsx` updated: `CallConfidenceBand` added at top of `module-body` (wrapped in accent-bordered card)
- `MobileFightRead.tsx` updated: `MobileCallCard` uses `CallConfidenceBand`, `RoundMomentumFlow` added after scenarios, `TaleOfTape` added before shape accordion
- `app/events/[eventId]/[fightId]/page.tsx` updated: desktop call tab wraps `TheCall` + `RoundMomentumFlow`; shape tab wraps `TaleOfTape` + `StyleComparisonBars`

---

## Data Sweep Findings (2026-05-21)

### UFC 328 (13 fights)
- All fights: `styleNulls=1` per fighter — one style axis null, likely due to thin UFC record or missing UFCStats detail. If UFCStats has the data, re-ingest. If not, the null is correct — radar gracefully degrades.
- ~60% of fighters: `hasEnoughForTrend=False` — expected for shorter records. `RoundMomentumFlow` shows pending state for these.
- Results: all null — event hasn't happened.

### UFC 329 (11 fights)
- `mcgregor-holloway`: McGregor `hasEnoughForTrend=False` — only 10 round samples post-layoff. Expected.
- All other fights: fully sourced, all 6 keyEdges rows populated.
- No `contextNotes` on any fight. **Recommended:** add manual context for McGregor layoff, any short-notice replacements, weight class changes.
- Results: all null — event hasn't happened.

### UFC Freedom 250
- 0 fights — full ingestion needed (see Task 1 above).

---

## Known Issues

| Issue | Location | Severity |
|---|---|---|
| Radar axis labels may clip at 375 px viewport (iPhone SE) | `components/StyleComparisonBars.tsx` overlay radar, `LABEL_RADIUS=148` | P0 — verify on device |
| SVG `<title>` tooltips don't fire on touch | Radar data dot `<title>` elements | P1 — replace with pointer-event tooltip |
| Hash anchor landings (`#section-call`, `#section-shape`) need browser QA | Both fight page routes | P1 — manual QA only |
| `prefers-reduced-motion` behavior not automated | `app/globals.css` reduced-motion block | P0 — manual device QA only |
| 60–80% calibration buckets are overconfident | `lib/backtest/calibration.ts` | P2 — diagnostics only |
| `RoundMomentumFlow` shows pending for ~60% of UFC 328 fighters | Expected — thin round history | P3 — improve with more history data |

---

## QA Commands

```bash
npm run audit:predictions   # all fight routes must pass
npm run backtest            # 253 fights, must complete
npm run lint                # 0 warnings
npm run build               # 36+ pages (increases as Freedom 250 fights are added)
```

After Freedom 250 ingestion with N fights: build must show `36 + N` pages, audit must pass `24 + N` routes.

---

## Do Not Touch Unless Asked

- `lib/predictionThresholds.ts` — 52% threshold is immutable
- `lib/predictionViewModel.ts` — only extend, never remove fields the UI depends on
- `lib/fight-shape-model/model.ts` — model formulas
- `data/predictions/*.json` — read-only. Only `outcome` field can be added post-fight.
- `scripts/backtest/` — only modify for new instrumentation
- `scripts/ingest/` — only modify when explicitly adding a new event
- `lib/accuracy/index.ts` — `getLockedPredictions()` / `getHistoricalBacktestReconstructions()` split
- Any file whose change would cause `npm run audit:predictions` to drop below 24/24
