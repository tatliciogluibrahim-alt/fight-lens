import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { FightPath } from "@/lib/types";

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

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div>
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        <p className="mono-label mt-2">{metric.label}</p>
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
  // Show paths if curated data exists OR model has sufficient signal
  const hasCuratedPaths = pathsA.length > 0 || pathsB.length > 0;
  const hasModelPaths = pathA.status !== "insufficient" || pathB.status !== "insufficient";
  const hasPaths = hasCuratedPaths || hasModelPaths;

  return (
    <section id="section-paths" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">cleaner path</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          most repeatable path.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          The clearest visible route to a finish or decision, based on sourced style signals.
        </p>
      </div>
      {hasPaths ? (
        <div className="module-body grid gap-4 lg:grid-cols-2">
          <PathList fighter={fighterA} metric={pathA} paths={pathsA} accent />
          <PathList fighter={fighterB} metric={pathB} paths={pathsB} />
        </div>
      ) : (
        <div className="module-body">
          <div className="grid gap-4 lg:grid-cols-2">
            {[fighterA, fighterB].map((fighter) => (
              <div key={fighter.id} className="rounded-2xl border border-line bg-background/40 p-5">
                <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
                <p className="mono-label mt-2">path analysis pending</p>
                <p className="mt-4 text-sm leading-6 text-muted">
                  Path reliability loads once round-trend and form data are sourced. Check back closer to the event.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
