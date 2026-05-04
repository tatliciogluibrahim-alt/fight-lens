
interface CreatorMetric {
  label: string;
  value: string;
}

interface CreatorCardSamplesProps {
  fightLabel: string;
  eventLabel: string;
  keyRead: string;
  resultLabel: string;
  metrics: CreatorMetric[];
}

function CardMetric({ label, value }: CreatorMetric) {
  return (
    <div className="border border-line bg-background/55 p-3">
      <p className="mono-label">{label}</p>
      <p className="data-text mt-2 text-xl text-foreground">{value}</p>
    </div>
  );
}

export function CreatorCardSamples({
  fightLabel,
  eventLabel,
  keyRead,
  resultLabel,
  metrics
}: CreatorCardSamplesProps) {
  return (
    <section className="module-card">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">creator cards / samples</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            exportable blocks.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            These are static previews for feedback: strong headline, one proof layer, clean metadata.
          </p>
        </div>
      </div>

      <div className="module-body grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="aspect-video border border-line bg-background p-5 md:p-7">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center justify-between gap-4">
              <p className="mono-label">fight lens / 16:9</p>
              <p className="data-text text-xs text-subtle">{eventLabel}</p>
            </div>

            <div>
              <p className="data-text text-sm text-accent">{fightLabel}</p>
              <h3 className="mt-3 max-w-2xl text-4xl font-semibold leading-[0.95] tracking-[-0.055em] md:text-6xl">
                control route held.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted md:text-base md:leading-7">
                {keyRead}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {metrics.slice(0, 3).map((metric) => (
                <CardMetric key={metric.label} {...metric} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="aspect-[9/16] border border-line bg-surface-2 p-5">
            <div className="flex h-full flex-col justify-between">
              <p className="mono-label">story / 9:16</p>
              <div>
                <p className="data-text text-sm text-accent">{fightLabel}</p>
                <h3 className="mt-3 text-4xl font-semibold leading-[0.94] tracking-[-0.055em]">
                  model vs actual.
                </h3>
              </div>
              <div className="space-y-3">
                {metrics.slice(0, 2).map((metric) => (
                  <CardMetric key={metric.label} {...metric} />
                ))}
                <p className="data-text text-xs text-subtle">{resultLabel}</p>
              </div>
            </div>
          </div>

          <div className="min-h-64 border border-line bg-background/55 p-5">
            <div className="flex h-full flex-col justify-between gap-8">
              <p className="mono-label">x card / compact</p>
              <div>
                <h3 className="text-3xl font-semibold leading-none tracking-[-0.05em]">
                  the evidence changed the exchange.
                </h3>
                <p className="mt-4 text-sm leading-6 text-muted">
                  Takedown threat reduced clean boxing minutes and converted position into round control.
                </p>
              </div>
              <p className="data-text text-xs text-subtle">{resultLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
