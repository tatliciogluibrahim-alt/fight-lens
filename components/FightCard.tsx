import Link from "next/link";
import { CountryFlag } from "./CountryFlag";
import type { Fight, Fighter } from "@/lib/types";

interface FightCardProps {
  fight: Fight;
  fighterA: Fighter;
  fighterB: Fighter;
  eventId: string;
}

export function FightCard({ fight, fighterA, fighterB, eventId }: FightCardProps) {
  return (
    <Link
      href={`/events/${eventId}/${fight.id}`}
      className="group grid gap-4 border-b border-line p-4 transition last:border-b-0 hover:bg-surface-2/70 md:grid-cols-[1fr_190px_1fr_190px] md:items-center md:p-5"
    >
      <div className="flex min-w-0 items-center gap-4 md:justify-end md:text-right">
        <div className="min-w-0">
          <div className="flex items-center gap-2 md:justify-end">
            <CountryFlag code={fighterA.countryCode} colors={fighterA.countryColors} label={fighterA.countryLabel} />
            <p className="truncate text-lg font-semibold tracking-tight">{fighterA.name}</p>
          </div>
          <p className="data-text text-xs text-subtle">
            {fighterA.record} / {fighterA.ranking || "nr"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-background/60 px-4 py-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">vs</p>
        <p className="mt-1 text-sm font-medium text-foreground">{fight.weightClass}</p>
        <p className="data-text mt-1 text-xs text-muted">
          {fight.rounds} rounds / {fight.cardPlacement.toLowerCase()}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-4 md:justify-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CountryFlag code={fighterB.countryCode} colors={fighterB.countryColors} label={fighterB.countryLabel} />
            <p className="truncate text-lg font-semibold tracking-tight">{fighterB.name}</p>
          </div>
          <p className="data-text text-xs text-subtle">
            {fighterB.record} / {fighterB.ranking || "nr"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-background/35 px-4 py-3 md:text-right">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          {fight.styleClashLabel}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle group-hover:text-muted">
          open lens
        </p>
      </div>
    </Link>
  );
}
