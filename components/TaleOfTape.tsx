/*
 * TaleOfTape — comparative metrics with bar-per-row layout.
 *
 * Mobile (< sm): Single-bar rows — [A value] [bar fill] [LABEL] [B value].
 *   The bar fills left → right proportional to A's share of (A + B).
 *   Accent fill when A has the edge; muted fill when B leads.
 *   A and B values are highlighted in foreground when that side leads.
 *
 * Desktop (sm+): Three-column dual-bar — bars grow outward from the center
 *   label, meeting symmetrically. A bar anchored right, B bar anchored left.
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
      <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:grid sm:grid-cols-[1fr_120px_1fr] sm:gap-3 md:grid-cols-[1fr_180px_1fr] md:px-5">
        <p className="text-base font-semibold tracking-tight text-foreground sm:text-right sm:text-lg">{lastA}</p>
        <p className="hidden text-center font-mono text-[10px] uppercase tracking-[0.16em] text-subtle sm:block">
          tale of the tape
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-subtle sm:hidden">
          tale of the tape
        </p>
        <p className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{lastB}</p>
      </div>

      {/* ── Metric rows ──────────────────────────────────────────────── */}
      <div>
        {rows.map((edge) => {
          const a    = edge.fighterA;
          const b    = edge.fighterB;
          const total = a + b;
          const aWins = a > b;
          const bWins = b > a;

          // Mobile: bar fill = A's share of total (left → right)
          const aSharePct = total > 0 ? (a / total) * 100 : 50;

          // Desktop: proportional to max (bars grow from center outward)
          const max  = Math.max(a, b);
          const aPct = max > 0 ? (a / max) * 100 : 50;
          const bPct = max > 0 ? (b / max) * 100 : 50;

          return (
            <div key={edge.shortLabel} className="border-t border-line/60">
              {/* ── Mobile row: [A val] [bar] [LABEL] [B val] ─────────── */}
              <div className="grid grid-cols-[2.5rem_1fr_6rem_2.5rem] items-center gap-2 px-4 py-3 sm:hidden">
                {/* A value */}
                <span
                  className={`text-right font-mono text-xs tabular-nums ${
                    aWins ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {fmtVal(a)}
                </span>

                {/* Single proportional bar — fills left → right */}
                <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width:      `${aSharePct}%`,
                      background: aWins
                        ? "rgba(143,215,247,0.65)"
                        : "rgba(226,232,240,0.22)",
                    }}
                  />
                </div>

                {/* Center label */}
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/80">
                  {edge.shortLabel}
                </p>

                {/* B value */}
                <span
                  className={`font-mono text-xs tabular-nums ${
                    bWins ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {fmtVal(b)}
                </span>
              </div>

              {/* ── Desktop row: dual bars meeting at center label ─────── */}
              <div className="hidden grid-cols-[1fr_120px_1fr] items-center gap-3 px-4 py-4 sm:grid md:grid-cols-[1fr_180px_1fr] md:px-5">
                {/* Fighter A side: [value] [bar anchored right] */}
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

                {/* Center label */}
                <div className="text-center">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/70">
                    {edge.shortLabel}
                  </p>
                  <p className="mt-0.5 text-[9.5px] leading-tight text-subtle/60">
                    {edge.label}
                  </p>
                </div>

                {/* Fighter B side: [bar anchored left] [value] */}
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
            </div>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-line/60 px-4 py-3 md:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/55">
          career averages · ufcstats · bar shows fighter a share
        </p>
      </div>
    </div>
  );
}
