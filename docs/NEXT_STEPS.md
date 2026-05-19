# Fight Lens - Next Steps

## Completed

- P0 prediction consistency pass completed.
- `predictionViewModel` is canonical for public prediction state.
- 52% named-call threshold is active.
- Locked calls pin public prediction surfaces.
- Public Model Record and historical backtest remain separated.
- Historical backtest expanded to 20 completed UFC events and 253 scored fights.
- Post-expansion QA checkpoint passed: audit, backtest, lint, and build are green.
- `ode-osbourne-alibi-idiris` resolves as `Overturned` / `NC` in source data and remains skipped as non-directional.

## Immediate next step

Run a backend-only model review and controlled calibration analysis.

Scope:
- No UI changes.
- No public claims.
- No ingestion expansion unless a specific data gap is identified.
- No model weight or formula changes during diagnosis.
- Compare model misses against the better-record baseline, especially where the model is confidently wrong.
- Segment thin-history fights from established-history fights.
- Review why the 60-80% confidence buckets are overconfident.
- Keep `ode-osbourne-alibi-idiris` skipped unless source data changes to a scoreable directional outcome.

## Recommendation

Do not tune weights yet. The expanded corpus is large enough to show that the current model is directionally useful, but it trails the better-record baseline by 5 points. The next useful move is controlled calibration/model review, not UI work and not a public model-grade update.

## Guardrails for future work

- Preserve `opponentTotals`.
- Preserve `predictionViewModel`.
- Keep public Model Record separate from historical backtest.
- Keep locked public calls pinned.
- Keep "Too close to call" behavior below 52%.
- Keep public language conservative: signal-based forecast, not a guarantee.
