import { formatRanking } from "@/lib/display";
import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { SourcedFighter } from "@/lib/sourced-event";
import { getStyleRadarDimensions } from "@/lib/style-radar";
import { StyleRadar } from "./StyleRadar";
import { ModuleEmptyState } from "./ModuleEmptyState";

interface StyleComparisonBarsProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
  styleClashLabel?: string;
}

export function StyleComparisonBars({ fighterA, fighterB }: StyleComparisonBarsProps) {
  const fighterADimensions = getStyleRadarDimensions(fighterA.styleProfile);
  const fighterBDimensions = getStyleRadarDimensions(fighterB.styleProfile);

  const comparableRows = fighterADimensions.flatMap((row) => {
    const b = fighterBDimensions.find((d) => d.key === row.key);
    return row.hasData || b?.hasData ? [{ a: row, b }] : [];
  });

  if (!comparableRows.length) {
    return (
      <section id="section-shape" className="module-card scroll-mt-28">
        <div className="module-header">
          <p className="mono-label">shape</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            style breakdown.
          </h2>
        </div>
        <div className="module-body">
          <ModuleEmptyState
            label="style data"
            title="Style shape pending."
            body="Fighter data not yet sourced."
          />
        </div>
      </section>
    );
  }

  return (
    <section id="section-shape" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">shape</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          style breakdown.
        </h2>
        <p className="mt-3 text-sm text-muted">
          Style-only comparison. It does not override the model call. Opponent quality manually weighted.
        </p>
      </div>

      <div className="module-body space-y-6">
        {/* Radar charts — side by side */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Fighter A */}
          <div className="rounded-2xl border border-line bg-background/40 p-5">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="text-base font-semibold tracking-tight text-accent">
                {fighterA.name}
              </p>
              <p className="data-text text-xs text-subtle">
                {[fighterA.record, formatRanking(fighterA.ranking) !== "UNRANKED" ? formatRanking(fighterA.ranking) : null]
                  .filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="mx-auto mt-2 w-full max-w-[260px]">
              <StyleRadar
                profile={fighterA.styleProfile}
                tone="accent"
                title={fighterA.name}
              />
            </div>
          </div>

          {/* Fighter B */}
          <div className="rounded-2xl border border-line bg-background/40 p-5">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="text-base font-semibold tracking-tight text-foreground">
                {fighterB.name}
              </p>
              <p className="data-text text-xs text-subtle">
                {[fighterB.record, formatRanking(fighterB.ranking) !== "UNRANKED" ? formatRanking(fighterB.ranking) : null]
                  .filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="mx-auto mt-2 w-full max-w-[260px]">
              <StyleRadar
                profile={fighterB.styleProfile}
                tone="muted"
                title={fighterB.name}
              />
            </div>
          </div>
        </div>

        {/* Metric comparison bars */}
        <div className="overflow-hidden rounded-2xl border border-line bg-background/30">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-5 py-3">
            <p className="font-semibold text-sm text-accent truncate">{fighterA.name}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-subtle text-center w-20">metric</p>
            <p className="font-semibold text-sm text-foreground truncate text-right">{fighterB.name}</p>
          </div>

          {comparableRows.map(({ a, b }) => {
            const aValue = a.hasData ? (a.value ?? null) : null;
            const bValue = b?.hasData ? (b.value ?? null) : null;
            const max = Math.max(aValue ?? 0, bValue ?? 0, 1);
            const aLeads = (aValue ?? 0) >= (bValue ?? 0);

            return (
              <div key={a.key} className="border-b border-line px-5 py-4 last:border-b-0">
                {/* Label + scores */}
                <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <span className={`data-text text-sm tabular-nums ${aLeads ? "text-accent" : "text-muted"}`}>
                    {aValue != null ? aValue : "—"}
                  </span>
                  <span className="w-20 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
                    {a.shortLabel}
                  </span>
                  <span className={`data-text text-sm tabular-nums text-right ${!aLeads ? "text-foreground" : "text-muted"}`}>
                    {bValue != null ? bValue : "—"}
                  </span>
                </div>

                {/* Bar */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex justify-end rounded-l-full bg-surface-2">
                    {aValue != null ? (
                      <div
                        className="h-2 rounded-l-full bg-accent"
                        style={{ width: `${(aValue / max) * 100}%` }}
                      />
                    ) : null}
                  </div>
                  <div className="rounded-r-full bg-surface-2">
                    {bValue != null ? (
                      <div
                        className="h-2 rounded-r-full bg-muted"
                        style={{ width: `${(bValue / max) * 100}%` }}
                      />
                    ) : null}
                  </div>
                </div>

                {(a.provenance === "manual" || b?.provenance === "manual") ? (
                  <p className="mt-1.5 data-text text-[9px] uppercase tracking-[0.08em] text-subtle/60">
                    manually weighted
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
          signal-based · not a guarantee · fight-shape-v0.2
        </p>
      </div>
    </section>
  );
}
