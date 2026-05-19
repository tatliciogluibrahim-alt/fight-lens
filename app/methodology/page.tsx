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
              <p className="mono-label">methodology / phase 1</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-none tracking-normal md:text-7xl">
                how Fight Lens reads a matchup.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens turns public stats, reviewed context, and computed signals into a
                visual read. The goal is not certainty. The goal is to show the shape of the
                matchup clearly enough that a creator, analyst, or serious fan can explain what
                matters.
              </p>
            </div>

            <div className="border border-line bg-surface/70 p-5">
              <p className="mono-label">data stance</p>
              <div className="mt-5 divide-y divide-line">
                {provenanceRows.map((row) => (
                  <div key={row.label} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr]">
                    <p className="data-text text-sm text-accent">{row.label}</p>
                    <p className="text-sm leading-6 text-muted">{row.body}</p>
                  </div>
                ))}
              </div>
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

        {/* Brier score explanation */}
        <section className="section-shell py-8 md:py-12">
          <div className="border border-line bg-surface/70">
            <div className="border-b border-line p-5">
              <p className="mono-label">internal scoring metric</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                brier score.
              </h2>
            </div>
            <div className="p-5 space-y-4 text-sm leading-6 text-muted">
              <p>
                The Brier score measures the mean squared error of the model&apos;s win
                probabilities against actual outcomes. A score of <span className="data-text text-foreground">0.00</span> is
                perfect — every probability matched the result exactly.
                A score of <span className="data-text text-foreground">0.25</span> is random — equivalent to always calling 50/50.
              </p>
              <p>
                It penalises overconfidence more than a simple win/loss record does.
                Saying 90% on a fight you lose is a bigger error than saying 55%.
                This keeps the model honest about confidence, not just directionality.
              </p>
              <p>
                Brier score is tracked internally. It is not surfaced in the main record view
                because it requires context to read — a number like 0.18 means little without
                the baseline.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {[
                  { range: "0.00 – 0.12", label: "Well-calibrated" },
                  { range: "0.12 – 0.20", label: "Acceptable" },
                  { range: "0.20 – 0.25", label: "Near-random" },
                ].map(({ range, label }) => (
                  <div key={range} className="rounded-xl border border-line bg-background/40 px-4 py-4 text-center">
                    <p className="data-text text-sm text-foreground">{range}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
                  </div>
                ))}
              </div>
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
