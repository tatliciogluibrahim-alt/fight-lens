import type { SourcedFight } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import { buildShapeNarrative } from "@/lib/fight-shape-model/shape-narrative";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ModuleEmptyState } from "./ModuleEmptyState";

interface FightShapeSummaryProps {
  fight: SourcedFight;
  modelOutput: FightShapeModelOutput;
  /**
   * Canonical predicted-winner fighter id from the model call. Drives which
   * style-edge row gets the accent so the shape section never disagrees with
   * the model call. When null (no call available), neither row is accented.
   */
  predictedWinnerId?: string | null;
}

function StyleEdgeRow({ metric, accent = false }: { metric: FighterMetricScore; accent?: boolean }) {
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

export function FightShapeSummary({ fight, modelOutput, predictedWinnerId = null }: FightShapeSummaryProps) {
  const pressureA = modelOutput.metrics.stylePressureIndex.fighterA;
  const pressureB = modelOutput.metrics.stylePressureIndex.fighterB;
  const hasPressurePoint = pressureA.status !== "insufficient" || pressureB.status !== "insufficient";
  const showDebug = process.env.NEXT_PUBLIC_DEBUG_MODE === "true" && modelOutput.debug;

  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  // Accent the predicted winner from the model call — NOT the higher-pressure
  // fighter. Accent drives visual hierarchy, not a winner prediction.
  const accentA = predictedWinnerId === fighterA.id;
  const accentB = predictedWinnerId === fighterB.id;

  // Detect when the style-edge "leader" (higher score) differs from the predicted winner.
  // When they disagree, we show an explicit clarifying note.
  const styleLeaderIsA =
    pressureA.score != null &&
    pressureB.score != null &&
    pressureA.score > pressureB.score;
  const styleLeaderIsB =
    pressureA.score != null &&
    pressureB.score != null &&
    pressureB.score > pressureA.score;
  const styleLeaderId = styleLeaderIsA
    ? fighterA.id
    : styleLeaderIsB
      ? fighterB.id
      : null;

  const styleAndCallDisagree =
    predictedWinnerId !== null &&
    styleLeaderId !== null &&
    styleLeaderId !== predictedWinnerId;

  // Narrative replaces the older robotic publicSummary. Compares per-axis,
  // names the biggest separator in plain fight-language, and never names a
  // winner. The shape tab renders the full "what the shape says" cards;
  // here on the call tab we only show the headline + the optional caveat.
  const narrative = buildShapeNarrative({
    fighterAName: fighterA.name,
    fighterAId: fighterA.id,
    fighterBName: fighterB.name,
    fighterBId: fighterB.id,
    profileA: fighterA.styleProfile,
    profileB: fighterB.styleProfile,
    predictedWinnerId,
  });

  return (
    <section id="fight-shape" className="module-card scroll-mt-32">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">fight shape</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">fight shape.</h2>
        </div>
      </div>

      <div className="module-body grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        {/* Left: shape summary */}
        <div>
          {narrative.headline ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <ConfidenceBadge label={modelOutput.dataConfidence.label} />
              </div>
              <p className="text-xl leading-8 text-foreground md:text-2xl md:leading-9">
                {narrative.headline}
              </p>
              {/* Context note — never a winner prediction */}
              <p className="mt-3 text-xs leading-5 text-subtle">
                This is the style map, not the model call. See the snapshot above for win probability.
              </p>
              {narrative.caveat ? (
                <p className="mt-3 text-xs leading-5 text-subtle">{narrative.caveat}</p>
              ) : null}
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
            {[`${fight.rounds} rounds`, fight.weightClass]
              .flatMap((label) => (label ? [label] : []))
              .map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
                >
                  {label.toLowerCase()}
                </span>
              ))}
          </div>
        </div>

        {/* Right: style edge */}
        <aside className="rounded-2xl border border-line bg-background/45 p-5">
          {hasPressurePoint ? (
            <>
              <p className="mono-label">style edge</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">stronger style signal.</h3>
                <ConfidenceBadge
                  label={
                    pressureA.confidence === "Insufficient"
                      ? pressureB.confidence
                      : pressureA.confidence
                  }
                />
              </div>
              <div className="mt-5 space-y-5">
                <StyleEdgeRow metric={pressureA} accent={accentA} />
                <StyleEdgeRow metric={pressureB} accent={accentB} />
              </div>

              {/* Disagree note — only shown when style edge and winner call diverge */}
              {styleAndCallDisagree ? (
                <p className="mt-3 text-xs leading-5 text-muted">
                  Style edge and winner forecast point to different fighters.
                  Style edge shows where the matchup shape tilts — it is not a winner prediction.
                </p>
              ) : (
                <p className="mt-3 text-[11px] uppercase tracking-[0.1em] text-subtle">
                  Style edge · separate from the winner forecast
                </p>
              )}

              <p className="mt-3 text-sm leading-6 text-muted">
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
              label="style edge"
              title="Style read pending."
              body="Stats not yet sourced."
            />
          )}
        </aside>
      </div>
    </section>
  );
}
