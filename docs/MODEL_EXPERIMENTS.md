# Fight Lens - Baseline Validation and Model Experiments

## v0.4 model-defect fixes (2026-07-07) - controlled before/after

Scope: the five model-defect fixes from the heavy review. Every probability/method change is
gated behind `outcome-v0.4` so v0.1/v0.2/v0.3 locked calls reproduce exactly
(`npm run audit:drift` = 21 checked, 0 drifted). Corpus: 263 scored fights. Control = the
prior pinned v0.2 backtest.

Reproduce configs via env on `npm run backtest`:
`BACKTEST_VERSION=outcome-v0.2|outcome-v0.3|outcome-v0.4`, `BACKTEST_TEMP=<T>`,
`BACKTEST_NO_ASOF=1`, `BACKTEST_HOLDOUT=<substr>` / `--holdout <substr>`.

### Headline before/after

| Config | Winner acc | Method acc | Brier | Decision |
| --- | --- | --- | --- | --- |
| Control: v0.2 raw (as-of bug on) | 66% | 59% | 0.218 | baseline |
| v0.2 + as-of layoff fix (#3) | 66% | 59% | 0.218 | keep (correctness, metrics stable) |
| v0.3 shipped config (T=0.824, never measured) | 66% | 59% | 0.218 | reference |
| **v0.4 shipped (all fixes, temp off)** | **70%** | **59%** | **0.223** | **ship** |

### Fix #3 - as-of layoff (backtest correctness)

`monthsSinceLastFight` used `Date.now()`, so backtest fights got a fake layoff measured
against today. Threaded the fight date through `buildFightShapeModel(fight, { asOf })`. Isolated
effect on this corpus: none (66/59/0.218 unchanged) because the events are recent and few
fighters crossed a layoff boundary differently. Kept as a correctness fix (no regression). Live
app is unaffected: it omits `asOf` and keeps `Date.now()`, which is correct for an upcoming fight.

### Fix #4 - temperature / version reconciliation (calibration A/B)

Per-bucket calibration gap (|pred - actual|), smaller is better:

| Config | 60-70 gap | 70-80 gap | 80+ gap | Brier |
| --- | --- | --- | --- | --- |
| v0.2 raw | 2 | 1 | 7 | 0.218 |
| v0.3 T=0.824 (shipped, old math) | 4 | 7 | 5 | 0.218 |
| v0.4 temp OFF (T=1.0) | 0 | 1 | 2 | 0.223 |
| v0.4 + T=0.824 (sharpen) | 6 | 10 | 2 | 0.223 |
| v0.4 + T=1.1 (shrink) | 2 | 3 | 2 | 0.223 |
| v0.4 + T=1.2 (shrink more) | 4 | 5 | 3 | 0.223 |

Read: T=0.824 SHARPENS, and the model was already calibrated, so it inflates the 60-80% band
(blows the 70-80 gap out to 7-10). Temperature OFF gives the smallest gaps. Shrinkage (T>1)
does not beat off. Decision: retire temperature (v0.4). v0.3's temperature stays defined for its
14 locked calls; the overloaded "v0.3 = opponent-tier" naming is corrected (see
model-vnext-v03-candidate.md).

### Fix #2 - missing-data handling

Tested three variants for the phantom-average removal:

| Variant | Winner | Brier | 80%+ bucket (n / missing) | Note |
| --- | --- | --- | --- | --- |
| Weight-drop, present-weight denominator (SHIPPED) | 70% | 0.223 | 23 / 74% | best calibration |
| Zero-delta, full denominator (hard shrink) | 69% | 0.225 | 7 / 71% | underconfident |
| Denominator blend (lambda=0.5) | 70% | 0.223 | 16 / 75% | mild underconfidence |

All three improve winner accuracy (+3 to +4) by removing the spurious edge an imputed
league-average handed the fighter-with-data, and all three move Brier +0.005 to +0.007. The
+0.005 is ~0.3 of the Brier standard error on n=263 (noise), while winner accuracy and
calibration both improve, so the shipped weight-drop is a net improvement, not a regression.
The hard-shrink variants dropped the 80%+ bucket's missing-data share the most but made the
model underconfident (the thin-data 80%+ calls are 91% accurate - real mismatches, not
miscalibration), so they were rejected. The shipped fix keeps those calls but caps their
confidence label (read-strength penalty) rather than faking a shrink. The factor WEIGHTS were
not retuned.

### Fix #1 - matchup-aware method head

Method accuracy (coarse finish-vs-decision) held at 59% (= control). The submission-0 artifact
(13 of 35 locked calls, 0% submission) is eliminated: 0 hard-0 submissions in the 263-fight
backtest. Ambiguous top-method display ties (e.g. whittaker-krylov 42/42) are eliminated: 0
top-ties, via a deterministic largest-remainder rounding plus a documented tie-break
(larger unrounded float, then ko > sub > decision).

### Fix #5 - out-of-sample holdout

UFC 328 held out and scored standalone: winner 54% / method 54% / Brier 0.25 / n=13. Rest of
corpus (excl. 328): winner 70% / Brier 0.221. The 70% full-corpus headline is IN-SAMPLE; the
event whose fights the weights were visibly tuned on scores near coin-flip out-of-sample on a
small sample. Reported via `--holdout ufc-328` / `BACKTEST_HOLDOUT`.

---

# Fight Lens - Baseline Validation and Model Experiments (prior pass)

Generated: 2026-05-20T00:10:01.495Z

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

## Chronological Elo Baseline

Simple global Elo is leakage-safe here: every fighter starts at 1500, ratings are read before each fight, then updated only after the result.

Ledger: 253 scored fights sorted by fightDate ascending -> eventName -> normalized event fights array order -> fightId. Limitation: Exact intra-event bout chronology is not separately available; fight order uses the normalized event fights array. Fighters appear once per event in this corpus, so same-day ordering does not affect future-event ratings.

| K | Picked | No-pick | Coverage | Pick acc | All-fight acc | Brier |
| --- | --- | --- | --- | --- | --- | --- |
| 24 | 60 | 193 | 24% | 58% | 14% | 0.249 |
| 32 | 60 | 193 | 24% | 58% | 14% | 0.249 |
| 40 | 60 | 193 | 24% | 58% | 14% | 0.249 |

Default K=32 comparison: v0.2 66% accuracy / Brier 0.219; official as-of record 63% picked / 58% all-fight / Brier 0.235; Elo 58% picked / 14% all-fight / Brier 0.249.

Agreement at K=32: model and Elo agree on 44 picked fights, disagree on 16; Elo correct/model wrong 6; model correct/Elo wrong 10; both correct 29; both wrong 15; Elo no-pick 193.

Recommendation: D. needs larger sample. The simple Elo baseline has too many cold-start/no-pick fights on this corpus to treat as stable. Keep it as a tracked baseline and revisit after more chronological history is available.

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
