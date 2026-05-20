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
- Frontend visual + copy polish (6 passes): sticky tab bar, events index, FightReadSnapshot, 2-column homepage hero, shape narrative system, CSS motion system, cinematic fighter hero, "What the shape says" cards, axis breakdown with Δ delta.

---

## Open tickets

### P0 — Manual device QA (mobile + reduced motion)

**Goal:** Verify that animations disable correctly on iOS Safari with Reduce Motion on, and that the overlay radar doesn't clip labels at narrow viewports.

**Files to check:**
- `app/globals.css` — `@media (prefers-reduced-motion: reduce)` block (should zero out all `fl-animate-*`, `fl-radar-bloom`, `fl-tab-panel` durations)
- `components/StyleRadar.tsx` — `LABEL_RADIUS=148`, `SIZE=360`; test at 375 px (iPhone SE)
- `components/FightPageTabs.tsx` — tab panel `fl-tab-panel` slide should not fire when `prefers-reduced-motion` is active

**Acceptance criteria:**
- All `fl-animate-fade-up` elements appear instantly (no fade) under Reduce Motion.
- Radar polygon draws without animation; data dots appear static.
- Axis label text is not cropped at 375 px viewport width (may need `LABEL_RADIUS` tuned down to ~135 or text truncated).
- Tab switching shows no slide transition under Reduce Motion.

**QA command:** Manual — no automated test for this today.

---

### P1 — Radar touch tooltips

**Goal:** Native SVG `<title>` elements don't fire on iOS/Android tap. Replace or supplement with a tap-friendly tooltip for axis data dots.

**Files:**
- `components/StyleRadar.tsx` — data dots have `<title>` children; these fire on desktop hover only.

**Approach options:**
1. Add `onPointerEnter`/`onPointerLeave` handlers on the `<circle>` and render a small absolutely-positioned `<div>` tooltip in React state.
2. Use a CSS-only `::after` trick on a wrapping `<foreignObject>` (fragile in SVG).
3. Option 1 is preferred — keeps the SVG pure and the tooltip styled with Tailwind.

**Constraints:** Do not change radar axis keys, score values, or the `getStyleRadarDimensions()` output. Purely a presentation layer change.

**Acceptance criteria:**
- Tapping a data dot on mobile shows the axis label + score for 2 seconds then auto-dismisses.
- Desktop hover still works (existing `<title>` can stay as a fallback or be removed).

---

### P1 — FightReadSnapshot sticky scroll

**Goal:** Pin the FightReadSnapshot strip above the tab bar when the user scrolls past the fighter hero, so the model call is always visible without switching tabs.

**Files:**
- `components/FightReadSnapshot.tsx`
- `app/events/[eventId]/[fightId]/page.tsx` — currently renders `<FightReadSnapshot>` above `<FightPageTabs>`

**Approach:** Add a scroll-listener (or IntersectionObserver on the hero section) that adds `position: sticky; top: 64px` to the snapshot strip once the hero scrolls out of view. Or: render a compact version inside the tab bar row (right side).

**Constraints:** `FightReadSnapshot` must continue reading only from `viewModel`. Do not add any independent prediction computation.

**Acceptance criteria:**
- Model call + win % is visible at all scroll positions on the fight page.
- Snapshot does not overlap the tab bar labels.
- Does not fire a re-render that causes a hydration mismatch.

---

### P2 — Data coverage expansion

**Goal:** Ingest additional completed UFC events to grow the backtest corpus beyond 253 fights and reduce the 40% missing-data rate.

**Scope:**
- Backend-only. No UI changes, no model tuning, no new public claims.
- Use `npm run ingest:ufcstats` + `npm run normalize:data` for each new event.
- Re-run `npm run backtest` after each event; verify missing-data rate trends down.
- Do not ingest events that have future fights (would introduce leakage risk).

**Constraints:**
- `opponentTotals` must remain intact after re-normalization.
- Do not change `lib/predictionThresholds.ts`, model formulas, or `lib/backtest/`.
- UFC 329 future rows must stay unscored.

**Acceptance criteria:**
- `npm run audit:predictions` 24/24 passes after ingestion.
- `npm run backtest` completes without new `future-date leakage` warnings.
- Missing-data rate ≤ 35% on the expanded corpus.

---

### P2 — Calibration diagnostics deep-dive

**Goal:** Understand why the 60–80% confidence buckets are overconfident (61–64% actual vs. 60–80% predicted).

**Files:**
- `lib/backtest/calibration.ts` — produces calibration bucket data
- `scripts/backtest/summary.ts` — prints bucket table
- `data/generated/backtests/` — calibration output JSON

**Approach:**
- Break the 60–80% bucket into 60–65%, 65–70%, 70–75%, 75–80% sub-buckets.
- Check if the overconfidence is concentrated in one weight class, fight type (title vs. non-title), or era.
- No model changes yet — diagnosis only.

**Acceptance criteria:**
- A written report in `docs/MODEL_EXPERIMENTS.md` identifying which sub-bucket and fight-type segments drive the most overconfidence.
- No model weights or thresholds changed.

---

### P3 — Elo seeding / cold-start experiment

**Goal:** Reduce the Elo baseline's 24% pick coverage (76% no-picks due to cold-start) by testing a warm-start seeding strategy.

**Files:**
- `scripts/backtest/elo-baseline.ts`
- `data/generated/backtests/elo-baseline.json`
- `data/generated/backtests/elo-summary.json`

**Constraints:** Backend-only. Do not promote Elo to the production model. Do not touch `lib/fight-shape-model/` or any locked predictions.

**Acceptance criteria:**
- A new seeding strategy (e.g., seed from UFC win percentage) raises coverage to ≥ 60% without lowering pick accuracy below 55%.
- Documented in `docs/MODEL_EXPERIMENTS.md`.
- No change to production outputs.

---

## Guardrails for all future work

- Preserve `opponentTotals`.
- Preserve `predictionViewModel` — all prediction display must route through `buildPredictionViewModelBundle`.
- Keep public Model Record separate from historical backtest.
- Keep locked public calls pinned.
- Keep "Too close to call" behavior below 52%.
- Keep public language conservative: signal-based forecast, not a guarantee.
- Do not use betting language (lock, odds, parlay, wager, unit, guaranteed, best bet, pick).
- Do not use forbidden UI phrases: "matchup stress", "pressure point", "style-pressure read", "Limited pressure signal".
- No model weight or formula tuning without a controlled before/after experiment and validation.
- No public model grade until enough logged public calls exist.
