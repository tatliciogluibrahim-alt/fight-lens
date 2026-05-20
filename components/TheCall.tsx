import { ProbabilityBar } from "@/components/ProbabilityBar";
import type { OutcomeScenario } from "@/lib/fight-outcome-model/types";
import type { PredictionViewModel, ReadStrength } from "@/lib/predictionViewModel";

interface TheCallProps {
  viewModel: PredictionViewModel;
}

// ─── Read strength chip ───────────────────────────────────────────────────────
//
// Sits directly under the win probability so the user sees how strong the read
// is without hunting for a separate badge.

const READ_STRENGTH_COPY: Record<ReadStrength, { label: string; tone: string; helper: string }> = {
  strong: {
    label: "Strong read",
    tone: "border-line-strong text-foreground bg-surface-2",
    helper: "Signals align across shape, form, and stats.",
  },
  usable: {
    label: "Usable read",
    tone: "border-line-strong text-foreground bg-surface-2",
    helper: "Clear lean, but not every signal points the same direction.",
  },
  thin: {
    label: "Thin read",
    tone: "border-line-strong text-muted bg-surface-2",
    helper: "Limited separation — treat the read as directional only.",
  },
  "data-pending": {
    label: "Data pending",
    tone: "border-line text-subtle bg-surface-2",
    helper: "Not enough sourced history to call this one yet.",
  },
};

function ReadStrengthChip({ readStrength }: { readStrength: ReadStrength }) {
  const copy = READ_STRENGTH_COPY[readStrength] ?? READ_STRENGTH_COPY["data-pending"];
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] ${copy.tone}`}
      >
        Read strength · {copy.label}
      </span>
      <p className="max-w-md text-xs leading-5 text-subtle">{copy.helper}</p>
    </div>
  );
}

// ─── Method lean (secondary, not peer to winner forecast) ─────────────────────
//
// The product spec is explicit: "Method probabilities should not feel as
// authoritative as the winner forecast." We collapse to a single highlighted
// lean + slim bars; hide methods below 8% behind "thin".

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
        <p className="text-xs text-subtle">
          {methodLeanNote}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-3xl">
          {top.label}
        </span>
        <span className="data-text text-sm text-muted">·  {top.value}% lean</span>
      </div>

      <div className="mt-5 space-y-2.5">
        {methods.map((m) => {
          const thin = m.value < 8;
          return (
            <div key={m.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted">{m.label}</span>
              <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`absolute left-0 h-full rounded-full ${m.id === top.id ? "bg-foreground/80" : "bg-muted/50"}`}
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
          <div className="mt-5">
            <ReadStrengthChip readStrength={vm.readStrength} />
          </div>
        </div>

        {/* Method lean — secondary */}
        <MethodLean viewModel={vm} />

        {/* The Call / Live Path / What Breaks the Call — required modules */}
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
