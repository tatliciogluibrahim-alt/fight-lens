import { ProbabilityBar } from "@/components/ProbabilityBar";
import type { FightOutcomeModelOutput, OutcomeScenario } from "@/lib/fight-outcome-model/types";

interface TheCallProps {
  outcomeModel: FightOutcomeModelOutput;
}

// ─── Method breakdown ─────────────────────────────────────────────────────────

function MethodBreakdown({
  decision,
  koTko,
  submission,
}: {
  decision: number;
  koTko: number;
  submission: number;
}) {
  const methods = [
    { label: "Decision", value: decision },
    { label: "KO / TKO", value: koTko },
    { label: "Submission", value: submission },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {methods.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-line bg-background/40 px-4 py-4 text-center"
        >
          <p className="data-text text-3xl font-light text-foreground">{value}%</p>
          <p className="mt-1.5 mono-label">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  suppressFighterLabel = false,
}: {
  scenario: OutcomeScenario;
  suppressFighterLabel?: boolean;
}) {
  const isLean = scenario.id === "lean";

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        isLean
          ? "border-accent/25 bg-accent/[0.06]"
          : "border-line bg-background/35"
      }`}
    >
      <p className={`mono-label ${isLean ? "text-accent" : ""}`}>
        {scenario.title}
      </p>
      {!suppressFighterLabel && scenario.fighterLabel ? (
        <p className="text-base font-semibold leading-tight tracking-[-0.02em]">
          {scenario.fighterLabel}
        </p>
      ) : null}
      <p className="text-sm leading-6 text-muted">{scenario.description}</p>
    </div>
  );
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const dot =
    confidence === "high"
      ? "bg-success"
      : confidence === "medium"
        ? "bg-accent"
        : "bg-subtle";

  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="mono-label">{confidence} confidence</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TheCall({ outcomeModel }: TheCallProps) {
  if (outcomeModel.confidence === "insufficient") {
    return (
      <section id="the-call" className="module-card scroll-mt-28">
        <div className="module-header">
          <p className="mono-label">the call</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            fight outcome model.
          </h2>
        </div>
        <div className="module-body">
          <div className="rounded-2xl border border-line bg-background/35 p-8 text-center">
            <p className="mono-label">data pending</p>
            <p className="mt-3 text-sm text-muted">
              Probabilities load once fighter stats are sourced.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { fighterA, fighterB, methodBreakdown, scenarios, confidence, tooClose } =
    outcomeModel;

  return (
    <section id="the-call" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">the call</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            fight outcome model.
          </h2>
          <p className="mt-3 text-sm text-muted">
            Style shape · form · stat differentials. Signal-based, not a guarantee.
          </p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>

      <div className="module-body space-y-6">
        {/* Giant animated probability bar */}
        <div className="rounded-2xl border border-line bg-background/40 p-6 md:p-8">
          <ProbabilityBar
            probA={fighterA.winProbability}
            probB={fighterB.winProbability}
            nameA={fighterA.fighterName}
            nameB={fighterB.fighterName}
            tooClose={tooClose}
          />
        </div>

        {/* Method breakdown */}
        <MethodBreakdown
          decision={methodBreakdown.decision}
          koTko={methodBreakdown.koTko}
          submission={methodBreakdown.submission}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/70 -mt-4">
          directional only · finish vs. decision lean · method model not independently validated
        </p>

        {/* 3 scenario cards — "swing" id gets renamed in display only */}
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={
                scenario.id === "swing"
                  ? { ...scenario, title: "what breaks the call" }
                  : scenario
              }
              suppressFighterLabel={
                tooClose && (scenario.id === "lean" || scenario.id === "upset")
              }
            />
          ))}
        </div>

        {/* Footer */}
        <p className="mono-label">
          signal-based · not a guarantee
        </p>
      </div>
    </section>
  );
}
