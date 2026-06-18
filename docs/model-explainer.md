# Fight Lens — How the Model Works (self-contained explainer)

A faithful description of the live prediction model (`outcome-v0.2`), written so an outside
reviewer with no repo access can critique it. All formulas are exactly as implemented.

## 0. One-paragraph summary

Fight Lens predicts UFC fights from **public UFCStats career averages** (strikes landed/absorbed
per minute, striking accuracy/defense, takedown average/accuracy/defense, submission average,
control time) plus one **manual 0–100 "opponent quality" score** per fighter. It derives an
8-axis "style fingerprint" per fighter, computes an opponent-aware "style pressure" score and a
recency-weighted "form" score, then blends **five factor-deltas** through a **logistic function**
into a single win probability. Method (KO/TKO vs SUB vs DEC) is a separate, simpler last-5-fights
profile. A manual transparency layer (confidence labels, blind-spot flags, market notes, warnings)
wraps the number but **never changes it**. It is a hand-tuned heuristic model, not a learned/fit
statistical model.

## 1. Inputs & provenance

Per fighter, from UFCStats:
- `slpm` — significant strikes landed per minute
- `sapm` — significant strikes absorbed per minute
- `strikingAccuracy`, `strikingDefense` (%)
- `takedownAverage` (per 15 min), `takedownAccuracy` (%), `takedownDefense` (%)
- `submissionAverage` (per 15 min), `control` time, last-5 fight history (result, method, duration)
- **`opponentQualityScore`** — a MANUAL 0–100 résumé-strength score authored per fighter (the only non-UFCStats model input). **Critical: it feeds only the radar's OPPOSITION axis. It has ZERO weight in the win probability.**

Defensive stats (sapm, striking defense, takedown defense) are pulled from prior bouts' opponent
totals where available; otherwise a UFC-average fallback is used. Coverage is partial.

## 2. The 8 style-fingerprint axes (per fighter, 0–100)

Each is clamped to 0–100. `slpm, sapm, tdAvg, tdAcc, tdDef, strDef, subAvg` are career rates.

| Axis (UI label) | Formula |
|---|---|
| OUTPUT (`strikingVolume`) | `(slpm / 7) * 100` |
| STRIKE DEFENSE (`strikingDefense`) | `strDef*0.7 + max(0, 100 - sapm*14)*0.3` |
| WRESTLING (`wrestlingOffense`) | `min(100, (tdAvg/6)*100)*0.65 + tdAcc*0.35` |
| TD DEFENSE (`takedownDefense`) | `tdDef` (raw) |
| CONTROL (`controlThreat`) | `min(100,(tdAvg/6)*100)*0.72 + min(100,(subAvg/2.5)*100)*0.28` |
| SUBMISSION (`submissionThreat`) | `(subAvg/2.5)*100` |
| CARDIO (`cardioConsistency`) | `(100 - min(100, sapm*12))*0.35 + strDef*0.25 + min(100, slpm*10)*0.40` |
| OPPOSITION (`opponentQuality`) | the manual 0–100 score (or "missing") |

These axes power the radar chart and feed the two derived metrics below.

## 3. Derived metric A — Style Pressure Index (SPI), opponent-aware, 0–100

Computed for fighter X *against the specific opponent Y* (uses Y's defenses):

```
wrestlingOffense' = weightedAvg(
    normalize(tdAvg, 0..6)        × 0.34,
    tdAccuracy                    × 0.18,
    normalize(recentControl,0..360)×0.30,   # control seconds per 15 min, recent
    normalize(subAvg, 0..2.5)     × 0.18 )
wrestlingStress   = wrestlingOffense' × 0.72 + (100 - Y.takedownDefense) × 0.28

strikingOffense   = weightedAvg(
    normalize(slpm, 1..7)         × 0.52,
    strikingAccuracy              × 0.24,
    normalize(Y.sapm, 1.5..6)     × 0.24 )   # how hittable Y is
strikingStress    = strikingOffense × 0.68 + (100 - Y.strikingDefense) × 0.32

SPI = max(wrestlingStress, strikingStress) × 0.68 + avg(wrestlingStress, strikingStress) × 0.32
```

Intuition: "how much offensive pressure can X impose given Y's defensive holes." Takes the
fighter's stronger avenue (max) and tempers with the average.

## 4. Derived metric B — "Opponent-Quality-Adjusted Form" (recency-weighted, 0–100)

> Naming caveat: despite the name, **opponent tier is NOT used here** (the code comment says so).
> It is purely recency-weighted recent results + a layoff penalty.

Per fight in the last 5:
```
score = 50;  win → 62;  loss → 38
+8 win by finish, +4 win by decision, −8 loss by finish, −3 loss by decision
+2 win lasting ≥900s, −3 loss inside ≤300s ; clamp 0..100
```
Recency weights over last 5: `[1.0, 0.88, 0.76, 0.64, 0.52]` (weighted average).
Layoff shrinkage: if months since last fight > 6, `factor = max(0.50, exp(-0.008*(months-6)))`,
then `form = 50 + (raw - 50) * factor` (pulls stale records toward the 50 prior).

## 5. The outcome model (win probability) — `outcome-v0.2`

Five factor-deltas (A minus B), each weighted, combined and squashed by a logistic. Missing
stats use defaults: `slpm=3.5, strDef=50%, sapm=3.5, tdAvg=1, tdAcc=40%, tdDef=60%`.

| # | Factor | Delta | Weight |
|---|---|---|---|
| 1 | Style Pressure Index | `(SPI_A − SPI_B)/100` | 0.25 |
| 2 | Form | `(form_A − form_B)/100` | 0.20 |
| 3 | Striking net | `landed_A = slpm_A*(1−strDef_B)`, `landed_B = slpm_B*(1−strDef_A)`; `clamp((landed_A−landed_B)/3, −1, 1)` | 0.25 |
| 4 | Grappling net | `grap_A = tdAvg_A*tdAcc_A*(1−tdDef_B)`, sym.; `clamp((grap_A−grap_B)/2.5, −1, 1)` | 0.16 |
| 5 | Absorption (chin) | `clamp((sapm_B − sapm_A)/4, −1, 1)` (lower absorption = edge) | 0.14 |

```
rawDelta  = Σ(weight_i × delta_i) / Σ(active weight_i)
winProbA  = 1 / (1 + exp(−3.5 × rawDelta))      # logistic, gain k = 3.5
winProbB  = 1 − winProbA
```

If SPI or form can't be computed, that factor's weight drops to 0 and a data warning is attached.
Logistic reference points: rawDelta 0.25 → ~72%, 0.15 → ~65%, 0.05 → ~54%. **This compresses
outputs to roughly the 25–75% band by construction** — the model essentially cannot say "85%."

## 6. Method / finish model (separate, simpler)

From each fighter's last-5 **wins**: `finishRate = finishes/wins`, `koRate`, `subRate`
(fallback to UFC average: 37% finish, of which 55% KO / 45% sub, when no recent wins).
```
overallFinish = winProbA*finishRate_A + winProbB*finishRate_B   # win-prob-weighted blend
ko, sub       = (raw ko/sub shares) normalized to sum to overallFinish
decision      = 100 − ko − sub
```

## 7. Post-processing & display rules

- **52% named-call threshold (immutable):** if `max(probA, probB) < 52`, the fight is shown as
  "too close to call" — no named winner, and it's excluded from named-call accuracy.
- **Read strength:** from top probability + internal confidence → `strong` (≥70 / high conf),
  `usable` (≥60 / medium), `thin` (else).
- **Confidence range:** a band drawn around the pick with half-width `strong ±5, usable ±9,
  thin ±13` percentage points. **Explicitly a heuristic "model range," NOT a statistical
  confidence interval.**
- **Manual confidence floor:** a manually-authored caution label can only *widen* the displayed
  band; it never narrows it and never changes the probability.

## 8. Scoring / accountability

- **Winner accuracy** — % of named calls where the favorite won (too-close fights excluded).
- **Method accuracy** — top predicted bucket vs actual.
- **Brier score** — `((p_winner − 1)² + (p_loser − 0)²) / 2`, averaged. 0 = perfect, 0.25 = always 50/50.
- **Calibration buckets** — 50–60 / 60–70 / 70–80 / 80%+ (predicted vs actual hit rate).
- **Grade A–F** from winner accuracy + Brier, but UI-gated until 30 scored fights.
- Locked pre-fight predictions are append-only (an `outcome` is added after the fight; the
  prediction is never edited). Public logged calls are kept strictly separate from retroactive
  backtest reconstructions.

Current observed performance: ~66% winner / Brier ~0.219 on a 253-fight retroactive backtest;
75% winner / Brier 0.23 on the 20 publicly-logged scored calls (small sample).

## 9. The manual transparency layer (wraps the model, never changes it)

- **Context notes / blind-spot flags** — age, layoff, weight cut, division change, short notice,
  small sample, style mismatch, opponent-tier mismatch. Labeled "not in model."
- **Model-sanity layer** — a per-fight confidence label (Strong … Data caution), data flags,
  a one-line "sharpest insight," an analyst-check direction (back / fade / underconfident…),
  optional market context, and a visible "model warning" banner.
- **Ranking-mismatch auto-detector** — fires when the model's named call lands on the
  lower-ranked fighter by a margin (the failure mode that flipped on Lopes/Garcia).
- **Post-fight receipts** — winner / finish-bucket / warning-layer scored separately; correctness
  is computed from the locked prediction + recorded outcome, so the receipt can't misreport.

None of this alters the win probability. It is transparency *around* a frozen number.

## 10. Known limitations / where to scrutinize (the useful part for review)

1. **`opponentQualityScore` has zero weight in the win probability** — only the radar uses it. A
   v0.3 candidate that folds it in was built and measured against real results: it **regressed**
   (5/7 → 4/7 winner, Brier 0.248 → 0.254) because a flat résumé delta wrongly credits fighters
   with *old elite résumés who are now declining* (e.g., it flipped a correct R1-KO call). It was
   rejected, not shipped. Opponent tier needs an *elite-loss discount + trajectory weighting*,
   not a flat score.
2. **Output compression** — logistic gain k=3.5 over normalized, bounded deltas keeps outputs in
   ~25–75%. The model is structurally underconfident vs markets that price 85%+ favorites.
3. **Feature overlap / double counting** — Factor 1 (SPI) already encodes striking + wrestling
   output derived from `slpm/sapm/td*`; Factors 3/4/5 re-use the same underlying rates. The
   inputs are correlated, not orthogonal, so the effective independent signal is less than the
   five weights imply.
4. **Shallow form** — last-5 result scores + layoff shrinkage only; no strength-of-schedule, no
   meaningful method/quality-of-opposition adjustment beyond ±8.
5. **Unmodeled entirely (manual-only):** age, accumulated damage / durability trajectory, weight
   cuts, walk-in size, division change, short-notice, camp/coaching/injury news, and
   style-archetype interactions (e.g., pressure-wrestler vs hittable striker as an interaction
   term). The model has no interaction terms at all.
6. **Method lean is coarse** — last-5 wins only, tiny sample, UFC-average fallback.
7. **Partial defensive-stat coverage** — UFC-average fallbacks for sapm / striking defense /
   takedown defense inject regression-to-the-mean noise where opponent totals are missing.
8. **Hand-tuned, not fit** — every weight (0.25/0.20/0.25/0.16/0.14), every normalization divisor
   (/3, /2.5, /4, and the min–max ranges), and the logistic gain k=3.5 are author-chosen, not
   learned from data. No regularization, no cross-validation of weights.
9. **No explicit uncertainty** — the "confidence range" is a fixed-width heuristic by read-strength
   tier, not propagated from data sparsity.

## 11. Good questions to ask another model

- Are the five factors too correlated to justify additive weighting? Would a learned logistic
  regression / gradient-boosted model on the same features beat the hand-tuned weights?
- Is the ~25–75% compression a feature (honesty) or a miscalibration (it loses real edges)?
- What's the right way to make `opponentQualityScore` matter without the declining-elite trap?
- Is last-5 recency weighting `[1, .88, .76, .64, .52]` reasonable, or should it decay by time
  rather than fight count?
- Given ~66% winner / Brier 0.219 on n=253, is this beating a sensible baseline (e.g., "pick the
  higher-ranked / higher-output fighter"), and by how much?
