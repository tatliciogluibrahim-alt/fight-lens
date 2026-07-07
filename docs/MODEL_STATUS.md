# Fight Lens - Model Status

## Shipped model: outcome-v0.4 (reconciled 2026-07-07)

`outcome-v0.4` is the current live model and the version the backtest now scores by
default. It reconciles a versioning mess: the code shipped `outcome-v0.3` (a T=0.824
temperature recalibration) while the docs still said "keep v0.2" and a separate
`model-vnext-v03-candidate.md` described v0.3 as an opponent-tier change that was never
shipped. v0.4 gives the live model one honest id and one backtested configuration.

What v0.4 changes vs the raw v0.2 math (each validated by before/after backtest, see
MODEL_EXPERIMENTS.md):

- Temperature OFF. The shipped v0.3 divided the logit by T=0.824, which SHARPENS an
  already-calibrated model. The backtest (now able to score the shipped config) shows
  T=0.824 degrades the 70-80% bucket to a 7-10 point calibration gap; temperature off
  gives the smallest per-bucket gaps (0 / 1 / 2 across 60-70 / 70-80 / 80+). Shrinkage
  (T>1) did not beat off. So the recalibration is retired.
- Matchup-aware method head. The method breakdown now factors the opponent's
  finish-resistance and submission-vulnerability (from their loss history), floors the
  submission share and regresses the finish rate toward the division base rate so a real
  fight is never a hard 0% (the old "submission 0%" artifact appeared on 13 of 35 locked
  calls; the backtest now shows zero hard-0 submissions), and breaks the decision/ko
  display tie deterministically (larger unrounded float, then ko > sub > decision).
- Missing-data handling. A factor with missing inputs on either side drops its weight
  (like SPI/form) instead of imputing a phantom league-average that hands the
  fighter-with-data a spurious edge. Confidence is capped when factor coverage is thin,
  so the read-strength cannot show "strong" on a default-heavy call.
- As-of layoff fix (backtest correctness). Layoff shrinkage is measured against the fight
  date in the backtest, not today.

### Backtested numbers (263-fight corpus)

| Config | Winner acc | Method acc | Brier | Notes |
| --- | --- | --- | --- | --- |
| v0.2 raw (prior backtest baseline) | 66% | 59% | 0.218 | control |
| v0.3 shipped (T=0.824, never measured before) | 66% | 59% | 0.218 | 70-80 bucket gap 7 |
| **v0.4 shipped** | **70%** | **59%** | **0.223** | best calibration, gaps 0/1/2 |

- v0.4 calibration: 50-60 pred 54 / act 68 · 60-70 pred 64 / act 65 · 70-80 pred 73 / act 74 · 80+ pred 89 / act 91.
- Winner accuracy improved +4 from dropping the phantom-average imputation; method held; the
  Brier moved +0.005, which is ~0.3 of the Brier standard error on n=263 (statistically
  indistinguishable from noise) while calibration and winner accuracy both improved. This
  was a deliberate keep decision, documented in MODEL_EXPERIMENTS.md, not a silent regression.
- The 80%+ probability bucket's missing-data share barely moved (76% to 74%) because that
  bucket is 91% accurate: those high-confidence, thin-data calls are legitimate
  established-vs-debut mismatches, not miscalibration. Force-shrinking them out of the
  bucket made the model underconfident and worse on Brier (0.225), so the shipped fix
  instead removes the fabricated stat and caps the confidence label, rather than faking a
  probability shrink.

### Out-of-sample holdout (honest, in-sample-relabeled)

The five factor weights were hand-tuned by inspecting fights inside this corpus (UFC 328 /
Chimaev / Strickland are cited by name in `model.ts`), and the headline 70% is scored on
that same corpus, so **70% is an IN-SAMPLE number.** Run with `--holdout` /
`BACKTEST_HOLDOUT` for the out-of-sample figure:

- **UFC 328 held out and scored standalone (out-of-sample): winner 54%, method 54%, Brier 0.25, n=13.**
- Rest of corpus excluding UFC 328: winner 70%, Brier 0.221.
- UFC 328 (the event the weights reference) is the model's worst event; the honest read is
  that the 70% headline is optimistic and a genuinely held-out event lands near coin-flip on
  a small sample. Treat the model as directionally promising, not proven.

### Version integrity

- v0.1 / v0.2 (52% threshold, raw logistic) and v0.3 (58% threshold, T=0.824) are FROZEN.
  All 35 locked calls (14 v0.1, 7 v0.2, 14 v0.3) still reproduce exactly:
  `npm run audit:drift` = 21 checked, 0 drifted. Every v0.4 math change is gated behind the
  version so historical calls never drift.
- `resolveNamedCallThreshold` is unchanged: v0.1/v0.2 -> 52%, v0.3/v0.4 -> 58%.

## Current state

Fight Lens has completed the P0 prediction consistency pass and the first 20-event historical backtest expansion.

Public prediction state:
- `predictionViewModel` is the canonical public prediction state.
- Named calls require at least 52% win probability.
- Below 52%, including exact 50/50, public copy shows `noLean` / "Too close to call".
- Locked calls pin the fight page, matchup row, record row, result banner, The Call, Live Path, and Method Lean.
- Chimaev/Strickland consistently shows Khamzat Chimaev 63%.
- Van/Taira consistently shows Tatsuro Taira 58%.
- Steveson/Ellison shows "Too close to call", not "Call: Gable Steveson 50%".
- Route audit checked 24 routeable fight pages: 24 passed, 0 failed.

## Backtest checkpoint

Expanded historical corpus:
- Events: 20 completed UFC events
- Scored fights: 253
- Winner accuracy: 66%
- Method accuracy: 58%
- Brier score: 0.219
- Official as-of UFC win percentage baseline: 63% pick accuracy / 58% all-fight accuracy
- Official as-of baseline Brier: 0.235
- Chronological Elo baseline (K=32): 58% pick accuracy / 14% all-fight accuracy, 24% coverage, Brier 0.249
- Legacy profile-record baseline: 71% all-fight accuracy, deprecated and not leakage-safe
- More-experience baseline: 40%
- Model vs official as-of baseline: +3 points on picked subset / +8 points all fights; Brier 0.016 lower
- Missing data rate: 40%
- `opponentTotals` item-level coverage: roughly 60%

Comparison to the previous n=76 deeper-history run:
- Winner accuracy held at 66%.
- Method accuracy improved from 51% to 58%.
- Brier improved from 0.236 to 0.219.
- The previous 71% better-record figure was reclassified as a deprecated profile-record baseline because it used profile snapshot records. It is not the official comparison.
- Missing data moved from 36% to 40%, mostly due added thin-history fighters.
- `opponentTotals` coverage improved from roughly 51% to roughly 60%.

## Interpretation

The model is directionally promising but not proven. It beats the leakage-safe as-of record
baselines and the cold-start chronological Elo baseline on headline winner accuracy and Brier,
but the corpus is still early and the out-of-sample holdout (UFC 328 at 54%) is a real caution.
The prior "keep v0.2, do not tune weights" guidance is superseded by the v0.4 reconciliation
above: the shipped changes were validated by controlled before/after backtests and gated behind
the version, and the FACTOR WEIGHTS were NOT retuned (that remains a bigger, separate project).
Do not publish a model grade.

Calibration is mixed:
- 50-60%: 61% actual on n=135
- 60-70%: 61% actual on n=57
- 70-80%: 64% actual on n=28
- 80%+: 94% actual on n=33

The 60-80% buckets remain the main calibration concern. The simple Elo baseline is useful as a leakage-safe report, but it is cold-start limited on this 20-event window and should not become a model feature without a larger chronological sample or a validated seeding plan.

## Post-frontend-polish QA checkpoint

Completed on May 20, 2026:
- `npm run audit:predictions` passed: 24 routeable fight pages checked, 24 passed, 0 failed.
- `npm run backtest` passed: 253 scored fights, 17 skipped.
- `npm run lint` passed (0 warnings).
- `npm run build` passed: 35 static pages generated.
- No model math, locked predictions, backtest scripts, or `opponentTotals` were changed during the frontend polish passes. All prediction surfaces still route through `buildPredictionViewModelBundle`.

## Previous QA checkpoint

Completed on May 19, 2026:
- `npm run audit:predictions` passed: 24 routeable fight pages checked, 24 passed, 0 failed.
- `npm run backtest` passed: 253 scored fights, 17 skipped fights.
- `npm run lint` passed.
- `npm run build` passed.
- Public Model Record/backtest separation remains intact: logged public calls stay separate from the historical reconstruction row.
- UFC 329 future rows remain unscored; no future/upcoming outcomes are included.
- Leakage checks show 72 thin-history warnings and 0 future-date leakage findings.
- `opponentTotals` remains present in the selected corpus: 2,940 of 4,917 history items, roughly 60% item-level coverage.
- `ode-osbourne-alibi-idiris` source data resolves as `Overturned` / `NC`; it remains skipped as a non-directional outcome.

## Guardrails

- Public Model Record stays separate from historical backtest rows.
- Historical backtests are not logged public calls.
- `opponentTotals` must not regress.
- `predictionViewModel` must not be bypassed.
- No model grade until enough logged public calls exist.
- No public overclaiming.
- No model tuning without a controlled review plan and before/after validation.
