# v0.3 Opponent-Tier Candidate — Staged Evaluation

**Status: DORMANT. Measured, NOT shipped. Do not wire into the live model.**

> NAMING RECONCILIATION (2026-07-07): the id "v0.3" was overloaded. This document's
> "v0.3" is the DORMANT opponent-tier candidate below, which was never shipped. The
> CODE, however, shipped a DIFFERENT `outcome-v0.3` (a T=0.824 temperature
> recalibration) that appeared in no doc. That temperature recal is what the 14
> `outcome-v0.3` locked calls were made under, and it stays frozen so those calls
> reproduce. The live model is now `outcome-v0.4`, which turns the temperature OFF (the
> backtest showed it hurts calibration) and is documented in MODEL_STATUS.md /
> MODEL_EXPERIMENTS.md. The opponent-tier idea below remains dormant and unshipped; it is
> NOT part of v0.4. When a résumé-trajectory model is ready it should ship as v0.5+, not
> reuse the "v0.3" name.

The opponent-tier candidate below leaves every locked call unchanged. This is the
"scaffold -> backtest -> decide" gate the Priority-1 vNext item called for.

## What was built

- `lib/fight-shape-model/opponent-tier-adjustment.ts` — a dormant scaffold that folds the
  résumé-strength delta (`opponentQualityScore_A − opponentQualityScore_B`) into the v0.2 win
  probability via a logit nudge (`gain = 2.5`). Not imported anywhere in the live path.
- `scripts/backtest/v03-candidate-comparison.ts` — scores v0.2 vs the v0.3 candidate against the
  **real UFC Freedom 250 results**, and previews 329. Read-only.

## The result: naive opponent-tier weighting REGRESSES — do not ship

Scored against the 7 Freedom 250 outcomes:

| | Winner accuracy | Brier (lower better) |
|---|---|---|
| v0.2 (live) | **5/7** | **0.248** |
| v0.3 candidate | 4/7 | 0.254 |

Per-fight movement:

| Fight | v0.2 | v0.3 | Actual | Effect |
|---|---|---|---|---|
| Lopes/Garcia | Lopes 25 | Lopes 48 | Lopes | closer, but still sub-50 — **does not flip the miss** |
| O'Malley/Zahabi | 56 | 69 | O'Malley | ✓ better (less underconfident) |
| Ruffy/Chandler | Ruffy 58 | Ruffy 33 | Ruffy | ✗ **BREAKS** — flips a correct R1-KO call to wrong |
| Hokit/Lewis | 71 | 54 | Hokit | ✓ but badly over-corrected |
| Topuria, Pereira, Nickal | ~unchanged | ~unchanged | — | negligible (balanced résumés) |

## Why it breaks — the real lesson

`opponentQualityScore` measures **who a fighter has faced**, not **how good they are now**.

- **Lopes (73):** lost *competitively* to elite (Volkanovski ×2, Evloev) while ascending → résumé credit is deserved.
- **Chandler (83), Lewis (68):** carry elite *career* résumés but are **declining now** → a flat résumé delta wrongly credits them and flips/weakens correct calls against rising finishers (Ruffy, Hokit).

A single linear "résumé delta" term cannot separate *"lost competitively to elite while rising"*
from *"has an old elite résumé but is fading."* That distinction is the whole ballgame.

## What v0.3 actually needs (before any ship)

1. **Elite-loss discount, not flat résumé credit** — discount the *penalty* for losing to elite opposition (helps Lopes) WITHOUT crediting a high career-opponent average to a declining fighter (avoids the Chandler/Lewis trap).
2. **Recency / trajectory weighting** on opponent tier — a tough schedule 4 years ago ≠ a tough schedule now.
3. **Gate + tune** — only apply where the résumé gap is large AND the trajectory agrees; re-tune `gain` on the full historical corpus, not on 7 fights.
4. **Full backtest** on the 253-fight corpus with calibration buckets before any release decision.
5. Release, if ever, as `outcome-v0.3` for a **future** card — never retro-applied to logged calls.

## 329 preview (read-only, nothing changed)

At `gain=2.5`, v0.3 would flip four 329 calls (Sandhagen, Royval→Royval, Whittaker, Garbrandt).
Some look intuitively better (Royval over the unranked Kavanagh; Sandhagen, Whittaker the ranked
names) — but because the same candidate **regresses on the scored card**, those flips are not
trustworthy yet. The manual warning layer already flags these (e.g. Royval/Kavanagh carries a
model-warning), which is the correct, shippable way to surface the concern today.

## Bottom line

The staged evaluation did its job: it **prevented shipping a change that would have made the
model worse.** The opponent-tier idea is real and important, but the naive implementation is a
net negative. Keep `outcome-v0.2` live; the manual warning layer carries the opponent-tier
signal for UFC 329 in the meantime.
