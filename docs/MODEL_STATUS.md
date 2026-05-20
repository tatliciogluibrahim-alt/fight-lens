# Fight Lens - Model Status

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

The model is directionally promising but not proven. It now beats the leakage-safe as-of record baselines and the cold-start chronological Elo baseline on headline winner accuracy and Brier, but the corpus is still early and no v0.3 experiment has clearly improved both metrics. Keep v0.2 current, do not tune weights yet, and do not publish a model grade.

Calibration is mixed:
- 50-60%: 61% actual on n=135
- 60-70%: 61% actual on n=57
- 70-80%: 64% actual on n=28
- 80%+: 94% actual on n=33

The 60-80% buckets remain the main calibration concern. The simple Elo baseline is useful as a leakage-safe report, but it is cold-start limited on this 20-event window and should not become a model feature without a larger chronological sample or a validated seeding plan.

## Post-expansion QA checkpoint

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
