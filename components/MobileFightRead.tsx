"use client";

/*
 * MobileFightRead — premium mobile fight intelligence card.
 *
 * Renders the full fight-read experience for narrow viewports (< 640 px).
 * Flow: matchup header → model call → method lean → why/flip scenarios →
 *       shape (accordion, collapsed by default) → record proof.
 *
 * All prediction data reads from the canonical viewModel.
 * No independent probability or method computation here.
 * Desktop layout is completely separate — this component is sm:hidden only.
 */

import { useState } from "react";
import Link from "next/link";
import type { PredictionViewModel } from "@/lib/predictionViewModel";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import { StyleComparisonBars } from "./StyleComparisonBars";
import { FightResultBanner } from "./FightResultBanner";
import { ContextualNotes } from "./ContextualNotes";
import { CallConfidenceBand } from "./CallConfidenceBand";
import { RoundMomentumFlow } from "./RoundMomentumFlow";

interface MobileFightReadProps {
  fight: SourcedFight;
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  viewModel: PredictionViewModel;
  winnerAccuracy: number | null;
  resolvedCount: number;
}

// Below this threshold a method value is considered "thin" signal and
// shown as a dot marker rather than a filled bar.
const METHOD_THIN = 8;

// ─── 1. Fighter matchup header ────────────────────────────────────────────────

function MobileMatchupHeader({
  fight,
  fighterA,
  fighterB,
  vm,
}: {
  fight: SourcedFight;
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  vm: PredictionViewModel;
}) {
  const calledA = vm.predictedWinner?.id === fighterA.id;
  const calledB = vm.predictedWinner?.id === fighterB.id;
  // Neither fighter is highlighted — probabilities too close to name a winner.
  const noLean = !calledA && !calledB;

  return (
    <div className="rounded-2xl border border-line bg-surface/70 px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
        {(fight.weightClass ?? "weight pending").toLowerCase()}
        {" · "}{fight.rounds}R
        {" · "}{fight.cardPlacement.toLowerCase()}
      </p>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <p
          className={`min-w-0 break-words text-xl font-semibold leading-[1.05] ${
            calledA ? "text-accent" : noLean ? "text-muted" : "text-foreground"
          }`}
        >
          {fighterA.name}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle/60">
          vs
        </p>
        <p
          className={`min-w-0 break-words text-right text-xl font-semibold leading-[1.05] ${
            calledB ? "text-accent" : noLean ? "text-muted" : "text-foreground"
          }`}
        >
          {fighterB.name}
        </p>
      </div>

      {noLean && (
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-subtle/70">
          too close to call
        </p>
      )}
    </div>
  );
}

// ─── 2. Model call card ───────────────────────────────────────────────────────

function MobileCallCard({ vm }: { vm: PredictionViewModel }) {
  // Pending state — no call data yet
  if (vm.callState === "insufficientData" || vm.callState === "pending") {
    return (
      <div id="section-call" className="scroll-mt-16 rounded-2xl border border-line bg-surface/70 p-5">
        <p className="mono-label">model call</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Model calls unlock once fighter data is available.
        </p>
      </div>
    );
  }

  const isNoLean = vm.callState === "noLean";

  return (
    <div id="section-call" className="scroll-mt-16 overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80">
      {/* Top edge accent rail — broadcast feel */}
      <span
        aria-hidden="true"
        className="block h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />

      <div className="p-5">
        <p className="mono-label mb-4">model call</p>
        <CallConfidenceBand
          winnerName={vm.predictedWinner?.name ?? null}
          winnerProbability={vm.winnerProbability}
          loserName={vm.livePathFighter?.name ?? null}
          loserProbability={vm.loserProbability}
          readStrength={vm.readStrength}
          isTooCloseToCall={isNoLean}
          fighterAName={vm.fighterA.name}
          fighterAProb={vm.fighterA.winProbability}
          fighterBName={vm.fighterB.name}
          fighterBProb={vm.fighterB.winProbability}
          rankingMismatch={vm.rankingMismatch}
        />
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-subtle/70">
          {vm.publicPredictionSource}
        </p>
      </div>
    </div>
  );
}

// ─── 3. Method lean ───────────────────────────────────────────────────────────

function MobileMethodLean({ vm }: { vm: PredictionViewModel }) {
  if (!vm.methodLean) return null;

  const methods = [
    { id: "decision", label: "Decision",   value: vm.methodDistribution.decision },
    { id: "ko",       label: "KO / TKO",   value: vm.methodDistribution.koTko },
    { id: "sub",      label: "Submission", value: vm.methodDistribution.submission },
  ].sort((a, b) => b.value - a.value);

  const top = methods[0];

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="mono-label">most likely finish</p>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-subtle/60">
          directional only
        </span>
      </div>

      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {top.label}
      </p>

      <div className="mt-4 space-y-3">
        {methods.map((m) => {
          const thin = m.value < METHOD_THIN;
          const isTop = m.id === top.id;
          return (
            <div key={m.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isTop ? "font-medium text-foreground" : "text-muted"}`}>
                  {m.label}
                </span>
                <span className={`data-text text-sm tabular-nums ${thin ? "text-subtle/70" : isTop ? "text-foreground" : "text-muted"}`}>
                  {thin ? "thin" : `${m.value}%`}
                </span>
              </div>
              {thin ? (
                <div className="flex h-1.5 items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-subtle/30" />
                </div>
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full transition-all ${isTop ? "bg-accent/80" : "bg-muted/55"}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 4. Why it leans · what flips it ─────────────────────────────────────────

function MobileScenarios({ vm }: { vm: PredictionViewModel }) {
  if (!vm.scenarios || vm.scenarios.length === 0) return null;

  // Mobile redundancy cut: scenarios[0] "the call" repeats the MobileCallCard
  // above, and scenarios[1] "counter path" repeats the counter-path block
  // inside the CallConfidenceBand. Only scenarios[2] "what breaks the call"
  // is genuinely unique on this scroll. Show only that one on mobile —
  // saves ~2 stacked cards of vertical space without losing information.
  const swing = vm.scenarios.find((s) => s.id === "swing");
  if (!swing) return null;

  return (
    <div
      className="rounded-2xl border border-line-strong bg-surface/60 p-5"
    >
      <p className="mono-label text-foreground">{swing.title}</p>
      {swing.fighterLabel ? (
        <p className="mt-2 text-base font-semibold leading-tight tracking-tight">
          {swing.fighterLabel}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-muted">{swing.description}</p>
    </div>
  );
}

// ─── 5. Fight shape ──────────────────────────────────────────────────────────
// Removed MobileShapeAccordion wrapper. StyleComparisonBars already renders a
// smart compact mobile summary (axis leader + biggest edge + swing path) with
// its own single "expand shape map" toggle for the full radar + insights. The
// outer wrapper meant users tapped one accordion just to reveal another one —
// classic double-accordion. Rendered directly now, with a stable scroll anchor
// preserved via the id attribute on the inner section header.

// ─── 6. Record proof ──────────────────────────────────────────────────────────

function MobileRecordProof({
  winnerAccuracy,
  resolvedCount,
}: {
  winnerAccuracy: number | null;
  resolvedCount: number;
}) {
  if (resolvedCount === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5">
      <p className="mono-label">model record</p>
      <div className="mt-4 flex items-end gap-8">
        {winnerAccuracy != null && (
          <div>
            <p className="data-text text-3xl text-foreground">{winnerAccuracy}%</p>
            <p className="mono-label mt-1">named-call</p>
          </div>
        )}
        <div>
          <p className="data-text text-3xl text-foreground">{resolvedCount}</p>
          <p className="mono-label mt-1">calls scored</p>
        </div>
      </div>
      <Link
        href="/record"
        className="tap-target mt-5 inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-sm text-foreground transition hover:border-accent/40"
      >
        View full record →
      </Link>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MobileFightRead({
  fight,
  fighterA,
  fighterB,
  viewModel: vm,
  winnerAccuracy,
  resolvedCount,
}: MobileFightReadProps) {
  const hasPred =
    vm.callState !== "insufficientData" && vm.callState !== "pending";

  return (
    <div className="space-y-3.5">
      {/* 1 · Fighter matchup header */}
      <MobileMatchupHeader
        fight={fight}
        fighterA={fighterA}
        fighterB={fighterB}
        vm={vm}
      />

      {/* Result banner — shown between matchup and call when fight is scored */}
      {vm.isScored && (
        <div className="overflow-hidden rounded-2xl border border-line">
          <FightResultBanner viewModel={vm} />
        </div>
      )}

      {/* 2 · Model call */}
      <MobileCallCard vm={vm} />

      {/* 3 · Method lean */}
      {hasPred && <MobileMethodLean vm={vm} />}

      {/* 4 · Why it leans · what flips it */}
      {hasPred && vm.scenarios.length > 0 && <MobileScenarios vm={vm} />}

      {/* 4b · Round momentum flow */}
      {hasPred && (
        <RoundMomentumFlow
          fighterA={fighterA}
          fighterB={fighterB}
          rounds={fight.rounds}
          fighterAWinProbability={vm.fighterA.winProbability}
          fighterBWinProbability={vm.fighterB.winProbability}
          predictedWinnerId={vm.predictedWinner?.id ?? null}
        />
      )}

      <ContextualNotes notes={fight.contextNotes} />

      {/* 5 · Fight shape — StyleComparisonBars renders its own mobile compact
          card with a single expand toggle; scroll anchor preserved via id. */}
      <div id="section-shape" className="scroll-mt-16">
        <StyleComparisonBars
          fighterA={fighterA}
          fighterB={fighterB}
          predictedWinnerId={vm.predictedWinner?.id ?? null}
        />
      </div>

      {/* 6 · Record proof */}
      <MobileRecordProof
        winnerAccuracy={winnerAccuracy}
        resolvedCount={resolvedCount}
      />
    </div>
  );
}
