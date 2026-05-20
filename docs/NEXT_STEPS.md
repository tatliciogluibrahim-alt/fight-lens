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

Keep v0.2 current and continue backend-only validation/calibration work.

Scope:
- No UI changes.
- No public claims.
- No ingestion expansion unless a specific data gap is identified.
- No model weight or formula changes without a controlled before/after experiment.
- Use leakage-safe as-of record baselines as the official comparison set.
- Keep the deprecated 71% profile-record baseline labeled as reference only.
- Review why the 60-80% confidence buckets are overconfident.
- Validate any record-prior or shrinkage experiment out of sample before promotion.
- Keep `ode-osbourne-alibi-idiris` skipped unless source data changes to a scoreable directional outcome.

## Recommendation

Do not tune weights yet. The old 71% better-record comparison was leakage-prone and is now deprecated. Current v0.2 beats the official leakage-safe as-of record baselines on winner accuracy and Brier, but this is still early validation. The next useful move is controlled backend calibration/validation, not UI work and not a public model-grade update.

## Guardrails for future work

- Preserve `opponentTotals`.
- Preserve `predictionViewModel`.
- Keep public Model Record separate from historical backtest.
- Keep locked public calls pinned.
- Keep "Too close to call" behavior below 52%.
- Keep public language conservative: signal-based forecast, not a guarantee.
