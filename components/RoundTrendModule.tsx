import type { FightShapeModelOutput, RoundSustainabilityScore } from "@/lib/fight-shape-model/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface RoundTrendModuleProps {
  modelOutput: FightShapeModelOutput;
}

function TrendBars({ metric, accent = false }: { metric: RoundSustainabilityScore; accent?: boolean }) {
  const rows = [
    ["early", metric.earlySignal],
    ["middle", metric.middleSignal],
    ["late", metric.lateSignal]
  ] as const;

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">{metric.fighterName}</h3>
          <p className="mono-label mt-1">{metric.label}</p>
        </div>
        <ConfidenceBadge label={metric.confidence} />
      </div>
      <div className="space-y-3">
        {rows.map(([label, value]) => {
          const score = value ?? 0;

          return (
            <div key={`${metric.fighterId}-${label}`} className="grid grid-cols-[64px_1fr_48px] items-center gap-3">
              <span className="data-text text-xs text-subtle">{label}</span>
              <div className="h-3 rounded-full bg-surface-2">
                <div
                  className={`h-3 rounded-full ${accent ? "bg-accent" : "bg-muted"}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`data-text text-right text-xs ${accent ? "text-accent" : "text-foreground"}`}>
                {value ?? "n/a"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignalTiles({ fighterA, fighterB }: { fighterA: RoundSustainabilityScore; fighterB: RoundSustainabilityScore }) {
  const rows = [
    ["early", fighterA.earlySignal, fighterB.earlySignal],
    ["middle", fighterA.middleSignal, fighterB.middleSignal],
    ["late", fighterA.lateSignal, fighterB.lateSignal]
  ] as const;

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <p className="mono-label">round model signals</p>
      <div className="mt-5 space-y-4">
        {rows.map(([label, a, b]) => {
          const max = Math.max(a ?? 0, b ?? 0, 1);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className={`data-text text-sm ${(a ?? 0) >= (b ?? 0) ? "text-accent" : "text-muted"}`}>{a ?? "n/a"}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</span>
                <span className={`data-text text-sm ${(b ?? 0) > (a ?? 0) ? "text-foreground" : "text-muted"}`}>{b ?? "n/a"}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex justify-end rounded-l-full bg-surface-2">
                  <div className="h-2.5 rounded-l-full bg-accent" style={{ width: `${((a ?? 0) / max) * 100}%` }} />
                </div>
                <div className="rounded-r-full bg-surface-2">
                  <div className="h-2.5 rounded-r-full bg-muted" style={{ width: `${((b ?? 0) / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoundTrendModule({ modelOutput }: RoundTrendModuleProps) {
  const fighterA = modelOutput.metrics.roundSustainability.fighterA;
  const fighterB = modelOutput.metrics.roundSustainability.fighterB;
  const canShowTrend = fighterA.status !== "insufficient" && fighterB.status !== "insufficient";

  return (
    <section id="section-round-trend" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">04 / round trend</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          sustainability by round.
        </h2>
        {canShowTrend ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            The model compares early, middle, and late signals from completed round data only.
          </p>
        ) : null}
      </div>
      {canShowTrend ? (
        <div className="module-body grid gap-4 lg:grid-cols-[1fr_1fr]">
          <TrendBars metric={fighterA} accent />
          <TrendBars metric={fighterB} />
          <div className="lg:col-span-2">
            <SignalTiles fighterA={fighterA} fighterB={fighterB} />
            <p className="data-text mt-4 text-xs leading-6 text-subtle">{fighterA.explanation}</p>
          </div>
        </div>
      ) : (
        <div className="module-body">
          <p className="text-xs text-subtle">
            Not enough data to see the shape of this fight by round.
          </p>
        </div>
      )}
    </section>
  );
}
