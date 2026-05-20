# Fight Lens — Backtesting System

## What it is

The backtest pipeline runs the Fight Lens prediction model on every historical fight where we have an outcome. It measures how accurate the model would have been — using only the data that was available before each fight.

## How to run

```bash
npm run backtest          # run pipeline, write output files
npm run backtest:elo      # run leakage-safe chronological Elo baseline
npm run backtest:summary  # print a human-readable summary
```

## What leakage means and how we prevent it

**Leakage** is when a backtest uses information that wasn't available before the fight. Example: if you compute a fighter's career striking average using fights that happened after the fight you're testing, the model would have known things it couldn't have known.

**How we prevent it:**
1. For every fight, we determine the event date as the cutoff
2. We filter each fighter's `fightHistory` to only include fights with a date strictly before the cutoff
3. We recompute aggregate stats (slpm, strikingAccuracy, tdAvg, etc.) from those filtered fights only
4. We never read `aggregateStats` directly from the normalized JSON — those totals include all historical fights

The leakage firewall lives in `lib/backtest/buildAsOfFeatures.ts`.

## Where outcomes come from

The runner resolves each fight's outcome in this order:

1. **Locked prediction file** (`data/predictions/<fightId>.json`) — for events Fight Lens called pre-fight (currently UFC 328)
2. **UFCStats fight-detail file** (`data/generated/ufcstats/fights/*.json`) — for historical events backfilled for backtest expansion

Detail-derived outcomes are clearly tagged (`outcomeSourceById` in the runner output and in `event-performance.json`). Draws and No Contests are skipped.

## What data is used

- **Event data:** `data/normalized/events/*.json` — all normalized event JSONs are loaded automatically
- **Outcomes:** locked prediction files or UFCStats fight-detail JSONs (see above)
- **Fighter history:** `fightHistory` within each normalized event JSON — each fighter's prior fights with per-fight totals and (where available) opponent totals

## Output files

Written to `data/generated/backtests/` after each run:

| File | Contents |
|------|----------|
| `predictions.json` | Per-fight: model call, actual result, brier score, missing data flags |
| `summary.json` | Aggregate: winner accuracy, method accuracy, brier score, baselines |
| `calibration.json` | Confidence bucket breakdown (50-60%, 60-70%, 70-80%, 80%+) |
| `missing-data-report.json` | Which stats were unavailable per fight |
| `leakage-reports.json` | Leakage verification for every fight |
| `feature-coverage.json` | Per-feature real / missing counts across all fighter-rows |
| `event-performance.json` | Per-event winner accuracy, method accuracy, brier, outcome source mix |
| `skip-report.json` | Fights skipped and why (no outcome, draw, NC, etc.) |
| `elo-baseline.json` | Per-fight chronological Elo baseline with pre-fight ratings and picks |
| `elo-summary.json` | Elo K sensitivity, model comparison, and agreement/disagreement summary |

## Metrics explained

| Metric | What it means |
|--------|---------------|
| **Winner accuracy** | % of fights where the model's top pick was correct |
| **Method accuracy** | % of fights where finish vs. decision was directionally right |
| **Brier score** | Mean squared error of win probabilities. Lower is better. 0.25 = random. |
| **Calibration** | When the model says 70%, do 70% of those actually win? |
| **Official as-of record baseline** | Leakage-safe baseline recomputed only from each fighter's pre-fight history |
| **Chronological Elo baseline** | Leakage-safe baseline that reads fighter Elo before each fight, then updates after the result |
| **Legacy profile-record baseline** | Deprecated reference that reads profile snapshot records; not an official comparison |
| **More-experience baseline** | Accuracy of always picking the fighter with more total fights |

## Current corpus (May 2026 expansion - n=253)

The corpus now covers **20 completed UFC events** selected by recency and UFCStats availability. No future events, Road to UFC, or DWCS events were selected as target events. Draws/NCs are skipped unless the scorer explicitly supports them.

| Event | Date | Scored | Skipped | Outcome source |
|---|---:|---:|---:|---|
| UFC Fight Night: Allen vs. Costa | 2026-05-16 | 13 | 0 | UFCStats fight detail |
| UFC 328: Chimaev vs. Strickland | 2026-05-09 | 13 | 0 | Locked prediction files |
| UFC Fight Night: Della Maddalena vs. Prates | 2026-05-02 | 13 | 0 | UFCStats fight detail |
| UFC Fight Night: Sterling vs. Zalal | 2026-04-25 | 13 | 0 | UFCStats fight detail |
| UFC Fight Night: Burns vs. Malott | 2026-04-18 | 11 | 1 draw skipped | UFCStats fight detail |
| UFC 327: Prochazka vs. Ulberg | 2026-04-11 | 11 | 1 draw skipped | UFCStats fight detail |
| UFC Fight Night: Moicano vs. Duncan | 2026-04-04 | 13 | 0 | UFCStats fight detail |
| UFC Fight Night: Adesanya vs. Pyfer | 2026-03-28 | 12 | 1 draw skipped | UFCStats fight detail |
| UFC Fight Night: Evloev vs. Murphy | 2026-03-21 | 13 | 0 | UFCStats fight detail |
| UFC Fight Night: Emmett vs. Vallejos | 2026-03-14 | 14 | 0 | UFCStats fight detail |
| UFC 326: Holloway vs. Oliveira 2 | 2026-03-07 | 12 | 0 | UFCStats fight detail |
| UFC Fight Night: Moreno vs. Kavanagh | 2026-02-28 | 13 | 0 | UFCStats fight detail |
| UFC Fight Night: Strickland vs. Hernandez | 2026-02-21 | 13 | 1 NC/overturned skipped | UFCStats fight detail |
| UFC Fight Night: Bautista vs. Oliveira | 2026-02-07 | 13 | 0 | UFCStats fight detail |
| UFC 325: Volkanovski vs. Lopes 2 | 2026-01-31 | 13 | 0 | UFCStats fight detail |
| UFC 324: Gaethje vs. Pimblett | 2026-01-24 | 11 | 0 | UFCStats fight detail |
| UFC Fight Night: Royval vs. Kape | 2025-12-13 | 11 | 1 draw skipped | UFCStats fight detail |
| UFC 323: Dvalishvili vs. Yan 2 | 2025-12-06 | 13 | 1 draw skipped | UFCStats fight detail |
| UFC Fight Night: Tsarukyan vs. Hooker | 2025-11-22 | 14 | 0 | UFCStats fight detail |
| UFC 322: Della Maddalena vs. Makhachev | 2025-11-15 | 14 | 0 | UFCStats fight detail |

The run also skipped 11 UFC 329 fights already present in normalized data because that event is future/upcoming and has no outcomes. Those rows are not part of the completed-event corpus.

## Current checkpoint after P0 prediction consistency pass

The prediction consistency pass is complete. `predictionViewModel` is the canonical public prediction state and must not be bypassed by fight-page components, matchup rows, record rows, result banners, The Call, Live Path, Method Lean, or future public prediction surfaces.

Public call behavior:
- Named fighter calls require at least 52% win probability.
- Below 52%, including exact 50/50, the public state is `noLean` / "Too close to call".
- Locked calls pin the public fight page, matchup row, record row, result banner, The Call, Live Path, and Method Lean.
- Chimaev/Strickland consistently shows Khamzat Chimaev 63%.
- Van/Taira consistently shows Tatsuro Taira 58%.
- Steveson/Ellison consistently shows "Too close to call", not "Call: Gable Steveson 50%".
- Route audit checked 24 routeable fight pages: 24 passed, 0 failed.

Guardrails:
- Public Model Record must stay separate from historical backtest rows.
- `opponentTotals` must not regress.
- Public prediction UI must use `predictionViewModel` as source of truth.
- Do not show a public model grade until there are enough logged public calls.
- Do not publicly overclaim accuracy, calibration, or predictive strength.

## Post-expansion QA checkpoint

Completed on May 19, 2026:

| Check | Result |
|---|---|
| `npm run audit:predictions` | Passed: 24 routeable fight pages checked, 24 passed, 0 failed |
| `npm run backtest` | Passed: 253 scored fights, 17 skipped fights |
| `npm run lint` | Passed |
| `npm run build` | Passed |

QA notes:
- Public Model Record and historical backtest remain separated.
- Expanded backtest rows do not appear as logged public calls.
- UFC 329 future rows remain unscored; no future/upcoming outcomes are included.
- Leakage checks show 72 thin-history warnings and 0 future-date leakage findings.
- `opponentTotals` remains present in the selected corpus: 2,940 of 4,917 history items, roughly 60% item-level coverage.
- `ode-osbourne-alibi-idiris` source data resolves as `Overturned` / `NC`, so it remains skipped as a non-directional outcome.

## Expanded backtest result

| Metric | n=76 deeper history | n=253 expanded corpus |
|---|---:|---:|
| Events | 6 | 20 |
| Scored fights | 76 | 253 |
| Winner accuracy | 66% | 66% |
| Method accuracy | 51% | 58% |
| Brier score | 0.236 | 0.219 |
| Official as-of record baseline | not recomputed in old summary | 63% picked / 58% all fights |
| Official as-of record Brier | not recomputed in old summary | 0.235 |
| Chronological Elo baseline (K=32) | not run | 58% picked / 14% all fights; Brier 0.249; 24% coverage |
| Legacy profile-record baseline | 66% | 71% (deprecated; not leakage-safe) |
| More-experience baseline | 43% | 40% |
| Model vs official as-of record | n/a | +3 pts on picked subset / +8 pts all fights; Brier 0.016 lower |
| Missing-data rate | 36% | 40% |
| `opponentTotals` history-item coverage | ~51% | ~60% |

### Feature coverage

| Feature | Coverage |
|---|---:|
| SLpM | 90% |
| Striking accuracy | 90% |
| SApM | 90% |
| Striking defense | 90% |
| Takedown average | 90% |
| Takedown accuracy | 82% |
| Takedown defense | 83% |
| Submission average | 90% |
| Reach | 100% |
| Stance | 99% |
| DOB | 100% |
| Days since last fight | 100% |

`opponentTotals` remains present in `fightHistory`: 2,940 of 4,917 history items have opponent totals, roughly 60% item-level coverage.

### Calibration

| Bucket | n | Accuracy | Predicted midpoint | Actual win rate |
|---|---:|---:|---:|---:|
| 50-60% | 135 | 61% | 55% | 61% |
| 60-70% | 57 | 61% | 65% | 61% |
| 70-80% | 28 | 64% | 75% | 64% |
| 80%+ | 33 | 94% | 90% | 94% |

The 50-60 and 80%+ buckets are directionally reasonable in this run. The 60-80 range still looks overconfident. Treat this as a calibration review input, not a reason to tune weights immediately.

### Event-by-event

| Event | Winner acc | Brier | Method acc |
|---|---:|---:|---:|
| UFC 322 | 50% | 0.250 | 64% |
| UFC 323 | 69% | 0.204 | 77% |
| UFC 324 | 82% | 0.158 | 73% |
| UFC 325 | 69% | 0.239 | 62% |
| UFC 326 | 67% | 0.261 | 58% |
| UFC 327 | 45% | 0.245 | 36% |
| UFC 328 | 54% | 0.241 | 38% |
| UFC FN Adesanya-Pyfer | 75% | 0.200 | 50% |
| UFC FN Allen-Costa | 54% | 0.234 | 46% |
| UFC FN Bautista-Oliveira | 77% | 0.167 | 54% |
| UFC FN Burns-Malott | 36% | 0.308 | 55% |
| UFC FN Della Maddalena-Prates | 69% | 0.234 | 62% |
| UFC FN Emmett-Vallejos | 64% | 0.225 | 64% |
| UFC FN Evloev-Murphy | 69% | 0.198 | 46% |
| UFC FN Moicano-Duncan | 69% | 0.198 | 62% |
| UFC FN Moreno-Kavanagh | 77% | 0.154 | 69% |
| UFC FN Royval-Kape | 82% | 0.180 | 55% |
| UFC FN Sterling-Zalal | 46% | 0.281 | 85% |
| UFC FN Strickland-Hernandez | 77% | 0.202 | 38% |
| UFC FN Tsarukyan-Hooker | 86% | 0.204 | 57% |

## Known limitations

### 1. Legacy profile-record baseline is deprecated

The previous 71% profile-record baseline is not leakage-safe because it reads normalized fighter profile record strings instead of recomputing records from pre-fight history. It remains in reports only as a deprecated reference. The official as-of UFC win percentage baseline is 63% on picked fights, 58% across all fights, with Brier 0.235. Current v0.2 is 66% winner accuracy with Brier 0.219, so it no longer trails the leakage-safe record baselines. This is promising but still early, not public proof.

### 2. Thin-history warnings are common

The leakage report shows 72 warning rows. These are thin/no prior history warnings, not future-date leakage. The backtest still filters `fightHistory` strictly before each fight date.

### 3. Partial opponent-stats coverage remains

`sapm`, `strikingDefense`, and `takedownDefense` depend on `opponentTotals` in `fightHistory`. Coverage improved from roughly 51% to 60%, but about 40% of history items still lack opponent totals.

### 4. One selected fight is non-directional

`ode-osbourne-alibi-idiris` in UFC Fight Night: Strickland vs. Hernandez has source data marked `Overturned` with both fighters recorded as `NC`. It should remain skipped unless source data changes to a scoreable directional outcome.

### 5. Simple Elo is cold-start limited

A leakage-safe chronological Elo baseline now runs with every fighter starting at 1500 and ratings read before each fight. On the current 253-fight corpus, K=24/32/40 all produce 60 picked fights, 193 no-picks, 24% coverage, 58% pick accuracy, 14% all-fight accuracy, and 0.249 Brier. This is too cold-start heavy to use as a model feature yet. Keep it as a backend baseline and revisit after a larger chronological corpus or a separately validated pre-corpus seeding approach.

## Adding more historical data

```bash
npm run ingest:ufcstats -- \
  --event-url <ufcstats event URL> \
  --include-fights --include-fighters --include-history-fights \
  --max-fights 14 --max-fighters 28 \
  --max-history-fights-per-fighter 8 --max-history-fight-details 120 \
  --max-requests 220 --delay-ms 500

npm run normalize:data -- --event <slug>
npm run backtest
```

No code changes needed. The runner auto-loads every JSON in `data/normalized/events/` and pulls outcomes from prediction files or UFCStats fight detail, in that order.

## Recommendation for next step

The 20-event backend expansion is complete and the target n >= 200 is met. Do not tune weights yet.

Recommended next step: keep v0.2 current and continue backend-only validation/calibration work. Focus on the 60-80% buckets, record-prior experiments, out-of-sample confirmation, and a larger chronological sample for Elo before any model promotion. Keep UI unchanged, public Model Record separate from historical backtests, and `predictionViewModel` as the public source of truth.
