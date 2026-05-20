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

  // Both pending — caller handles the "both pending" case by not rendering this
  // component at all. This branch only fires when one side has no data but the
  // other side does.
  if (!hasCuratedPaths && !hasModelSignal) {
    return (
      <div className="rounded-2xl border border-line bg-background/45 p-5">
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        <p className="mono-label mt-2 text-subtle">path data pending</p>
        <p className="mt-3 text-sm leading-6 text-subtle">
          Round-trend data not yet sourced for this fighter.
        </p>
      </div>
    );
  }

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

  // Check whether both sides have zero path data.
  // When true: suppress both large "pending" cards — show one quiet note instead.
  const aNoPaths = pathsA.length === 0 && (pathA.status === "insufficient" || pathA.score == null);
  const bNoPaths = pathsB.length === 0 && (pathB.status === "insufficient" || pathB.score == null);
  const bothPending = aNoPaths && bNoPaths;

  // Section title and description depend on call state:
  //   noLean   → "paths to watch" / "both routes stay live."
  //   no call  → "live path" / "non-call route."
  //   pending  → neutral, only a quiet note shown
  const sectionLabel = isNoLean ? "paths to watch" : "live path";
  const sectionHeading = isNoLean
    ? "both routes stay live."
    : "non-call route.";

  const sectionDescription = isDataPending
    ? null // hidden when data is pending — the quiet note below covers it
    : isNoLean
      ? "No fighter is assigned the live-path role because the winner call is too close."
      : `What has to change for ${viewModel.livePathFighter?.name ?? "the other fighter"} to flip the read — this is not the model call.`;

  return (
    <section id="section-paths" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">{sectionLabel}</p>
        {!bothPending && (
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            {sectionHeading}
          </h2>
        )}
        {sectionDescription && !bothPending && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {sectionDescription}
          </p>
        )}
      </div>

      <div className="module-body">
        {bothPending ? (
          /*
           * Both fighters have no path data — suppress the two large pending
           * cards. Replace with one quiet single-line note.
           * Do not render a big empty module or duplicate "Check back closer
           * to the event" text.
           */
          <p className="text-sm text-subtle">
            Path analysis unlocks when enough recent round-trend data is sourced.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <PathList
              fighter={fighterA}
              metric={pathA}
              paths={pathsA}
              accent={accentA}
              roleLabel={accentA ? "live route" : null}
            />
            <PathList
              fighter={fighterB}
              metric={pathB}
              paths={pathsB}
              accent={accentB}
              roleLabel={accentB ? "live route" : null}
            />
          </div>
        )}
      </div>
    </section>
  );
}
