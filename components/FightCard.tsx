import Link from "next/link";
import { CountryFlag } from "./CountryFlag";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";

interface FightCardProps {
  fight: SourcedFight;
  eventId: string;
}

function FighterCountry({ fighter }: { fighter: SourcedFighter }) {
  const country = fighter.country;
  return (
    <CountryFlag
      code={country?.code ?? "TBD"}
      colors={country?.colors ?? ["#c85b3f", "#f5efe6", "#403a31"]}
      label={country?.label ?? "country pending"}
    />
  );
}

function RecordLine({ fighter }: { fighter: SourcedFighter }) {
  return (
    <p className="data-text text-xs text-subtle">
      {fighter.record ?? "record pending"} / {fighter.ranking || "nr"}
    </p>
  );
}

export function FightCard({ fight, eventId }: FightCardProps) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  return (
    <Link
      href={`/events/${eventId}/${fight.id}`}
      className="group grid gap-4 border-b border-line p-4 transition last:border-b-0 hover:bg-surface-2/70 md:grid-cols-[1fr_190px_1fr_190px] md:items-center md:p-5"
    >
      <div className="flex min-w-0 items-center gap-4 md:justify-end md:text-right">
        <div className="min-w-0">
          <div className="flex items-center gap-2 md:justify-end">
            <FighterCountry fighter={fighterA} />
            <p className="truncate text-lg font-semibold tracking-tight">{fighterA.name}</p>
          </div>
          <RecordLine fighter={fighterA} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-background/60 px-4 py-3 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">vs</p>
        <p className="mt-1 text-sm font-medium text-foreground">{fight.weightClass ?? "weight class pending"}</p>
        <p className="data-text mt-1 text-xs text-muted">
          {fight.rounds} rounds / {fight.cardPlacement.toLowerCase()}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-4 md:justify-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FighterCountry fighter={fighterB} />
            <p className="truncate text-lg font-semibold tracking-tight">{fighterB.name}</p>
          </div>
          <RecordLine fighter={fighterB} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-background/35 px-4 py-3 md:text-right">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          {fight.styleClashLabel ?? "matchup data ready"}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle group-hover:text-muted">
          open lens
        </p>
      </div>
    </Link>
  );
}
