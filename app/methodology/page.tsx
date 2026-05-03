import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { creatorExportStrategy } from "@/lib/creator-export-strategy";
import { fightShapeExportAxes, fightShapeMetricDefinitions } from "@/lib/fight-shape";

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
    label: "creator-card-brief",
    body: "A portable summary for export formats once each module is stable."
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
            href="/events/ufc-328/chimaev-strickland"
            className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
          >
            back to main lens
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
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mono-label">export axes</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                six-axis creator view.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                The public overlap card compresses the full metric set into six readable axes.
                This keeps the export scannable without changing the underlying metric contract.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {fightShapeExportAxes.map((axis) => (
                <div key={axis.key} className="border border-line bg-surface/65 p-5">
                  <p className="mono-label">{axis.metricKeys.join(" / ")}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-normal">{axis.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{axis.definition}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-8 md:py-12">
          <div className="grid gap-6 lg:grid-cols-2">
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

            <div className="border border-line bg-surface/70">
              <div className="border-b border-line p-5">
                <p className="mono-label">creator export strategy</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                  portable, not noisy.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">{creatorExportStrategy.principle}</p>
              </div>
              <div className="divide-y divide-line">
                {creatorExportStrategy.items.map((item) => (
                  <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div>
                      <p className="font-semibold tracking-normal">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{item.purpose}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span className="rounded-full border border-line bg-background/65 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                        {item.format}
                      </span>
                      <span className="rounded-full border border-line bg-background/65 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
