# Model vNext — Calibration Plan After UFC Freedom 250

This is a **planning + scaffolding document**. It does NOT change the live model
(`outcome-v0.2`). The locked UFC Freedom 250 predictions stand exactly as logged; this card
is the evidence base for the next model version. Nothing here is implemented as math yet —
several items start as **manual context flags** (already in the app) before becoming model inputs.

## What the card exposed

Raw model: **5/7 winner**, **6/7 finish bucket**. Two misses, both instructive:

- **Topuria/Gaethje (miss):** model + manual layer + market all leaned Topuria. Nobody flagged Gaethje. Mileage was read as *decline* when it was *war-tested durability*.
- **Lopes/Garcia (raw miss, warning correct):** the raw model favored Garcia 75%; the warning layer flagged the opponent-tier trap pre-fight. The clearest proof the warning layer earns its place.

## Priority 1 — Opponent-tier weighting (highest priority)

**Problem:** `opponentQualityScore` feeds only the radar's OPPOSITION axis; it has **zero weight in win probability**. So the model over-penalized Lopes for elite-opposition losses (Volkanovski ×2, Evloev) and over-rewarded Garcia's cleaner aggregate form vs a thinner résumé.

**Action (scaffolding):**
- Weight career stats by opponent tier before they enter the outcome model.
- Add an **elite-loss discount** (a loss to a champion/top-3 is a weaker negative than a loss to unranked).
- Add an **elite-competitive-performance credit**.
- Separate raw aggregate record from opponent-adjusted performance.

**Candidate fields:** `opponentTierAdjustedScore`, `eliteLossDiscount`, `elitePerformanceCredit`, `resumeStrength`, `rankingMismatchFlag`.

> Do not wire complex math blindly. Build the adjusted-stat scaffold + a fresh backtest first; only then fold into the probability blend as `outcome-v0.3`.

## Priority 2 — Style-specific loss correction

**Problem:** O'Malley's losses (to Merab's wrestling-pressure archetype) were over-applied against Zahabi, who does not bring that style.

**Action:** classify recent losses by **opponent archetype** (wrestling-pressure / range striker / pocket brawler / low-volume power HW / grappling specialist / attrition fighter) and compare to the next opponent's archetype.

**Candidate field:** `recentLossArchetypeSimilarity: "low" | "medium" | "high"`.

## Priority 3 — Age / mileage split (two-way, not one-directional)

**Problem:** age/mileage **helped** with Chandler (decline) but **misled** with Gaethje (durability). One-directional "decline" framing is wrong.

**Action:** split the single age/mileage idea into directional sub-signals (start as **manual context flags**, not math):
- `athletic_decline_risk`
- `durability_decline_risk`
- `veteran_composure_credit`
- `attrition_durability_credit`
- `recovery_under_damage`
- `late_fight_experience`

## Priority 4 — Small-sample discount (confidence, not direction)

**Problem:** Hokit and Nickal validated the model side; the small-sample caution was right to lower *certainty* but should not have flipped direction.

**Action:** a `sampleSizeConfidenceMultiplier` that widens the confidence range without moving the lean. (The app already widens the displayed band via the manual confidence floor — formalize it in the model.)

## Priority 5 — Separate scoring dimensions (already shipped in the receipt layer)

Winner correctness, finish-bucket correctness, exact-method, and fight-shape are now scored
**separately** (see `PostFightReceipt`). A wrong winner with a correct finish bucket (Lopes,
Topuria) is no longer conflated with a method win.

## Priority 6 — Warning-layer scoring (already shipped)

The warning layer is scored **separately from raw model accuracy** so a correct contrarian
warning (Lopes/Garcia) reads as product credibility, not as inflated model accuracy. Grades:
`correct_warning` / `missed_warning` / `not_applicable`.

## vNext signal index (collected from the receipts)

`attrition_durability`, `veteran_recovery`, `damage_absorption_context`, `late_damage_compounding`,
`division_change`, `weight_translation`, `natural_division_experience`, `five_round_division_experience`,
`style_specific_loss_correction`, `opponent_archetype_similarity`, `finish_upside_from_range_advantage`,
`small_sample_discount`, `performance_validation`, `heavyweight_power_tail_risk`, `prospect_sample`,
`skill_expansion`, `wrestling_to_damage_transition`, `age_mileage`, `recent_form_decay`,
`durability_decline`, `early_burst_tail_risk`, `name_value_overweighting`, `opponent_tier_weighting`,
`ranking_mismatch`, `elite_loss_context`, `resume_strength`, `aggregate_stat_distortion`,
`manual_warning_success`.

## Sequencing

1. Build opponent-tier-adjusted stat scaffold (no probability change yet).
2. Re-run the historical backtest with the adjustment; compare to the current as-of baseline.
3. Only if it improves calibration without overfitting → release as `outcome-v0.3` for the **next** card (never retro-applied to logged calls).
