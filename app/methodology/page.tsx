import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { fightShapeMetricDefinitions } from "@/lib/fight-shape";
import { getAccuracyMetrics } from "@/lib/accuracy";

export const metadata: Metadata = {
  title: "Methodology | Fight Lens",
  description: "How Fight Lens turns public stats, manual context, and derived signals into Fight Shape reads."
};

const provenanceRows = [
  {
    label: "public stats",
    body: "Public stat snapshots are used where they are available and complete enough."
  },
  {
    label: "reviewed context",
    body: "Human-reviewed context for style tags, opponent tiers, route labels, and corrections."
  },
  {
    label: "computed signals",
    body: "Readable 0-100 signals built from measured values plus reviewed context."
  }
];

const outputRows = [
  {
    label: "fight-shape",
    body: "The short tactical read: pressure points, fight pace, and the cleanest matchup question."
  },
  {
    label: "style-clash",
    body: "The head-to-head axis comparison used by the overlap card and roster map."
  },
  {
    label: "form-resume",
    body: "Recent form and resume strength, kept together so opponent quality stays visible."
  },
  {
    label: "round-trend",
    body: "Round-level evidence and confidence, especially where the available sample gets thin."
  },
  {
    label: "tactical-routes",
    body: "Repeatable routes each fighter can use to create controlled minutes."
  },
  {
    label: "prediction-brief",
    body: "Win probability and method breakdown, locked before the first bell and tracked against outcomes."
  }
];

const modelRows = [
  {
    label: "Style Pressure Index",
    status: "real",
    body: "Uses profile rates and recent control evidence to show which style creates matchup stress. It is not an outcome score."
  },
  {
    label: "Opponent Quality Adjusted Form",
    status: "partial",
    body: "Uses recent sourced results, methods, and recency. Opponent tiers are held out until that context is modeled cleanly."
  },
  {
    label: "Round Sustainability",
    status: "real when sampled",
    body: "Uses completed round stats to compare early, middle, and late signals. It stays hidden when late-round samples are thin."
  },
  {
    label: "Path Reliability",
    status: "partial",
    body: "Combines pressure, form, and sustainability only when all three have usable samples."
  },
  {
    label: "Context Signal Score",
    status: "deferred",
    body: "Reserved for Context Lens and Source Scout. No public context signal is added yet."
  }
];

function NumberPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="data-text inline-flex min-w-10 justify-center rounded-full border border-line bg-surface-2 px-3 py-2 text-xs text-subtle">
      {children}
    </span>
  );
}

export default function MethodologyPage() {
  const showDebug = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
  const metricGridClass = showDebug
    ? "grid gap-4 border-b border-line p-5 last:border-b-0 lg:grid-cols-[72px_190px_1fr_1fr_92px] lg:items-start"
    : "grid gap-4 border-b border-line p-5 last:border-b-0 lg:grid-cols-[72px_190px_1fr_1fr] lg:items-start";

  return (
    <>
      <AppHeader />
      <main>
        <section className="section-shell py-10 md:py-16">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
          >
            ← back
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <p className="mono-label">methodology</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-none tracking-normal md:text-7xl">
                how the model reads a matchup.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens turns public stats, reviewed context, and computed signals into a
                model call. The goal is not certainty — it is to show the shape of the matchup
                clearly enough that a creator, analyst, or serious fan can explain what matters.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface/70 p-5">
              <p className="mono-label">data stance</p>
              <div className="mt-5 divide-y divide-line">
                {provenanceRows.map((row) => (
                  <div key={row.label} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr]">
                    <p className="text-sm font-medium text-accent">{row.label}</p>
                    <p className="text-sm leading-6 text-muted">{row.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Plain English section */}
        <section className="section-shell py-8 md:py-12">
          <div className="rounded-2xl border border-line bg-surface/70 p-6 md:p-8">
            <p className="mono-label">plain english</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              the short version.
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-foreground">What the model uses</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Public stat history, recent form, style signals, and stat differentials between
                  the two fighters. Stats that depend on opponent context (defense, absorbed
                  strikes) come from each fighter&apos;s prior bouts where the detail data is available.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">What it does not know</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Camp news, injuries, weight cuts, mid-fight adjustments, judging quirks, or any
                  context that is not in a public stats record. The model is signal-based, not
                  omniscient.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">How calls are scored</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Win calls are scored as correct or incorrect against the official result.
                  Method (finish vs. decision) is tracked directionally — separately from the
                  winner call, because it&apos;s a coarser read.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">What read strength means</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Strong, usable, or thin — a plain-English summary of how confident the model is.
                  &quot;Thin&quot; means treat the call as directional only. Read strength sits next to
                  every win probability, not buried.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Why method lean is secondary</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Picking a winner is a binary check. Picking a method is a 3-way split with much
                  less signal in the data. The model surfaces a method lean for context, but
                  winner accuracy is the headline metric.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Why forecasts are not guarantees</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Fights are noisy. Even a well-calibrated 70% call loses ~3 in 10 times — that&apos;s
                  the model working correctly, not failing. The model record is the only place to
                  read accuracy honestly.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-line bg-background/40 p-4">
              <p className="text-sm font-semibold text-foreground">May 2026 — data repair</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Earlier backtests fell back to UFC averages for three defensive stats (sapm,
                striking defense, takedown defense) because opponent totals weren&apos;t stored in
                each fighter&apos;s history. After adding opponent totals into the pipeline, those
                stats now come from prior bouts where the fight detail data is available.
                Coverage is partial today — it improves as more events get ingested.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-background/40 p-4">
              <p className="text-sm font-semibold text-foreground">May 2026 — expanded historical backtest (n=253, 20-event corpus)</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                The historical backtest covers 253 fights across 20 completed events. Winner
                accuracy held at 66%, method accuracy moved to 58%, and Brier improved to 0.219.
                The model now trails the better-record baseline by 5 points, so it is directionally
                useful but not proven. The 60–80% confidence buckets still show overconfidence.
                More logged public calls are needed before any model grade unlocks.
                These backtests are <span className="text-foreground">retroactive validation runs</span> —
                they are not the same as logged pre-fight calls, and are listed separately on the
                Model Record page.
              </p>
            </div>
          </div>
        </section>

        <section className="section-shell py-8 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mono-label">fight shape model</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                first model pass.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                The model explains pressure, form, sustainability, and confidence. It does not
                publish outcome calls, and it returns Insufficient when the sample is too thin.
              </p>
            </div>

            <div className="overflow-hidden border border-line bg-surface/70">
              {modelRows.map((row) => (
                <div key={row.label} className="grid gap-3 border-b border-line p-5 last:border-b-0 md:grid-cols-[220px_120px_1fr]">
                  <h3 className="font-semibold tracking-normal">{row.label}</h3>
                  <p className="data-text text-xs uppercase tracking-[0.12em] text-accent">{row.status}</p>
                  <p className="text-sm leading-6 text-muted">{row.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-8 md:py-12">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono-label">fight shape metrics</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                the shared scoring spine.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              Each metric stays on a 0-100 scale so matchup modules, cards, and future outputs
              can speak the same language.
            </p>
          </div>

          <div className="overflow-hidden border border-line bg-surface/70">
            {fightShapeMetricDefinitions.map((metric, index) => (
              <div
                key={metric.key}
                className={metricGridClass}
              >
                <NumberPill>{String(index + 1).padStart(2, "0")}</NumberPill>
                <div>
                  <h3 className="font-semibold tracking-normal">{metric.label}</h3>
                  <p className="mono-label mt-2">{metric.shortLabel}</p>
                </div>
                <div className="text-sm leading-6 text-muted">
                  <p>{metric.definition}</p>
                  <p className="mt-2 text-subtle">{metric.scoreMeaning}</p>
                </div>
                <p className="data-text text-xs leading-6 text-subtle">
                  {metric.inputs.join(" / ")}
                </p>
                {showDebug ? (
                  <p className="data-text text-xs uppercase tracking-[0.12em] text-accent">
                    {metric.provenance}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell py-8 md:py-12">
          <div className="border border-line bg-surface/70">
            <div className="border-b border-line p-5">
              <p className="mono-label">model output contract</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                public outputs stay modular.
              </h2>
            </div>
            <div className="divide-y divide-line">
              {outputRows.map((row) => (
                <div key={row.label} className="grid gap-3 p-5 sm:grid-cols-[170px_1fr]">
                  <p className="data-text text-sm text-accent">{row.label}</p>
                  <p className="text-sm leading-6 text-muted">{row.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technical details */}
        <section className="section-shell py-8 md:py-12">
          <div className="rounded-2xl border border-line bg-surface/70">
            <div className="border-b border-line p-5">
              <p className="mono-label">technical details</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                brier score.
              </h2>
            </div>
            <div className="p-5 space-y-4 text-sm leading-6 text-muted">
              <p>
                The Brier score measures the mean squared error of the model&apos;s win
                probabilities against actual outcomes. <span className="text-foreground">Lower is better</span> —
                but the number matters most against a baseline.
              </p>
              <p>
                A score of <span className="data-text text-foreground">0.25</span> is the same as always
                calling 50/50. Anything below that means the model is contributing real signal.
                A score in the high teens or low twenties on UFC fights is a reasonable target;
                a confident, well-calibrated model could land lower. There is no universal
                &quot;good/bad&quot; range — context matters.
              </p>
              <p>
                Brier penalises overconfidence more than a simple win/loss record does.
                Saying 90% on a fight you lose is a bigger error than saying 55%. That keeps
                the model honest about confidence, not just directionality.
              </p>
              <p>
                Brier is tracked internally and reported here only. The main record page shows
                call accuracy and method accuracy — numbers a fan can read at a glance.
              </p>
            </div>
          </div>
        </section>

        {/* Model accuracy */}
        <section className="section-shell py-10 md:py-16">
          {(() => {
            const metrics = getAccuracyMetrics();
            return <ModelAccuracyCard metrics={metrics} />;
          })()}
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
