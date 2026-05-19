# Fight Lens - Model Review and Calibration Diagnosis

Generated: 2026-05-19T17:50:40.154Z

## Scope

Backend diagnosis only. This pass did not change model weights, formulas, public UI, predictionViewModel, locked predictions, ingestion, or public Model Record behavior.

## Files inspected

- `AGENTS.md`
- `docs/CHANGELOG.md`
- `docs/MODEL_STATUS.md`
- `docs/NEXT_STEPS.md`
- `docs/BACKTESTING.md`
- `lib/fight-outcome-model/model.ts`
- `lib/fight-outcome-model/types.ts`
- `lib/fight-shape-model/model.ts`
- `lib/fight-shape-model/confidence.ts`
- `lib/fight-shape-model/normalization.ts`
- `lib/backtest/run.ts`
- `lib/backtest/runBacktest.ts`
- `lib/backtest/buildAsOfFeatures.ts`
- `lib/backtest/scorePredictions.ts`
- `lib/backtest/baselines.ts`
- `lib/backtest/calibration.ts`
- `lib/backtest/leakageChecks.ts`
- `lib/predictionThresholds.ts`
- `data/generated/backtests/predictions.json`
- `data/generated/backtests/summary.json`
- `data/generated/backtests/leakage-reports.json`
- `data/generated/backtests/missing-data-report.json`
- `data/generated/backtests/event-performance.json`

## Current model logic

- Outcome model: outcome-v0.2 in `lib/fight-outcome-model/model.ts`.
- Inputs: style pressure, recent form, striking net advantage, grappling net advantage, and absorption resistance.
- Weights: style pressure 0.25, recent form 0.20, striking 0.25, grappling 0.16, absorption 0.14.
- Probability conversion: logistic transform with k=3.5.
- Missing stats fall back to UFC-average-like defaults inside the outcome model.
- No explicit W-L record, age, reach, stance, or raw experience feature is used in the winner model.
- Method model blends each fighter's recent finish profile with win probability; no method formula changes were made.
- Better-record baseline picks the fighter with the higher W-L win ratio from normalized fighter records; it is not currently recomputed from filtered as-of history.
- Thin-history warnings are diagnostic only; those fights still run through the model.

## Headline

The model is not losing everywhere. It is losing mainly when it goes against better-record: in disagreement fights, the model is 40% and better-record is 55%. That explains most of the 5-point baseline gap.

## Model vs better-record agreement

| Segment | n | Model acc | Better-record acc | Avg model conf | Brier | Missing data | Thin history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| model and better-record agree | 171 | 78% | 78% | 64.2% | 0.192 | 34% | 29% |
| model disagrees with better-record | 82 | 40% | 55% | 59.2% | 0.274 | 38% | 28% |
| model correct / better-record wrong | 33 | 100% | 0% | 60.2% | 0.166 | 42% | 33% |
| better-record correct / model wrong | 45 | 0% | 100% | 58.6% | 0.348 | 33% | 24% |
| both correct | 134 | 100% | 100% | 65% | 0.139 | 37% | 31% |
| both wrong | 41 | 0% | 0% | 61.2% | 0.381 | 27% | 22% |

## Record-delta analysis

| Record bucket | n | Model acc | Better-record acc | Delta | Brier |
| --- | --- | --- | --- | --- | --- |
| same/similar record | 42 | 55% | 29% | 26 pts | 0.254 |
| small record advantage | 56 | 52% | 59% | -7 pts | 0.253 |
| medium record advantage | 66 | 70% | 76% | -6 pts | 0.228 |
| large record advantage | 89 | 78% | 94% | -16 pts | 0.175 |

## Calibration diagnosis

| Bucket | n | Avg predicted | Actual win rate | Gap | Brier | Missing data | Thin history | BR disagreement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50-60% | 135 | 54.4% | 61% | 6.6 pts | 0.248 | 27% | 22% | 38% |
| 60-70% | 57 | 64% | 61% | -3 pts | 0.233 | 33% | 23% | 37% |
| 70-80% | 28 | 72.8% | 64% | -8.8 pts | 0.236 | 32% | 32% | 25% |
| 80%+ | 33 | 85% | 94% | 9 pts | 0.062 | 73% | 61% | 9% |

Read: the 60-80% overconfidence does not look primarily caused by missing data or thin history in aggregate. It is more consistent with mid-confidence formula calibration and the model's weaker record-baseline disagreement behavior.

## Thin-history impact

| Segment | n | Model acc | Better-record acc | Avg model conf | Brier | Missing data | Thin history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thin-history warning | 72 | 72% | 72% | 66.7% | 0.195 | 82% | 100% |
| no thin-history warning | 181 | 64% | 70% | 61% | 0.229 | 17% | 0% |

## Missing-data impact

| Segment | n | Model acc | Better-record acc | Avg model conf | Brier | Missing data | Thin history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no missing flags | 164 | 63% | 70% | 60.9% | 0.231 | 0% | 8% |
| one missing flag | 28 | 64% | 68% | 69% | 0.192 | 100% | 54% |
| multiple missing flags | 61 | 74% | 74% | 64.2% | 0.199 | 100% | 72% |
| missing defensive stats | 71 | 70% | 70% | 64.4% | 0.201 | 100% | 68% |
| missing takedown stats | 89 | 71% | 72% | 65.7% | 0.197 | 100% | 66% |
| missing striking stats | 44 | 73% | 68% | 60.3% | 0.230 | 100% | 73% |

## Event-level diagnosis

| Event | n | Model acc | Better-record acc | Brier | Missing data | Method acc | BR disagreement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UFC 322: Della Maddalena vs. Makhachev | 14 | 50% | 79% | 0.250 | 21% | 64% | 43% |
| UFC 323: Dvalishvili vs. Yan 2 | 13 | 69% | 69% | 0.204 | 23% | 77% | 46% |
| UFC 324: Gaethje vs. Pimblett | 11 | 82% | 82% | 0.158 | 18% | 73% | 18% |
| UFC 325: Volkanovski vs. Lopes 2 | 13 | 69% | 77% | 0.239 | 46% | 62% | 23% |
| UFC 326: Holloway vs. Oliveira 2 | 12 | 67% | 58% | 0.261 | 25% | 58% | 42% |
| UFC 327: Prochazka vs. Ulberg | 11 | 45% | 55% | 0.245 | 18% | 36% | 55% |
| UFC 328: Chimaev vs. Strickland | 13 | 54% | 46% | 0.241 | 15% | 38% | 31% |
| UFC Fight Night: Adesanya vs. Pyfer | 12 | 75% | 75% | 0.200 | 42% | 50% | 33% |
| UFC Fight Night: Allen vs. Costa | 13 | 54% | 69% | 0.234 | 31% | 46% | 31% |
| UFC Fight Night: Bautista vs. Oliveira | 13 | 77% | 77% | 0.167 | 31% | 54% | 31% |
| UFC Fight Night: Burns vs. Malott | 11 | 36% | 45% | 0.308 | 45% | 55% | 9% |
| UFC Fight Night: Della Maddalena vs. Prates | 13 | 69% | 85% | 0.234 | 46% | 62% | 31% |
| UFC Fight Night: Emmett vs. Vallejos | 14 | 64% | 86% | 0.225 | 36% | 64% | 36% |
| UFC Fight Night: Evloev vs. Murphy | 13 | 69% | 69% | 0.198 | 46% | 46% | 31% |
| UFC Fight Night: Moicano vs. Duncan | 13 | 69% | 54% | 0.198 | 23% | 62% | 31% |
| UFC Fight Night: Moreno vs. Kavanagh | 13 | 77% | 92% | 0.154 | 46% | 69% | 31% |
| UFC Fight Night: Royval vs. Kape | 11 | 82% | 73% | 0.180 | 55% | 55% | 45% |
| UFC Fight Night: Sterling vs. Zalal | 13 | 46% | 69% | 0.281 | 46% | 85% | 38% |
| UFC Fight Night: Strickland vs. Hernandez | 13 | 77% | 69% | 0.202 | 38% | 38% | 8% |
| UFC Fight Night: Tsarukyan vs. Hooker | 14 | 86% | 79% | 0.204 | 50% | 57% | 36% |

Best events by model accuracy:
- UFC Fight Night: Tsarukyan vs. Hooker: 86% on n=14, Brier 0.204
- UFC 324: Gaethje vs. Pimblett: 82% on n=11, Brier 0.158
- UFC Fight Night: Royval vs. Kape: 82% on n=11, Brier 0.180
- UFC Fight Night: Bautista vs. Oliveira: 77% on n=13, Brier 0.167
- UFC Fight Night: Moreno vs. Kavanagh: 77% on n=13, Brier 0.154

Worst events by model accuracy:
- UFC Fight Night: Burns vs. Malott: 36% on n=11, Brier 0.308
- UFC 327: Prochazka vs. Ulberg: 45% on n=11, Brier 0.245
- UFC Fight Night: Sterling vs. Zalal: 46% on n=13, Brier 0.281
- UFC 322: Della Maddalena vs. Makhachev: 50% on n=14, Brier 0.250
- UFC 328: Chimaev vs. Strickland: 54% on n=13, Brier 0.241

## Method model diagnosis

Overall method accuracy: 58%.

| Top method | n | Method acc | Winner acc | Brier |
| --- | --- | --- | --- | --- |
| Decision | 137 | 56% | 66% | 0.223 |
| KO/TKO | 96 | 59% | 71% | 0.200 |
| Submission | 20 | 60% | 45% | 0.284 |

- Method accuracy when winner call is correct: 63% on n=167.
- Method accuracy when winner call is wrong: 48% on n=86.
- Read: method lean is useful context but should stay secondary until winner calibration improves.

## Feature/component review

| Component | Read | Evidence |
| --- | --- | --- |
| Record/form | Helpful but incomplete | Better-record wins 55% vs model 40% when they disagree. Current model has recent form, but no explicit W-L ratio feature. |
| Striking offense/defense | Helpful | When striking is the top weighted component: n=151, model 68%, Brier 0.208. |
| Takedown offense/defense | Unclear | When grappling is the top weighted component: n=17, model 71%, directional component accuracy 56%. |
| Submission threat | Unclear | Submission enters style pressure and method tendency, but it is not isolated in the winner model diagnostics yet. |
| Reach/stance/age/activity | Mostly missing from winner model | Activity affects form through layoff shrinkage; reach, stance, and age are not explicit winner-model features in outcome-v0.2. |
| Experience | Weak as currently baselined | More-experience baseline is 40%, so raw fight count is not the record signal to chase. |
| Missing-data handling | Not the aggregate failure mode | No missing flags: 63%, missing flags: 71%. Missing stats currently fall back to UFC-average defaults, but aggregate missing-data rows did not underperform here. |
| Confidence/read strength | Do not blanket-penalize thin history yet | Thin-history fights: 72%, no thin-history fights: 64%. Mid-confidence calibration is the concern, not thin-history accuracy overall. |

## Recommended controlled model changes to test later

| Change | Why | Expected effect | Risk | How to test | Metric |
| --- | --- | --- | --- | --- | --- |
| Validate an as-of better-record baseline before tuning toward it | The current baseline uses normalized fighter record strings rather than records recomputed from filtered as-of history. | Confirms whether the 71% baseline is a fair target or partly a record-field timing artifact. | May delay model changes, but avoids tuning toward a misleading benchmark. | Derive W-L records from each fighter's filtered pre-fight history and compare baseline accuracy against the current record-string baseline. | Benchmark validity before model accuracy changes. |
| Test explicit record-ratio feature or record-baseline blend | Better-record is ahead overall and dominates disagreement fights, pending the as-of baseline validation above. | Reduce avoidable misses when the model fades a strong W-L edge without enough stat support. | Could overvalue padded records or weak schedules. | Run an A/B backtest that adds record-ratio delta with small fixed weights, then compare by record bucket and disagreement segment. | Winner accuracy vs better-record, especially model/baseline disagreement accuracy. |
| Test mid-confidence probability shrinkage, especially 60-80% | The 60-70 and 70-80 buckets are overconfident while the 80%+ bucket is strong. | Improve Brier and calibration without flattening the best high-confidence calls. | May make useful 60-70 calls look too timid if applied too broadly. | Apply a diagnostic-only shrink to 60-80% outputs and compare calibration gap, Brier, and winner accuracy. | Brier score and calibration gap in 60-80% buckets. |
| Require stronger stat evidence before disagreeing with better-record | The largest baseline gap appears when the model goes against record advantage. | Keeps contrarian calls, but only when component agreement is broad enough. | Can turn the model into a record follower if threshold is too blunt. | Create a diagnostic-only rule: when better-record disagrees, require multiple components to favor the model side; compare misses saved vs wins lost. | Disagreement-segment accuracy and Brier. |
| Hold method-model tuning until winner calibration stabilizes | Method accuracy improved, but method direction is conditioned on noisy winner probabilities. | Avoids chasing method noise before the main probability layer is trustworthy. | Method may remain secondary and underoptimized for another cycle. | After winner calibration changes, re-run method-by-top-method and winner-correct/wrong splits. | Method accuracy without hurting winner Brier. |

## What not to change yet

- Do not tune model weights or formulas in this pass.
- Do not change predictionViewModel or public prediction thresholds.
- Do not mix historical backtest rows into public Model Record.
- Do not add public claims or a model grade.
- Do not ingest new events as part of this diagnosis.
- Do not optimize only against the current 253-fight sample.

## Notes

- This is a diagnostic snapshot, not a tuning result.
- Public Model Record and historical backtest separation must remain intact.
- Do not publish a model grade from these historical backtest metrics.
