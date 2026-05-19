"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { CountryFlag } from "./CountryFlag";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";

interface FightCardProps {
  fight: SourcedFight;
  eventId: string;
  prediction?: PredictionRecord | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function methodLabel(method: string): string {
  switch (method) {
    case "ko_tko": return "KO/TKO";
    case "submission": return "SUB";
    case "decision": return "DEC";
    default: return method.toUpperCase();
  }
}

// Read strength — single source of truth for the public-facing label
function readStrengthFromProb(probA: number, probB: number): string {
  const top = Math.max(probA, probB);
  if (top >= 70) return "strong";
  if (top >= 60) return "usable";
  if (top >= 55) return "thin";
  return "coin flip";
}

function topMethod(breakdown: { decision: number; koTko: number; submission: number }): string {
  const entries: Array<[string, number]> = [
    ["Decision", breakdown.decision],
    ["KO/TKO", breakdown.koTko],
    ["Submission", breakdown.submission],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FighterCountry({ fighter }: { fighter: SourcedFighter }) {
  const country = getCountryDisplay(fighter);
  return (
    <CountryFlag
      code={country?.code ?? "TBD"}
      label={country?.label ?? "country pending"}
    />
  );
}

function RecordLine({ fighter }: { fighter: SourcedFighter }) {
  const ranking = formatRanking(fighter.ranking);
  const parts = [
    fighter.record ?? null,
    ranking !== "UNRANKED" ? ranking : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="data-text text-xs text-subtle">{parts.join(" · ")}</p>;
}

function ResultChip({
  outcome,
  modelPick,
}: {
  outcome: PredictionRecord["outcome"];
  modelPick: "fighterA" | "fighterB";
}) {
  if (!outcome) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/70 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-subtle">
        <span className="size-1.5 rounded-full bg-subtle/60" />
        Pending
      </span>
    );
  }

  if (outcome.winner === "draw" || outcome.winner === "nc") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/70 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-muted">
        No result
      </span>
    );
  }

  const correct = outcome.winner === modelPick;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${
        correct
          ? "border border-success/30 bg-success-soft text-success"
          : "border border-wrong/30 bg-wrong-soft text-wrong"
      }`}
    >
      <span className={`size-1.5 rounded-full ${correct ? "bg-success" : "bg-wrong"}`} />
      Model {correct ? "correct" : "incorrect"}
    </span>
  );
}

function MethodBar({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-24 mono-label shrink-0">{label}</p>
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`absolute left-0 h-full rounded-full ${accent ? "bg-accent" : "bg-muted/50"}`}
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

export function FightCard({ fight, eventId, prediction }: FightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const pred = prediction?.prediction;
  const outcome = prediction?.outcome ?? null;
  const hasPred = !!pred;
  const favA = hasPred && pred.fighterAWinProbability >= pred.fighterBWinProbability;
  const modelPick: "fighterA" | "fighterB" = favA ? "fighterA" : "fighterB";
  const modelPickName = favA ? fighterA.name : fighterB.name;
  const probA = pred?.fighterAWinProbability ?? null;
  const probB = pred?.fighterBWinProbability ?? null;
  const topProb = pred ? Math.max(pred.fighterAWinProbability, pred.fighterBWinProbability) : null;
  const readStrength = pred ? readStrengthFromProb(pred.fighterAWinProbability, pred.fighterBWinProbability) : null;
  const methodTop = pred ? topMethod(pred.methodBreakdown) : null;

  return (
    <div className="group border-b border-line transition hover:bg-surface-2/30 last:border-b-0">
      {/* Main row */}
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_180px_1fr_auto] md:items-center md:p-5">
        {/* Fighter A */}
        <div className="flex min-w-0 items-center gap-3 md:justify-end md:text-right">
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:justify-end">
              <FighterCountry fighter={fighterA} />
              <p
                className={`truncate text-base font-semibold tracking-tight ${
                  hasPred && favA ? "text-accent" : "text-foreground"
                }`}
              >
                {fighterA.name}
              </p>
            </div>
            <RecordLine fighter={fighterA} />
          </div>
        </div>

        {/* VS center */}
        <div className="rounded-2xl border border-line bg-background/50 px-4 py-3 text-center">
          <p className="mono-label">vs</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {fight.weightClass ?? "weight pending"}
          </p>
          <p className="data-text mt-1 text-xs text-muted">{fight.rounds}R</p>
          {hasPred && (
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center">
              <span className={`data-text text-[11px] font-medium ${favA ? "text-accent" : "text-muted"}`}>
                {probA}
              </span>
              <span className="text-[9px] text-subtle">·</span>
              <span className={`data-text text-[11px] font-medium ${!favA ? "text-accent" : "text-muted"}`}>
                {probB}
              </span>
            </div>
          )}
        </div>

        {/* Fighter B */}
        <div className="flex min-w-0 items-center gap-3 md:justify-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FighterCountry fighter={fighterB} />
              <p
                className={`truncate text-base font-semibold tracking-tight ${
                  hasPred && !favA ? "text-accent" : "text-foreground"
                }`}
              >
                {fighterB.name}
              </p>
            </div>
            <RecordLine fighter={fighterB} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasPred && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2/70 px-3 text-xs text-subtle transition hover:border-accent/30 hover:text-accent"
              aria-expanded={expanded}
              aria-label={expanded ? "collapse" : "expand details"}
            >
              {expanded ? "−" : "+"}
            </button>
          )}
          <Link
            href={`/events/${eventId}/${fight.id}`}
            className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-xs font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10"
          >
            View Read →
          </Link>
        </div>
      </div>

      {/* Sub-row: call summary line — scannable, low monospace */}
      {hasPred && (
        <div className="flex flex-wrap items-center gap-3 px-5 pb-4 text-xs text-muted md:gap-5">
          <span>
            <span className="text-subtle">Call:</span>{" "}
            <span className="font-medium text-foreground">{modelPickName}</span>{" "}
            <span className="data-text text-foreground">{topProb}%</span>
          </span>
          <span className="text-subtle">·</span>
          <span>
            <span className="text-subtle">Read:</span>{" "}
            <span className="text-foreground">{readStrength}</span>
          </span>
          {methodTop && (
            <>
              <span className="text-subtle">·</span>
              <span>
                <span className="text-subtle">Method lean:</span>{" "}
                <span className="text-foreground">{methodTop}</span>
              </span>
            </>
          )}
          <span className="ml-auto">
            <ResultChip outcome={outcome} modelPick={modelPick} />
          </span>
        </div>
      )}

      {/* Expandable method breakdown */}
      {expanded && pred && (
        <div className="border-t border-line bg-background/30 px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="mono-label">win probability</p>
              <div className="flex items-center gap-3">
                <p className={`data-text w-10 text-right text-sm ${favA ? "text-accent" : "text-muted"}`}>
                  {probA}%
                </p>
                <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="absolute left-0 h-full rounded-full bg-accent"
                    style={{ width: `${probA}%` }}
                  />
                </div>
                <p className={`data-text w-10 text-sm ${!favA ? "text-accent" : "text-muted"}`}>
                  {probB}%
                </p>
              </div>
              <div className="flex justify-between text-xs text-subtle">
                <span>{fighterA.name.split(" ").pop()}</span>
                <span>{fighterB.name.split(" ").pop()}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="mono-label">method lean</p>
              <MethodBar label="Decision" value={pred.methodBreakdown.decision} accent={methodTop === "Decision"} />
              <MethodBar label="KO / TKO" value={pred.methodBreakdown.koTko} accent={methodTop === "KO/TKO"} />
              <MethodBar label="Submission" value={pred.methodBreakdown.submission} accent={methodTop === "Submission"} />
              <p className="pt-1 text-[11px] text-subtle">
                Method lean is directional. Winner calls are tracked separately.
              </p>
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
  );
}
