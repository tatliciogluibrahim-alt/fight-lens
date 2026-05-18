import { hasCompleteExportStyleProfile } from "@/lib/fight-shape";
import { formatRanking } from "@/lib/display";
import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { SourcedFighter } from "@/lib/sourced-event";
import { getStyleRadarDimensions } from "@/lib/style-radar";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { StyleClashExportCard } from "./StyleClashExportCard";
import { StyleClashLabel } from "./StyleClashLabel";
import { StyleClashSaveButton } from "./StyleClashSaveButton";

interface StyleComparisonBarsProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
  styleClashLabel?: string;
}

export function StyleComparisonBars({ fighterA, fighterB, modelOutput, styleClashLabel }: StyleComparisonBarsProps) {
  const fighterADimensions = getStyleRadarDimensions(fighterA.styleProfile);
  const fighterBDimensions = getStyleRadarDimensions(fighterB.styleProfile);
  const comparableRows = fighterADimensions.flatMap((row) => {
    const b = fighterBDimensions.find((dimension) => dimension.key === row.key);
    return row.hasData || b?.hasData ? [{ a: row, b }] : [];
  });
  const exportFighterA = hasCompleteExportStyleProfile(fighterA.styleProfile)
    ? { name: fighterA.name, styleProfile: fighterA.styleProfile }
    : null;
  const exportFighterB = hasCompleteExportStyleProfile(fighterB.styleProfile)
    ? { name: fighterB.name, styleProfile: fighterB.styleProfile }
    : null;
  const canExport = Boolean(exportFighterA && exportFighterB);

  return (
    <section id="section-overlap" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mono-label">the clash</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">style fingerprints.</h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">
            Recent sourced signals · not a full-career scouting grade · opponent quality manually weighted
          </p>
        </div>
        {canExport ? (
          <StyleClashSaveButton fighterA={exportFighterA!} fighterB={exportFighterB!} styleClashLabel={styleClashLabel} />
        ) : null}
      </div>

      <div className="module-body space-y-6">
        {canExport ? (
          <div className="rounded-2xl border border-line bg-background/45 p-3 md:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <p className="mono-label">matchup export</p>
                <p className="mt-1 text-sm text-muted">Export the shape as a creator-ready overlap card.</p>
              </div>
              {styleClashLabel ? <StyleClashLabel label={styleClashLabel} copyable /> : null}
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[720px] md:min-w-0">
                <StyleClashExportCard fighterA={exportFighterA!} fighterB={exportFighterB!} styleClashLabel={styleClashLabel} />
              </div>
            </div>
          </div>
        ) : (
          <ModuleEmptyState
            label="style data"
            title="Style shape pending."
            body="Full fighter data not yet sourced."
          />
        )}

        {comparableRows.length ? (
          <div className="grid gap-8 rounded-2xl border border-line bg-background/30 p-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="space-y-6">
                <div>
                  <p className="mono-label">axis detail / fighter a</p>
                  <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-accent md:text-4xl">
                    {fighterA.name}
                  </h3>
                  <p className="data-text mt-2 text-sm text-muted">
                    {fighterA.record} / {formatRanking(fighterA.ranking)} / {fighterA.stance}
                  </p>
                </div>
                <div>
                  <p className="mono-label">axis detail / fighter b</p>
                  <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-foreground md:text-4xl">
                    {fighterB.name}
                  </h3>
                  <p className="data-text mt-2 text-sm text-muted">
                    {fighterB.record} / {formatRanking(fighterB.ranking)} / {fighterB.stance}
                  </p>
                </div>
                {styleClashLabel ? (
                  <StyleClashLabel label={styleClashLabel} copyable />
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-line rounded-2xl border border-line bg-background/35">
              {comparableRows.map(({ a, b }) => {
                const aValue = a.hasData ? a.value : null;
                const bValue = b?.hasData ? b.value ?? null : null;
                const max = Math.max(aValue ?? 0, bValue ?? 0, 1);

                return (
                  <div key={a.key} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className={`data-text text-sm ${(aValue ?? 0) >= (bValue ?? 0) ? "text-accent" : "text-muted"}`}>
                        {a.displayValue}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{a.label}</span>
                      <span className={`data-text text-sm ${(bValue ?? 0) > (aValue ?? 0) ? "text-foreground" : "text-muted"}`}>
                        {b?.displayValue ?? "Insufficient sample"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="flex justify-end rounded-l-full bg-background">
                        {aValue != null ? <div className="h-2.5 rounded-l-full bg-accent" style={{ width: `${(aValue / max) * 100}%` }} /> : null}
                      </div>
                      <div className="rounded-r-full bg-background">
                        {bValue != null ? <div className="h-2.5 rounded-r-full bg-muted" style={{ width: `${(bValue / max) * 100}%` }} /> : null}
                      </div>
                    </div>
                    {(a.provenance === "manual" || b?.provenance === "manual") ? (
                      <p className="data-text mt-2 text-[10px] uppercase tracking-[0.08em] text-subtle">
                        manual
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
