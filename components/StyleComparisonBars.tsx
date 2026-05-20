import { formatRanking } from "@/lib/display";
import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { SourcedFighter } from "@/lib/sourced-event";
import { getStyleRadarDimensions, hasEnoughStyleRadarData } from "@/lib/style-radar";
import { StyleRadar } from "./StyleRadar";
import { ModuleEmptyState } from "./ModuleEmptyState";
import type { NullableStyleProfile } from "@/lib/fight-shape";

interface StyleComparisonBarsProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
  styleClashLabel?: string;
}

// ─── Overlay radar — both fighters on one chart ───────────────────────────────
//
// Renders two polygons on the same axes so the shapes can be compared directly.
// Accent = Fighter A, Muted = Fighter B. This is the shape tab's visual signature.

function OverlayRadar({
  profileA,
  profileB,
  nameA,
  nameB,
}: {
  profileA: NullableStyleProfile | null | undefined;
  profileB: NullableStyleProfile | null | undefined;
  nameA: string;
  nameB: string;
}) {
  const SIZE = 360;
  const CENTER = SIZE / 2;
  const RADIUS = 110;
  const LABEL_RADIUS = 148;
  const RINGS = [25, 50, 75, 100];

  const dimsA = getStyleRadarDimensions(profileA);
  const dimsB = getStyleRadarDimensions(profileB);
  const canFillA = hasEnoughStyleRadarData(profileA) && dimsA.every((d) => d.hasData);
  const canFillB = hasEnoughStyleRadarData(profileB) && dimsB.every((d) => d.hasData);
  const count = dimsA.length;

  function point(index: number, value: number, radius = RADIUS) {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const scaled = (value / 100) * radius;
    return { x: CENTER + Math.cos(angle) * scaled, y: CENTER + Math.sin(angle) * scaled };
  }

  function pts(dims: ReturnType<typeof getStyleRadarDimensions>) {
    return dims.map((d, i) => point(i, d.hasData ? d.value ?? 0 : 0));
  }

  function toStr(points: Array<{ x: number; y: number }>) {
    return points.map((p) => `${p.x},${p.y}`).join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-full w-full overflow-visible"
      role="img"
      aria-label={`${nameA} vs ${nameB} style comparison radar`}
    >
      {/* Background halo */}
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 20} fill="rgba(245,158,11,0.025)" />
      <circle
        cx={CENTER} cy={CENTER} r={RADIUS + 30}
        fill="none" stroke="var(--line)" strokeOpacity={0.4} strokeDasharray="2 8"
      />

      {/* Ring guides */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={toStr(dimsA.map((_, i) => point(i, ring)))}
          fill="none"
          stroke="var(--line-strong)"
          strokeOpacity={ring === 100 ? 0.9 : 0.4}
          strokeWidth={ring === 100 ? 1.2 : 0.7}
        />
      ))}

      {/* Axis lines + labels */}
      {dimsA.map((dim, i) => {
        const end = point(i, 100);
        const lp = point(i, 100, LABEL_RADIUS);
        return (
          <g key={dim.key}>
            <line
              x1={CENTER} y1={CENTER} x2={end.x} y2={end.y}
              stroke="var(--line-strong)" strokeOpacity={0.45} strokeWidth={0.8}
            />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="middle"
              className="fill-subtle font-mono text-[10px] uppercase tracking-[0.12em]"
              opacity={0.9}
            >
              {dim.shortLabel}
            </text>
            <circle cx={end.x} cy={end.y} r={2} fill="var(--line-strong)" opacity={0.5} />
          </g>
        );
      })}

      {/* Fighter B shape (drawn first, under A) */}
      {canFillB && (
        <polygon
          points={toStr(pts(dimsB))}
          fill="rgba(139,154,180,0.12)"
          stroke="var(--muted)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeDasharray="5 3"
        />
      )}

      {/* Fighter A shape */}
      {canFillA && (
        <polygon
          points={toStr(pts(dimsA))}
          fill="rgba(245,158,11,0.12)"
          stroke="var(--accent)"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      )}

      {/* Data dots A */}
      {dimsA.map((d, i) => {
        if (!d.hasData || d.value == null) return null;
        const p = point(i, d.value);
        return (
          <circle key={d.key} cx={p.x} cy={p.y} r={4}
            fill="var(--background)" stroke="var(--accent)" strokeWidth={2}
          />
        );
      })}

      {/* Data dots B */}
      {dimsB.map((d, i) => {
        if (!d.hasData || d.value == null) return null;
        const p = point(i, d.value);
        return (
          <circle key={d.key} cx={p.x} cy={p.y} r={3.2}
            fill="var(--background)" stroke="var(--muted)" strokeWidth={1.8}
          />
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={3.5} fill="var(--subtle)" opacity={0.7} />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StyleComparisonBars({ fighterA, fighterB }: StyleComparisonBarsProps) {
  const fighterADimensions = getStyleRadarDimensions(fighterA.styleProfile);
  const fighterBDimensions = getStyleRadarDimensions(fighterB.styleProfile);

  const comparableRows = fighterADimensions.flatMap((row) => {
    const b = fighterBDimensions.find((d) => d.key === row.key);
    return row.hasData || b?.hasData ? [{ a: row, b }] : [];
  });

  if (!comparableRows.length) {
    return (
      <section id="section-shape" className="module-card scroll-mt-32">
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
    <section id="section-shape" className="module-card scroll-mt-32">
      <div className="module-header">
        <p className="mono-label">shape</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          style breakdown.
        </h2>
        <p className="mt-3 text-sm text-muted">
          Style-only comparison — shows how the matchup tilts, not who the model picks.
        </p>
      </div>

      <div className="module-body space-y-8">
        {/*
          ── Overlay comparison radar ─────────────────────────────────────────
          This is the signature asset: both fighter shapes on one canvas so
          the overlap and divergence read instantly. The individual radars
          below give per-fighter detail.
        */}
        <div className="rounded-2xl border border-accent/15 bg-background/60 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="mono-label">shape comparison</p>
            <div className="flex items-center gap-4 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-6 bg-accent" />
                {fighterA.name.split(" ").pop()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-5 border-t border-dashed border-muted" />
                {fighterB.name.split(" ").pop()}
              </span>
            </div>
          </div>
          <div className="mx-auto max-w-[340px] md:max-w-[380px]">
            <OverlayRadar
              profileA={fighterA.styleProfile}
              profileB={fighterB.styleProfile}
              nameA={fighterA.name}
              nameB={fighterB.name}
            />
          </div>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.1em] text-subtle/70">
            Shape fingerprint · directional only · not a winner call
          </p>
        </div>

        {/* Individual radars — side by side */}
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
            <div className="mx-auto mt-2 w-full max-w-[280px]">
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
            <div className="mx-auto mt-2 w-full max-w-[280px]">
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
            <p className="truncate text-sm font-semibold text-accent">{fighterA.name}</p>
            <p className="w-20 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">metric</p>
            <p className="truncate text-right text-sm font-semibold text-foreground">{fighterB.name}</p>
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
                  <span className={`data-text text-right text-sm tabular-nums ${!aLeads ? "text-foreground" : "text-muted"}`}>
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
                  <p className="data-text mt-1.5 text-[9px] uppercase tracking-[0.08em] text-subtle/60">
                    manually weighted
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
          signal-based · not a winner call · fight-shape-v0.2
        </p>
      </div>
    </section>
  );
}
