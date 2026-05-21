/*
 * TaleOfTape — dual-bar center-meeting metrics comparison.
 *
 * Three-column layout: [A value + bar] [center label] [bar + B value].
 * Bars grow outward from the center label — fighter A extends left,
 * fighter B extends right. The wider bar = the edge on that metric.
 * The winning side's value gets full foreground color; the trailing
 * side gets muted treatment.
 *
 * Data comes from fight.keyEdges — all sourced career averages.
 * Only rows where BOTH fighters have a non-null value are rendered.
 * No invented data, no model math — this is raw comparative stats only.
 */

import type { SourcedKeyEdge } from "@/lib/sourced-event";

interface TaleOfTapeProps {
  keyEdges:     SourcedKeyEdge[];
  fighterAName: string;
  fighterBName: string;
}

// Format a raw numeric value for display.
// Values >= 2 are assumed to be percentages (e.g. 54 → "54%").
// Values < 2 are decimal rates (e.g. 5.32 → "5.32", 0.1 → "0.10").
function fmtVal(v: number): string {
  if (v >= 2) return `${Math.round(v)}%`;
  if (v === 0) return "0";
  return v.toFixed(2);
}

export function TaleOfTape({ keyEdges, fighterAName, fighterBName }: TaleOfTapeProps) {
  // Only render rows where both sides have data
  const rows = keyEdges.filter(
    (e): e is SourcedKeyEdge & { fighterA: number; fighterB: number } =>
      e.fighterA != null && e.fighterB != null,
  );

  if (!rows.length) return null;

  const lastA = fighterAName.split(" ").pop() ?? fighterAName;
  const lastB = fighterBName.split(" ").pop() ?? fighterBName;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/70">
      {/* ── Fighter name header ──────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_120px_1fr] items-center gap-3 border-b border-line px-4 py-4 md:grid-cols-[1fr_180px_1fr] md:px-5">
        <div className="text-right">
          <p className="text-lg font-semibold tracking-tight text-foreground">{lastA}</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
            tale of the tape
          </p>
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">{lastB}</p>
        </div>
      </div>

      {/* ── Metric rows ──────────────────────────────────────────────── */}
      <div>
        {rows.map((edge) => {
          const a    = edge.fighterA;
          const b    = edge.fighterB;
          const max  = Math.max(a, b);
          const aPct = max > 0 ? (a / max) * 100 : 50;
          const bPct = max > 0 ? (b / max) * 100 : 50;
          const aWins = a > b;
          const bWins = b > a;

          return (
            <div
              key={edge.shortLabel}
              className="grid grid-cols-[1fr_120px_1fr] items-center gap-3 border-t border-line/60 px-4 py-4 md:grid-cols-[1fr_180px_1fr] md:px-5"
            >
              {/*
               * ── Fighter A side ────────────────────────────────────────
               * Layout: [value right-aligned] [bar — fill anchored right,
               * growing leftward from the center label]
               */}
              <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
                <span
                  className={`text-right font-mono text-base tabular-nums ${
                    aWins ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {fmtVal(a)}
                </span>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="absolute right-0 top-0 h-full rounded-full transition-all"
                    style={{
                      width:      `${aPct}%`,
                      background: aWins
                        ? "rgba(143,215,247,0.60)"
                        : "rgba(226,232,240,0.20)",
                    }}
                  />
                </div>
              </div>

              {/* ── Center label ─────────────────────────────────────────── */}
              <div className="text-center">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/70">
                  {edge.shortLabel}
                </p>
                <p className="mt-0.5 text-[9.5px] leading-tight text-subtle/60">
                  {edge.label}
                </p>
              </div>

              {/*
               * ── Fighter B side ────────────────────────────────────────
               * Layout: [bar — fill anchored left, growing rightward]
               *         [value left-aligned]
               */}
              <div className="grid grid-cols-[1fr_5rem] items-center gap-3">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{
                      width:      `${bPct}%`,
                      background: bWins
                        ? "rgba(143,215,247,0.60)"
                        : "rgba(226,232,240,0.20)",
                    }}
                  />
                </div>
                <span
                  className={`font-mono text-base tabular-nums ${
                    bWins ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {fmtVal(b)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-line/60 px-4 py-3 md:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/55">
          career averages · ufcstats · bars lean toward the edge
        </p>
      </div>
    </div>
  );
}
