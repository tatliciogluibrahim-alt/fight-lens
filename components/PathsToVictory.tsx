import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { FightPath } from "@/lib/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";

interface PathsToVictoryProps {
  fight: SourcedFight;
  modelOutput: FightShapeModelOutput;
  viewModel: PredictionViewModel;
}

function PathList({
  fighter,
  metric,
  paths,
  accent = false,
  roleLabel,
}: {
  fighter: SourcedFighter;
  metric: FighterMetricScore;
  paths: FightPath[];
  accent?: boolean;
  roleLabel?: string | null;
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
    <div className={`rounded-2xl border bg-background/45 p-5 ${accent ? "border-accent/35" : "border-line"}`}>
      <div>
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        {roleLabel ? <p className="mono-label mt-2 text-accent">{roleLabel}</p> : null}
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

export function PathsToVictory({ fight, modelOutput, viewModel }: PathsToVictoryProps) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const pathsA = fight.paths?.fighterA ?? [];
  const pathsB = fight.paths?.fighterB ?? [];
  const pathA = modelOutput.metrics.pathReliability.fighterA;
  const pathB = modelOutput.metrics.pathReliability.fighterB;

  const isNoLean = viewModel.callState === "noLean";
  const isDataPending = viewModel.callState === "insufficientData" || viewModel.callState === "pending";
  const livePathId = viewModel.livePathFighter?.id ?? null;
  const accentA = !isNoLean && livePathId === fighterA.id;
  const accentB = !isNoLean && livePathId === fighterB.id;

  return (
    <section id="section-paths" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">{isNoLean ? "paths to watch" : "live path"}</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          {isNoLean ? "both routes stay live." : "non-lean route."}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {isDataPending
            ? "Path analysis stays pending until there is enough sourced data for a public call."
            : isNoLean
              ? "No fighter is assigned the live-path role because the winner call is too close."
              : `How ${viewModel.livePathFighter?.name ?? "the non-lean fighter"} can still win this without contradicting the model call.`}
        </p>
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <PathList
          fighter={fighterA}
          metric={pathA}
          paths={pathsA}
          accent={accentA}
          roleLabel={accentA ? "live path" : null}
        />
        <PathList
          fighter={fighterB}
          metric={pathB}
          paths={pathsB}
          accent={accentB}
          roleLabel={accentB ? "live path" : null}
        />
      </div>
    </section>
  );
}
