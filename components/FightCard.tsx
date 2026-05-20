"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { CountryFlag } from "./CountryFlag";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";

interface FightCardProps {
  fight: SourcedFight;
  eventId: string;
  prediction?: PredictionRecord | null;
  predictionViewModel?: PredictionViewModel | null;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function RecordLine({ fighter }: { fighter: SourcedFighter }) {
  const ranking = formatRanking(fighter.ranking);
  const parts = [
    fighter.record ?? null,
    ranking !== "UNRANKED" ? ranking : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="data-text text-xs text-subtle">{parts.join(" · ")}</p>;
}

function FighterCountry({ fighter }: { fighter: SourcedFighter }) {
  const country = getCountryDisplay(fighter);
  return (
    <CountryFlag
      code={country?.code ?? "TBD"}
      label={country?.label ?? "country pending"}
    />
  );
}

function ResultChip({ viewModel }: { viewModel: PredictionViewModel }) {
  if (viewModel.resultState === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-subtle">
        <span className="size-1.5 rounded-full bg-subtle/60" />
        Pending
      </span>
    );
  }

  if (viewModel.resultState === "noResult" || viewModel.modelCorrect === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-muted">
        No result
      </span>
    );
  }

  const correct = viewModel.modelCorrect;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${
        correct
          ? "border border-success/30 bg-success-soft text-success"
          : "border border-wrong/30 bg-wrong-soft text-wrong"
      }`}
    >
      <span className={`size-1.5 rounded-full ${correct ? "bg-success" : "bg-wrong"}`} />
      {correct ? "Correct" : "Incorrect"}
    </span>
  );
}

function MethodBar({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-24 mono-label shrink-0">{label}</p>
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`absolute left-0 h-full rounded-full ${accent ? "bg-foreground/80" : "bg-muted/50"}`}
          style={{ width: `${Math.max(value, 2)}%` }}
        />
      </div>
      <p className="data-text w-10 text-right text-xs text-muted">
        {value < 8 ? "thin" : `${value}%`}
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FightCard({ fight, eventId, predictionViewModel }: FightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const vm = predictionViewModel ?? null;
  const hasPred = !!vm && vm.callState !== "insufficientData" && vm.callState !== "pending";
  const favA = vm?.predictedWinner?.id === fighterA.id;
  const favB = vm?.predictedWinner?.id === fighterB.id;
  const probA = vm?.fighterA.winProbability ?? null;
  const probB = vm?.fighterB.winProbability ?? null;
  const methodTop = vm?.methodLean ?? null;

  // On mobile, only show the ResultChip when the fight has a scored outcome —
  // "Pending" is implied by context so we suppress it to reduce clutter.
  const showMobileResultChip = vm && vm.resultState === "scored";

  return (
    <div className="border-b border-line last:border-b-0">

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE card layout — visible only below sm (640 px)
          Stacked fighter names (full text, wrapping), compact prediction row,
          full-width "View read" CTA. No flags, no records, no expand button.
          ════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden p-4">

        {/* Fighter matchup — stacked, full names, wrapping text */}
        <div>
          <p className={`text-base font-semibold leading-snug tracking-tight ${favA ? "text-accent" : "text-foreground"}`}>
            {fighterA.name}
          </p>
          <p className="my-1 font-mono text-[9px] uppercase tracking-[0.1em] text-subtle/70">vs</p>
          <p className={`text-base font-semibold leading-snug tracking-tight ${favB ? "text-accent" : "text-foreground"}`}>
            {fighterB.name}
          </p>
        </div>

        {/* Metadata — weight class · rounds · card placement */}
        <p className="mt-2 data-text text-xs text-subtle">
          {(fight.weightClass ?? "weight pending").toLowerCase()}
          {" · "}{fight.rounds}R
          {" · "}{fight.cardPlacement.toLowerCase()}
        </p>

        {/* Prediction — only when a call is available */}
        {hasPred && (
          <div className="mt-3 space-y-1">
            {vm.isNamedCall && vm.predictedWinner ? (
              <p className="text-sm text-muted">
                <span className="text-subtle">call · </span>
                <span className="font-semibold text-foreground">{vm.predictedWinner.name}</span>
                <span className="data-text ml-1.5 tabular-nums text-foreground">
                  {vm.winnerProbability}%
                </span>
              </p>
            ) : (
              <p className="text-sm font-medium text-muted">{vm.displayedCallLabel}</p>
            )}
            {methodTop && (
              <p className="text-xs text-subtle">
                {methodTop}
                <span className="opacity-60"> lean</span>
              </p>
            )}
          </div>
        )}

        {/* Result chip — only when scored, not for pending */}
        {showMobileResultChip && (
          <div className="mt-2">
            <ResultChip viewModel={vm} />
          </div>
        )}

        {/* CTA — full width, easy tap target */}
        <Link
          href={`/events/${eventId}/${fight.id}`}
          className="tap-target mt-3 flex w-full items-center justify-center rounded-full border border-line-strong bg-surface-2 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10"
        >
          View read
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP row layout — visible only at sm+ (640 px and up)
          Side-by-side fighters with VS/probability in center, call meta row,
          expand button + View read CTA.
          ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:block">
        <div className="p-5">

          {/* Fighters — always side-by-side at desktop */}
          <div className="flex items-start gap-3">
            {/* Fighter A */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FighterCountry fighter={fighterA} />
                <p className={`min-w-0 truncate text-base font-semibold leading-snug tracking-tight ${favA ? "text-accent" : "text-foreground"}`}>
                  {fighterA.name}
                </p>
              </div>
              <RecordLine fighter={fighterA} />
            </div>

            {/* VS centre with probability */}
            <div className="flex shrink-0 flex-col items-center gap-0.5 pt-px">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-subtle">vs</p>
              {hasPred && (
                <p className="data-text mt-0.5 text-[11px] tabular-nums">
                  <span className={favA ? "font-semibold text-foreground" : "text-muted"}>{probA}%</span>
                  <span className="mx-0.5 text-subtle/50">–</span>
                  <span className={favB ? "font-semibold text-foreground" : "text-muted"}>{probB}%</span>
                </p>
              )}
            </div>

            {/* Fighter B */}
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <p className={`min-w-0 truncate text-base font-semibold leading-snug tracking-tight ${favB ? "text-accent" : "text-foreground"}`}>
                  {fighterB.name}
                </p>
                <FighterCountry fighter={fighterB} />
              </div>
              <div className="flex justify-end">
                <RecordLine fighter={fighterB} />
              </div>
            </div>
          </div>

          {/* Call meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="data-text text-subtle">
              {(fight.weightClass ?? "weight pending").toLowerCase()} · {fight.rounds}R
            </span>

            {hasPred && vm.isNamedCall && vm.predictedWinner ? (
              <span className="text-muted">
                <span className="text-subtle">call · </span>
                <span className="font-medium text-foreground">{vm.predictedWinner.name}</span>
              </span>
            ) : hasPred && !vm.isNamedCall ? (
              <span className="font-medium text-muted">{vm.displayedCallLabel}</span>
            ) : null}

            {methodTop && (
              <span className="text-subtle">
                {methodTop}<span className="opacity-60"> lean</span>
              </span>
            )}

            {vm && (
              <span className="ml-auto">
                <ResultChip viewModel={vm} />
              </span>
            )}
          </div>

          {/* Action row */}
          <div className="mt-3 flex items-center gap-2">
            {vm && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2/70 px-3 text-xs text-subtle transition hover:border-accent/30 hover:text-accent"
                aria-expanded={expanded}
                aria-label={expanded ? "collapse details" : "expand details"}
              >
                {expanded ? "−" : "+"}
              </button>
            )}
            <Link
              href={`/events/${eventId}/${fight.id}`}
              className="tap-target inline-flex flex-1 items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-xs font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10 sm:flex-none"
            >
              View read
            </Link>
          </div>
        </div>

        {/* Expandable breakdown — desktop only */}
        {expanded && vm && (
          <div className="border-t border-line bg-background/30 px-5 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="mono-label">win probability</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className={`rounded-xl border p-3 ${favA ? "border-line-strong bg-surface-2/70" : "border-line bg-background/35"}`}>
                    <p className="truncate text-xs text-subtle">{fighterA.name.split(" ").pop()}</p>
                    <p className={`data-text mt-1 text-lg ${favA ? "text-foreground" : "text-muted"}`}>{probA}%</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${favB ? "border-line-strong bg-surface-2/70" : "border-line bg-background/35"}`}>
                    <p className="truncate text-xs text-subtle">{fighterB.name.split(" ").pop()}</p>
                    <p className={`data-text mt-1 text-lg ${favB ? "text-foreground" : "text-muted"}`}>{probB}%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="mono-label">method lean</p>
                <MethodBar label="Decision" value={vm.methodDistribution.decision} accent={methodTop === "Decision"} />
                <MethodBar label="KO / TKO" value={vm.methodDistribution.koTko} accent={methodTop === "KO/TKO"} />
                <MethodBar label="Submission" value={vm.methodDistribution.submission} accent={methodTop === "Submission"} />
                <p className="pt-1 text-[11px] text-subtle">{vm.methodLeanNote}</p>
              </div>
            </div>

            {fight.matchupQuestion && (
              <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
                {fight.matchupQuestion}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
