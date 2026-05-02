import type { Fighter } from "@/lib/types";
import { SaveSectionButton } from "./SaveSectionButton";

export interface SourcedLastFiveFight {
  result?: string | null;
  opponent?: string | null;
  method?: string | null;
  round?: number | null;
  time?: string | null;
  event?: string | null;
  date?: string | null;
  provenance?: string | null;
}

interface LastFiveTrendProps {
  fighterA: Fighter;
  fighterB: Fighter;
  sourcedA?: SourcedLastFiveFight[];
  sourcedB?: SourcedLastFiveFight[];
}

interface TrendFight {
  result: "W" | "L" | "D";
  opponent: string;
  method: string;
  roundLabel: string;
  time: string;
  context: string;
  source: "ufcstats" | "mock";
}

function resultLabel(result: string | null | undefined): "W" | "L" | "D" {
  const normalized = String(result ?? "").toLowerCase();
  if (normalized.startsWith("w")) return "W";
  if (normalized.startsWith("l")) return "L";
  return "D";
}

function buildTrendFights(fighter: Fighter, sourced?: SourcedLastFiveFight[]): TrendFight[] {
  if (sourced?.length) {
    return sourced.slice(0, 5).map((fight, index) => ({
      result: resultLabel(fight.result),
      opponent: fight.opponent ?? `opponent ${index + 1}`,
      method: fight.method ?? "method n/a",
      roundLabel: fight.round ? `r${fight.round}` : "round n/a",
      time: fight.time ?? "--:--",
      context: fight.event ?? fight.date ?? "ufcstats history",
      source: fight.provenance === "sourced" ? "ufcstats" : "mock"
    }));
  }

  return fighter.lastFiveFights.map((fight) => ({
    result: fight.result,
    opponent: fight.opponent,
    method: fight.method,
    roundLabel: `r${fight.round}`,
    time: fight.time,
    context: fight.opponentTier.toLowerCase(),
    source: "mock"
  }));
}

function FighterTrend({ fighter, sourced }: { fighter: Fighter; sourced?: SourcedLastFiveFight[] }) {
  const rows = buildTrendFights(fighter, sourced);
  const hasSourceNames = rows.some((fight) => fight.source === "ufcstats");

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
          <p className="mono-label mt-1">last five</p>
        </div>
        <span className="data-text text-xs text-subtle">{hasSourceNames ? "ufcstats" : fighter.record}</span>
      </div>
      <div className="space-y-2">
        {rows.map((fight, index) => (
          <div
            key={`${fighter.id}-${fight.opponent}-${index}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-surface/45 p-3"
          >
            <span
              className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                fight.result === "W" ? "bg-accent text-white" : "border border-line text-muted"
              }`}
            >
              {fight.result}
            </span>
            <div>
              <p className="text-sm text-foreground">{fight.opponent}</p>
              <p className="data-text text-xs text-subtle">
                {fight.method} / {fight.roundLabel} / {fight.context}
              </p>
            </div>
            <span className="data-text text-xs text-muted">{fight.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LastFiveTrend({ fighterA, fighterB, sourcedA, sourcedB }: LastFiveTrendProps) {
  return (
    <section id="section-momentum" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">03 / last 5 trend</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            recent momentum.
          </h2>
        </div>
        <SaveSectionButton elementId="section-momentum" filename="fight-lens-momentum" />
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <FighterTrend fighter={fighterA} sourced={sourcedA} />
        <FighterTrend fighter={fighterB} sourced={sourcedB} />
      </div>
    </section>
  );
}
