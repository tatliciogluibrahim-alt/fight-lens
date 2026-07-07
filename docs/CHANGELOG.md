# Fight Lens — Changelog

## July 2026

### Heavy review pass — shipped the laundry list

A six-lens review (design, copy, ux, model, data provenance, code health) with adversarial verification, then implemented across parallel workstreams. Full ship gate green: lint 0 warnings, typecheck clean, 42/42 tests, build 50 static pages, audit 36/36 routes, backtest 0 drift.

**Trust surface (P0/P1):**
- **Fixed the calibration display bug.** `computeCalibration` called `getNamedCallSide` without the versioned threshold, so legacy 52–58% calls sat in the bucket denominator but could never be counted correct. The 50–60% band on `/record` was showing 25% actual when the true figure is 75%. Now passes `resolveNamedCallThreshold(r.modelVersion)`, matching the other call sites. Locked by a regression test that fails if the arg is ever dropped again.
- **`/record` historical validation now reads the real backtest** (70% winner across 263 fights, Brier 0.223, from `summary.json`) instead of a lone 1-fight reconstruction shown as 100%. Added a small-sample honesty caveat on the live named-call accuracy (22 scored, not yet distinguishable from backing the favorite). Removed the hardcoded `outcome-v0.2` version stamps in favor of the computed version label.
- **Deleted the stale `app/events/ufc-328/` route tree** (and its two orphaned components). The flagship card is now served by the dynamic `[eventId]` tree with the full mobile layout and receipt modules, not a divergent desktop-only copy.

**Cancelled bouts (Ode Osbourne withdrawal):**
- Added a `cancelled` state to `PredictionRecord`. Marked `osbourne-durden` cancelled (Osbourne withdrew, re-booked as Costa vs. Durden, which the model has not read). Forward-only: the logged call stays in the record marked cancelled, but a cancelled bout never resolves, so it is excluded from accuracy, dropped from the live card, and removed from the public "calls logged" count (33, not 34). A shared link to it lands on an honest cancelled notice instead of a stale pre-fight call.

**Model (all gated behind new `outcome-v0.4`; 35 locked v0.1–v0.3 calls reproduce exactly, `audit:drift` 0 drifted):**
- **Method head is matchup-aware** now (opponent finish-resistance + submission vulnerability), with a submission floor and a deterministic tie-break. The "submission 0%" artifact went from 13/35 to 0 hard-zeros; ambiguous top-method ties went to 0.
- **Missing features drop the factor weight** instead of imputing a phantom league-average, plus a real confidence penalty on thin-data calls. Winner accuracy 66% → 70%.
- **Retired the temperature recalibration** (T=0.824 sharpened the already-overconfident 60–80% band, the wrong direction). Reconciled the overloaded "v0.3" naming; docs updated.
- **Fixed the backtest layoff bug** (used wall-clock `Date.now()` instead of the fight's as-of date).
- **Added an out-of-sample holdout** (`--holdout`). UFC 328, the event whose fights the weights were visibly tuned on, scores 54% out-of-sample vs 70% in-sample. The 70% headline is now labeled in-sample.

**Anti-AI copy + design:**
- Em dashes removed from every user-facing string across app, components, lib, and the data layer (163 → 0). Fixed "pick-em" betting parlance on the UFC 329 card, prose semicolons, manufactured-contrast headlines, and filler ("unlock"/"leverage"). Fixed The Call showing "Holloway 61%" next to a 63% model call. Reconciled the "Pressure Point" doc contradiction and deleted the dead `pressurePoints` field.
- Aligned the drifted hardcoded accent literals to the `--accent` token, raised `--subtle` to clear WCAG AA, removed the three sportsbook-adjacent accent glows, renamed the misleading `--font-geist-*` tokens to honest `--font-sans`/`--font-mono`, and fixed the rust/gold/amber drift between the design doc and the shipped ice-blue accent.

**Provenance + infrastructure:**
- Un-gated the methodology provenance labels (mock/manual/sourced/derived) from debug mode. Added a "card data as of" freshness line with a staleness caveat, a branded 404, and a pending-outcome placeholder that names where the receipt lands.
- **Headless-browser ingester** (`npm run ingest:ufcstats:headless`) that solves the UFCStats JS anti-bot challenge via Playwright, unblocking card refreshes (validated 14 real UFC 329 rows). Added the first test suite (vitest), a pre-flight guard on `apply-results` (loud fail on a mistyped fight id, with an `--allow-missing` escape hatch), `assertSourcedEvent` at the data boundary, a country-flag miss warning, and dependency hygiene (removed dead `dom-to-image-more`, moved `cheerio` to devDependencies).

**Deliberately deferred (need your eye, not a blind change):** the repeated feature-surface treatment across core blocks, the trailing-period headline scaffold, the home first-paint hero height, the mobile radar's manual-input flag, and the full per-fight `sourceMix` strip.

---

### UFC Vegas 119 outcomes scored (append-only)

Recorded official results for UFC Fight Night: Kape vs. Horiguchi (June 20, 2026) onto the three locked pre-fight calls. Append-only: only the `outcome` block was written, no `prediction` block was touched.

- Sourced winner, method, round, and stoppage time from UFC.com's official results article, cross-checked against CBS Sports and MMA media. Written to `data/postfight/ufc-vegas-119/results.json`, applied via `scripts/postfight/apply-results.mjs` (dry-run first, then live). UFCStats stat totals remain `needs_stats_review`.
- Results: Kape def. Horiguchi (TKO R3, 2:42), Stirling def. Cutelaba (TKO R2, 3:23), Oliveira def. Fili (TKO R2, 4:56). The other two Vegas 119 bouts (Rodriguez/Amil, Baghdasaryan/Magomedov) were never locked calls and stay out of the record.
- Model scoring on these three: winner **2/3** (missed Kape, hit Stirling and Oliveira), method **0/3** — the method model called decision on all three and all three finished by TKO inside the distance.
- Public Model Record after this: 22 resolved named calls, 77% winner accuracy, 45% method accuracy, Brier 0.218. Grade stays hidden (gated at 30 scored calls; currently 22). The 50–60% confidence bucket now reads 3/11 (27%) — a low-confidence-band calibration concern flagged for review, not a display bug.

**Provenance:** `sourced` (winner/method/round/time from UFC.com). No model math, thresholds, or prediction values changed. Data-layer change only.

---

## May 2026

### Mobile UX + visual hierarchy pass

Focused mobile UX pass. No model math, prediction values, locked prediction files, backtest logic, public record calculations, or data files changed.

- **Bottom nav compressed** — reduced padding, inner pill height from 44px → 40px, icon from 0.95rem → 0.875rem, and body bottom padding from 6rem → 5.25rem. Stays above iOS minimum touch target. Nav feels lighter and less dominant.
- **Homepage hierarchy tightened** — `HomeEventSelector` (card discovery) hidden on mobile; replaced with a slim "Browse all cards →" link. Mobile flow is now: hero → featured card → record proof → browse link. Discovery lives on `/events`. Desktop keeps full selector.
- **Active card state strengthened** — selected event in `HomeEventSelector` gets `border-accent/55`, a subtle gradient background, an accent glow ring, and a top accent rail. Clearer without being loud.
- **Fight shape collapsed-first on mobile** — `StyleComparisonBars` now shows a compact summary card on mobile by default: axis edge count (e.g. "Topuria leads 5 of 7 axes"), biggest edge axis, and swing path. A toggle expands the full overlay radar + narrative cards. Desktop always shows full layout.
- **Radar rendering fixed** — removed `.every((d) => d.hasData)` check from `StyleRadar` and `OverlayRadar`. The polygon now renders for any fighter with ≥ 3 axes of data (gate was already correct via `hasEnoughStyleRadarData()`). Missing axes use 0 as a display-safe fallback; model math is untouched.
- **Amber color bug fixed** — `StyleRadar` fill and halo were using `rgba(245,158,11,...)` (amber/orange) instead of the design system's icy-blue `rgba(143,215,247,...)`. Corrected.
- **Shape insight copy improved** — `biggestEdgeBodyWeak` now reads "has the relative X edge, but both scores are low. Treat this as a thin style path." Previous language ("both profiles are limited there") was too model-internal.
- **Fight list hierarchy added** — mobile event card list now shows visual weight based on placement: first Main Card fight gets accent border + glow, other Main Card fights get a medium border, Prelims/Early Prelims get a compact rounded card. Desktop unchanged.
- **"live path" → "counter path"** — scenario title and lean description in `lib/fight-outcome-model/model.ts` updated. Comment in `types.ts` updated. All pre-fight scenario language now uses counter path / alternate path consistently.

**QA:** `npm run lint` 0 errors · `npm run build` passed · `npm run audit:predictions` 31/31 routes, 0 violations.

---

### Claude Design UI translation pass

UI implementation pass translating the provided Claude Design direction into the real Next.js app. No model math, prediction values, locked prediction files, generated prediction artifacts, public record scoring, backtest logic, ingestion, or normalized event data changed.

- Added a mobile bottom navigation shell with existing routes only: home (`/`), cards (`/events`), and record (`/record`). Desktop top navigation remains intact.
- Tightened the global visual system toward the reference: deeper app background, softer icy-blue accent treatment, and safe mobile bottom spacing so fixed nav does not trap content.
- Reworked the homepage hero into a stronger mobile-first product opener using “forecast the card / track the result” language, with no betting or unsupported live wording.
- Rebuilt homepage card discovery as compact selectable event cards with a clear active state and one primary card action, while keeping `/events` as the full browse route.
- Replaced visible “forecast live” language with “calls logged,” “forecast pending,” or “outcomes pending” depending on the real event state.
- Made mobile event fight lists feel more tappable by rendering separate mobile fight cards and adding clear forecast-pending labels when calls are unavailable.
- Updated fight-read copy from “live path” to “counter path” / “alternate path,” including no-lean copy that now says both paths remain viable.
- Made the mobile fight header more app-like with a compact versus layout while preserving all real fighter and prediction data.
- Made fight shape more compact and interactive: the existing real style-profile radar now supports fighter/both focus and tap-to-compare axis details. Shape copy still states it is not the winner forecast.
- Simplified `/record` so public named-call accuracy appears in one primary module, with historical validation separated as a smaller computed section.

**QA:** `npm run lint` passed · `npm run build` passed with 43/43 static pages · `npm run audit:predictions` hit the documented local `tsx` named-pipe EPERM issue · documented no-IPC loader audit passed 31/31 with 0 failures.

---

### UFC Freedom 250 sourced data + public prediction lock

Data, prediction, and QA pass. No model math, prediction thresholds, existing locked prediction values, public record scoring, backtest artifacts, `lib/predictionThresholds.ts`, or `opponentTotals` logic changed.

- Re-verified the official UFC Freedom 250 listing against `ufc.com/event/ufc-freedom-250` and `ufc.com/freedom250`; the official card still lists seven bouts on June 14, 2026 at the South Lawn of the White House in Washington, DC, streaming on Paramount+ at 8:00 PM EDT.
- Ingested the UFCStats upcoming event page `48544433372ecfa6`, all seven matchup-preview fight pages, all 14 fighter profiles, and 69 recent completed fight-detail pages for recent-history totals and round samples.
- Rebuilt `data/normalized/events/ufc-freedom-250.json` from the existing UFCStats normalizer with official UFC metadata overrides. All seven fights now have sourced profile stats, fight histories, last-five rows, round samples, derived style profiles, key edges, and UFCStats fight IDs.
- Added seven real pre-fight public prediction files from the existing production outcome model: `topuria-gaethje`, `pereira-gane`, `o-malley-zahabi`, `hokit-lewis`, `ruffy-chandler`, `nickal-daukaus`, and `lopes-garcia`. Every new prediction has `outcome: null`, `isBacktestReconstruction: false`, and probability/method totals summing to 100.
- Registered the Freedom 250 predictions in `lib/accuracy/index.ts`. Public Model Record now has 31 locked calls total: UFC 328 (13), UFC 329 (11), and UFC Freedom 250 (7). Historical backtest records remain separate.
- Removed Tale of the Tape rendering from desktop and mobile fight pages. The sourced `keyEdges` remain in normalized data for audits and future UI reuse.
- Extended `scripts/ingest/build-normalized-event.mjs` so event overrides can preserve official UFC metadata and official bout labels while still deriving fighter data from UFCStats.
- Full sweep confirmed UFC 326 and UFC 327 still have zero public prediction files, `opponentTotals` remains present on populated fight-history rows, and no public/backtest mixing was introduced.

**QA:** baseline lint/build/audit passed before edits · post-change audit passed 31/31 · final lint/build/audit passed · manual route checks passed for home, events, Freedom 250, all seven Freedom 250 fight routes, UFC 329, UFC 328 Chimaev/Strickland, record, and methodology.

---

### UFC Freedom 250 official card data + pending-state QA

Data and QA pass only. No model math, prediction thresholds, locked prediction values, public record scoring, backtest artifacts, or `opponentTotals` logic changed.

- Verified the current official UFC listing for UFC Freedom 250 and updated `data/normalized/events/ufc-freedom-250.json` with the official event metadata: June 14, 2026, South Lawn of the White House, Washington, DC, United States, Paramount+, 8:00 PM EDT.
- Added seven official fights as routeable pending matchups: Topuria vs. Gaethje, Pereira vs. Gane, O'Malley vs. Zahabi, Hokit vs. Lewis, Ruffy vs. Chandler, Nickal vs. Daukaus, and Lopes vs. Garcia.
- Kept all Freedom 250 model-input data intentionally pending: `aggregateStats: null`, `styleProfile: null`, empty `fightHistory`/`lastFive`, empty `keyEdges`, `paths: null`, empty `contextNotes`, and `roundModel.hasEnoughForTrend: false`.
- Added known UFCStats fighter IDs where they already existed in repo-normalized or generated UFCStats data, but did not copy old model inputs into the new event or create public calls.
- Created no Freedom 250 prediction files. Public Model Record remains locked public calls only; historical backtests remain separate.
- Adjusted `scripts/audit/predictions.ts` so the threshold guard allows deliberate `insufficientData`/pending route states while still failing named calls below the public threshold.
- Full sweep confirmed UFC 326 and UFC 327 still have zero public prediction files, UFC 328/329 prediction coverage is unchanged, and every existing swept `fightHistory` row still includes the `opponentTotals` property.

**QA:** lint passed · build passed with 43 static pages · package `audit:predictions` still hits local `tsx` named-pipe EPERM in this sandbox; the local no-IPC loader path passed 31/31 with 0 failures.

---

### Design implementation — confidence band, round momentum, tale of the tape

Three new visual components implemented from a Claude Design mockup. No model math, prediction values, locked predictions, backtest logic, or public record behavior changed. All data flows from existing `viewModel`, `fighter.roundModel`, and `fight.keyEdges`.

**New components:**

- `components/CallConfidenceBand.tsx` — Visual probability track replacing the plain text pick display in both mobile and desktop call cards. Shows predicted winner name + probability, a horizontal 0–100% track with gradient fill between model range bounds (derived from `readStrength`: strong ±5%, usable ±9%, thin ±13%), and a glowing vertical pin at the exact call. `noLean` state shows both fighters' probabilities side-by-side. Counter path card below the band.

- `components/RoundMomentumFlow.tsx` — SVG round-by-round momentum chart. Uses `fighter.roundModel.roundScores` (per-round historical performance scores, 0–100) to project how probability shifts across rounds if the fight plays out as the model expects. Algorithm: `rawA = baseA × sigA, rawB = baseB × sigB`, normalize. Smooth bezier curves, area fills, per-checkpoint dots, end-value labels, and a round key grid below. Shows pending state when both fighters lack `hasEnoughForTrend`. Labeled "Projected from historical round data — not per-round predictions."

- `components/TaleOfTape.tsx` — Center-meeting dual-bar metrics comparison. Three-column layout: A value + bar grows left from center, center metric label, bar grows right + B value. Winning side on each metric gets accent bar + full foreground weight. Values ≥ 2 formatted as %, values < 2 as decimal. Only renders rows from `fight.keyEdges` where both fighters have sourced data.

**Integration:**
- `TheCall.tsx`: `CallConfidenceBand` added as first element of `module-body`, wrapped in accent-bordered gradient card with top edge rail
- `MobileFightRead.tsx`: `MobileCallCard` now uses `CallConfidenceBand`; `RoundMomentumFlow` added after scenarios; `TaleOfTape` added before shape accordion
- `app/events/[eventId]/[fightId]/page.tsx`: desktop call tab wraps `TheCall` + `RoundMomentumFlow`; shape tab wraps `TaleOfTape` + `StyleComparisonBars`

**QA:** lint 0 warnings · build 36/36 pages · audit 24/24 ✓

---

### Accuracy trust fixes + main event link reliability

No model math, prediction values, or backtest logic changed.

**findMainEventFight — silent link bug fix:**
- Added `findMainEventFight(event)` to `lib/events/registry.ts` with `lastName()` helper. Uses case-insensitive last-name matching against `event.event.mainEvent` (handles reversed fighter order). Falls back to `fights[0]` only when metadata is missing.
- Applied in: `EventHero.tsx` (CTA href), `app/page.tsx` `selectorOption()` and `Home()`. Fixes the case where "View main event read" linked to `fights[0]` when the labeled main event was a different fight.

**named-call accuracy label:**
- `components/ModelAccuracyCard.tsx`: hero stat label changed from `"call accuracy"` → `"named-call accuracy"`. Clarifies that "Too close to call" fights are excluded from the denominator. Labeling fix only.

**Computed backtest accuracy footer:**
- `app/record/page.tsx`: historical validation footer replaced hardcoded `"66% winner accuracy"` with value computed from `computeAccuracyMetrics(backtestReconstructions)`. Label changed from "full validation corpus" → "historical backtest corpus". Falls back to "accuracy pending outcomes" when no outcomes are resolved. Prevents the false visual confirmation created by the hardcoded number coincidentally matching the public record accuracy.
- Added `import { computeAccuracyMetrics } from "@/lib/accuracy/calculator"` to `record/page.tsx`.

**QA:** lint 0 warnings · build 36/36 pages · audit 24/24 ✓

---

### Mobile-first redesign + red team fixes

No model math, prediction values, locked predictions, backtest logic, or public record behavior changed.

**MobileFightRead — new mobile fight page:**
- New `components/MobileFightRead.tsx` renders the complete fight read on mobile (`sm:hidden`). Flow: matchup header → result banner (if scored) → model call → method lean → why/flip scenarios → contextual notes → shape accordion (collapsed by default) → model record proof.
- Large touch targets, no dense grids, no desktop sections squeezed into mobile.
- Hash anchors: `id="section-call"` and `id="section-shape"` with `scroll-mt-16` for deep links.
- Desktop layout completely unchanged — dual layout via `sm:hidden` / `hidden sm:block`.

**HomeEventSelector — pill toggle (replaces native select):**
- `components/HomeEventSelector.tsx`: removed `<label>` and `<select>`. Replaced with scrollable pill group (`overflow-x-auto`) matching the AppHeader nav pill aesthetic. Active pill uses `bg-surface-2`. Layout changed from two-column row to single-column (heading above, pills below).

**ContextualNotes — neutral color system:**
- Removed `toneFor()` function that returned success/wrong/neutral palette per `impactDirection`.
- All chips use uniform neutral styling (`CHIP` constant). Chip order swapped: confidence first (more meaningful), direction second (qualifier). Success/wrong palette reserved exclusively for scored outcomes.

**MobileCallCard visual fixes:**
- noLean state: both fighter names → `text-muted`, "too close to call" micro-label inserted, metadata `mt` reduced.
- Live path label: "counter path" (was "live path"). Copy: "what changes if the call flips" (was "if the fight shifts").
- Pending state suppressed on mobile — `MobileCallCard` pending → `id="section-call"` on a neutral border card (not accent).

**QA:** lint 0 warnings · build 36/36 pages · audit 24/24 ✓

---

### Product-level front-end sequencing overhaul

Focused UX implementation pass inspired by premium data-storytelling patterns. No model math, prediction values, locked predictions, fight data, scoring logic, backtest logic, ingestion, or generated backtest artifacts changed.

- Re-sequenced the homepage into a guided path: product hero, current-card module, compact public-record strip, compact event selector, then the secondary how-to guide.
- Tightened homepage event discovery so one selected event preview appears at a time. The selector remains the browse shortcut; `/events` remains the full event browser.
- Added compact mobile event-card rendering on `/events`: event name, date/status, main event, model status, and one Open card CTA without desktop-style crowding.
- Removed the remaining mobile left-origin probability rail from the fight call card. Mobile now leads with the model call and shows the live path as secondary context.
- Renamed the supporting call section to "why the model leans this way" and kept method bars proportional with thin dot states.
- Made the shape module feel more intentional by surfacing the plain-English shape takeaway below the radar and keeping the full axis breakdown collapsed.
- Reduced double-pending form clutter: if both adjusted-form scores are unavailable, details now show one compact note instead of two large pending boxes.
- Softened swing/shape copy so weak relative gaps read as possible swing areas or context, not strong weapons or confident flip paths.
- UFC Freedom 250 remains an upcoming shell before UFC 329 with event-level details only; no fake fights, predictions, percentages, or public calls were added.

**QA:** lint passed · build passed with 36 static pages · normal prediction audit hit the known local `tsx` named-pipe EPERM issue; the established loader workaround passed 24/24 with 0 failures. Static route output checked home, events, Freedom 250, UFC 329, two fight pages, and record.

---
### Event discovery, Freedom 250, and context-note guardrails

Focused mobile/product cleanup. No model math, prediction values, locked predictions, fight data stats, ingestion, backtest logic, generated backtest artifacts, or public record scoring changed.

- Replaced the homepage stacked event discovery with a compact selected-event chooser. The default selected event is UFC Freedom 250, with UFC 329 and UFC 328 available from the dropdown.
- Simplified the mobile homepage hero so it explains Fight Lens and sends users to the current card/record without repeating the selected-event preview.
- Populated UFC Freedom 250 with sourced event-level details: Topuria vs. Gaethje, June 14, 2026, South Lawn of the White House, Washington, DC, Paramount+, 8:00 PM ET, plus Pereira vs. Gane as a listed bout. No fake fights, calls, percentages, or fighter stats were added.
- Updated homepage and /events card copy to use "card building", "event details live", and "forecast opens when fight data is ready" instead of pending date/location/card language.
- Added a note-only contextual fight layer (`contextNotes`) with confidence, impact direction, and explicit "not included in model" / "manual context only" guardrails. It renders only when notes are present and does not affect predictions.
- Suppressed empty live-path/path-analysis cards when neither side has useful path data. Method lean bars in event rows now use proportional fills and thin dot states.
- Strengthened fight-shape narrative guardrails so weak relative edges are described as thin paths instead of strong advantages.

**QA:** lint passed · build passed with 36 static pages · normal prediction audit hit the known local `tsx` named-pipe EPERM issue; the established loader workaround passed 24/24 with 0 failures.

---
### Homepage, record, and event discovery stabilization

Focused mobile-first product cleanup. No model math, prediction values, fight data, ingestion, backtest logic, generated backtest artifacts, or public record scoring changed.

- Condensed the homepage Public Model Record module into a compact proof strip: 24 calls, 13 scored, 10 correct, 77% accuracy, plus a subtle accuracy bar.
- Cleaned the /record hero so 77% call accuracy and 10/13 scored calls lead the page, with 31% method read treated as secondary.
- Reworked homepage event discovery into a compact chooser: Next Card, Upcoming Card, Past Scored Card, and All Events.
- Updated /events to separate Next Card, Upcoming forecast cards, and Past Scored cards, including clean pending states.
- Added UFC Freedom 250 as an upcoming event shell (`ufc-freedom-250`) before UFC 329. It has no fake fights, predictions, percentages, or public calls.
- Added reusable subtle progress bars (`fl-bar-fill`) for public record accuracy and calibration, disabled under `prefers-reduced-motion`.

**QA:** lint passed · build passed with 36 static pages · prediction audit passed 24/24 via the local loader workaround after the normal `tsx` command hit the known named-pipe permission issue.

---

### Mobile-first redesign

True mobile-first experience across homepage, event list, and fight read. Desktop layout is completely preserved — no changes to any desktop rendering path, model math, prediction values, routes, or public record logic. All mobile layouts use `sm:hidden` / `hidden sm:block` dual-block pattern.

**New component — `components/MobileFightRead.tsx`:**
- Client component encapsulating the complete mobile fight intelligence experience.
- Six ordered sections, each a self-contained card in a `space-y-3.5` stack:
  1. **Matchup header** — Fighter A vs Fighter B, names in `text-accent` if called winner, weight class · rounds · card placement metadata.
  2. **Result banner** (when scored) — `FightResultBanner` wrapped in `rounded-2xl border border-line overflow-hidden`. Hidden when fight is not yet scored.
  3. **Model call card** — Gradient border card with top accent rail. Shows winner name + probability in large text (accent-colored). Probability split bar: last names above bar, `probA%` fill left-to-right, both probability numbers below. Pending state shows a quiet one-line note — no large placeholder.
  4. **Method lean** — "most likely finish" label, top method name in `text-xl`, proportional bar tracks for all three methods (same `METHOD_THIN = 8` logic as desktop). "directional only" note.
  5. **Scenarios (why/flip)** — Stacked scenario cards from `vm.scenarios`. `lean` card uses `border-accent/30 bg-accent/[0.06]`. `swing` uses `border-line-strong`. Other cards neutral. No section heading — labelled "why it leans · what flips it".
  6. **Shape accordion** — "fight shape" tap-to-expand. Collapsed by default with "Tap to expand — style edges" hint text. Expands inline to full `StyleComparisonBars` output. `+` / `−` toggle button.
  7. **Record proof** — Winner accuracy % and resolved call count in large `data-text`. "View full record →" link. Hidden if `resolvedCount === 0`.
- All prediction data reads from `PredictionViewModel` only — no independent computation.

**Fight page — `app/events/[eventId]/[fightId]/page.tsx`:**
- Added `getAccuracyMetrics` import from `@/lib/accuracy`.
- Added `MobileFightRead` import.
- Mobile block (`sm:hidden mt-5`): renders `MobileFightRead` with fight, fighters, viewModel, winnerAccuracy, resolvedCount.
- Desktop block (`hidden sm:block`): contains the existing fighter hero panel, `FightReadSnapshot`, and `FightPageTabs` — zero changes to desktop rendering.

**Event list — `components/EventHero.tsx`:**
- Mobile block (`sm:hidden`): compact `rounded-2xl border` card. Status chip, event name (`text-2xl`), date/location. Footer strip: "main event · tap a fight below to read the model call". No matchup question, no instruction paragraph, no "View main event read" CTA.
- Desktop block (`hidden sm:block`): existing full panel (promotion label, `text-5xl` name, date/location/bouts, main event highlight with matchup question, CTA, instruction line) — zero changes.
- Outer padding tightened on mobile: `py-5` instead of `py-6 md:py-10` (desktop breakpoint prefix preserved).

**Homepage — `app/page.tsx`:**
- Mobile hero (`sm:hidden`): single current-card block with gradient border, status chip, event name, date, main event matchup, model call (if named), full-width "Open card" CTA. Accuracy strip below: winner accuracy % + resolved count + "Record →" link.
- Desktop hero (`hidden sm:block`): existing two-column `lg:grid-cols-[1.08fr_0.92fr]` layout — zero changes.
- "How to use" 4-column grid: wrapped in `hidden sm:block` — hidden on mobile. The information is in the footer and `/methodology`.

**Files changed:** `components/MobileFightRead.tsx` (new), `app/events/[eventId]/[fightId]/page.tsx`, `components/EventHero.tsx`, `app/page.tsx`.

**Not changed:** model math, prediction values, locked predictions, fight data, backtest logic, generated artifacts, public Model Record scoring, ingestion scripts, desktop layouts, `lib/predictionViewModel.ts`, `lib/predictionThresholds.ts`, `lib/accuracy/`, all `data/` files.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

---

### Mobile UX pass — quick wins

Three targeted mobile improvements. Zero model math, prediction values, fight data, backtest logic, locked predictions, or ingestion changes.

**QW1 — Simplified mobile header (`components/AppHeader.tsx`):**
- Added `mobileVisible` property to each nav link entry.
- "how it works" set to `mobileVisible: false` — hidden on mobile via `hidden sm:flex`.
- Mobile nav now shows three pills only: Home · Events · Record. No label clipping on narrow screens.
- Methodology remains reachable via the footer link on all screen sizes (no change to `DisclaimerFooter.tsx`).

**QW2 — Mobile-first fight card (`components/FightCard.tsx`):**
- Full dual-layout rewrite: `sm:hidden` mobile block and `hidden sm:block` desktop block.
- Mobile layout: stacked fighter names with full text wrapping, no flags, no records/rankings. "vs" text is a micro label between names. Compact weight class · rounds · card placement metadata line.
- Prediction row (mobile): shows "call · Name Prob%" when a named call exists; shows `displayedCallLabel` when not.
- Method lean (mobile): one-line "KO / TKO lean" text, no bars (bars retained in desktop expand panel).
- Result chip (mobile): suppressed when `resultState === "pending"` — implied by context. Only appears when scored.
- CTA (mobile): full-width "View read" button (`w-full`), easy tap target.
- Desktop layout: previous side-by-side fighters with flags, records, VS + probability, expand (+) button, expandable breakdown panel — all preserved unchanged.

**QW3 — Suppress pending placeholder sections on mobile:**
- `components/PathsToVictory.tsx`: when `bothPending`, the entire `<section>` gets `hidden sm:block` — invisible on mobile. FightReadSnapshot already covers the pending state above the fold. When one side has no data, that individual `PathList` card gets `hidden sm:block` wrapper — desktop keeps both columns.
- `components/TheCall.tsx`: the "data pending" placeholder section gets `hidden sm:block` — on mobile it contributes nothing since FightReadSnapshot already shows the pending model call state.

**Files changed:** `components/AppHeader.tsx`, `components/FightCard.tsx`, `components/PathsToVictory.tsx`, `components/TheCall.tsx`.

**Docs updated:** `docs/CODEX_HANDOFF.md` — added two long-term P3 tickets: "True mobile fight-read mode" (compact accordion-based fight intelligence card) and "Event discovery system" (Events page as primary mobile entry point with grouped fights and simple filters).

**Not changed:** model math, prediction values, locked predictions, fight data, backtest logic, generated artifacts, public Model Record scoring, ingestion scripts, `lib/predictionViewModel.ts`, `lib/predictionThresholds.ts`, `lib/accuracy/`, all `data/` files.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

---

### Analysis hygiene pass

Content logic, hierarchy, and visualization cleanup. No model math, prediction values, fight data, backtest logic, locked predictions, ingestion, or audit scripts changed.

**Narrative guardrails — `lib/fight-shape-model/shape-narrative.ts`:**
- Added `DISPLAY_LEADER_FLOOR = 45`, `DISPLAY_DELTA_FLOOR = 6`, `DISPLAY_BOTH_FLOOR = 40` constants. These are purely presentational thresholds — they control what is surfaced as a meaningful narrative claim, not model output.
- Added `passesDisplayThreshold(row)` — returns false when: delta < 6, OR both fighters score < 40, OR leader's absolute score < 45.
- Swing card guardrail: underdog edge candidates now require the underdog's absolute score on that axis ≥ 45. Previously a wrestling score of 27 vs 21 (delta 6) would surface "X's wrestling could reshape the matchup" — now suppressed.
- Watching card guardrail: fallback "worth watching" card now requires `passesDisplayThreshold()` — suppressed if the axis score is too weak.
- Added `biggestEdgeBodyWeak()` — used when the biggest edge leader score < 45. Acknowledges the relative gap without implying a strong tactical signal.
- Added `overallWeak` flag — when the biggest edge itself has weak absolute signal, the headline now says "No reliable swing path surfaced from the shape map — treat as soft context only." instead of implying a real advantage.
- Updated `buildHeadline()` signature to accept `overallWeak`.

**Method lean visualization — `components/TheCall.tsx`:**
- Added `METHOD_THIN_THRESHOLD = 8` constant.
- Replaced plain text-row list with proportional bar tracks: each method row now has a `h-1.5` track with a fill whose width equals the percentage. KO/TKO at 80% fills 80% of the bar; Decision at 20% fills 20%.
- Top method bar: `bg-accent/65` (icy blue tint). Secondary bars: `bg-muted/35`.
- Thin methods (< 8%): replaced with a tiny dot marker (`h-1.5 w-1.5 rounded-full bg-subtle/30`) — never shows as a full-width bar, making the visual hierarchy immediately legible.
- Removed the `divide-y divide-line/40` row separator — replaced with `space-y-3` with a gap per row.

**Duplicate pending suppression — `components/PathsToVictory.tsx`:**
- Added `aNoPaths` / `bNoPaths` / `bothPending` detection.
- When both fighters have no curated paths AND no model signal: suppresses the empty path module rather than rendering large pending cards.
- When one side has data: still renders both `PathList` cards (pending card for the no-data side stays, but now uses compact `text-subtle` styling instead of large "Check back closer to the event" copy).
- Renamed the secondary path section to "alternate path." for named-call fights so it reads as context, not a second call.
- Role label changed from "live path" to "live route" to match the less-certain language in the spec.
- Section description updated: "What has to change for X to flip the read — this is not the model call." — explicitly reminds the reader this is not a second call.
- Module heading suppressed (`h2` hidden) when `bothPending`, so the section doesn't have a large header above a one-liner note.

**Files changed:** `lib/fight-shape-model/shape-narrative.ts`, `components/TheCall.tsx`, `components/PathsToVictory.tsx`.

**Not changed:** model math, prediction values, locked predictions, fight data, backtest logic, generated artifacts, public Model Record scoring, ingestion scripts, `lib/predictionViewModel.ts`, `lib/predictionThresholds.ts`, `lib/accuracy/`, all `data/` files.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

---

### Event discovery and mobile readability pass

Focused product pass across homepage, /events, event detail, and fight read pages. Zero model math, prediction values, fight data, backtest logic, locked predictions, or ingestion changes.

**Homepage (`app/page.tsx`):**
- Removed competing "View main event read" button from the hero featured event card. Now one dominant "Open card" CTA only. The hero card shows event name, status, date/location, main event matchup, and model call — no secondary fight-level links competing.

**Events page (`app/events/page.tsx`):**
- Rebuilt `EventCard` component: removed two-column `lg:grid-cols-[1.25fr_0.75fr]` layout that caused a cramped right-panel on mid-sizes.
- Removed "View read →" link from inside the main event panel — it was competing with "Open card".
- New design: single-column card with clean hierarchy: label + status → event name → date/location/count → main event matchup → one "Open card" CTA → quiet "See record" for past cards only.
- Past events now clearly use `text-2xl md:text-3xl` vs. current card `text-3xl md:text-4xl` for visual hierarchy.

**Event hero (`components/EventHero.tsx`):**
- Removed the two-column `lg:grid-cols-[1.45fr_0.75fr]` hero layout. Now a single card with all event info inline.
- Replaced three separate stat boxes (date, location, bouts) with a compact inline metadata line — less vertical bulk.
- Main event now shows inline within the same card with a horizontal separator, with the "View main event read" CTA aligned to the end on `sm+` and stacked below on mobile.
- Added a clear instruction line: "Choose a fight below — each read starts with the model call."

**Fight card (`components/FightCard.tsx`):**
- Replaced `md:grid-cols-[1fr_180px_1fr_auto]` collapsing grid with a mobile-first flex layout.
- Fighters are always side-by-side at every viewport width (no more 4-cell stack on mobile).
- VS centre is now a compact inline element with probability numbers below it — no full-width bordered box.
- "View read" button is `flex-1` on mobile (full-width tap target) and `flex-none` on sm+.
- Model call, method lean, and result chip remain in a compact meta row below the fighters.
- Removed `readStrengthLabel` helper and its display — sub-label helper copy removed per design rules.
- Expand (+) detail panel kept for method breakdown; still shows win probability cards and method lean bars.
- Result chip text simplified: "Model correct"/"Model incorrect" → "Correct"/"Incorrect" (saves horizontal space).

**Fight read snapshot (`components/FightReadSnapshot.tsx`):**
- Fixed mobile grid: was `sm:grid-cols-2` (2-col only at 640px+, 1-col single-stack on all narrower phones). Now `grid-cols-2` from all sizes.
- Model call: `col-span-2` (full width) at all sizes, `lg:col-span-2` at desktop.
- Method lean + live path: each `col-span-1` — side by side on mobile rather than stacked.
- "What breaks the call": `col-span-2` (full width) on mobile to prevent text clipping, `lg:col-span-1` on desktop.
- Result: 3 visual rows on mobile instead of 4 stacked cells.

**Files changed:** `app/page.tsx`, `app/events/page.tsx`, `components/EventHero.tsx`, `components/FightCard.tsx`, `components/FightReadSnapshot.tsx`.

**Not changed:** model math, prediction values, locked predictions, fight data, backtest logic, generated artifacts, public Model Record scoring, ingestion, audit scripts.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

---

### Color system pass — Midnight Signal palette

Replaced the amber/gold accent system with an icy-blue palette throughout. Zero model math, layout, or copy changes.

**Token changes (`app/globals.css` `:root`):**
- `--background`: `#0d1117` → `#070B12`
- `--surface`: `#141c27` → `#101925`
- `--surface-2`: `#1a2332` → `#172435`
- `--line`: `#1e2d40` → `#1D2B3D`
- `--line-strong`: `#2a3f59` → `#3A4D63`
- `--foreground`: `#e2e8f0` → `#EAF2FB`
- `--muted`: `#8b9ab4` → `#A8B7C8`
- `--subtle`: `#4e6180` → `#6F8197`
- `--accent`: `#f59e0b` → `#8FD7F7` (amber → ice blue)
- `--accent-soft`: amber 0.14 → icy 0.12
- `--success`: `#10b981` → `#34D399`
- `--success-soft`: updated rgba
- `--wrong`: `#ef4444` → `#F87171`
- `--wrong-soft`: updated rgba

**Hardcoded rgba amber values replaced (`app/globals.css`):**
- Body background radial gradient: amber 0.04 → icy 0.04
- `.status-pill.is-live` border-color: amber 0.35 → icy 0.35
- `.status-pill` background: old surface-2 rgba → new surface-2 rgba
- `.fl-hud-mark` border-color: amber 0.35 → icy 0.25
- `.lens-mark::before` box-shadow glow: amber 0.18 → icy 0.15
- `.radar-card::after` radial gradient: amber 0.035 → icy 0.025

**Propagation:** All Tailwind utilities (`text-accent`, `bg-accent`, `border-accent`, `text-success`, `text-wrong`, etc.) automatically inherit new values via CSS custom properties — no component changes required.

**Files changed:** `app/globals.css` only.

**Not changed:** model math, prediction values, locked predictions, fight data, backtest, component files, layout, copy.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

---

### Fight page consolidation pass

Six targeted fixes to eliminate repeated call content, dead helpers, and hero crowding. Zero model math or data changes.

**Fix 1+2+3 — FightReadSnapshot is the primary call display; TheCall is now "call detail."**
- Removed `ProbabilityBar` component from `TheCall` entirely. The large amber winner/probability card was a duplicate of what `FightReadSnapshot` already shows above the fold.
- Removed `ProbabilityBar` import from `TheCall.tsx`.
- Heading changed: "model call." → "call detail."
- Subcopy changed: "Win probability from shape, form, and stat differentials." → "Why the model leans this way, and what could flip it."
- For the "too close to call" state, a small neutral inline note shows both fighter probabilities instead of the full ProbabilityBar card.

**Fix 4 — Method lean: text-row list replaces faint bars**
- Replaced the `h-2` horizontal bar visualization with a clean divide-y text-row list.
- Each method gets one row: label (left) + percentage or "thin" (right).
- Top method row uses `font-medium text-foreground`; secondary rows use `text-muted`. No bars, no faint lines.
- No amber — method lean is never a winner signal.

**Fix 5 — Single fight shape section, no redundant style-edge box**
- Removed the standalone `styleEdgeText` box from `StyleComparisonBars` (was a one-liner repeating the biggest-edge insight card's same information).
- Removed all dead helper functions used only to build that box: `lastName`, `possessiveName`, `axisPhrase`, `buildShapeTakeaway`.
- Removed `shapeTakeaway`, `biggestEdge`, `styleEdgeText` variables.
- Removed `ShapeNarrative` type import (no longer needed after removing `buildShapeTakeaway`).
- Removed `modelOutput` and `styleClashLabel` from `StyleComparisonBarsProps` — both were in the interface but never used in the component body. Removed corresponding `FightShapeModelOutput` import.
- Updated both fight page call sites to no longer pass `modelOutput` to `StyleComparisonBars`.
- The section now reads: radar → insight cards (each adds distinct info) → collapsed axis breakdown.

**Fix 6 — Hero matchup card containment**
- Replaced the two-row metadata display (pill chips for rank/stance/record + separate physicals text for height/reach) with a single compact mono text line: `#3 · southpaw · 72-8-0 · 5'9" · 69" reach`.
- This gives the name a clearly isolated visual zone — one row below the name for ALL metadata, not two.
- No mid-word breaks (FighterNamePlate guarantees word-boundary-only splits).
- UFC-328 hero already used a similar single-line approach; both routes are now consistent.

**Files changed:** `components/TheCall.tsx`, `components/StyleComparisonBars.tsx`, `app/events/[eventId]/[fightId]/page.tsx`, `app/events/ufc-328/[fightId]/page.tsx`.

**Not changed:** model math, prediction values, locked predictions, fight data, ingestion, backtest logic, generated artifacts, public Model Record scoring. `ProbabilityBar.tsx` component file still exists and is not deleted.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

### Fight page cleanup pass (delete-first)

Removed UI clutter, consolidated duplicate sections, fixed fighter hero name rendering. Zero model math or data changes.

**Removed:**
- Visible "call / shape / details" tab nav row — `FightPageTabs` now renders all sections stacked on one scroll page. Hash anchors (`#section-call`, `#section-shape`, `#section-details`) preserved for deep links.
- `ReadStrengthChip` component and "Read strength · Usable read / Thin read" helper copy from `TheCall`.
- Read strength badge pill from `FightReadSnapshot` header.
- Footer disclaimer line from `FightReadSnapshot` (one disclaimer remains inside the shape section).
- `FightShapeSummary` from both fight page call panels — was a redundant second "fight shape." section. `StyleComparisonBars` is the single fight shape section.

**Fixed:**
- Fighter hero name on generic `[eventId]/[fightId]` route now uses `FighterNamePlate` (word-boundary-only line breaks). Was a raw `<h2>` with unconstrained flow. UFC-328 already used `FighterNamePlate`; both routes are now consistent.
- Method lean bars: `h-[3px]` → `h-2` (8 px). Non-top bar fill: `bg-muted/50` → `bg-muted/60`. Bars are now readable without using amber.

**Consolidated:**
- Fight page is now one scroll page: fighter hero → snapshot → model call → method lean + scenarios → fight shape → details. No tab switching required.

**Files changed:** `components/FightPageTabs.tsx`, `components/FightReadSnapshot.tsx`, `components/TheCall.tsx`, `app/events/[eventId]/[fightId]/page.tsx`, `app/events/ufc-328/[fightId]/page.tsx`.

**Not changed:** Model math, prediction values, locked predictions, fight data, ingestion, backtest logic, generated artifacts, public Model Record scoring. `FightShapeSummary.tsx` file still exists; it is simply no longer rendered.

**QA:** lint 0 warnings · build 35 static pages · audit:predictions 24/24.

### Final pre-commit fight-page polish

- Reconfirmed fight-page tabs remain plain in-page anchor navigation with no sticky/fixed/blur/scrollspy behavior.
- Cleaned internal live-path language so visible fight-page text now uses reader-facing alternate-path copy.
- Simplified the shape tab hierarchy: fight shape intro, compact style edge card, neutral shape fingerprint radar, three insight cards, and collapsed full axis breakdown.
- Tightened details copy to "recent form" with opponent-quality context and kept details styling neutral.
- No model math, prediction values, fight data, ingestion, backtest logic, generated artifacts, or public scoring changed.

### Homepage and event discovery clarity pass

- Tightened the homepage start path around the current card: one primary Open UFC 329 action, Model Record as the secondary trust check, and lighter how-to steps.
- Updated the events directory current-card status to "forecast live" so the browser flow matches the homepage language.
- Simplified the event detail hero into a choose-a-fight entry point by keeping one main-event read CTA and removing early Full Call / Fight Shape CTA clutter.
- Kept fight-page tabs non-sticky and made no changes to model math, prediction values, fight data, ingestion, backtest logic, generated artifacts, or public scoring.
- Static build-output inspection verified the homepage, events directory, UFC 329 event page, UFC 329 main-event fight page, UFC 328 Chimaev/Strickland, record, and methodology route content.

### Non-sticky fight tabs stabilization verification

- Re-verified the fight-page tab row is normal in-page content after the hotfix: no sticky/fixed/blur/scrollIntoView behavior remains in the fight tab/page files.
- Static route checks confirmed home, events, UFC 329, UFC 329 main event anchors, UFC 328 Chimaev/Strickland anchors, record, and methodology still render expected navigation and section headings.
- Confirmed built fight-page HTML includes `section-call`, `section-shape`, and `section-details` plus simple tab anchor hrefs for Call, Shape, and Details.
- No model math, prediction values, fight data, locked calls, ingestion, backtest logic, generated artifacts, or public scoring changed.

### P0 non-sticky fight tabs hotfix

- Removed the remaining fight-page tab overlay behavior entirely: `FightPageTabs` is now plain in-page content, not sticky or fixed.
- Removed tab scrollspy, hash listeners, manual `scrollIntoView`, and sticky-aware offset logic from fight section navigation.
- Kept simple anchor links only: Call → `#section-call`, Shape → `#section-shape`, Details → `#section-details`.
- Section anchors remain on wrappers above the full section content with conservative scroll margin for the global site header only.
- Confirmed proof grep returns no sticky/fixed/backdrop-blur/IntersectionObserver/scrollIntoView behavior in fight tab/page files.
- No model math, prediction values, fight data, locked calls, ingestion, backtest logic, generated artifacts, or public scoring changed.

### P0 section navigation hotfix

- Reworked `FightPageTabs` from a panel swapper into in-page section navigation so `section-call`, `section-shape`, and `section-details` all exist as stable anchors in the rendered page.
- Moved section ids to wrappers above the visible content and switched landing behavior to CSS `scroll-margin`, avoiding fragile manual pixel scroll math.
- Cleaned the model-call Live Path helper copy to "Still live if the fight shifts."
- Updated the record accuracy headline from "building." to "record in progress." while keeping the 30-scored-fight grade unlock copy.
- No model math, prediction values, fight data, locked calls, ingestion, backtest logic, generated artifacts, or public scoring changed.

### Final P0 fight-read clarity QA

- Verified the fight-read flow across home, events, event detail, fight pages, record, and methodology through source and static build output.
- Confirmed `#section-call`, `#section-shape`, and `#section-details` use the shared `FightPageTabs` anchor-offset pattern.
- Neutralized the expandable event-row win probability and method bars so amber is not used as a generic chart/comparison color.
- Reconfirmed model-call hierarchy, Live Path labeling, neutral shape/radar treatment, collapsed axis breakdown, and public record/backtest separation labels.
- Remaining manual QA: browser/device hash landing and reduced-motion behavior should be spot-checked outside the Codex sandbox, where the local dev server can bind normally.

### P0 fight-read navigation clarity

- Made fight-page hash navigation use a single tab-owned anchor target for `#section-call`, `#section-shape`, and `#section-details`, with scroll offset applied after the active panel mounts.
- Simplified the model-call card by removing the duplicate footer call line and renaming the non-called side to "Live path".
- Reordered the shape tab so the heading, intro, neutral radar, plain-English takeaway, and three insight cards lead before the detailed axis breakdown.
- Collapsed the full axis breakdown behind a quiet details control so the radar no longer dominates the first shape view.
- Updated shape copy to avoid robotic "model call still lives above" phrasing. No model math, prediction values, locked calls, ingestion, backtest logic, generated data, or public Model Record scoring changed.

### P0 visual-system cleanup

- Replaced the fight-page model-call probability rail with a clearer call-first layout: called fighter, win probability, live path, read strength, and secondary method lean.
- Removed bright cyan/blue from radar and axis comparison visuals; shape now uses neutral off-white vs muted slate styling so it does not read like a winner forecast.
- Neutralized method/read-strength bar coloring so amber stays reserved for primary actions, selected UI, and the canonical model call.
- Tightened event discovery copy and restored past-card record links while keeping cards directory-like.
- Increased fight-page hash scroll offset and removed sticky tab blur so section titles remain visible on anchor navigation.
- No model math, prediction values, locked calls, ingestion, backtest logic, generated backtest data, or public Model Record scoring changed.

### P0 product UX consolidation

- Simplified the homepage hierarchy around one primary action: open UFC 329, with Model Record as the secondary path.
- Trimmed the next-card preview to the main event and model call; removed extra method/shape CTAs from the hero preview.
- Calmed event discovery cards by reducing metadata rows and keeping per-card CTAs focused on opening the card.
- Made the fight read snapshot put the model call first visually, with method, live path, and break condition as secondary details.
- Reframed the shape/radar section as an optional style map and moved generic fighter-A radar coloring away from amber so orange stays reserved for model call, primary action, and selected UI.
- No model math, prediction values, locked calls, ingestion, backtest logic, Elo, opponentTotals, or public Model Record scoring changed.

### P0 visual semantics QA

- Replaced the fight-page probability rail with a two-sided semantic rail: each fighter owns their side of the 50/50 axis, amber only highlights the named model call, and no-call states remain neutral.
- Corrected Lone'er Kavanagh's UFC 329 country marker from the stale Denmark override to England/UK in the manual override source and normalized event metadata used by the app.
- Re-verified hero name plates keep full-word line breaks only; no model math, prediction percentages, locked calls, backtest logic, ingestion, Elo, or public Model Record scoring changed.

### Frontend visual + copy polish (multi-pass)

Six successive UI/UX passes with zero model-math changes. All passes ran on top of the v0.2 prediction pipeline. QA commands (`audit:predictions`, `backtest`, `lint`, `build`) remained green throughout.

#### Fighter hero stabilization
- Repaired `FighterNamePlate` after live QA found names splitting inside words. Name normalization now preserves full words, each rendered line is `nowrap`, and the hero grid gives fighter columns more room with a narrower fixed VS column.
- Added `FighterNamePlate` for fight-page hero names. Hero names now reserve a consistent two-line plate and split names predictably, so short and long fighter names align without changing model data.
- Tightened fight-page tab hash behavior: `#section-call`, `#section-shape`, and `#section-details` activate the correct tab and scroll below the sticky header/tab stack.
- Reduced adjacent repetition in the fight snapshot and call tab by keeping method lean secondary while removing duplicate helper/disclaimer lines.
- Removed remaining public `pick/picked` wording from the Model Record accuracy card and methodology baseline note.
- No model math, prediction values, locked predictions, ingestion, backtest outputs, `opponentTotals`, or public Model Record behavior changed.

#### Visual/UX correction pass
- Sticky tab bar fixed at `top-16 z-20` — no longer scrolls away on mobile.
- Nav labels: "matchups" → "events", "model record" → "record", "methodology" → "how it works".
- Events link now routes to `/events` index (was hardcoded to `/events/ufc-329`).
- Event status chip added to EventHero (forecast live / result pending / scored).
- Style edge terminology: all "matchup stress", "pressure point", "style-pressure read", and "Limited pressure signal" variants removed from the UI. Replacement: "style edge".
- Method lean copy: label changed to "most likely finish type", added "directional only" badge.
- Fight-shape copy improvements: `publicSummary()` in model.ts now detects shared dominant-factor ties and differentiates by score gap; never names a winner.

#### QA pass
- Browser-verified 10 routes; found and fixed three remaining forbidden-language occurrences:
  - "creates matchup stress" in methodology `modelRows`.
  - `pressureLabel()` returning "Limited pressure signal" (renamed to "Limited style edge" across all four confidence levels).
  - "pressure points" in fight-shape output row on methodology page.

#### Visual level-up
- Created `app/events/page.tsx` — events index with featured current card and past cards list.
- Created `components/FightReadSnapshot.tsx` — at-a-glance strip between fighter hero and tabs showing model call, win %, read strength, method lean, live path, and what-breaks-the-call. Reads from canonical `viewModel` only.
- Homepage rebuilt as 2-column layout: manifesto left, live next-card preview panel right. Preview pulls the canonical `buildPredictionViewModelBundle` — no separate data compute.
- Shape tab radar given hero treatment with HUD corner marks.
- Methodology page rebuilt with 3-card scan grid (what it uses / what it doesn't know / how to read it).

#### Motion / cinematic pass
- Added CSS motion system to `app/globals.css`: `fl-animate-fade-up`, `fl-radar-bloom`, `fl-radar-centroid`, `fl-radar-dot`, `fl-tab-panel`, `fl-delay-{100-400}`.
- Global `@media (prefers-reduced-motion: reduce)` override disables all animations.
- Fighter hero panel: `cornerLabel` ("side · A"/"side · B"), accent rail above predicted winner's name, staggered entrance delays.
- VS centre uses gradient text, vertical accent rails flanking the panel.
- Radar polygon gets `fl-radar-bloom` animated draw-in on load.
- Tab panel uses `fl-tab-panel` slide-in on tab change via `key={active}` reset.
- Native SVG `<title>` on radar data dots for accessibility.

#### Shape copy / narrative pass
- Created `lib/fight-shape-model/shape-narrative.ts` — analyst-style shape copy generator.
  - Compares fighters across all 8 radar axes using per-axis delta.
  - Returns `{ headline, cards, caveat }` — never names a winner.
  - Three card types: `biggest-edge`, `closest`, `swing`/`watching`.
  - Swing card biases toward predicted loser's best axis for counter-path framing.
  - Thin-sample caveat surfaces automatically when fewer than 4 axes have data on both sides.
- `FightShapeSummary` now uses `narrative.headline` instead of `modelOutput.publicSummary`.
- `StyleComparisonBars` restructured:
  - "What the shape says" card grid added above axis bars.
  - Axis breakdown sorted by absolute delta descending.
  - Δ delta column added to bars.
  - `predictedWinnerId` prop plumbed through for swing card direction.
- `styleAndCallDisagree` detection added to `FightShapeSummary`: explicit note shown when style edge leader and predicted winner differ.

No model math, locked predictions, prediction thresholds, backtest scripts, `opponentTotals`, or public Model Record logic was changed in any of the above passes.

### Chronological Elo baseline pass

- Added backend-only leakage-safe chronological Elo baseline generation.
- New command: `npm run backtest:elo`.
- New outputs: `data/generated/backtests/elo-baseline.json` and `data/generated/backtests/elo-summary.json`.
- Elo reads pre-fight ratings before each fight, then updates ratings only after the result. Every fighter starts at 1500.
- K sensitivity tested at 24, 32, and 40. All produced 60 picked fights, 193 no-picks, 24% coverage, 58% pick accuracy, 14% all-fight accuracy, and 0.249 Brier.
- Recommendation: Elo is not ready as a model feature on this corpus; keep it as a tracked baseline and revisit with a larger chronological sample or validated seeding plan.
- No production model outputs, locked predictions, public UI, ingestion, or public Model Record behavior changed.

### Baseline correction pass

- Replaced the official backtest baseline reporting with leakage-safe as-of record baselines computed from pre-fight history only.
- Deprecated the old 71% profile-record baseline because it reads normalized fighter profile snapshots and is not leakage-safe. It remains available only as reference.
- Official headline baseline is now `asof-ufc-win-pct-any-history`: 92% coverage, 63% pick accuracy, 58% all-fight accuracy, Brier 0.235.
- Current v0.2 remains the production model: 66% winner accuracy, 58% method accuracy, Brier 0.219 on 253 scored fights.
- No v0.3 experiment was promoted; no model weights, formulas, UI, locked predictions, ingestion, or public Model Record behavior changed.
- Regenerated backtest summary, model diagnostics, and experiment reports to use the corrected official baseline.

### P0 prediction consistency pass

Goal: fix visible prediction contradictions before expanding the corpus to 20-30 events.

Completed:
- `lib/predictionViewModel.ts` is now the canonical public prediction state for fight pages, matchup rows, record rows, result banners, The Call, Live Path, and Method Lean.
- Added a 52% named-call threshold. Anything below 52% now resolves to `noLean` / "Too close to call" instead of defaulting to Fighter A or array order.
- Locked calls now pin the public fight-page state consistently across the fight page, matchup row, record row, result banner, The Call, Live Path, and Method Lean.
- Chimaev/Strickland consistently shows the locked public call: Khamzat Chimaev 63%.
- Van/Taira consistently shows the locked public call: Tatsuro Taira 58%.
- Steveson/Ellison shows "Too close to call" everywhere, not "Call: Gable Steveson 50%".
- Route audit checked 24 routeable fight pages: 24 passed, 0 failed.

Guardrails reinforced:
- Public Model Record must stay separate from historical backtest rows.
- `opponentTotals` must not regress.
- Public prediction surfaces must not bypass `predictionViewModel`.
- Do not show a public model grade until there are enough logged public calls.
- Keep public language signal-based and avoid overclaiming.

Next step:
- Backend-only expansion to 20-30 completed UFC events, targeting n >= 200 scored fights.
- No model tuning, UI changes, or public claims expansion during that step.

### 20-event backtest expansion QA checkpoint

- Backtest corpus now covers 20 completed UFC events and 253 scored fights.
- Headline metrics: 66% winner accuracy, 58% method accuracy, 0.219 Brier score, 40% more-experience baseline, 40% missing-data rate.
- Follow-up baseline correction found the previous 71% profile-record baseline was not leakage-safe; official as-of record baseline is 63% picked / 58% all fights with Brier 0.235.
- Model remains directionally promising but not proven; v0.2 now beats the leakage-safe record baselines but should not be publicly graded yet.
- Calibration concern remains in the 60-80% confidence buckets.
- `opponentTotals` remained intact at 2,940 of 4,917 selected-corpus history items, roughly 60% item-level coverage.
- Public Model Record/backtest separation re-checked: public logged calls remain separate from historical reconstruction rows.
- UFC 329 future rows remain unscored in the backtest.
- `ode-osbourne-alibi-idiris` source data resolves as `Overturned` / `NC`; it stays skipped as a non-directional outcome.
- Checks passed: `npm run audit:predictions`, `npm run backtest`, `npm run lint`, `npm run build`.

Recommended next step:
- Controlled backend model review/calibration, not UI polish and not public claim expansion.

### Data coverage repair pass

- Re-ingested all 6 backtest corpus events with `--max-history-fight-details 120` (was 60) and `--max-history-fights-per-fighter 8` (was 4)
- Fight-detail files: 439 → 737 (+298 new)
- Feature coverage: 78% → 85% on striking/submission stats; takedownAccuracy 65% → 80%; takedownDefense 70% → 79%
- `opponentTotals` history-item coverage: ~28% → 51%
- Re-ran backtest: winner accuracy 59% → **66%** (now matches better-record baseline); Brier 0.251 → **0.236**; missing-data rate 57% → **36%**
- Regenerated all normalized event JSONs

### Source-of-truth and contradiction fix

Root causes identified and fixed:
- `pinToLockedPrediction` overrode probabilities but not scenario direction → Chimaev/Strickland showed 52% Strickland but "the call" card named Chimaev
- `publicSummary()` in fight-shape model named a style-pressure "leader" independently of the outcome model
- `FightShapeSummary` hardcoded accent to `pressureA` regardless of predicted winner
- `islam-jdm.json` (backtest reconstruction) was counted in `getAccuracyMetrics()`, inflating public Model Record

Fixes applied:
- Added `lib/predictionViewModel.ts` — canonical view model for all fight-page components (`buildPredictionViewModel()`, `PredictionViewModel`, `PredictionSourceType`)
- Fixed `pin-to-locked.ts`: added `reconcileScenarios()` to swap lean/upset content when locked direction disagrees with live re-run
- Fixed `lib/fight-shape-model/model.ts` `publicSummary()`: now neutral style-only copy, never names a winner
- Updated `FightShapeSummary` and `PathsToVictory`: accept `predictedWinnerId` prop from canonical view model
- Split `lib/accuracy/index.ts` into `getLockedPredictions()` and `getHistoricalBacktestReconstructions()`; `getAccuracyMetrics()` now uses locked-only
- Split `app/record/page.tsx` into two labeled sections: public Model Record (locked calls) and Historical Backtest (reconstructions)
- Created `scripts/audit/predictions.ts` — 9 consistency checks across all fight pages
- Added `npm run audit:predictions` — passes across 99 fights/8 events
- All routes now wired through `buildPredictionViewModel()` and pass canonical `predictedWinnerId` downstream

### Backtest expansion (6-event corpus, n=76)

- Selected 6 most recent completed UFC events with UFCStats data (no cherry-picking)
- Events: UFC 322 (Nov 2025), UFC 326 (Mar 2026), UFC 327 (Apr 2026), UFC 328 (May 2026), UFC FN Della Maddalena vs. Prates (May 2026), UFC FN Allen vs. Costa (May 2026)
- Extended `scripts/backtest/run.ts`: fight-detail outcome derivation from UFCStats JSON (no prediction files needed for historical events)
- Added new output files: `feature-coverage.json`, `event-performance.json`, `skip-report.json`
- Backtest now writes 8 output files per run
- Initial n=76 result: 59% winner accuracy, Brier 0.251, trailing the then-reported profile-record baseline (66%) — confirmed n=13 was favorable noise; that profile-record comparison is now treated as legacy reference only
- Documented in `docs/BACKTESTING.md` with three-checkpoint comparison table

### UI and language pass

- Renamed CTAs: "lens →" → "View Read →"; "open main lens" → "View Main Event Read →"; nav "record" → "model record"
- Renamed scenario titles in model: "the lean" → "the call", "upset path" → "live path", "swing factor" → "what breaks the call"
- `TheCall.tsx` rewrite: `ReadStrengthChip` under probability bar; `MethodLean` collapsed to top method + slim bars (methods <8% show "thin")
- `FightCard.tsx` rewrite: scannable sub-row with call / read strength / method lean / result chip
- `ResultStateChip`: "Model correct / Model incorrect / Pending / No result"
- Visual: quieter body background gradient, reduced amber glow, reduced card/lens-mark glow
- AppHeader subline: "see the shape" → "forecast · tracked"
- Disclaimer footer: "signal-based forecast · not a guarantee" + lock-timestamp note
- Methodology page: added "Plain English" 6-pillar grid; Brier section framed as "technical details" with softened ranges

### opponentTotals fix (defensive stat coverage)

- Opponent defensive stats were absent from `fightHistory`, forcing `sapm`, `strikingDefense`, `takedownDefense` to fall back to UFC averages in the backtest
- Added `opponentIdFromDetail(detail, fighterId)` to `scripts/ingest/build-normalized-event.mjs`
- `buildHistoryItem()` now stores `opponentTotals` alongside `totals` in each history item
- Added `opponentTotals` field to `SourcedFightHistoryItem` in `lib/sourced-event.ts`
- `accumulateFight()` in `lib/backtest/buildAsOfFeatures.ts` reads `item.opponentTotals.totals`

### Backtesting system (initial build)

- Created `lib/backtest/` pipeline: types, buildAsOfFeatures, runBacktest, scorePredictions, calibration, baselines, leakageChecks
- Created `scripts/backtest/run.ts` and `scripts/backtest/summary.ts`
- Added `npm run backtest` and `npm run backtest:summary`
- Leakage firewall: history filtered with strict `<` ISO date comparison; aggregate stats recomputed from filtered history only
- Initial output: 5 files to `data/generated/backtests/`

### Codebase organization pass

- Removed dead lib files: `lib/data.ts`, `lib/exportStyleClashCard.ts`, `lib/exportStyleRadarCard.ts`, `lib/exportRosterStyleMap.ts`, `lib/creator-export-strategy.ts`, `lib/exportSection.js/.d.ts`, `lib/normalized-event.ts`, `lib/export/exportHookCard.ts`, `lib/export/exportUtils.ts`
- Removed 21 dead components (creator-export feature set)
- Updated `docs/code-structure.md` with full directory map, rules, cleaned-up list
- Created `docs/BACKTESTING.md`
