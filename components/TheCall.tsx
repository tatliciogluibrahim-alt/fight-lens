import type { OutcomeScenario } from "@/lib/fight-outcome-model/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";

interface TheCallProps {
  viewModel: PredictionViewModel;
}

// ─── Method lean ──────────────────────────────────────────────────────────────
//
// Secondary to the winner forecast. Rendered as a compact text-row breakdown
// so the three method rows read clearly without faint bar lines.
// No amber — this is not a winner signal.

function MethodLean({ viewModel }: { viewModel: PredictionViewModel }) {
  const { methodDistribution, methodLean } = viewModel;
  if (!methodLean) return null;

  const methods = [
    { id: "decision", label: "Decision",   value: methodDistribution.decision },
    { id: "ko",       label: "KO / TKO",   value: methodDistribution.koTko },
    { id: "sub",      label: "Submission", value: methodDistribution.submission },
  ].sort((a, b) => b.value - a.value);

  const top = methods[0];

  return (
    <div className="rounded-2xl border border-line bg-background/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mono-label">most likely finish type</p>
        <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
          directional only
        </span>
      </div>

      {/* Top method — primary read */}
      <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
        {top.label}
      </p>

      {/* Compact breakdown — plain rows, no bars */}
      <div className="mt-4 divide-y divide-line/40">
        {methods.map((m) => {
          const thin = m.value < 8;
          const isTop = m.id === top.id;
          return (
            <div key={m.id} className="flex items-center justify-between py-2.5">
              <span className={`text-sm ${isTop ? "font-medium text-foreground" : "text-muted"}`}>
                {m.label}
              </span>
              <span
                className={`data-text text-sm tabular-nums ${
                  thin ? "text-subtle" : isTop ? "text-foreground" : "text-muted"
                }`}
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

function ScenarioCard({ scenario }: { scenario: OutcomeScenario }) {
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
//
// "call detail." is the SUPPORTING section. The FightReadSnapshot above the
// fold is the primary call display. This section explains why the model leans
// the way it does and what could flip it — it does not repeat the big
// winner/probability card.

export function TheCall({ viewModel: vm }: TheCallProps) {
  if (vm.callState === "insufficientData" || vm.callState === "pending") {
    return (
      <section className="module-card">
        <div className="module-header">
          <p className="mono-label">the call</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            call detail.
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
          call detail.
        </h2>
        <p className="mt-3 text-sm text-muted">
          Why the model leans this way, and what could flip it.
        </p>
      </div>

      <div className="module-body space-y-6">
        {/* No-lean note — only shown when probabilities don't separate */}
        {tooClose && (
          <div className="rounded-xl border border-line bg-surface/50 p-4">
            <p className="text-sm leading-6 text-muted">
              Probabilities too close to name a call —{" "}
              <span className="text-foreground">{fighterA.name} {fighterA.winProbability}%</span>
              {" · "}
              <span className="text-foreground">{fighterB.name} {fighterB.winProbability}%</span>.
              No named model call.
            </p>
          </div>
        )}

        {/* Method lean */}
        <MethodLean viewModel={vm} />

        {/* The call / Live path / What breaks the call */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>

        <p className="mono-label">outcome-v0.2</p>
      </div>
    </section>
  );
}
