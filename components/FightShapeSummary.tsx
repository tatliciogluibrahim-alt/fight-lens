import type { SourcedFight } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { StyleClashLabel } from "./StyleClashLabel";

interface FightShapeSummaryProps {
  fight: SourcedFight;
  modelOutput: FightShapeModelOutput;
}

function PressureRow({ metric, accent = false }: { metric: FighterMetricScore; accent?: boolean }) {
  const score = metric.score ?? 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">{metric.fighterName}</p>
          <p className="data-text mt-1 text-xs text-subtle">{metric.label}</p>
        </div>
        <p className={`data-text text-2xl ${accent ? "text-accent" : "text-foreground"}`}>
          {metric.score ?? "n/a"}
        </p>
      </div>
      <div className="h-2.5 rounded-full bg-surface-2">
        <div
          className={`h-2.5 rounded-full ${accent ? "bg-accent" : "bg-muted"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function FightShapeSummary({ fight, modelOutput }: FightShapeSummaryProps) {
  const pressureA = modelOutput.metrics.stylePressureIndex.fighterA;
  const pressureB = modelOutput.metrics.stylePressureIndex.fighterB;
  const hasPressurePoint = pressureA.status !== "insufficient" || pressureB.status !== "insufficient";
  const showDebug = process.env.NEXT_PUBLIC_DEBUG_MODE === "true" && modelOutput.debug;

  return (
    <section id="fight-shape" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">shape of the fight</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">the read.</h2>
        </div>
      </div>

      <div className="module-body grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <div>
          {modelOutput.publicSummary ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <ConfidenceBadge label={modelOutput.dataConfidence.label} />
              </div>
              <p className="text-xl leading-8 text-foreground md:text-2xl md:leading-9">
                {modelOutput.publicSummary}
              </p>
              {fight.fightShapeSummary ? (
                <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">{fight.fightShapeSummary}</p>
              ) : null}
            </div>
          ) : (
            <ModuleEmptyState
              label="fight shape"
              title="Fight shape pending."
              body="No fight stats sourced yet — check back closer to the event."
            />
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {fight.styleClashLabel ? <StyleClashLabel label={fight.styleClashLabel} /> : null}
            {[`${fight.rounds} rounds`, fight.weightClass].flatMap((label) => label ? [label] : []).map((label) => (
              <span
                key={label}
                className="rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
              >
                {label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-line bg-background/45 p-5">
          {hasPressurePoint ? (
            <>
              <p className="mono-label">pressure point</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">matchup stress</h3>
                <ConfidenceBadge label={pressureA.confidence === "Insufficient" ? pressureB.confidence : pressureA.confidence} />
              </div>
              <div className="mt-5 space-y-5">
                <PressureRow metric={pressureA} accent />
                <PressureRow metric={pressureB} />
              </div>
              <p className="mt-5 text-sm leading-6 text-muted">
                {pressureA.score != null && (pressureA.score ?? 0) >= (pressureB.score ?? 0)
                  ? pressureA.explanation
                  : pressureB.explanation}
              </p>
              {showDebug ? (
                <p className="data-text mt-4 text-xs leading-6 text-subtle">
                  {modelOutput.debug?.modelVersion}: {modelOutput.debug?.notes.join(" ")}
                </p>
              ) : null}
            </>
          ) : (
            <ModuleEmptyState
              label="pressure point"
              title="Pressure point pending."
              body="Stats not yet sourced."
            />
          )}
        </aside>
      </div>
    </section>
  );
}
