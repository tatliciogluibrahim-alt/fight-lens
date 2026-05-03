import { fightShapeMetricDefinitions } from "@/lib/fight-shape";
import type { Fighter } from "@/lib/types";
import { StyleClashExportCard } from "./StyleClashExportCard";
import { StyleClashSaveButton } from "./StyleClashSaveButton";

interface StyleComparisonBarsProps {
  fighterA: Fighter;
  fighterB: Fighter;
  styleClashLabel?: string;
}

export function StyleComparisonBars({ fighterA, fighterB, styleClashLabel }: StyleComparisonBarsProps) {
  return (
    <section id="section-overlap" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">02 / style clash</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">the overlap.</h2>
        </div>
        <StyleClashSaveButton fighterA={fighterA} fighterB={fighterB} />
      </div>

      <div className="module-body space-y-6">
        <div className="rounded-2xl border border-line bg-background/45 p-3 md:p-4">
          <StyleClashExportCard fighterA={fighterA} fighterB={fighterB} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <div className="space-y-6">
              <div>
                <p className="mono-label">fighter a</p>
                <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-accent md:text-4xl">
                  {fighterA.name}
                </h3>
                <p className="data-text mt-2 text-sm text-muted">
                  {fighterA.record} / {fighterA.stance}
                </p>
              </div>
              <div>
                <p className="mono-label">fighter b</p>
                <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-foreground md:text-4xl">
                  {fighterB.name}
                </h3>
                <p className="data-text mt-2 text-sm text-muted">
                  {fighterB.record} / {fighterB.stance}
                </p>
              </div>
              {styleClashLabel ? (
                <span className="inline-flex rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {styleClashLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="divide-y divide-line rounded-2xl border border-line bg-background/35">
            {fightShapeMetricDefinitions.map((row) => {
              const a = fighterA.styleProfile[row.key];
              const b = fighterB.styleProfile[row.key];
              const max = Math.max(a, b, 1);

              return (
                <div key={row.key} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className={`data-text text-sm ${a >= b ? "text-accent" : "text-muted"}`}>
                      {a}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{row.label}</span>
                    <span className={`data-text text-sm ${b > a ? "text-foreground" : "text-muted"}`}>
                      {b}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="flex justify-end rounded-l-full bg-background">
                      <div className="h-2.5 rounded-l-full bg-accent" style={{ width: `${(a / max) * 100}%` }} />
                    </div>
                    <div className="rounded-r-full bg-background">
                      <div className="h-2.5 rounded-r-full bg-muted" style={{ width: `${(b / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
