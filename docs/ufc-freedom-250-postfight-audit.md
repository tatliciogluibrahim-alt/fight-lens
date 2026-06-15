# UFC Freedom 250 — Post-Fight Audit

**Event:** UFC Freedom 250: Topuria vs. Gaethje — June 14, 2026, South Lawn of the White House, Washington, DC (Paramount+).
**Recorded:** 2026-06-15 (morning after).
**Status:** Winner / method-bucket / round recorded. Exact stoppage **times** and **UFCStats totals** are NOT yet transcribed — flagged for human review.

## Verification status

Results below were provided by the product owner from the live card and recorded as the official
result layer. **Live web/UFCStats scraping was not performed in this pass** — the events are
treated as the owner-supplied source of truth, with exact wording and stats left for human QA.
Do not treat any stat as official until confirmed against UFCStats.

| QA item | Status |
|---|---|
| Winner per fight | recorded (owner-provided) — confirm vs UFC.com / UFCStats |
| Method **bucket** (KO/TKO / SUB / DEC) | recorded — confirm exact wording |
| Round | recorded — confirm |
| Exact stoppage **time** | **blank — needs human UFCStats review** |
| UFCStats **totals** (sig strikes, control, KD, TD…) | **placeholder — `data/postfight/ufc-freedom-250/ufcstats-raw.json` is `needs_human_ufcstats_review`** |

## Source links (for human confirmation)

- UFC official: https://www.ufc.com/event/ufc-freedom-250
- UFCStats: https://www.ufcstats.com/ (locate the UFC Freedom 250 event page; confirm exact ticker)
- ESPN: https://www.espn.com/mma/fightcenter/_/id/600058854/league/ufc
- CBS Sports: https://www.cbssports.com/ufc/news/ufc-white-house-fight-card-date-odds-ilia-topuria-justin-gaethje-alex-pereira/
- Media / play-by-play: MMA Fighting / Uncrowned / MMA Mania (narrative only)

## Official results recorded

| Fight | Winner | Method (bucket) | Round | Pre-fight call | Winner | Finish bucket |
|---|---|---|---|---|---|---|
| Topuria vs Gaethje | **Gaethje** | TKO (corner stoppage) | 4 | Topuria 65% | ✗ miss | ✓ |
| Pereira vs Gane | **Gane** | TKO (punches) | 2 | Gane 60% | ✓ | ✓ |
| O'Malley vs Zahabi | **O'Malley** | TKO (punches) | 2 | O'Malley 56% (DEC lean) | ✓ | ✗ method miss |
| Hokit vs Lewis | **Hokit** | TKO (punches) | 2 | Hokit 71% | ✓ | ✓ |
| Ruffy vs Chandler | **Ruffy** | KO/TKO | 1 | Ruffy 58% | ✓ | ✓ |
| Nickal vs Daukaus | **Nickal** | TKO (punches) | 1 | Nickal 63% | ✓ | ✓ |
| Lopes vs Garcia | **Lopes** | KO/TKO (punches) | 2 | Garcia 75% | ✗ miss | ✓ |

**Computed totals (from locked predictions + recorded outcomes):** winner calls **5/7**, finish buckets **6/7**.

## Discrepancies / remaining human QA

1. **Stoppage times** are blank for all 7 — fill from UFCStats.
2. **Ruffy/Chandler method wording** (`needs_source_review`): "KO" vs "TKO" vs spinning-attack sequence — confirm exact official wording. Bucket (KO/TKO) is unaffected.
3. **All UFCStats totals** are placeholders — no stat numbers have been entered anywhere in the app. `statSummary` on each receipt renders "official stats pending review" until filled.
4. **Topuria/Gaethje corner stoppage** — confirm whether the official record times it at end of R4 or start of R5.
5. **Outdoor environment** — no fight-altering weather delay was assumed. If sources confirm heat/footing effects, they are event-level context only (already noted in `environmentNote`), never a model input.

## Data artifacts

- `data/postfight/ufc-freedom-250/results.json` — recorded results (source of truth for outcomes).
- `data/postfight/ufc-freedom-250/ufcstats-raw.json` — stats placeholder, `needs_human_ufcstats_review`.
- `data/postfight/ufc-freedom-250/media-notes.json` — narrative notes (context only).
- `data/predictions/*.json` — `outcome` appended (prediction blocks untouched), via `scripts/postfight/apply-results.mjs` (append-only).
