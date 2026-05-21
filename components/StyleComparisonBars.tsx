import type { SourcedFighter } from "@/lib/sourced-event";
import { getStyleRadarDimensions, hasEnoughStyleRadarData } from "@/lib/style-radar";
import { buildShapeNarrative, type NarrativeAxisCard } from "@/lib/fight-shape-model/shape-narrative";
import { ModuleEmptyState } from "./ModuleEmptyState";
import type { NullableStyleProfile } from "@/lib/fight-shape";

interface StyleComparisonBarsProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  /**
   * Canonical predicted-winner fighter id from the model call. Used by the
   * narrative helper to direct the "swing category" toward the underdog so
   * the shape section reads as a counter-path, never a winner forecast.
   */
  predictedWinnerId?: string | null;
}

// ─── "What the shape says" cards ─────────────────────────────────────────────

function shapeCardTone(kind: NarrativeAxisCard["kind"]) {
  switch (kind) {
    case "biggest-edge":
    case "swing":
      return { border: "border-line-strong", bg: "bg-surface-2/60", labelTone: "text-foreground" };
    case "closest":
    case "watching":
      return { border: "border-line", bg: "bg-background/40", labelTone: "text-muted" };
  }
}

function ShapeCard({ card }: { card: NarrativeAxisCard }) {
  const tone = shapeCardTone(card.kind);
  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`mono-label ${tone.labelTone}`}>{card.title}</p>
        {card.delta != null ? (
          <span className="data-text text-[10px] uppercase tracking-[0.12em] text-subtle">
            Δ {card.delta}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-base font-semibold leading-tight tracking-tight text-foreground">
        {card.axisLabel}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
      {card.scoreA != null && card.scoreB != null ? (
        <p className="data-text mt-3 text-[10px] uppercase tracking-[0.12em] text-subtle">
          <span className="text-foreground">{card.scoreA}</span>
          <span className="text-subtle/60"> / </span>
          <span>{card.scoreB}</span>
        </p>
      ) : null}
    </div>
  );
}

// ─── Overlay radar — both fighters on one chart ───────────────────────────────
//
// Renders two polygons on the same axes so the shapes can be compared directly.
// Off-white = Fighter A, muted slate = Fighter B. Neither color is a winner forecast.

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
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 20} fill="rgba(226,232,240,0.018)" />
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

      {/* Fighter B shape drawn first (under) */}
      {canFillB && (
        <polygon
          points={toStr(pts(dimsB))}
          fill="rgba(139,154,180,0.12)"
          stroke="var(--muted)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeDasharray="5 3"
          className="fl-radar-bloom"
        />
      )}

      {/* Fighter A shape — drawn last; not styled as a winner call */}
      {canFillA && (
        <polygon
          points={toStr(pts(dimsA))}
          fill="rgba(226,232,240,0.08)"
          stroke="var(--foreground)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          className="fl-radar-bloom fl-radar-bloom-delay"
        />
      )}

      {/* Data dots with per-axis tooltips */}
      {dimsA.map((d, i) => {
        if (!d.hasData || d.value == null) return null;
        const p = point(i, d.value);
        return (
          <g key={`a-${d.key}`} className="fl-radar-bloom fl-radar-bloom-delay">
            <circle cx={p.x} cy={p.y} r={4}
              fill="var(--background)" stroke="var(--foreground)" strokeWidth={2}
              className="fl-radar-dot"
            >
              <title>{`${nameA} · ${d.label}: ${d.value}`}</title>
            </circle>
          </g>
        );
      })}

      {dimsB.map((d, i) => {
        if (!d.hasData || d.value == null) return null;
        const p = point(i, d.value);
        return (
          <g key={`b-${d.key}`} className="fl-radar-bloom">
            <circle cx={p.x} cy={p.y} r={3.2}
              fill="var(--background)" stroke="var(--muted)" strokeWidth={1.8}
              className="fl-radar-dot"
            >
              <title>{`${nameB} · ${d.label}: ${d.value}`}</title>
            </circle>
          </g>
        );
      })}

      {/* Centroid mark */}
      <circle cx={CENTER} cy={CENTER} r={3.5} fill="var(--subtle)" className="fl-radar-centroid" />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StyleComparisonBars({
  fighterA,
  fighterB,
  predictedWinnerId = null,
}: StyleComparisonBarsProps) {
  const fighterADimensions = getStyleRadarDimensions(fighterA.styleProfile);
  const fighterBDimensions = getStyleRadarDimensions(fighterB.styleProfile);

  const comparableRows = fighterADimensions.flatMap((row) => {
    const b = fighterBDimensions.find((d) => d.key === row.key);
    return row.hasData || b?.hasData ? [{ a: row, b }] : [];
  });

  const narrative = buildShapeNarrative({
    fighterAName: fighterA.name,
    fighterAId: fighterA.id,
    fighterBName: fighterB.name,
    fighterBId: fighterB.id,
    profileA: fighterA.styleProfile,
    profileB: fighterB.styleProfile,
    predictedWinnerId,
  });

  if (!comparableRows.length) {
    return (
      <section className="module-card">
        <div className="module-header">
          <p className="mono-label">fight shape</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            fight shape.
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

  // Sort by absolute delta — most-separating axes first
  const sortedRows = [...comparableRows].sort((rowL, rowR) => {
    const a = rowL.a.hasData && rowL.b?.hasData
      ? Math.abs((rowL.a.value ?? 0) - (rowL.b.value ?? 0)) : -1;
    const b = rowR.a.hasData && rowR.b?.hasData
      ? Math.abs((rowR.a.value ?? 0) - (rowR.b.value ?? 0)) : -1;
    return b - a;
  });

  return (
    <section className="module-card">
      <div className="module-header">
        <p className="mono-label">fight shape</p>
        <h2 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          fight shape.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Shape explains where the matchup tilts. It does not replace the model call.
        </p>
      </div>

      <div className="module-body space-y-7">
        {/*
          ── Signature overlay radar ───────────────────────────────────────────
          Single central visual. Both fighters overlaid on one chart so shapes
          can be compared directly. Neither polygon color implies a winner.
        */}
        <div className="relative overflow-visible rounded-3xl border border-line-strong/60 bg-gradient-to-br from-background/70 via-surface/40 to-background/70 p-5 md:p-7">
          {/* Corner registration marks */}
          <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-line-strong" />
          <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-line-strong" />
          <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-line-strong" />
          <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-line-strong" />

          {/* Header: label + neutral fighter legend */}
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mono-label">shape fingerprint</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-subtle/75">
                style map only · not a winner forecast
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium tracking-tight">
              <span className="inline-flex items-center gap-2 text-foreground">
                <span className="h-px w-7 bg-foreground/80" />
                {fighterA.name}
              </span>
              <span className="inline-flex items-center gap-2 text-muted">
                <span className="h-px w-7 border-t border-dashed border-muted" />
                {fighterB.name}
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[340px] sm:max-w-[460px] md:max-w-[520px]">
            <OverlayRadar
              profileA={fighterA.styleProfile}
              profileB={fighterB.styleProfile}
              nameA={fighterA.name}
              nameB={fighterB.name}
            />
          </div>
        </div>

        {/*
          ── Shape insight cards ───────────────────────────────────────────────
          Biggest-edge, closest, and swing cards each add distinct information.
          Never identifies a winner forecast.
        */}
        {narrative.headline ? (
          <div className="rounded-2xl border border-line bg-background/35 p-4">
            <p className="mono-label">what the shape says</p>
            <p className="mt-2 text-sm leading-6 text-muted">{narrative.headline}</p>
          </div>
        ) : null}

        {narrative.cards.length > 0 ? (
          <div>
            <p className="mb-3 mono-label">shape insights</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {narrative.cards.slice(0, 3).map((card) => (
                <ShapeCard key={`${card.kind}-${card.axisLabel}`} card={card} />
              ))}
            </div>
            {narrative.caveat ? (
              <p className="mt-4 text-xs leading-5 text-subtle">{narrative.caveat}</p>
            ) : null}
          </div>
        ) : null}

        {/*
          ── Axis breakdown ────────────────────────────────────────────────────
          Collapsed by default. Sorted by absolute delta — strongest signals first.
        */}
        <details className="group overflow-hidden rounded-2xl border border-line bg-background/25">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="mono-label">full axis breakdown</p>
              <p className="mt-1 text-xs text-subtle">Larger number = stronger style signal.</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted group-open:hidden">show</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted group-open:inline">hide</span>
          </summary>

          <div className="border-t border-line p-4 md:p-5">
            <div className="overflow-hidden rounded-2xl border border-line bg-background/30">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-5 py-3">
                <p className="truncate text-sm font-semibold text-foreground">{fighterA.name}</p>
                <p className="w-20 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">axis · Δ</p>
                <p className="truncate text-right text-sm font-semibold text-foreground">{fighterB.name}</p>
              </div>

              {sortedRows.map(({ a, b }) => {
                const aValue = a.hasData ? (a.value ?? null) : null;
                const bValue = b?.hasData ? (b.value ?? null) : null;
                const max = Math.max(aValue ?? 0, bValue ?? 0, 1);
                const bothPresent = aValue != null && bValue != null;
                const delta = bothPresent ? Math.abs(aValue - bValue) : null;

                return (
                  <div key={a.key} className="border-b border-line px-5 py-4 last:border-b-0">
                    <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <span className="data-text text-sm tabular-nums text-foreground">
                        {aValue != null ? aValue : "—"}
                      </span>
                      <div className="flex w-20 flex-col items-center gap-0.5">
                        <span className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
                          {a.shortLabel}
                        </span>
                        {delta != null && delta > 0 ? (
                          <span className="data-text text-[9px] uppercase tracking-[0.1em] text-subtle/70">
                            Δ {delta}
                          </span>
                        ) : null}
                      </div>
                      <span className="data-text text-right text-sm tabular-nums text-muted">
                        {bValue != null ? bValue : "—"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <div className="flex justify-end rounded-l-full bg-surface-2">
                        {aValue != null ? (
                          <div
                            className="h-2 rounded-l-full bg-foreground/80"
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
            <p className="mt-3 text-[11px] leading-5 text-subtle/80">
              These rows compare style signals only. They do not decide the fight.
            </p>
          </div>
        </details>

        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
          fight-shape-v0.2
        </p>
      </div>
    </section>
  );
}
