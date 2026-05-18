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
  leanA,
  leanB,
  tooClose,
}: {
  probA: number;
  probB: number;
  nameA: string;
  nameB: string;
  leanA: string;
  leanB: string;
  tooClose: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5 md:p-7">
      {/* Fighter labels */}
      <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
        <div>
          <p className="mono-label text-accent">{leanA}</p>
          <h3 className="mt-1.5 text-xl font-semibold leading-tight tracking-[-0.03em] md:text-2xl">
            {nameA}
          </h3>
        </div>
        <p className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">vs</p>
        <div className="text-right">
          <p className="mono-label">{leanB}</p>
          <h3 className="mt-1.5 text-xl font-semibold leading-tight tracking-[-0.03em] md:text-2xl">
            {nameB}
          </h3>
        </div>
      </div>

      {/* Probability numbers */}
      <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="data-text text-4xl font-light text-accent md:text-5xl">
          {probA}%
        </span>
        <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
          {tooClose ? (
            /* Even match — neutral bar */
            <div className="absolute inset-0 rounded-full bg-muted/30" />
          ) : (
            <>
              <div
                className="absolute left-0 top-0 h-full rounded-l-full bg-accent transition-all"
                style={{ width: `${probA}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full rounded-r-full bg-muted/50 transition-all"
                style={{ width: `${probB}%` }}
              />
            </>
          )}
        </div>
        <span className="data-text text-4xl font-light text-muted md:text-5xl">
          {probB}%
        </span>
      </div>

      {tooClose && (
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
          model sees no reliable lean — too close to separate
        </p>
      )}
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
          <div className="rounded-2xl border border-line bg-background/35 p-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              insufficient data
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              The model needs complete style pressure and form scores for both fighters to generate outcome probabilities. Check back once more fight data is sourced.
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
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Win probabilities and method breakdown derived from style shape, recent form, and stat differentials. Signal-based — not a guarantee.
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
          leanA={fighterA.leanLabel}
          leanB={fighterB.leanLabel}
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
