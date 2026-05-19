# Fight Lens — Backtesting System

## What it is

The backtest pipeline runs the Fight Lens prediction model on every historical fight that has a recorded outcome. It measures how accurate the model would have been — using only the data that was available before each fight.

## How to run

```bash
npm run backtest          # run pipeline, write output files
npm run backtest:summary  # print a human-readable summary
```

## What leakage means and how we prevent it

**Leakage** is when a backtest uses information that wasn't available before the fight. Example: if you compute a fighter's career striking average using fights that happened after the fight you're testing, you're cheating — the model would have known things it couldn't have known.

**How we prevent it:**
1. For every fight, we determine the event date as the cutoff
2. We filter each fighter's `fightHistory` to only include fights with a date strictly before the cutoff
3. We recompute aggregate stats (slpm, strikingAccuracy, tdAvg, etc.) from those filtered fights only
4. We never read `aggregateStats` directly from the normalized JSON — those totals include all historical fights

The leakage firewall lives in `lib/backtest/buildAsOfFeatures.ts`.

## What data is used

- **Event data:** `data/normalized/events/*.json` — all normalized event JSONs are loaded automatically
- **Outcomes:** `data/predictions/*.json` — only fights with a recorded `outcome` block are backtested
- **Fighter history:** `fightHistory` within each normalized event JSON — each fighter's prior fights with per-fight totals

## Output files

Written to `data/generated/backtests/` after each run:

| File | Contents |
|------|----------|
| `predictions.json` | Per-fight: model call, actual result, brier score, missing data flags |
| `summary.json` | Aggregate: winner accuracy, method accuracy, brier score, baselines |
| `calibration.json` | Confidence bucket breakdown (50-60%, 60-70%, 70-80%, 80%+) |
| `missing-data-report.json` | Which stats were unavailable per fight |
| `leakage-reports.json` | Leakage verification for every fight |

## Metrics explained

| Metric | What it means |
|--------|---------------|
| **Winner accuracy** | % of fights where the model's top pick was correct |
| **Method accuracy** | % of fights where finish vs. decision was directionally right |
| **Brier score** | Mean squared error of win probabilities. Lower is better. 0.25 = random. |
| **Calibration** | When model says 70%, do 70% of those actually win? |
| **Better-record baseline** | Accuracy of always picking the fighter with the better W-L ratio |
| **More-experience baseline** | Accuracy of always picking the fighter with more total fights |

## Current limitations

### 1. Partial opponent stats coverage
`sapm`, `strikingDefense`, and `takedownDefense` are now computed as-of for fights where the normalizer has scraped fight detail files. As of May 2026, this covers ~26% of career history items (fights from ingested events only). For fights without detail files, the model still falls back to UFC-average defaults.

**Coverage:** 5/13 UFC 328 fights still have partial missing-stat flags (down from 13/13 before May 2026). The remaining gaps are sparse-history fighters whose career bouts were not individually scraped.

**How to improve:** Ingest older UFC events to build a deeper fight detail library. Each ingested event adds opponent totals for all fighters who competed in that event.

### 2. Small sample (n=13)
Only UFC 328 outcomes are recorded as of May 2026. UFC 329 fought July 11, 2026 — once outcomes are added, the corpus grows to n=24. Calibration is not statistically meaningful below n=30.

### 3. Confidence collapses to 50/50 on sparse data
When a fighter has very few prior fights in the history (e.g., Amosov had only 1 UFC fight before UFC 328), the model correctly returns "insufficient" confidence and often outputs near 50/50. This is correct behavior — the model is honest about uncertainty.

## Interpreting results

**Good sign:** High accuracy in the 70-80% and 80%+ confidence buckets — this means when the model is confident, it's right more often.

**Warning sign:** If accuracy in the 50-60% bucket is above 60%, the model is underconfident (should be more aggressive). If it's below 40%, the model is overconfident on coin-flips.

**Brier score vs random (0.25):** A well-calibrated model on UFC fights should reach 0.18-0.22. Below 0.18 is genuinely good. Above 0.25 means the model is hurting itself with overconfident wrong picks.

## Adding more historical data

To add more historical events to the backtest corpus:

1. Ingest the event: `npm run ingest:ufcstats -- --event-url <url>`
2. Normalize: `npm run normalize:data -- --event-id <slug>`
3. Create prediction files in `data/predictions/` with `outcome` blocks filled in
4. The backtest runner auto-discovers all JSONs in `data/normalized/events/`
5. Re-run: `npm run backtest`

No code changes needed — the runner loads all event JSONs automatically.
