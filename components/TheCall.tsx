import type { FightOutcomeModelOutput, OutcomeScenario } from "@/lib/fight-outcome-model/types";

interface TheCallProps {
  outcomeModel: FightOutcomeModelOutput;
}

// ─── Win probability bar ──────────────────────────────────────────────────────

function ProbabilityBar({
  probA,
  probB,
  nameA,
  nameB,
  tooClose,
}: {
  probA: number;
  probB: number;
  nameA: string;
  nameB: string;
  tooClose: boolean;
}) {
  const favName = probA >= probB ? nameA : nameB;
  const favProb = Math.max(probA, probB);

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5 md:p-7">
      {/* Fighter names */}
      <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <h3 className="text-lg font-semibold leading-tight tracking-[-0.03em]">{nameA}</h3>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">vs</p>
        <h3 className="text-right text-lg font-semibold leading-tight tracking-[-0.03em]">{nameB}</h3>
      </div>

      {/* Probability numbers + bar */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className={`data-text text-5xl font-light ${!tooClose && probA >= probB ? "text-accent" : "text-muted"}`}>
          {probA}%
        </span>
        <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
          {tooClose ? (
            <div className="absolute inset-0 rounded-full bg-muted/25" />
          ) : (
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all"
              style={{ width: `${probA}%` }}
            />
          )}
        </div>
        <span className={`data-text text-5xl font-light ${!tooClose && probB > probA ? "text-accent" : "text-muted"}`}>
          {probB}%
        </span>
      </div>

      {/* Single lean statement */}
      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
        {tooClose
          ? "too close to separate — either side viable"
          : `model leans ${favName} · ${favProb}% win probability`}
      </p>
    </div>
  );
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
          className="rounded-xl border border-line bg-background/35 px-4 py-3 text-center"
        >
          <p className="data-text text-2xl text-foreground">{value}%</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, suppressFighterLabel = false }: { scenario: OutcomeScenario; suppressFighterLabel?: boolean }) {
  const accentIds: OutcomeScenario["id"][] = ["lean"];
  const isAccent = accentIds.includes(scenario.id);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        isAccent
          ? "border-accent/30 bg-accent/5"
          : "border-line bg-background/35"
      }`}
    >
      <p className={`mono-label ${isAccent ? "text-accent" : ""}`}>
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
          <div className="rounded-2xl border border-line bg-background/35 p-5 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              data pending
            </p>
            <p className="mt-2 text-sm text-muted">
              Probabilities load once fighter stats are sourced.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { fighterA, fighterB, methodBreakdown, scenarios, confidence, modelVersion, tooClose } =
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
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2">
          <span
            className={`size-2 rounded-full ${
              confidence === "high"
                ? "bg-accent"
                : confidence === "medium"
                  ? "bg-muted"
                  : "bg-subtle"
            }`}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {confidence} confidence
          </span>
        </div>
      </div>

      <div className="module-body space-y-4">
        {/* Win probability */}
        <ProbabilityBar
          probA={fighterA.winProbability}
          probB={fighterB.winProbability}
          nameA={fighterA.fighterName}
          nameB={fighterB.fighterName}
          tooClose={tooClose}
        />

        {/* Method breakdown */}
        <MethodBreakdown
          decision={methodBreakdown.decision}
          koTko={methodBreakdown.koTko}
          submission={methodBreakdown.submission}
        />

        {/* 3 scenario cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              suppressFighterLabel={tooClose && scenario.id === "lean"}
            />
          ))}
        </div>

        {/* Model footer */}
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/70">
          {modelVersion} · signal-based · not a guarantee
        </p>
      </div>
    </section>
  );
}
