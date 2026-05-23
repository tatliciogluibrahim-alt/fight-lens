import type { OutcomeScenario } from "@/lib/fight-outcome-model/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";
import { CallConfidenceBand } from "./CallConfidenceBand";

interface TheCallProps {
  viewModel: PredictionViewModel;
}

// ─── Method lean ──────────────────────────────────────────────────────────────
//
// Secondary to the winner forecast. Rendered as a compact text-row breakdown
// so the three method rows read clearly without faint bar lines.
// No amber — this is not a winner signal.

// Threshold below which a method is considered "thin" signal — shown as a
// minimal dot marker rather than a filled bar so the visual hierarchy is clear.
const METHOD_THIN_THRESHOLD = 8;

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
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-subtle/70">
          directional only
        </span>
      </div>

      {/* Top method — primary read */}
      <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
        {top.label}
      </p>

      {/*
        Proportional bar rows.
        - Top method: accent-tinted fill at the actual percentage width.
        - Secondary methods: muted fill at the actual percentage width.
        - Thin methods (<8%): dot marker only — no fill bar so it never
          looks equal to an 80% KO/TKO bar.
      */}
      <div className="mt-4 space-y-3">
        {methods.map((m) => {
          const thin = m.value < METHOD_THIN_THRESHOLD;
          const isTop = m.id === top.id;
          return (
            <div key={m.id} className="space-y-1.5">
              {/* Label + value */}
              <div className="flex items-center justify-between gap-3">
                <span className={`text-sm ${isTop ? "font-medium text-foreground" : "text-muted"}`}>
                  {m.label}
                </span>
                <span
                  className={`data-text text-sm tabular-nums ${
                    thin ? "text-subtle/70" : isTop ? "text-foreground" : "text-muted"
                  }`}
                >
                  {thin ? "thin" : `${m.value}%`}
                </span>
              </div>

              {/* Proportional bar track */}
              {thin ? (
                /* Thin: tiny dot marker — no bar, prevents visual equality with strong methods */
                <div className="flex h-1.5 items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-subtle/30" />
                </div>
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isTop ? "bg-accent/80" : "bg-muted/55"
                    }`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              )}
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
// "why the model leans this way." is the SUPPORTING section. The FightReadSnapshot above the
// fold is the primary call display. This section explains why the model leans
// the way it does and what could flip it — it does not repeat the big
// winner/probability card.

export function TheCall({ viewModel: vm }: TheCallProps) {
  if (vm.callState === "insufficientData" || vm.callState === "pending") {
    // Hide the "data pending" placeholder on mobile — FightReadSnapshot already
    // surfaces the pending state above the fold. Showing a large empty card
    // makes the product look unfinished on small screens.
    return (
      <section className="module-card hidden sm:block">
        <div className="module-header">
          <p className="mono-label">pre-fight call</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">
            why the model leans this way.
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
        <p className="mono-label">pre-fight call</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">
          why the model leans this way.
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Directional model lean. Not a guarantee.
        </p>
      </div>

      <div className="module-body space-y-6">
        {/* ── Confidence band pick visualization ────────────────────────────
            Shows the model pick + probability as the visual anchor, with a
            horizontal track illustrating the model's confidence range.
            Replaces the plain text no-lean note with a proper visual treatment.
        */}
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80 p-5">
          <span
            aria-hidden="true"
            className="block h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent -mx-5 -mt-5 mb-5"
          />
          <CallConfidenceBand
            winnerName={vm.predictedWinner?.name ?? null}
            winnerProbability={vm.winnerProbability}
            loserName={vm.livePathFighter?.name ?? null}
            loserProbability={vm.loserProbability}
            readStrength={vm.readStrength}
            isTooCloseToCall={tooClose}
            fighterAName={vm.fighterA.name}
            fighterAProb={vm.fighterA.winProbability}
            fighterBName={vm.fighterB.name}
            fighterBProb={vm.fighterB.winProbability}
            rankingMismatch={vm.rankingMismatch}
          />
        </div>

        {/* Method lean */}
        <MethodLean viewModel={vm} />

        {/* The call / Counter path / What breaks the call */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      </div>
    </section>
  );
}
