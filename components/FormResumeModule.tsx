import type { Fighter, FightResult } from "@/lib/types";
import type { SourcedLastFiveFight } from "./LastFiveTrend";

interface FormResumeModuleProps {
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
  source: "ufcstats" | "prototype";
}

function resultLabel(result: string | null | undefined): "W" | "L" | "D" {
  const normalized = String(result ?? "").toLowerCase();
  if (normalized.startsWith("w")) return "W";
  if (normalized.startsWith("l")) return "L";
  return "D";
}

function fromMockFight(fight: FightResult): TrendFight {
  return {
    result: fight.result,
    opponent: fight.opponent,
    method: fight.method,
    roundLabel: `r${fight.round}`,
    time: fight.time,
    context: fight.opponentTier.toLowerCase(),
    source: "prototype"
  };
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
      source: fight.provenance === "sourced" ? "ufcstats" : "prototype"
    }));
  }

  return fighter.lastFiveFights.slice(0, 5).map(fromMockFight);
}

function sourceLabel(rows: TrendFight[]) {
  return rows.some((row) => row.source === "ufcstats") ? "ufcstats + manual" : "prototype";
}

function ResumeMeter({ fighter, accent = false }: { fighter: Fighter; accent?: boolean }) {
  const filled = Math.round(fighter.resumeHeat.score / 8.33);

  return (
    <div className="rounded-2xl border border-line bg-surface/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label">resume strength</p>
          <p className="mt-2 text-sm text-muted">{fighter.resumeHeat.label}</p>
        </div>
        <p className={`data-text text-3xl ${accent ? "text-accent" : "text-foreground"}`}>
          {fighter.resumeHeat.score}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-12 gap-1">
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className={`h-4 rounded-sm ${index < filled ? (accent ? "bg-accent" : "bg-muted") : "bg-background"}`}
          />
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{fighter.resumeHeat.explanation}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {fighter.resumeHeat.factors.map((factor) => (
          <p key={factor} className="data-text rounded-xl border border-line bg-background/55 px-3 py-2 text-xs text-subtle">
            / {factor}
          </p>
        ))}
      </div>
    </div>
  );
}

function FighterFormCard({ fighter, sourced, accent = false }: { fighter: Fighter; sourced?: SourcedLastFiveFight[]; accent?: boolean }) {
  const rows = buildTrendFights(fighter, sourced);

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{fighter.name}</h3>
          <p className="data-text mt-1 text-xs text-subtle">{fighter.record} / {sourceLabel(rows)}</p>
        </div>
        <span className={`rounded-full border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${accent ? "text-accent" : "text-muted"}`}>
          last five + resume
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((fight, index) => (
          <div
            key={`${fighter.id}-${fight.opponent}-${index}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-surface/45 p-3"
          >
            <span
              className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                fight.result === "W" ? (accent ? "bg-accent text-white" : "bg-muted text-background") : "border border-line text-muted"
              }`}
            >
              {fight.result}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{fight.opponent}</p>
              <p className="data-text text-xs text-subtle">
                {fight.method} / {fight.roundLabel} / {fight.context}
              </p>
            </div>
            <span className="data-text text-xs text-muted">{fight.time}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <ResumeMeter fighter={fighter} accent={accent} />
      </div>
    </div>
  );
}

export function FormResumeModule({ fighterA, fighterB, sourcedA, sourcedB }: FormResumeModuleProps) {
  return (
    <section id="section-form-resume" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">03 / form + resume</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          recent form, weighted by who it came against.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Last-five rows name the opponent first, then add method, round, time, and context. The resume score sits beside form so opponent quality does not become a separate scavenger hunt.
        </p>
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <FighterFormCard fighter={fighterA} sourced={sourcedA} accent />
        <FighterFormCard fighter={fighterB} sourced={sourcedB} />
      </div>
    </section>
  );
}
