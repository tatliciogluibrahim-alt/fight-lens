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

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5">
      <p className={`text-xl font-semibold leading-tight tracking-tight ${calledA ? "text-accent" : "text-foreground"}`}>
        {fighterA.name}
      </p>
      <p className="my-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-subtle/60">
        vs
      </p>
      <p className={`text-xl font-semibold leading-tight tracking-tight ${calledB ? "text-accent" : "text-foreground"}`}>
        {fighterB.name}
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">
        {(fight.weightClass ?? "weight pending").toLowerCase()}
        {" · "}{fight.rounds}R
        {" · "}{fight.cardPlacement.toLowerCase()}
      </p>
    </div>
  );
}

// ─── 2. Model call card ───────────────────────────────────────────────────────

function MobileCallCard({
  vm,
  fighterA,
  fighterB,
}: {
  vm: PredictionViewModel;
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
}) {
  // Pending state — no call data yet
  if (vm.callState === "insufficientData" || vm.callState === "pending") {
    return (
      <div className="rounded-2xl border border-line bg-surface/70 p-5">
        <p className="mono-label">model call</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Forecast loads once fighter stats are sourced.
        </p>
      </div>
    );
  }

  const isNoLean = vm.callState === "noLean";
  const probA = vm.fighterA.winProbability ?? 0;
  const probB = vm.fighterB.winProbability ?? 0;
  const calledA = vm.predictedWinner?.id === fighterA.id;
  const calledB = vm.predictedWinner?.id === fighterB.id;

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80">
      {/* Top edge accent rail — broadcast feel */}
      <span
        aria-hidden="true"
        className="block h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />

      <div className="p-5">
        <p className="mono-label">model call</p>

        {isNoLean ? (
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Too close to call
          </p>
        ) : (
          <p className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            <span className="text-accent">{vm.predictedWinner?.name}</span>
            {vm.winnerProbability != null && (
              <span className="data-text ml-2 text-xl font-normal text-foreground">
                {vm.winnerProbability}%
              </span>
            )}
          </p>
        )}

        {/* Probability split bar — only when a named call exists */}
        {!isNoLean && (
          <div className="mt-5 space-y-2">
            {/* Last-name labels above bar */}
            <div className="flex items-center justify-between text-[11px]">
              <span className={calledA ? "font-semibold text-foreground" : "text-muted"}>
                {fighterA.name.split(" ").pop()}
              </span>
              <span className={calledB ? "font-semibold text-foreground" : "text-muted"}>
                {fighterB.name.split(" ").pop()}
              </span>
            </div>
            {/* Bar track */}
            <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="absolute left-0 h-full rounded-full bg-accent/65 transition-all"
                style={{ width: `${probA}%` }}
              />
            </div>
            {/* Probability numbers below bar */}
            <div className="flex items-center justify-between">
              <span className={`data-text text-[11px] tabular-nums ${calledA ? "text-foreground" : "text-muted"}`}>
                {probA}%
              </span>
              <span className={`data-text text-[11px] tabular-nums ${calledB ? "text-foreground" : "text-muted"}`}>
                {probB}%
              </span>
            </div>
          </div>
        )}

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
                    className={`h-full rounded-full transition-all ${isTop ? "bg-accent/65" : "bg-muted/35"}`}
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

  return (
    <div className="space-y-3">
      <p className="mono-label px-0.5">why it leans · what flips it</p>
      {vm.scenarios.map((scenario) => {
        const isLean  = scenario.id === "lean";
        const isSwing = scenario.id === "swing";
        return (
          <div
            key={scenario.id}
            className={`rounded-2xl border p-5 ${
              isLean
                ? "border-accent/30 bg-accent/[0.06]"
                : isSwing
                  ? "border-line-strong bg-surface/60"
                  : "border-line bg-background/35"
            }`}
          >
            <p className={`mono-label ${isLean ? "text-accent" : isSwing ? "text-foreground" : ""}`}>
              {scenario.title}
            </p>
            {scenario.fighterLabel ? (
              <p className="mt-2 text-base font-semibold leading-tight tracking-tight">
                {scenario.fighterLabel}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-muted">{scenario.description}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── 5. Fight shape accordion ─────────────────────────────────────────────────

function MobileShapeAccordion({
  fighterA,
  fighterB,
  predictedWinnerId,
}: {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  predictedWinnerId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="mono-label">fight shape</p>
          <p className="mt-1 text-sm text-muted">
            {open ? "Style edges and radar" : "Tap to expand — style edges"}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm text-subtle"
        >
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-4 pb-5 pt-4">
          <StyleComparisonBars
            fighterA={fighterA}
            fighterB={fighterB}
            predictedWinnerId={predictedWinnerId}
          />
        </div>
      )}
    </div>
  );
}

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
            <p className="mono-label mt-1">winner accuracy</p>
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
      <MobileCallCard vm={vm} fighterA={fighterA} fighterB={fighterB} />

      {/* 3 · Method lean */}
      {hasPred && <MobileMethodLean vm={vm} />}

      {/* 4 · Why it leans · what flips it */}
      {hasPred && vm.scenarios.length > 0 && <MobileScenarios vm={vm} />}

      <ContextualNotes notes={fight.contextNotes} />

      {/* 5 · Fight shape — collapsed accordion */}
      <MobileShapeAccordion
        fighterA={fighterA}
        fighterB={fighterB}
        predictedWinnerId={vm.predictedWinner?.id ?? null}
      />

      {/* 6 · Record proof */}
      <MobileRecordProof
        winnerAccuracy={winnerAccuracy}
        resolvedCount={resolvedCount}
      />
    </div>
  );
}
