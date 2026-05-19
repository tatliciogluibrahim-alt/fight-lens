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

## Expanded backtest result (n=76) — three checkpoints

| | n=13 (UFC 328 only) | n=76 initial coverage | **n=76 deeper coverage** |
|---|---|---|---|
| Winner accuracy | 69% | 59% | **66%** |
| Brier score | 0.224 | 0.251 | **0.236** |
| Better-record baseline | 46% | 66% | 66% |
| More-experience baseline | 54% | 43% | 43% |
| Missing-data rate (per-fight flag) | 38% | 57% | **36%** |
| Striking / submission per-feature coverage | n/a | 78% | **85%** |
| Takedown-accuracy coverage | n/a | 65% | **80%** |
| Takedown-defense coverage | n/a | 70% | **79%** |
| `opponentTotals` history-item coverage | ~26% | ~28% | **51%** |

### Deeper-coverage pass (May 2026)

The middle column was the first n=76 run with `--max-history-fight-details 60` per event ingestion. The right column was after re-running each ingestion with `--max-history-fight-details 120` and `--max-history-fights-per-fighter 8`. Fight-detail file count grew 439 → 737 (+298). Cache absorbed most repeats.

### Honest read

Deeper data coverage **closed about half the gap** to the better-record baseline:
- Winner accuracy moved 59% → 66%, drawing level with the baseline (66%)
- Brier moved 0.251 → 0.236 — meaningfully below the 0.25 random threshold
- Missing-data flags fell from 57% → 36% of fights
- Per-feature coverage moved from 78% → 85% on most stats; takedown stats jumped 65→80% and 70→79%

What it did **not** prove:
- The model still does not *beat* the better-record baseline — it matches it
- 60–70% and 70–80% buckets still show overconfidence (predicted 65% / actual 54%; predicted 75% / actual 50%). The high-confidence (80%+) bucket flipped to 100% (6/6) but n is tiny
- n=76 is still small. Calibration buckets at n=6, 13 do not stabilize

This is consistent with the hypothesis that the previous regression (59% on the initial pass) was partly a data-coverage artifact, not a model design failure. But more data alone hasn't shown the model to be better than always picking the higher-W/L fighter.

### Event-by-event (deeper-coverage run)

| Event | Winner acc | Brier | Method acc | Δ vs prior |
|---|---|---|---|---|
| UFC 322 | 64% (9/14) | 0.258 | 64% | +7 pts |
| UFC 326 | 75% (9/12) | 0.256 | 58% | +8 pts |
| UFC 327 | 55% (6/11) | 0.233 | 36% | unchanged |
| UFC 328 | 69% (9/13) | 0.210 | 38% | unchanged (locked) |
| UFC FN DDM-Prates | 77% (10/13) | 0.221 | 62% | +8 pts |
| UFC FN Allen-Costa | 54% (7/13) | 0.239 | 46% | +16 pts |

UFC FN Allen-Costa, which had pulled the previous average down (38% → 54%), is now the noisiest event in the sample but no longer a clear outlier.

## Known limitations

### 1. Partial opponent-stats coverage
`sapm`, `strikingDefense`, and `takedownDefense` are computed from `opponentTotals` in `fightHistory`, but those are only stored for fights where the normalizer has scraped fight-detail data. Career history items without scraped details fall back to UFC averages.

**Coverage today (n=76 corpus, post-deeper-pass):** 85% on most aggregate stats; takedown accuracy 80%; takedown defense 79%.

**How to improve further:** push `--max-history-fight-details` higher than 120, or run a dedicated fighter-history backfill pass that walks each fighter's career and ingests every detail page.

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

The deeper-coverage pass (May 2026) is done. The recommendation now sequences:

1. **Expand the corpus to 20–30 completed events** with the same selection rule (most recent completed cards). Reach n≥200 fights so the calibration buckets actually stabilize. At today's per-bucket counts (n=6, 13) we cannot tell whether the 60–80% overconfidence is signal or noise.
2. **Hold off on weight tuning** until step 1 lands. Tuning on n=76 with coverage gaps still around 15–20% on the takedown stats would overfit to this specific sample.
3. **Consider a second deeper-coverage pass** only if per-feature coverage stops improving naturally as the corpus grows. Each new event automatically backfills history pages for the fighters who appear on it.
4. **A model review** belongs after step 1 — at that point we will know whether the model is structurally below the better-record baseline (formula/feature problem) or whether the calibration buckets stabilize at honest numbers as n grows.

The opponentTotals fix and the source-of-truth view model from the previous passes are preserved and working. This pass closed the data-coverage gap and moved the model from 7 points below the better-record baseline to level with it — useful, but still not proof.
