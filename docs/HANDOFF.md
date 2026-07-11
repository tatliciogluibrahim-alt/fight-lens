# Fight Lens — Session Handoff

Last updated: 2026-07-07. Written to resume cleanly in a fresh session.

## Where things stand

The heavy-review pass is **shipped, committed, and live**.

- Committed to `main` (`1285ea1`, 87 files), pushed to GitHub, deployed to Vercel.
- Live: **https://fight-lens.vercel.app** (verified serving the new build).
- Ship gate was green: `npm run lint` (0 warnings), `npm run typecheck`, `npm test` (42/42),
  `npm run build` (50 static pages), `npm run audit:predictions` (36/36), `npm run backtest` (0 drift).
- Full change list is in `docs/CHANGELOG.md` under the July 2026 entry.

## What shipped (summary)

- **P0:** fixed the `/record` calibration display bug (50–60% band showed 25% vs a true 75%),
  locked by a regression test in `tests/accuracy-calculator.test.ts`.
- **Model → `outcome-v0.4`:** matchup-aware method head (submission-0 artifact gone), missing-data
  weight-drop + confidence penalty, temperature recal retired, backtest layoff as-of fix, out-of-sample
  holdout added. Winner accuracy 66% → 70%. All 35 locked v0.1–v0.3 calls reproduce exactly
  (`npm run audit:drift` = 0 drifted). See `docs/MODEL_STATUS.md` / `docs/MODEL_EXPERIMENTS.md`.
- **Cancelled bouts:** `PredictionRecord.cancelled` state; `osbourne-durden` marked cancelled
  (Osbourne withdrew). Excluded from accuracy, the live card, and the public count; shown as a
  cancelled notice. Forward-only.
- **Anti-AI copy + design:** em dashes 163 → 0 (user-facing), "pick-em" removed, semicolons,
  manufactured contrast, filler fixed; accent-token drift aligned, `--subtle` raised to WCAG AA,
  sportsbook glows removed, `--font-geist-*` renamed to honest tokens.
- **Infra:** headless UFCStats ingester (`npm run ingest:ufcstats:headless`, solves the JS
  anti-bot challenge), first test suite (vitest), `apply-results` pre-flight guard,
  `assertSourcedEvent` at the data boundary, dependency hygiene.
- **Data:** UFC Vegas 119 outcomes scored (append-only). Public record: 33 calls logged,
  22 resolved, 77% winner accuracy.

## Open work (nothing started)

### 1. Five deferred design calls (need Ibrahim's eye — do not blind-edit)
- The repeated feature-surface treatment (gradient + top accent hairline + mono kicker) applied
  across ~7 core blocks — decide which 1–2 stay "hero" per screen.
- The trailing-period headline scaffold (mono kicker → lowercase headline with a period), repeated
  4+ times per fight page.
- Home `/` first-paint hero height (the model-lean artifact sits one scroll down).
- The mobile radar's "manual input" flag on the opponent-quality axis (desktop improved; mobile omits it).
- A full per-fight `sourceMix` provenance strip (data is captured in normalized events but not rendered).

### 2. Two model watch-items
- The 5 factor weights were **not** retuned. They were hand-tuned by inspecting the corpus
  (in-sample). A proper fix is a holdout-based fit; the holdout tooling exists (`--holdout` /
  `BACKTEST_HOLDOUT`). UFC 328 out-of-sample is 54% vs 70% in-sample.
- A per-fighter `submissionProbability` stat can still read 0% for a fighter with no recent
  submission wins (a factual per-fighter stat, distinct from the fixed matchup method lean).

### 3. UFC 329 card refresh (blocked on nothing now — ingester is built)
- The real card grew to **14 bouts**; our normalized data has 11. Missing bouts:
  Green vs. McKinney, Gandra vs. Reese, Basharat vs. Garza.
- Osbourne (cancelled) was replaced by **Costa vs. Durden** — not yet in our data.
- Refresh path: `npm run ingest:ufcstats:headless -- --event-url <ufc-329 url>` →
  `npm run normalize:data` → `npx tsx scripts/audit/lock-event.ts ufc-329` (append-only; it skips
  fights with a recorded outcome and never fabricates a number for insufficient-data fights).

## Resume checklist
1. `git status` should be clean (all shipped work is on `main`).
2. Read `docs/CHANGELOG.md` (July 2026) and this file.
3. Live model is v0.4; the next card locked gets v0.4. Never re-lock UFC 329 (forward-only).
4. Pick up open work above.
