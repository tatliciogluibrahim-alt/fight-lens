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
  return (
    <p className="data-text text-xs text-subtle">{parts.join(" · ")}</p>
  );
}

function MethodBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-24 mono-label shrink-0">{label}</p>
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute left-0 h-full rounded-full bg-accent/60"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="data-text w-8 text-right text-xs text-muted">{value}%</p>
    </div>
  );
}

export function FightCard({ fight, eventId, prediction }: FightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const pred = prediction?.prediction;
  const hasPred = !!pred;
  const favA = hasPred && pred.fighterAWinProbability >= pred.fighterBWinProbability;
  const probA = pred?.fighterAWinProbability ?? null;
  const probB = pred?.fighterBWinProbability ?? null;

  return (
    <div className="border-b border-line last:border-b-0">
      {/* Main row */}
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_180px_1fr_auto] md:items-center md:p-5">
        {/* Fighter A */}
        <div className="flex min-w-0 items-center gap-3 md:justify-end md:text-right">
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:justify-end">
              <FighterCountry fighter={fighterA} />
              <p className={`truncate text-base font-semibold tracking-tight ${hasPred && favA ? "text-accent" : ""}`}>
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
              <span className="mono-label text-[9px]">–</span>
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
              <p className={`truncate text-base font-semibold tracking-tight ${hasPred && !favA ? "text-accent" : ""}`}>
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
              className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2/70 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle transition hover:border-accent/30 hover:text-accent"
              aria-expanded={expanded}
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
          <Link
            href={`/events/${eventId}/${fight.id}`}
            className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2/70 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle transition hover:border-accent/30 hover:text-foreground"
          >
            lens →
          </Link>
        </div>
      </div>

      {/* Expandable method breakdown */}
      {expanded && pred && (
        <div className="border-t border-line bg-background/30 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Left: win probability mini bar */}
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
              <div className="flex justify-between">
                <p className="mono-label text-[9px]">{fighterA.name.split(" ").pop()}</p>
                <p className="mono-label text-[9px]">{fighterB.name.split(" ").pop()}</p>
              </div>
            </div>

            {/* Right: method breakdown */}
            <div className="space-y-2.5">
              <p className="mono-label">method breakdown</p>
              <MethodBar label="Decision" value={pred.methodBreakdown.decision} />
              <MethodBar label="KO / TKO" value={pred.methodBreakdown.koTko} />
              <MethodBar label="Submission" value={pred.methodBreakdown.submission} />
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
