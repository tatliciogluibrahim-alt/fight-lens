import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import type { SourcedFighter } from "@/lib/sourced-event";
import { getStyleRadarDimensions, hasEnoughStyleRadarData } from "@/lib/style-radar";
import { buildShapeNarrative, type NarrativeAxisCard } from "@/lib/fight-shape-model/shape-narrative";
import { ModuleEmptyState } from "./ModuleEmptyState";
import type { NullableStyleProfile } from "@/lib/fight-shape";

interface StyleComparisonBarsProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
  styleClashLabel?: string;
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
      return {
        border: "border-accent/25",
        bg: "bg-accent/[0.06]",
        labelTone: "text-accent",
      };
    case "swing":
      return {
        border: "border-line-strong",
        bg: "bg-surface-2/60",
        labelTone: "text-foreground",
      };
    case "closest":
      return {
        border: "border-line",
        bg: "bg-background/40",
        labelTone: "text-muted",
      };
    case "watching":
      return {
        border: "border-line",
        bg: "bg-background/40",
        labelTone: "text-muted",
      };
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
          <span className="text-accent">{card.scoreA}</span>
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

      {/* Fighter B shape drawn first (under) — staggered bloom for sequencing */}
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

      {/* Fighter A shape — primary accent, drawn last so the gold lands on top */}
      {canFillA && (
        <polygon
          points={toStr(pts(dimsA))}
          fill="rgba(245,158,11,0.12)"
          stroke="var(--accent)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          className="fl-radar-bloom fl-radar-bloom-delay"
        />
      )}

      {/* Data dots — native SVG <title> elements give per-axis tooltips on hover */}
      {dimsA.map((d, i) => {
        if (!d.hasData || d.value == null) return null;
        const p = point(i, d.value);
        return (
          <g key={`a-${d.key}`} className="fl-radar-bloom fl-radar-bloom-delay">
            <circle cx={p.x} cy={p.y} r={4}
              fill="var(--background)" stroke="var(--accent)" strokeWidth={2}
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

      {/* Centroid mark — soft pulse for "live read" feel */}
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

  // ── Narrative ───────────────────────────────────────────────────────────────
  // Single source of analyst-style copy: picks biggest/closest/swing axes and
  // writes plain-language sentences. Never names a winner. Honest about
  // thin samples.
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
      <section id="section-shape" className="module-card scroll-mt-32">
        <div className="module-header">
          <p className="mono-label">shape</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            shape fingerprint.
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

  // Sort axis breakdown rows by absolute delta — most-separating axes first
  // so the eye reads the strongest signals at the top.
  const sortedRows = [...comparableRows].sort((rowL, rowR) => {
    const a = rowL.a.hasData && rowL.b?.hasData
      ? Math.abs((rowL.a.value ?? 0) - (rowL.b.value ?? 0))
      : -1;
    const b = rowR.a.hasData && rowR.b?.hasData
      ? Math.abs((rowR.a.value ?? 0) - (rowR.b.value ?? 0))
      : -1;
    return b - a;
  });

  return (
    <section id="section-shape" className="module-card scroll-mt-32">
      <div className="module-header">
        <p className="mono-label accent-rail">fight shape</p>
        <h2 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          shape fingerprint.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          The style map. Watch where the shapes diverge — not the absolute scores.
          This is not the winner forecast.
        </p>
      </div>

      <div className="module-body space-y-7">
        {/*
          ── Signature overlay radar ───────────────────────────────────────────
          The single, central visual. Broadcast HUD treatment frames it as a
          scouting-room read, not a chart-library default. The individual
          side-by-side radars were removed in favour of this being the focus.
        */}
        <div className="relative overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-background/70 via-surface/40 to-background/70 p-5 md:p-7">
          {/* Corner registration marks */}
          <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-accent/30" />
          <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-accent/30" />
          <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-accent/30" />
          <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-accent/30" />

          {/* Header: label + fighter chips */}
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="mono-label">shape comparison</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] px-3 py-1 text-[11px] font-medium tracking-tight text-accent">
                <span className="size-2 rounded-full bg-accent" />
                {fighterA.name}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/80 px-3 py-1 text-[11px] font-medium tracking-tight text-muted">
                <span className="size-2 rounded-full bg-muted" />
                {fighterB.name}
              </span>
            </div>
          </div>

          {/* The radar — larger canvas on desktop, fluid on mobile */}
          <div className="mx-auto w-full max-w-[460px] md:max-w-[520px]">
            <OverlayRadar
              profileA={fighterA.styleProfile}
              profileB={fighterB.styleProfile}
              nameA={fighterA.name}
              nameB={fighterB.name}
            />
          </div>

          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.1em] text-subtle/80">
            shape fingerprint · not a winner forecast
          </p>
        </div>

        {/*
          ── What the shape says ───────────────────────────────────────────────
          Analyst-style cards. The biggest separator, the closest category, and
          a swing/counter-path. Never names a winner — describes style in fight
          language. Pulled from the same narrative helper as the call-tab
          headline, so the two views stay consistent.
        */}
        {narrative.headline ? (
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="mono-label">what the shape says</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-subtle/70">
                style-only
              </p>
            </div>
            <p className="text-base leading-7 text-foreground md:text-lg md:leading-8">
              {narrative.headline}
            </p>
            {narrative.cards.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {narrative.cards.map((card) => (
                  <ShapeCard key={`${card.kind}-${card.axisLabel}`} card={card} />
                ))}
              </div>
            ) : null}
            {narrative.caveat ? (
              <p className="mt-4 text-xs leading-5 text-subtle">{narrative.caveat}</p>
            ) : null}
          </div>
        ) : null}

        {/*
          ── Axis breakdown ────────────────────────────────────────────────────
          Sorted by absolute delta so the most-separating axes read first.
          Delta label makes it explicit that the bar shows shape signal, not
          a guaranteed advantage. Manually-weighted axes are flagged.
        */}
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="mono-label">axis breakdown</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-subtle/70">
              larger = stronger style signal
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-background/30">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-5 py-3">
              <p className="truncate text-sm font-semibold text-accent">{fighterA.name}</p>
              <p className="w-20 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">
                axis · Δ
              </p>
              <p className="truncate text-right text-sm font-semibold text-foreground">{fighterB.name}</p>
            </div>

            {sortedRows.map(({ a, b }) => {
              const aValue = a.hasData ? (a.value ?? null) : null;
              const bValue = b?.hasData ? (b.value ?? null) : null;
              const max = Math.max(aValue ?? 0, bValue ?? 0, 1);
              const aLeads = (aValue ?? 0) >= (bValue ?? 0);
              const bothPresent = aValue != null && bValue != null;
              const delta = bothPresent ? Math.abs(aValue - bValue) : null;

              return (
                <div key={a.key} className="border-b border-line px-5 py-4 last:border-b-0">
                  {/* Label + scores + Δ */}
                  <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <span className={`data-text text-sm tabular-nums ${aLeads ? "text-accent" : "text-muted"}`}>
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
          <p className="mt-3 text-[11px] leading-5 text-subtle/80">
            A larger number means a stronger style signal — it does not decide the fight.
          </p>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
          signal-based · not a winner call · fight-shape-v0.2
        </p>
      </div>
    </section>
  );
}
