import { ProbabilityBar } from "@/components/ProbabilityBar";
import type { OutcomeScenario } from "@/lib/fight-outcome-model/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";

interface TheCallProps {
  viewModel: PredictionViewModel;
}

// ─── Method lean ──────────────────────────────────────────────────────────────
//
// Secondary to the winner forecast. Shows the most likely finish type and a
// compact neutral breakdown. Bars are 8 px tall for readability; no amber so
// they don't read as a second winner signal.

function MethodLean({
  viewModel,
}: {
  viewModel: PredictionViewModel;
}) {
  const { methodDistribution, methodLean, methodLeanNote } = viewModel;
  if (!methodLean) return null;

  const methods = [
    { id: "decision", label: "Decision", value: methodDistribution.decision },
    { id: "ko", label: "KO / TKO", value: methodDistribution.koTko },
    { id: "sub", label: "Submission", value: methodDistribution.submission },
  ].sort((a, b) => b.value - a.value);

  const top = methods[0];

  return (
    <div className="rounded-2xl border border-line bg-background/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="mono-label">most likely finish type</p>
          <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
            secondary read
          </span>
        </div>
        {methodLeanNote && (
          <p className="text-xs text-subtle">{methodLeanNote}</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-3xl">
          {top.label}
        </span>
        <span className="data-text text-sm text-muted">· {top.value}% lean</span>
      </div>

      <div className="mt-5 space-y-3">
        {methods.map((m) => {
          const thin = m.value < 8;
          const isTop = m.id === top.id;
          return (
            <div key={m.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted">{m.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`absolute left-0 h-full rounded-full ${isTop ? "bg-foreground/85" : "bg-muted/60"}`}
                  style={{ width: `${Math.max(m.value, 2)}%` }}
                />
              </div>
              <span
                className={`data-text w-16 text-right text-xs ${thin ? "text-subtle" : "text-muted"}`}
              >
                {thin ? "thin" : `${m.value}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
}: {
  scenario: OutcomeScenario;
}) {
  const isLean = scenario.id === "lean";
  const isSwing = scenario.id === "swing";

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 transition ${
        isLean
          ? "border-accent/30 bg-accent/[0.06]"
          : isSwing
            ? "border-line-strong bg-surface/60"
            : "border-line bg-background/35"
      }`}
    >
      <p className={`mono-label ${isLean ? "text-accent" : isSwing ? "text-foreground" : ""}`}>
        {scenario.title}
      </p>
      {scenario.fighterLabel ? (
        <p className="text-base font-semibold leading-tight tracking-[-0.02em]">
          {scenario.fighterLabel}
        </p>
      ) : null}
      <p className="text-sm leading-6 text-muted">{scenario.description}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TheCall({ viewModel: vm }: TheCallProps) {
  if (vm.callState === "insufficientData" || vm.callState === "pending") {
    return (
      <section className="module-card">
        <div className="module-header">
          <p className="mono-label">the call</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            model call.
          </h2>
        </div>
        <div className="module-body">
          <div className="rounded-2xl border border-line bg-background/35 p-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              <span className="size-1.5 animate-pulse rounded-full bg-subtle/60" />
              data pending
            </span>
            <p className="mt-4 text-sm leading-6 text-muted">
              Win probability and model call load once fighter stats are sourced.
              Check back closer to the event.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { fighterA, fighterB, scenarios, tooClose } = vm;

  return (
    <section className="module-card">
      <div className="module-header">
        <p className="mono-label">the call</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          model call.
        </h2>
        <p className="mt-3 text-sm text-muted">
          Win probability from shape, form, and stat differentials. Signal-based — not a guarantee.
        </p>
      </div>

      <div className="module-body space-y-6">
        {/* Win probability — primary surface */}
        <div className="rounded-2xl border border-line bg-background/40 p-4 md:p-6">
          <ProbabilityBar
            probA={fighterA.winProbability}
            probB={fighterB.winProbability}
            nameA={fighterA.name}
            nameB={fighterB.name}
            tooClose={tooClose}
          />
        </div>

        {/* Method lean — secondary */}
        <MethodLean viewModel={vm} />

        {/* The Call / Live Path / What Breaks the Call */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
            />
          ))}
        </div>

        <p className="mono-label">outcome-v0.2</p>
      </div>
    </section>
  );
}
