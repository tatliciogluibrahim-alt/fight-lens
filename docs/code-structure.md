# Fight Lens — Code Structure

This document explains where things live and why. Read it before adding new files.

---

## Directory map

```
fight-lens/
├── app/                    Next.js App Router pages (routes)
│   ├── page.tsx            Homepage
│   ├── events/
│   │   ├── [eventId]/      Dynamic event page (UFC 329, etc.)
│   │   │   └── [fightId]/  Fight prediction page
│   │   └── ufc-328/        Legacy static event route (kept for existing links)
│   ├── record/             Model record page
│   ├── methodology/        Methodology explanation page
│   └── backtests/          Historical backtest pages (islam-jdm example)
│
├── components/             React UI components (display only)
│   All flat — no subdirectories. Components named by what they render.
│   Active components:
│     AppHeader, CardFilterTabs, ConfidenceBadge, DisclaimerFooter,
│     EventHero, FightCard, FightPageTabs, FightResultBanner,
│     FightShapeSummary, FormResumeModule, ModelAccuracyCard,
│     ModuleEmptyState, PathsToVictory, ProbabilityBar, PrototypeBadge,
│     StyleComparisonBars, StyleRadar, TheCall, CountryFlag
│
├── lib/                    Logic and utilities (no React)
│   ├── accuracy/           Model record scoring
│   │   ├── index.ts        Loads all predictions, exposes metrics
│   │   ├── calculator.ts   Computes AccuracyMetrics from PredictionRecords
│   │   └── types.ts        PredictionRecord, AccuracyMetrics, etc.
│   │
│   ├── backtest/           Historical backtest system (being built)
│   │   ├── types.ts        AsOfFightFeatures, BacktestPrediction, etc.
│   │   ├── buildAsOfFeatures.ts   Leakage firewall — filters history by date
│   │   ├── runBacktest.ts  Runs the model on as-of features
│   │   ├── scorePredictions.ts    Scores predictions vs outcomes
│   │   ├── calibration.ts  Calibration bucket analysis
│   │   ├── baselines.ts    Naive baselines for comparison
│   │   └── leakageChecks.ts  Verifies no post-fight data used
│   │
│   ├── events/
│   │   └── registry.ts     Event registry — import new events here
│   │
│   ├── fight-outcome-model/
│   │   ├── model.ts        Outcome model (outcome-v0.2)
│   │   ├── pin-to-locked.ts  Pins completed fight pages to locked probabilities
│   │   └── types.ts        FightOutcomeModelOutput, etc.
│   │
│   ├── fight-shape-model/  Fight shape model (fight-shape-v0.2)
│   │   ├── model.ts        Main model — SPI, form, layoff shrinkage
│   │   ├── confidence.ts   Data confidence scoring
│   │   ├── explain.ts      Human-readable explanations of model scores
│   │   ├── normalization.ts  Stat normalization utilities
│   │   ├── validate.ts     Output validation
│   │   └── types.ts        FightShapeModelOutput, etc.
│   │
│   ├── ui/
│   │   └── terminology.ts  Centralized public language — approved/banned words
│   │
│   ├── display.ts          Format helpers (rankings, country, labels)
│   ├── fight-shape.ts      Metric definitions, axis definitions, export types
│   ├── sourced-event.ts    SourcedFight / SourcedFighter types + ufc-328 loader
│   ├── style-radar.ts      Style radar dimension helpers
│   └── types.ts            Shared base types (StyleProfile, FightPath, etc.)
│
├── data/
│   ├── generated/          Machine-generated data (never hand-edit)
│   │   └── ufcstats/       Raw UFCStats scraper output
│   │       ├── cache/      HTTP response cache (hash-named JSON files)
│   │       ├── events/     Per-event raw data
│   │       ├── fighters/   Per-fighter raw data
│   │       ├── fights/     Per-fight raw data
│   │       ├── index/      Index files
│   │       └── reports/    Data quality reports
│   │
│   ├── manual/             Hand-authored overrides (edit carefully)
│   │   ├── ufc-328.overrides.json
│   │   ├── ufc-329.overrides.json
│   │   └── islam-jdm.backtest.json
│   │
│   ├── normalized/         Processed event JSON — source of truth for the model
│   │   ├── events/
│   │   │   ├── ufc-328.json   (1.6MB — all fighters + stats for UFC 328)
│   │   │   └── ufc-329.json   (all fighters + stats for UFC 329)
│   │   └── backtests/
│   │       └── islam-jdm.json  (hand-crafted backtest example)
│   │
│   └── predictions/        Pre-fight locked predictions (25 JSON files)
│       Each file = one fight, one prediction, locked before first bell.
│       Once locked, never edit the prediction block.
│       Add outcome block when fight resolves.
│
├── docs/                   Documentation
│   ├── code-structure.md   This file
│   ├── DESIGN_DIRECTION.md
│   ├── INGESTION_PLAN.md
│   ├── QA_CHECKLIST.md
│   └── UFCSTATS_INGESTION.md
│
├── prompts/                AI agent context files
│   └── team/               Role-specific prompts (PMM, CTO, QA, etc.)
│
└── scripts/
    └── ingest/             Data ingestion scripts (run locally, not in CI)
```

---

## Key rules

### 1. Model logic does not import UI
`lib/fight-shape-model/` and `lib/fight-outcome-model/` must not import from `components/`.
The data flows one way: model → page → component.

### 2. UI components do not calculate model math
Components receive pre-computed model outputs as props. They display, they don't calculate.
Exception: minor formatting (e.g., rounding a number for display).

### 3. Backtest logic does not depend on React
`lib/backtest/` is pure TypeScript. It must be runnable in Node.js scripts
without any React or Next.js imports.

### 4. Generated data lives in JSON
`data/normalized/events/*.json` — machine-generated, should not be hand-edited for model logic.
Manual corrections go in `data/manual/*.overrides.json`.

### 5. Predictions are immutable once locked
Files in `data/predictions/` are append-only for the `outcome` block.
The `prediction` block must never be changed after a fight is locked.
This is enforced by convention, not code — be careful.

### 6. Terminology is centralized
All public-facing language should be consistent with `lib/ui/terminology.ts`.
Never use: lock, best bet, unit, parlay, wager, guaranteed, pick (use "call").
Always use: model call, win probability, confidence, signal-based, not a guarantee.

### 7. Adding a new event
1. Run `npm run ingest:ufcstats -- --event-url <url>`
2. Run `npm run normalize:data -- --event-id <slug>`
3. Import the JSON in `lib/events/registry.ts` and add to `orderedEvents`
4. Create prediction files in `data/predictions/`
5. Import predictions in `lib/accuracy/index.ts`

---

## What has been cleaned up

The following files were removed in May 2026 as dead code:

**lib/ (removed):**
- `lib/data.ts` — legacy mock fighter data, 0 active imports
- `lib/exportStyleClashCard.ts` — creator 16:9 export (feature removed)
- `lib/exportStyleRadarCard.ts` — creator radar export (feature removed)
- `lib/exportRosterStyleMap.ts` — creator roster map export (feature removed)
- `lib/creator-export-strategy.ts` — export strategy config (feature removed)
- `lib/exportSection.js` / `.d.ts` — dom-to-image helper (feature removed)
- `lib/normalized-event.ts` — hardcoded to ufc-328, superseded by registry
- `lib/export/exportHookCard.ts` — hook card export (feature removed)
- `lib/export/exportUtils.ts` — export utilities (feature removed)

**components/ (removed):**
- StyleClashExportCard, StyleClashLabel, StyleClashSaveButton
- StyleRadarSaveButton, RosterStyleMapSaveButton, RosterStyleMap
- SaveSectionButton, ExportCardButtons
- components/export/ (ExportStudio, HookCardSaveButton, ExportOptionCard)
- CreatorActions, CreatorCardSamples
- DataModelReadout, FighterStyleRadarCard, ResumeHeatCard
- KeyStatEdges, LastFiveTrend, RoundTrendModule
- FighterMark, FighterAssetSlot

All removed components were part of the creator-export feature set (16:9 cards,
save buttons, creator studio). The product is now strictly predictive — no export UI.

---

## TODOs before backtesting

- [ ] Implement `lib/backtest/buildAsOfFeatures.ts` — needs fight-by-fight date filtering
- [ ] Wire `lib/backtest/runBacktest.ts` to `buildFightOutcomeModel`
- [ ] Auto-load `data/predictions/` from directory instead of 25 manual imports
- [ ] Auto-load `lib/events/registry.ts` from directory instead of manual imports
- [ ] Add `data/backtests/` output folder for generated backtest summaries
- [ ] Consider splitting `lib/fight-shape-model/model.ts` (554 lines) into:
  - `formScoring.ts` — form/momentum calculations
  - `stylePressure.ts` — SPI calculation
  - `layoffModel.ts` — inactivity penalty logic
