# Fight Lens — Changelog

## May 2026

### Data coverage repair pass

- Re-ingested all 6 backtest corpus events with `--max-history-fight-details 120` (was 60) and `--max-history-fights-per-fighter 8` (was 4)
- Fight-detail files: 439 → 737 (+298 new)
- Feature coverage: 78% → 85% on striking/submission stats; takedownAccuracy 65% → 80%; takedownDefense 70% → 79%
- `opponentTotals` history-item coverage: ~28% → 51%
- Re-ran backtest: winner accuracy 59% → **66%** (now matches better-record baseline); Brier 0.251 → **0.236**; missing-data rate 57% → **36%**
- Regenerated all normalized event JSONs

### Source-of-truth and contradiction fix

Root causes identified and fixed:
- `pinToLockedPrediction` overrode probabilities but not scenario direction → Chimaev/Strickland showed 52% Strickland but "the call" card named Chimaev
- `publicSummary()` in fight-shape model named a style-pressure "leader" independently of the outcome model
- `FightShapeSummary` hardcoded accent to `pressureA` regardless of predicted winner
- `islam-jdm.json` (backtest reconstruction) was counted in `getAccuracyMetrics()`, inflating public Model Record

Fixes applied:
- Added `lib/predictionViewModel.ts` — canonical view model for all fight-page components (`buildPredictionViewModel()`, `PredictionViewModel`, `PredictionSourceType`)
- Fixed `pin-to-locked.ts`: added `reconcileScenarios()` to swap lean/upset content when locked direction disagrees with live re-run
- Fixed `lib/fight-shape-model/model.ts` `publicSummary()`: now neutral style-only copy, never names a winner
- Updated `FightShapeSummary` and `PathsToVictory`: accept `predictedWinnerId` prop from canonical view model
- Split `lib/accuracy/index.ts` into `getLockedPredictions()` and `getHistoricalBacktestReconstructions()`; `getAccuracyMetrics()` now uses locked-only
- Split `app/record/page.tsx` into two labeled sections: public Model Record (locked calls) and Historical Backtest (reconstructions)
- Created `scripts/audit/predictions.ts` — 9 consistency checks across all fight pages
- Added `npm run audit:predictions` — passes across 99 fights/8 events
- All routes now wired through `buildPredictionViewModel()` and pass canonical `predictedWinnerId` downstream

### Backtest expansion (6-event corpus, n=76)

- Selected 6 most recent completed UFC events with UFCStats data (no cherry-picking)
- Events: UFC 322 (Nov 2025), UFC 326 (Mar 2026), UFC 327 (Apr 2026), UFC 328 (May 2026), UFC FN Della Maddalena vs. Prates (May 2026), UFC FN Allen vs. Costa (May 2026)
- Extended `scripts/backtest/run.ts`: fight-detail outcome derivation from UFCStats JSON (no prediction files needed for historical events)
- Added new output files: `feature-coverage.json`, `event-performance.json`, `skip-report.json`
- Backtest now writes 8 output files per run
- Initial n=76 result: 59% winner accuracy, Brier 0.251, trailing better-record baseline (66%) — confirmed n=13 was favorable noise
- Documented in `docs/BACKTESTING.md` with three-checkpoint comparison table

### UI and language pass

- Renamed CTAs: "lens →" → "View Read →"; "open main lens" → "View Main Event Read →"; nav "record" → "model record"
- Renamed scenario titles in model: "the lean" → "the call", "upset path" → "live path", "swing factor" → "what breaks the call"
- `TheCall.tsx` rewrite: `ReadStrengthChip` under probability bar; `MethodLean` collapsed to top method + slim bars (methods <8% show "thin")
- `FightCard.tsx` rewrite: scannable sub-row with call / read strength / method lean / result chip
- `ResultStateChip`: "Model correct / Model incorrect / Pending / No result"
- Visual: quieter body background gradient, reduced amber glow, reduced card/lens-mark glow
- AppHeader subline: "see the shape" → "forecast · tracked"
- Disclaimer footer: "signal-based forecast · not a guarantee" + lock-timestamp note
- Methodology page: added "Plain English" 6-pillar grid; Brier section framed as "technical details" with softened ranges

### opponentTotals fix (defensive stat coverage)

- Opponent defensive stats were absent from `fightHistory`, forcing `sapm`, `strikingDefense`, `takedownDefense` to fall back to UFC averages in the backtest
- Added `opponentIdFromDetail(detail, fighterId)` to `scripts/ingest/build-normalized-event.mjs`
- `buildHistoryItem()` now stores `opponentTotals` alongside `totals` in each history item
- Added `opponentTotals` field to `SourcedFightHistoryItem` in `lib/sourced-event.ts`
- `accumulateFight()` in `lib/backtest/buildAsOfFeatures.ts` reads `item.opponentTotals.totals`

### Backtesting system (initial build)

- Created `lib/backtest/` pipeline: types, buildAsOfFeatures, runBacktest, scorePredictions, calibration, baselines, leakageChecks
- Created `scripts/backtest/run.ts` and `scripts/backtest/summary.ts`
- Added `npm run backtest` and `npm run backtest:summary`
- Leakage firewall: history filtered with strict `<` ISO date comparison; aggregate stats recomputed from filtered history only
- Initial output: 5 files to `data/generated/backtests/`

### Codebase organization pass

- Removed dead lib files: `lib/data.ts`, `lib/exportStyleClashCard.ts`, `lib/exportStyleRadarCard.ts`, `lib/exportRosterStyleMap.ts`, `lib/creator-export-strategy.ts`, `lib/exportSection.js/.d.ts`, `lib/normalized-event.ts`, `lib/export/exportHookCard.ts`, `lib/export/exportUtils.ts`
- Removed 21 dead components (creator-export feature set)
- Updated `docs/code-structure.md` with full directory map, rules, cleaned-up list
- Created `docs/BACKTESTING.md`
