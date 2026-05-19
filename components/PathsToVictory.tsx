import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { FightPath } from "@/lib/types";

interface PathsToVictoryProps {
  fight: SourcedFight;
  modelOutput: FightShapeModelOutput;
  /**
   * Canonical predicted-winner fighter id. Used to ensure the layout reads
   * left-to-right as "model call" → "live path" without contradicting the
   * winner forecast.
   */
  predictedWinnerId?: string | null;
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
  const hasCuratedPaths = paths.length > 0;
  const hasModelSignal = metric.status !== "insufficient" && metric.score != null;

  // Nothing at all — show pending state
  if (!hasCuratedPaths && !hasModelSignal) {
    return (
      <div className="rounded-2xl border border-line bg-background/45 p-5">
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        <p className="mono-label mt-2">path analysis pending</p>
        <p className="mt-4 text-sm leading-6 text-muted">
          Path reliability loads once round-trend and form data are sourced. Check back closer to the event.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div>
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        {hasModelSignal && <p className="mono-label mt-2">{metric.label}</p>}
      </div>
      {hasModelSignal && (
        <p className="mt-5 text-sm leading-6 text-muted">{metric.explanation}</p>
      )}
      {hasCuratedPaths && (
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
      )}
    </div>
  );
}

export function PathsToVictory({ fight, modelOutput, predictedWinnerId = null }: PathsToVictoryProps) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const pathsA = fight.paths?.fighterA ?? [];
  const pathsB = fight.paths?.fighterB ?? [];
  const pathA = modelOutput.metrics.pathReliability.fighterA;
  const pathB = modelOutput.metrics.pathReliability.fighterB;

  // Accent the model-call winner — keeps the page internally consistent. When
  // no winner exists (pending/data-light), no row gets accented.
  const accentA = predictedWinnerId === fighterA.id;
  const accentB = predictedWinnerId === fighterB.id;

  return (
    <section id="section-paths" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">live path</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          most repeatable path.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          How each fighter can still win this. Based on sourced style signals — not a finishing prediction.
        </p>
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <PathList fighter={fighterA} metric={pathA} paths={pathsA} accent={accentA} />
        <PathList fighter={fighterB} metric={pathB} paths={pathsB} accent={accentB} />
      </div>
    </section>
  );
}
