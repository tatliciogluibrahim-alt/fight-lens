import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { FightPath } from "@/lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface PathsToVictoryProps {
  fight: SourcedFight;
  modelOutput: FightShapeModelOutput;
}

function PathList({
  fighter,
  metric,
  paths,
  accent = false
}: {
  fighter: SourcedFighter;
  metric: FighterMetricScore;
  paths: FightPath[];
  accent?: boolean;
}) {
  if (metric.status === "insufficient" || metric.score == null) {
    return (
      <div className="rounded-2xl border border-line bg-background/45 p-5">
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        <p className="mono-label mt-2">insufficient sample</p>
        <p className="mt-5 text-sm leading-6 text-muted">
          Route reliability needs more sourced pressure, form, and round data.
        </p>
      </div>
    );
  }

  const score = metric.score ?? 0;

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
          <p className="mono-label mt-2">{metric.label}</p>
        </div>
        <ConfidenceBadge label={metric.confidence} />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Path reliability</p>
          <p className={`data-text text-2xl ${accent ? "text-accent" : "text-foreground"}`}>{metric.score ?? "n/a"}</p>
        </div>
        <div className="h-2.5 rounded-full bg-surface-2">
          <div
            className={`h-2.5 rounded-full ${accent ? "bg-accent" : "bg-muted"}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-muted">{metric.explanation}</p>
      {paths.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {paths.slice(0, 3).map((path) => (
            <span
              key={path.label}
              className="rounded-full border border-line bg-surface/70 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle"
            >
              {path.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PathsToVictory({ fight, modelOutput }: PathsToVictoryProps) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const pathsA = fight.paths?.fighterA ?? [];
  const pathsB = fight.paths?.fighterB ?? [];
  const pathA = modelOutput.metrics.pathReliability.fighterA;
  const pathB = modelOutput.metrics.pathReliability.fighterB;
  const hasPaths = pathA.status !== "insufficient" || pathB.status !== "insufficient";

  if (!hasPaths) {
    return (
      <section id="section-paths" className="scroll-mt-28 rounded-xl border border-line bg-surface/45 px-4 py-3">
        <p className="mono-label">05 / tactical routes</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Route reliability needs sourced pressure, form, and round data.
        </p>
      </section>
    );
  }

  return (
    <section id="section-paths" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">05 / tactical routes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            tactical routes.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Scores describe how repeatable the clearest visible route appears from sourced data.
          </p>
        </div>
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <PathList fighter={fighterA} metric={pathA} paths={pathsA} accent />
        <PathList fighter={fighterB} metric={pathB} paths={pathsB} />
      </div>
    </section>
  );
}
