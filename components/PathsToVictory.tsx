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

  if (!hasCuratedPaths && !hasModelSignal) return null;

  return (
    <div className={`rounded-2xl border bg-background/45 p-5 ${accent ? "border-line-strong" : "border-line"}`}>
      <div>
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        {roleLabel ? <p className="mono-label mt-2 text-foreground">{roleLabel}</p> : null}
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

  const aNoPaths = pathsA.length === 0 && (pathA.status === "insufficient" || pathA.score == null);
  const bNoPaths = pathsB.length === 0 && (pathB.status === "insufficient" || pathB.score == null);
  const bothPending = aNoPaths && bNoPaths;

  if (bothPending) return null;

  const sectionLabel = isNoLean ? "paths to watch" : "counter path";
  const sectionHeading = isNoLean ? "both routes stay viable." : "alternate path.";
  const sectionDescription = isDataPending
    ? null
    : isNoLean
      ? "No fighter is assigned a counter-path role because the winner call is too close."
      : `Alternate path for ${viewModel.livePathFighter?.name ?? "the non-called fighter"} if the matchup plays differently than the model expects.`;

  return (
    <section id="section-paths" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">{sectionLabel}</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          {sectionHeading}
        </h2>
        {sectionDescription ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {sectionDescription}
          </p>
        ) : null}
      </div>

      <div className="module-body">
        <div className="grid gap-4 lg:grid-cols-2">
          {!aNoPaths && (
            <PathList
              fighter={fighterA}
              metric={pathA}
              paths={pathsA}
              accent={accentA}
              roleLabel={accentA ? "counter route" : null}
            />
          )}
          {!bNoPaths && (
            <PathList
              fighter={fighterB}
              metric={pathB}
              paths={pathsB}
              accent={accentB}
              roleLabel={accentB ? "counter route" : null}
            />
          )}
        </div>
      </div>
    </section>
  );
}
