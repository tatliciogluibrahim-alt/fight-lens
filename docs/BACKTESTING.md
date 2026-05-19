# Fight Lens — Backtesting System

## What it is

The backtest pipeline runs the Fight Lens prediction model on every historical fight where we have an outcome. It measures how accurate the model would have been — using only the data that was available before each fight.

## How to run

```bash
npm run backtest          # run pipeline, write output files
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

## Metrics explained

| Metric | What it means |
|--------|---------------|
| **Winner accuracy** | % of fights where the model's top pick was correct |
| **Method accuracy** | % of fights where finish vs. decision was directionally right |
| **Brier score** | Mean squared error of win probabilities. Lower is better. 0.25 = random. |
| **Calibration** | When the model says 70%, do 70% of those actually win? |
| **Better-record baseline** | Accuracy of always picking the fighter with the better W-L ratio |
| **More-experience baseline** | Accuracy of always picking the fighter with more total fights |

## Current corpus (May 2026 expansion — n=76)

The corpus was expanded from n=13 (UFC 328 only) to n=76 across **6 completed events**:

| Event | Date | Fights | Outcome source |
|---|---|---|---|
| UFC 322: Della Maddalena vs. Makhachev | 2025-11-15 | 14 | UFCStats fight detail |
| UFC 326: Holloway vs. Oliveira 2 | 2026-03-07 | 12 | UFCStats fight detail |
| UFC 327: Prochazka vs. Ulberg | 2026-04-11 | 11 (1 draw skipped) | UFCStats fight detail |
| UFC Fight Night: Della Maddalena vs. Prates | 2026-05-02 | 13 | UFCStats fight detail |
| UFC 328: Chimaev vs. Strickland | 2026-05-09 | 13 | Locked prediction files |
| UFC Fight Night: Allen vs. Costa | 2026-05-16 | 13 | UFCStats fight detail |

Selection rule: most recent completed UFC events with UFCStats data (no cherry-picking by storyline or favorability).

## Expanded backtest result (n=76) vs prior n=13

|  | n=13 (UFC 328 only) | n=76 (expanded) | direction |
|---|---|---|---|
| Winner accuracy | 69% | **59%** | ⬇ |
| Brier score | 0.224 | **0.251** | ⬆ (worse) |
| Better-record baseline | 46% | **66%** | the baseline changed completely |
| More-experience baseline | 54% | **43%** | the baseline changed completely |
| Missing-data rate (per-fight flag) | 38% | **57%** | ⬆ (more partial coverage) |
| Per-feature defensive coverage | ~62% (5/13 missing) | **78%** (33/152 fighter-rows missing) | ⬆ better at the per-row level |

### Honest read

This is an **early expanded sample**, not proof of model quality.

The n=13 result was almost certainly favorable noise. On the broader sample, the model is roughly at the random Brier threshold (0.251 vs 0.25), and the better-record baseline beats the model by 7 points (66% vs 59%). The baselines themselves swung wildly when the sample changed, which is exactly what tiny samples do.

Two contributors to the regression:
1. **Calibration gap.** The 60-70% and 70-80% buckets show clear overconfidence (predicted 65% / actual 45%; predicted 75% / actual 50%). When the model gets specific, it's worse than when it sits near 50/50.
2. **Data coverage gap.** 57% of fights still have at least one missing-stat flag. Per-feature coverage is 78% across the corpus, with `takedownAccuracy` at 65% and `takedownDefense` at 70%. The model uses UFC averages when a stat is missing, which compresses signal.

### Event-by-event

| Event | Winner acc | Brier | Method acc | Outcomes from |
|---|---|---|---|---|
| UFC 322 | 57% (8/14) | 0.289 | 57% | detail |
| UFC 326 | 67% (8/12) | 0.228 | 58% | detail |
| UFC 327 | 55% (6/11) | 0.229 | 36% | detail |
| UFC 328 | 69% (9/13) | 0.224 | 38% | predictions |
| UFC FN DDM-Prates | 69% (9/13) | 0.242 | 69% | detail |
| UFC FN Allen-Costa | **38%** (5/13) | 0.288 | 46% | detail |

The model is unstable across events. UFC FN Allen-Costa (38%) pulled the average down sharply; UFC 326, 328, and UFC FN DDM-Prates clustered at 67-69%. With only 11–14 fights per event, individual-event accuracy carries large variance.

## Known limitations

### 1. Partial opponent-stats coverage
`sapm`, `strikingDefense`, and `takedownDefense` are computed from `opponentTotals` in `fightHistory`, but those are only stored for fights where the normalizer has scraped fight-detail data. Career history items without scraped details fall back to UFC averages.

**Coverage today (n=76 corpus):** 78% on most aggregate stats, 65–70% on takedown stats.

**How to improve:** Ingest deeper fighter history — `--include-history-fights --max-history-fight-details 80` (or higher) on each event ingestion, or run a separate fighter-history backfill pass.

### 2. Calibration is off
The model is overclaiming confidence in the 60–80% bucket on this corpus. **Do not adjust weights to chase this number** — that would overfit the sample. Re-examine after the corpus reaches n≥200 (15–20 events).

### 3. Sample size still early
n=76 is large enough to falsify the n=13 result but too small to publish stable accuracy numbers. Calibration buckets need n≥30 each to be meaningful; today the 70-80% bucket has only n=6, 80%+ has only n=7.

## Adding more historical data

```bash
npm run ingest:ufcstats -- \
  --event-url <ufcstats event URL> \
  --include-fights --include-fighters --include-history-fights \
  --max-fights 14 --max-fighters 28 \
  --max-history-fights-per-fighter 4 --max-history-fight-details 60 \
  --max-requests 150 --delay-ms 500

npm run normalize:data -- --event <slug>
npm run backtest
```

No code changes needed — the runner auto-loads every JSON in `data/normalized/events/` and pulls outcomes from prediction files or UFCStats fight detail, in that order.

## Recommendation for next step

**Data repair first, then a 20–30 event expansion.** Specifically:

1. **Deeper history backfill** — run `--include-history-fights --max-history-fight-details 120` on every event already in the corpus so per-feature coverage moves from 78% toward 90%+
2. **Then expand the corpus** to 20–30 events, sequentially, with the same selection rule (most recent completed cards)
3. **Only after that** consider a model review. Adjusting weights on n=76 would be fitting to noise.

The opponentTotals fix from the previous pass is preserved and working — the data pipeline regression isn't in the wiring, it's in the depth of fighter history available for each backtested event.
