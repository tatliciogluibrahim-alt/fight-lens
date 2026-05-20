# Fight Lens - Baseline Validation and Model Experiments

Generated: 2026-05-19T23:56:40.882Z

## Scope

Backend/model-validation only. This pass did not change public UI, production model outputs, locked predictions, ingestion, public copy, or public Model Record behavior.

## Record baseline audit

- Legacy implementation: scripts/backtest/run.ts parses fight.fighters.fighterA.record and fighterB.record, compares W-L win percentage, and counts coin-flips as misses in the aggregate denominator.
- Source fields: scripts/ingest/ufcstats.mjs scrapes fighter profile record text; scripts/ingest/build-normalized-event.mjs copies profile.record or event-preview Wins/Losses/Draws into SourcedFighter.record; scripts/backtest/run.ts reads SourcedFighter.record directly
- Legacy profile-record leakage-safe: no
- Finding: The normalized record strings are scrape/profile snapshots, not records recomputed from each target fight's filtered pre-fight history. They can include target or later results for historical events, so the prior 71% baseline should not be treated as validated.

Primary leakage-safe comparator for experiments: `asof-ufc-win-pct-any-history`.

Baseline Brier convention: Baseline Brier uses 60/40 on picked fights and 50/50 on no-picks. Accuracy-on-picked excludes no-picks; all-fight accuracy counts no-picks as misses for direct coverage comparison.

| Baseline | Leakage-safe | Picked | No-pick | Coverage | Pick acc | All-fight acc | Brier | v0.2 delta on picked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Legacy normalized record-string baseline | no | 247 | 6 | 98% | 72% | 71% | 0.216 | -5% |
| As-of absolute W-L record | yes | 206 | 47 | 81% | 59% | 48% | 0.243 | 5% |
| As-of win percentage, min 3 fights each | yes | 146 | 107 | 58% | 60% | 34% | 0.245 | 2% |
| As-of UFC win percentage, any history | yes | 233 | 20 | 92% | 63% | 58% | 0.235 | 3% |
| As-of win percentage, no small edge | yes | 188 | 65 | 74% | 64% | 47% | 0.237 | 0% |

## Experiment results

All experiments use the same 253-fight corpus and leave method predictions unchanged.

| Experiment | Winner acc | Named-call acc | Brier | NoLean | Calls changed | Disagree acc | Same-record acc | Large-record acc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current v0.2 | 66% | 64% | 0.219 | 31 | 0% | 55% | 71% | 67% |
| Experiment A - record-ratio feature | 64% | 65% | 0.217 | 21 | 17% | 52% | 71% | 64% |
| Experiment B - better-record disagreement penalty | 66% | 65% | 0.218 | 43 | 5% | 55% | 71% | 67% |
| Experiment C - mid-confidence shrinkage | 66% | 64% | 0.218 | 31 | 0% | 55% | 71% | 67% |
| Experiment D - thin-support contrarian guardrail | 66% | 65% | 0.219 | 40 | 4% | 55% | 71% | 67% |
| Experiment E - 10% record-prior blend | 64% | 66% | 0.218 | 41 | 5% | 52% | 71% | 65% |
| Experiment E - 20% record-prior blend | 64% | 66% | 0.218 | 29 | 15% | 51% | 71% | 64% |
| Experiment E - 30% record-prior blend | 64% | 66% | 0.219 | 28 | 19% | 52% | 71% | 64% |

## Calibration snapshot

Cells are `n / actual win rate / Brier`.

| Experiment | 50-60 | 60-70 | 70-80 | 80+ |
| --- | --- | --- | --- | --- |
| Current v0.2 | 135 / 61% / 0.248 | 57 / 61% / 0.233 | 28 / 64% / 0.236 | 33 / 94% / 0.062 |
| Experiment A - record-ratio feature | 119 / 58% / 0.243 | 65 / 63% / 0.230 | 34 / 59% / 0.265 | 35 / 94% / 0.056 |
| Experiment B - better-record disagreement penalty | 148 / 59% / 0.249 | 44 / 68% / 0.219 | 28 / 64% / 0.236 | 33 / 94% / 0.062 |
| Experiment C - mid-confidence shrinkage | 161 / 61% / 0.246 | 53 / 62% / 0.233 | 6 / 67% / 0.223 | 33 / 94% / 0.062 |
| Experiment D - thin-support contrarian guardrail | 143 / 60% / 0.249 | 52 / 67% / 0.220 | 27 / 63% / 0.242 | 31 / 94% / 0.064 |
| Experiment E - 10% record-prior blend | 144 / 57% / 0.249 | 58 / 67% / 0.221 | 31 / 71% / 0.199 | 20 / 100% / 0.023 |
| Experiment E - 20% record-prior blend | 149 / 57% / 0.245 | 57 / 65% / 0.228 | 29 / 76% / 0.177 | 18 / 100% / 0.029 |
| Experiment E - 30% record-prior blend | 152 / 59% / 0.241 | 59 / 59% / 0.245 | 31 / 87% / 0.126 | 11 / 100% / 0.031 |

## Risks and overfitting flags

- Experiment A - record-ratio feature: May be copying the as-of record baseline too much by suppressing disagreement cases.
- Experiment E - 30% record-prior blend: May be copying the as-of record baseline too much by suppressing disagreement cases.

## Recommendation

A. keep v0.2 unchanged

- The legacy 71% better-record baseline is not leakage-safe and is retained only as a deprecated profile-record reference.
- The official as-of record baseline produced 63% pick accuracy / 58% all-fight accuracy with 92% coverage and Brier 0.235.
- Current v0.2 remains stronger on the headline run: 66% winner accuracy and Brier 0.219.
- Best experiment by Brier was Experiment A - record-ratio feature at 0.217 vs v0.2 at 0.219, but it did not clearly improve both accuracy and Brier enough for promotion.

## Guardrails

- Do not promote a model from this single run.
- Do not change production outcome-v0.2 outputs yet.
- Do not change predictionViewModel or public noLean threshold.
- Keep public Model Record separate from historical backtests.
- Do not tune method model until winner probability calibration stabilizes.
