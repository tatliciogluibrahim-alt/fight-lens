# Fight Lens Codex Handoff

## Product Summary

Fight Lens is a signal-based UFC matchup intelligence product. Before each card it publishes a model call (predicted winner + win probability, method lean, fight shape), logs the call publicly, and scores the result after the fight. It is not a betting product. Language is always signal-based and directional — never a guarantee.

The stack is Next.js 16 App Router with full static generation. All prediction data lives in JSON files under `data/`. There is no API server, no database, and no runtime prediction compute.

---

## Current State (as of 2026-05-21)

- **Model version:** outcome-v0.2
- **Backtest corpus:** 20 completed UFC events, 253 scored fights
- **Winner accuracy:** 66% | **Method accuracy:** 58% | **Brier:** 0.219
- **Public logged calls:** 25 (`isBacktestReconstruction: false`) — UFC 328 (13) + UFC 329 (11) + UFC 328 islam-jdm backtest (1 — marked backtest)
- **Static pages:** 36 (verified: `npm run build` → 36/36)
- **Prediction audit:** 24/24 routes pass (`npm run audit:predictions`)
- **Lint:** 0 warnings
- **`opponentTotals` pipeline:** active; ~60% item-level coverage

### Events in registry (newest first)
| Event | Fights | Predictions | Status |
|---|---|---|---|
| UFC Freedom 250: Topuria vs. Gaethje | **0** | 0 | **Empty shell — needs full data ingestion** |
| UFC 329: McGregor vs. Holloway 2 | 11 | 11 | Forecast live, outcomes pending |
| UFC 328 | 13 | 13 (+1 backtest) | Forecast live, outcomes pending |

---

## Immediate Codex Tasks

### Task 1 — UFC Freedom 250 full data implementation

The event shell exists at `data/normalized/events/ufc-freedom-250.json` but has 0 fights. The full card needs to be ingested, normalized, and published.

**Step 1: Find the event on UFCStats**
Search `http://www.ufcstats.com/statistics/events/completed` (or upcoming events) for "UFC Freedom 250". The event ID will be in the URL like `/event-details/[hex-id]`. The confirmed event metadata:
- Date: June 14, 2026
- Venue: South Lawn of the White House, Washington, DC
- Broadcast: Paramount+ · 8:00 PM ET
- Main event: Ilia Topuria vs. Justin Gaethje (Lightweight)
- Featured: Alex Pereira vs. Ciryl Gane (Light Heavyweight)

**Step 2: Ingest**
```bash
npm run ingest:ufcstats -- --event-url http://www.ufcstats.com/event-details/[ID] --include-fights --include-fighters
```
This writes raw source JSON to `data/events/`. Check `scripts/ingest/README.md` for any flags.

**Step 3: Normalize**
```bash
npm run normalize:data -- --event-id ufc-freedom-250
```
This updates `data/normalized/events/ufc-freedom-250.json` with all fights and fighter stats.

**Step 4: Verify data completeness**
After normalization, check every fight for:
- `fighters.fighterA.styleProfile` — all 8 axes populated (null axes degrade the radar)
- `fighters.fighterA.roundModel.hasEnoughForTrend` — determines if RoundMomentumFlow renders a chart vs. pending state
- `keyEdges` — must have both `fighterA` and `fighterB` non-null for each row (6 rows expected)
- `fighters.fighterA.fightHistory.length` — minimum 3 fights needed for meaningful style scores
- `fighters.fighterA.lastFive` — populated by normalization from fightHistory

Run this check:
```bash
node -e "
const d = require('./data/normalized/events/ufc-freedom-250.json');
d.fights.forEach(f => {
  const fa = f.fighters.fighterA, fb = f.fighters.fighterB;
  console.log(f.id);
  console.log('  A:', fa.name, '| history:', fa.fightHistory.length, '| trend:', fa.roundModel.hasEnoughForTrend);
  console.log('  B:', fb.name, '| history:', fb.fightHistory.length, '| trend:', fb.roundModel.hasEnoughForTrend);
  const edges = f.keyEdges.filter(e => e.fighterA != null && e.fighterB != null).length;
  console.log('  keyEdges sourced:', edges + '/' + f.keyEdges.length);
});
"
```

**Step 5: Create prediction files**
For each fight, create `data/predictions/[fighter-a-lastname]-[fighter-b-lastname].json`.

The `fightId` must exactly match the fight's `id` in the normalized event JSON (e.g. `topuria-gaethje`).

Prediction file schema (copy and fill in with model outputs):
```json
{
  "fightId": "topuria-gaethje",
  "event": "UFC Freedom 250: Topuria vs. Gaethje",
  "fighters": {
    "fighterA": "Ilia Topuria",
    "fighterB": "Justin Gaethje"
  },
  "generatedAt": "2026-06-13T20:00:00.000Z",
  "modelVersion": "outcome-v0.2",
  "isBacktestReconstruction": false,
  "prediction": {
    "fighterAWinProbability": 60,
    "fighterBWinProbability": 40,
    "methodBreakdown": {
      "decision": 20,
      "koTko": 70,
      "submission": 10
    }
  },
  "outcome": null
}
```

Rules for prediction values:
- `fighterAWinProbability + fighterBWinProbability = 100` (always)
- `decision + koTko + submission = 100` (always)
- Below 52% on both → "Too close to call" (the model handles this — just enter the raw probabilities)
- `isBacktestReconstruction: false` for real pre-fight calls
- `outcome: null` until the fight is scored (never fill this before the event)

**Step 6: Register predictions in `lib/accuracy/index.ts`**
Import each new prediction file and add to `allRecords`:
```typescript
import topuriaGaethje from "@/data/predictions/topuria-gaethje.json";
// ... other new predictions

const allRecords: PredictionRecord[] = [
  // ... existing records
  topuriaGaethje as PredictionRecord,
  // ... other new ones
];
```

**Step 7: Run full QA**
```bash
npm run lint          # 0 warnings
npm run build         # page count must increase by (fights × 1) + 0 (event page already exists)
npm run audit:predictions   # must pass all fight routes
```

After adding, say, 10 fights from Freedom 250, the build should show 46 static pages and audit should pass 34/34.

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
npm run backtest          # 253 fights, backtest accuracy must not regress
```

Manual visual QA checklist (spot-check 2–3 fights after any data change):
- [ ] Fight page loads, `FightReadSnapshot` shows pick name + probability correctly
- [ ] `RoundMomentumFlow` renders chart (not pending state) for fights with `hasEnoughForTrend=true` on at least one fighter
- [ ] `TaleOfTape` renders for fights with sourced `keyEdges` (all 6 rows populated)
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
| `/events` | Events index — Next Card, Upcoming, Past Scored groups. |
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
| `components/TaleOfTape.tsx` | **NEW.** Dual-bar center-meeting metrics comparison. Data from `fight.keyEdges`. Desktop: shape tab (before radar). Mobile: before shape accordion. |
| `components/MobileFightRead.tsx` | Mobile-only fight read. Flow: matchup → call (CallConfidenceBand) → method lean → scenarios → RoundMomentumFlow → ContextualNotes → TaleOfTape → shape accordion → record. |
| `components/StyleComparisonBars.tsx` | Desktop fight shape section: radar + insight cards + collapsed axis breakdown. |
| `components/FightPageTabs.tsx` | Desktop section anchor wrapper. Assigns `id="section-{id}"`. |
| `components/FightCard.tsx` | Event page matchup row. |
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
| `data/normalized/events/ufc-freedom-250.json` | Empty shell — 0 fights. Needs full ingestion (see Task 1). |
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
