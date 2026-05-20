# Fight Lens - Model Review and Calibration Diagnosis

Generated: 2026-05-19T23:57:16.020Z

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
- `lib/backtest/recordBaselines.ts`
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
- Official record baseline uses leakage-safe as-of UFC win percentage from filtered pre-fight history only.
- Legacy profile-record baseline uses normalized fighter profile record strings; it is deprecated and retained only for reference.
- Thin-history warnings are diagnostic only; those fights still run through the model.

## Headline

The previous 71% profile-record baseline was leakage-prone and is no longer the official comparison. Against the official as-of record baseline, v0.2 is directionally ahead: model 66% winner accuracy and Brier 0.219 vs official as-of record 63% picked / 58% all fights and Brier 0.235. This is promising, not public proof.

## Model vs official as-of record agreement

| Segment | n | Model acc | As-of record acc | Avg model conf | Brier | Missing data | Thin history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| model and as-of record agree | 169 | 70% | 70% | 64.2% | 0.209 | 33% | 30% |
| model disagrees with as-of record | 64 | 55% | 45% | 58.5% | 0.248 | 34% | 22% |
| as-of record no-pick | 20 | 70% | 0% | 62.2% | 0.213 | 55% | 35% |
| model correct / as-of record wrong | 49 | 100% | 0% | 60.4% | 0.168 | 41% | 27% |
| as-of record correct / model wrong | 29 | 0% | 100% | 57.8% | 0.338 | 34% | 21% |
| both correct | 118 | 100% | 100% | 65.5% | 0.135 | 36% | 33% |
| both wrong/no-pick | 57 | 0% | 0% | 60.9% | 0.377 | 28% | 25% |

## Record-delta analysis

| Record bucket | n | Model acc | As-of record acc | Delta | Brier |
| --- | --- | --- | --- | --- | --- |
| same/similar record | 34 | 71% | 21% | 50 pts | 0.208 |
| small record advantage | 28 | 54% | 64% | -10 pts | 0.250 |
| medium record advantage | 31 | 68% | 61% | 7 pts | 0.216 |
| large record advantage | 160 | 67% | 64% | 3 pts | 0.216 |

## Calibration diagnosis

| Bucket | n | Avg predicted | Actual win rate | Gap | Brier | Missing data | Thin history | Record disagreement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50-60% | 135 | 54.4% | 61% | 6.6 pts | 0.248 | 27% | 22% | 41% |
| 60-70% | 57 | 64% | 61% | -3 pts | 0.233 | 33% | 23% | 32% |
| 70-80% | 28 | 72.8% | 64% | -8.8 pts | 0.236 | 32% | 32% | 14% |
| 80%+ | 33 | 85% | 94% | 9 pts | 0.062 | 73% | 61% | 21% |

Read: the 60-80% overconfidence does not look primarily caused by missing data or thin history in aggregate. It is more consistent with mid-confidence formula calibration and selected contrarian record-baseline behavior.

## Thin-history impact

| Segment | n | Model acc | As-of record acc | Avg model conf | Brier | Missing data | Thin history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thin-history warning | 72 | 72% | 63% | 66.7% | 0.195 | 82% | 100% |
| no thin-history warning | 181 | 64% | 56% | 61% | 0.229 | 17% | 0% |

## Missing-data impact

| Segment | n | Model acc | As-of record acc | Avg model conf | Brier | Missing data | Thin history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no missing flags | 164 | 63% | 57% | 60.9% | 0.231 | 0% | 8% |
| one missing flag | 28 | 64% | 54% | 69% | 0.192 | 100% | 54% |
| multiple missing flags | 61 | 74% | 62% | 64.2% | 0.199 | 100% | 72% |
| missing defensive stats | 71 | 70% | 61% | 64.4% | 0.201 | 100% | 68% |
| missing takedown stats | 89 | 71% | 60% | 65.7% | 0.197 | 100% | 66% |
| missing striking stats | 44 | 73% | 55% | 60.3% | 0.230 | 100% | 73% |

## Event-level diagnosis

| Event | n | Model acc | As-of record acc | Brier | Missing data | Method acc | Record disagreement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UFC 322: Della Maddalena vs. Makhachev | 14 | 50% | 43% | 0.250 | 21% | 64% | 36% |
| UFC 323: Dvalishvili vs. Yan 2 | 13 | 69% | 62% | 0.204 | 23% | 77% | 54% |
| UFC 324: Gaethje vs. Pimblett | 11 | 82% | 55% | 0.158 | 18% | 73% | 9% |
| UFC 325: Volkanovski vs. Lopes 2 | 13 | 69% | 69% | 0.239 | 46% | 62% | 15% |
| UFC 326: Holloway vs. Oliveira 2 | 12 | 67% | 58% | 0.261 | 25% | 58% | 42% |
| UFC 327: Prochazka vs. Ulberg | 11 | 45% | 64% | 0.245 | 18% | 36% | 36% |
| UFC 328: Chimaev vs. Strickland | 13 | 54% | 62% | 0.241 | 15% | 38% | 23% |
| UFC Fight Night: Adesanya vs. Pyfer | 12 | 75% | 58% | 0.200 | 42% | 50% | 17% |
| UFC Fight Night: Allen vs. Costa | 13 | 54% | 46% | 0.234 | 31% | 46% | 31% |
| UFC Fight Night: Bautista vs. Oliveira | 13 | 77% | 62% | 0.167 | 31% | 54% | 23% |
| UFC Fight Night: Burns vs. Malott | 11 | 36% | 18% | 0.308 | 45% | 55% | 9% |
| UFC Fight Night: Della Maddalena vs. Prates | 13 | 69% | 69% | 0.234 | 46% | 62% | 31% |
| UFC Fight Night: Emmett vs. Vallejos | 14 | 64% | 64% | 0.225 | 36% | 64% | 29% |
| UFC Fight Night: Evloev vs. Murphy | 13 | 69% | 62% | 0.198 | 46% | 46% | 8% |
| UFC Fight Night: Moicano vs. Duncan | 13 | 69% | 38% | 0.198 | 23% | 62% | 15% |
| UFC Fight Night: Moreno vs. Kavanagh | 13 | 77% | 85% | 0.154 | 46% | 69% | 23% |
| UFC Fight Night: Royval vs. Kape | 11 | 82% | 64% | 0.180 | 55% | 55% | 27% |
| UFC Fight Night: Sterling vs. Zalal | 13 | 46% | 46% | 0.281 | 46% | 85% | 31% |
| UFC Fight Night: Strickland vs. Hernandez | 13 | 77% | 62% | 0.202 | 38% | 38% | 23% |
| UFC Fight Night: Tsarukyan vs. Hooker | 14 | 86% | 71% | 0.204 | 50% | 57% | 21% |

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
| Record/form | Useful but no longer the headline gap | The official as-of record baseline is 45% vs model 55% when they disagree. Current model has recent form, but no explicit W-L ratio feature. |
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
| Keep v0.2 current while validating more data | The corrected official as-of baseline is weaker than v0.2 on all-fight accuracy and Brier, and no v0.3 experiment has clearly improved both metrics. | Avoids promoting a noisy variant from one historical sample while preserving the current public model behavior. | Model improvement slows down until the next controlled validation pass. | Re-run this same report after additional completed-event validation or an out-of-sample holdout. | Winner accuracy and Brier against leakage-safe baselines. |
| Continue controlled record-prior experiments | As-of record still carries useful signal in some buckets, but the legacy 71% profile-record baseline is deprecated and should not be optimized against. | Find a conservative way to use record signal without turning the model into a simple record picker. | Could overvalue padded records or weak schedules. | Run diagnostic-only record-ratio and blend variants against the same corpus plus a holdout before promotion. | Brier, winner accuracy, and same/similar-record bucket performance. |
| Test mid-confidence probability shrinkage, especially 60-80% | The 60-70 and 70-80 buckets are overconfident while the 80%+ bucket is strong. | Improve Brier and calibration without flattening the best high-confidence calls. | May make useful 60-70 calls look too timid if applied too broadly. | Apply a diagnostic-only shrink to 60-80% outputs and compare calibration gap, Brier, and winner accuracy. | Brier score and calibration gap in 60-80% buckets. |
| Require stronger stat evidence for record-contrarian calls | Some contrarian calls remain weak even after replacing the legacy baseline with the official as-of baseline. | Keeps contrarian calls, but only when component agreement is broad enough. | Can turn the model into a record follower if threshold is too blunt. | Create a diagnostic-only rule: when the official as-of record baseline disagrees, require multiple components to favor the model side; compare misses saved vs wins lost. | Disagreement-segment accuracy and Brier. |
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
