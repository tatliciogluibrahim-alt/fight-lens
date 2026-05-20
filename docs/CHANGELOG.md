# Fight Lens — Changelog

## May 2026

### Frontend visual + copy polish (multi-pass)

Six successive UI/UX passes with zero model-math changes. All passes ran on top of the v0.2 prediction pipeline. QA commands (`audit:predictions`, `backtest`, `lint`, `build`) remained green throughout.

#### Visual/UX correction pass
- Sticky tab bar fixed at `top-16 z-20` — no longer scrolls away on mobile.
- Nav labels: "matchups" → "events", "model record" → "record", "methodology" → "how it works".
- Events link now routes to `/events` index (was hardcoded to `/events/ufc-329`).
- Event status chip added to EventHero (forecast live / result pending / scored).
- Style edge terminology: all "matchup stress", "pressure point", "style-pressure read", and "Limited pressure signal" variants removed from the UI. Replacement: "style edge".
- Method lean copy: label changed to "most likely finish type", added "directional only" badge.
- Fight-shape copy improvements: `publicSummary()` in model.ts now detects shared dominant-factor ties and differentiates by score gap; never names a winner.

#### QA pass
- Browser-verified 10 routes; found and fixed three remaining forbidden-language occurrences:
  - "creates matchup stress" in methodology `modelRows`.
  - `pressureLabel()` returning "Limited pressure signal" (renamed to "Limited style edge" across all four confidence levels).
  - "pressure points" in fight-shape output row on methodology page.

#### Visual level-up
- Created `app/events/page.tsx` — events index with featured current card and past cards list.
- Created `components/FightReadSnapshot.tsx` — at-a-glance strip between fighter hero and tabs showing model call, win %, read strength, method lean, live path, and what-breaks-the-call. Reads from canonical `viewModel` only.
- Homepage rebuilt as 2-column layout: manifesto left, live next-card preview panel right. Preview pulls the canonical `buildPredictionViewModelBundle` — no separate data compute.
- Shape tab radar given hero treatment with HUD corner marks.
- Methodology page rebuilt with 3-card scan grid (what it uses / what it doesn't know / how to read it).

#### Motion / cinematic pass
- Added CSS motion system to `app/globals.css`: `fl-animate-fade-up`, `fl-radar-bloom`, `fl-radar-centroid`, `fl-radar-dot`, `fl-tab-panel`, `fl-delay-{100-400}`.
- Global `@media (prefers-reduced-motion: reduce)` override disables all animations.
- Fighter hero panel: `cornerLabel` ("side · A"/"side · B"), accent rail above predicted winner's name, staggered entrance delays.
- VS centre uses gradient text, vertical accent rails flanking the panel.
- Radar polygon gets `fl-radar-bloom` animated draw-in on load.
- Tab panel uses `fl-tab-panel` slide-in on tab change via `key={active}` reset.
- Native SVG `<title>` on radar data dots for accessibility.

#### Shape copy / narrative pass
- Created `lib/fight-shape-model/shape-narrative.ts` — analyst-style shape copy generator.
  - Compares fighters across all 8 radar axes using per-axis delta.
  - Returns `{ headline, cards, caveat }` — never names a winner.
  - Three card types: `biggest-edge`, `closest`, `swing`/`watching`.
  - Swing card biases toward predicted loser's best axis for counter-path framing.
  - Thin-sample caveat surfaces automatically when fewer than 4 axes have data on both sides.
- `FightShapeSummary` now uses `narrative.headline` instead of `modelOutput.publicSummary`.
- `StyleComparisonBars` restructured:
  - "What the shape says" card grid added above axis bars.
  - Axis breakdown sorted by absolute delta descending.
  - Δ delta column added to bars.
  - `predictedWinnerId` prop plumbed through for swing card direction.
- `styleAndCallDisagree` detection added to `FightShapeSummary`: explicit note shown when style edge leader and predicted winner differ.

No model math, locked predictions, prediction thresholds, backtest scripts, `opponentTotals`, or public Model Record logic was changed in any of the above passes.

### Chronological Elo baseline pass

- Added backend-only leakage-safe chronological Elo baseline generation.
- New command: `npm run backtest:elo`.
- New outputs: `data/generated/backtests/elo-baseline.json` and `data/generated/backtests/elo-summary.json`.
- Elo reads pre-fight ratings before each fight, then updates ratings only after the result. Every fighter starts at 1500.
- K sensitivity tested at 24, 32, and 40. All produced 60 picked fights, 193 no-picks, 24% coverage, 58% pick accuracy, 14% all-fight accuracy, and 0.249 Brier.
- Recommendation: Elo is not ready as a model feature on this corpus; keep it as a tracked baseline and revisit with a larger chronological sample or validated seeding plan.
- No production model outputs, locked predictions, public UI, ingestion, or public Model Record behavior changed.

### Baseline correction pass

- Replaced the official backtest baseline reporting with leakage-safe as-of record baselines computed from pre-fight history only.
- Deprecated the old 71% profile-record baseline because it reads normalized fighter profile snapshots and is not leakage-safe. It remains available only as reference.
- Official headline baseline is now `asof-ufc-win-pct-any-history`: 92% coverage, 63% pick accuracy, 58% all-fight accuracy, Brier 0.235.
- Current v0.2 remains the production model: 66% winner accuracy, 58% method accuracy, Brier 0.219 on 253 scored fights.
- No v0.3 experiment was promoted; no model weights, formulas, UI, locked predictions, ingestion, or public Model Record behavior changed.
- Regenerated backtest summary, model diagnostics, and experiment reports to use the corrected official baseline.

### P0 prediction consistency pass

Goal: fix visible prediction contradictions before expanding the corpus to 20-30 events.

Completed:
- `lib/predictionViewModel.ts` is now the canonical public prediction state for fight pages, matchup rows, record rows, result banners, The Call, Live Path, and Method Lean.
- Added a 52% named-call threshold. Anything below 52% now resolves to `noLean` / "Too close to call" instead of defaulting to Fighter A or array order.
- Locked calls now pin the public fight-page state consistently across the fight page, matchup row, record row, result banner, The Call, Live Path, and Method Lean.
- Chimaev/Strickland consistently shows the locked public call: Khamzat Chimaev 63%.
- Van/Taira consistently shows the locked public call: Tatsuro Taira 58%.
- Steveson/Ellison shows "Too close to call" everywhere, not "Call: Gable Steveson 50%".
- Route audit checked 24 routeable fight pages: 24 passed, 0 failed.

Guardrails reinforced:
- Public Model Record must stay separate from historical backtest rows.
- `opponentTotals` must not regress.
- Public prediction surfaces must not bypass `predictionViewModel`.
- Do not show a public model grade until there are enough logged public calls.
- Keep public language signal-based and avoid overclaiming.

Next step:
- Backend-only expansion to 20-30 completed UFC events, targeting n >= 200 scored fights.
- No model tuning, UI changes, or public claims expansion during that step.

### 20-event backtest expansion QA checkpoint

- Backtest corpus now covers 20 completed UFC events and 253 scored fights.
- Headline metrics: 66% winner accuracy, 58% method accuracy, 0.219 Brier score, 40% more-experience baseline, 40% missing-data rate.
- Follow-up baseline correction found the previous 71% profile-record baseline was not leakage-safe; official as-of record baseline is 63% picked / 58% all fights with Brier 0.235.
- Model remains directionally promising but not proven; v0.2 now beats the leakage-safe record baselines but should not be publicly graded yet.
- Calibration concern remains in the 60-80% confidence buckets.
- `opponentTotals` remained intact at 2,940 of 4,917 selected-corpus history items, roughly 60% item-level coverage.
- Public Model Record/backtest separation re-checked: public logged calls remain separate from historical reconstruction rows.
- UFC 329 future rows remain unscored in the backtest.
- `ode-osbourne-alibi-idiris` source data resolves as `Overturned` / `NC`; it stays skipped as a non-directional outcome.
- Checks passed: `npm run audit:predictions`, `npm run backtest`, `npm run lint`, `npm run build`.

Recommended next step:
- Controlled backend model review/calibration, not UI polish and not public claim expansion.

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
- Initial n=76 result: 59% winner accuracy, Brier 0.251, trailing the then-reported profile-record baseline (66%) — confirmed n=13 was favorable noise; that profile-record comparison is now treated as legacy reference only
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
