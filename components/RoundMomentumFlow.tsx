/*
 * RoundMomentumFlow, projected round-by-round win probability chart.
 *
 * Uses each fighter's historical round model (earlyThreat / lateEvidence /
 * per-round scores) to project how the probability might shift across rounds
 * if the fight plays out as the model expects.
 *
 * Labeled explicitly as "projected momentum", this is derived from historical
 * round data, NOT a per-round prediction or guarantee. If a fighter's round
 * model lacks enough data, a pending state is shown instead.
 *
 * Formula: for each round r, rawA = baseA × sigA, rawB = baseB × sigB.
 * Normalize so they sum to 1. sigA/sigB come from fighter.roundModel.roundScores
 * (0–100 scale), falling back to earlyThreat / lateEvidence when null.
 *
 * All probabilities flow from the canonical predictionViewModel , 
 * no independent winner computation here.
 */

import type { SourcedFighter } from "@/lib/sourced-event";

export interface RoundMomentumFlowProps {
  fighterA:              SourcedFighter;
  fighterB:              SourcedFighter;
  rounds:                3 | 5;
  /** Fighter A's win probability 0–100, from vm.fighterA.winProbability */
  fighterAWinProbability: number;
  /** Fighter B's win probability 0–100, from vm.fighterB.winProbability */
  fighterBWinProbability: number;
  /** The canonical predicted winner id, used to color the chart only */
  predictedWinnerId:     string | null;
}

// ─── Round signal helpers ─────────────────────────────────────────────────────

function roundSignal(fighter: SourcedFighter, roundNum: number): number {
  const rm   = fighter.roundModel;
  const rs   = rm.roundScores.find((r) => r.round === roundNum);
  if (rs?.score != null) return rs.score;
  // Fallback: early threat covers R1-R2, late evidence covers R3+
  if (roundNum <= 2) return rm.earlyThreat ?? 50;
  return rm.lateEvidence ?? rm.earlyThreat ?? 50;
}

interface RoundPoint {
  rd: string;
  a:  number;  // 0–1
  b:  number;  // 0–1
}

function computeFlow(
  fighterA: SourcedFighter,
  fighterB: SourcedFighter,
  baseA:    number,   // 0–1
  baseB:    number,   // 0–1
  rounds:   3 | 5,
): RoundPoint[] {
  const labels = rounds === 5
    ? ["OPEN", "R1", "R2", "R3", "R4", "R5"]
    : ["OPEN", "R1", "R2", "R3"];

  return labels.map((rd, i) => {
    if (i === 0) return { rd, a: baseA, b: baseB };

    const sigA = roundSignal(fighterA, i) / 100;
    const sigB = roundSignal(fighterB, i) / 100;
    const rawA = baseA * sigA;
    const rawB = baseB * sigB;
    const total = rawA + rawB;

    if (total === 0) return { rd, a: baseA, b: baseB };

    const a = Math.round((rawA / total) * 1000) / 1000;
    return { rd, a, b: Math.round((1 - a) * 1000) / 1000 };
  });
}

// ─── SVG path helpers ─────────────────────────────────────────────────────────

const W   = 800;
const H   = 270;
const PAD = { l: 40, r: 60, t: 24, b: 44 };
const iW  = W - PAD.l - PAD.r;
const iH  = H - PAD.t - PAD.b;

function xAt(i: number, n: number): number {
  return PAD.l + (i / (n - 1)) * iW;
}
function yAt(p: number): number {
  return PAD.t + (1 - p) * iH;
}

function buildPath(points: RoundPoint[], key: "a" | "b"): string {
  return points
    .map((d, i) => {
      const x = xAt(i, points.length);
      const y = yAt(d[key]);
      if (i === 0) return `M${x},${y}`;
      const px = xAt(i - 1, points.length);
      const py = yAt(points[i - 1][key]);
      const cx = (px + x) / 2;
      return `C${cx},${py} ${cx},${y} ${x},${y}`;
    })
    .join(" ");
}

function buildArea(points: RoundPoint[], key: "a" | "b"): string {
  const n    = points.length;
  const line = buildPath(points, key);
  return `${line} L${xAt(n - 1, n)},${yAt(0)} L${xAt(0, n)},${yAt(0)} Z`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoundMomentumFlow({
  fighterA,
  fighterB,
  rounds,
  fighterAWinProbability,
  fighterBWinProbability,
  predictedWinnerId,
}: RoundMomentumFlowProps) {
  const rmA     = fighterA.roundModel;
  const rmB     = fighterB.roundModel;
  const hasData = rmA.hasEnoughForTrend || rmB.hasEnoughForTrend;

  const nameA = fighterA.name.split(" ").pop() ?? fighterA.name;
  const nameB = fighterB.name.split(" ").pop() ?? fighterB.name;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-line bg-surface/70 p-5">
        <p className="mono-label">round momentum</p>
        <p className="mt-2 text-sm text-muted">
          Insufficient round data to project a momentum curve for this matchup.
        </p>
      </div>
    );
  }

  const baseA  = fighterAWinProbability / 100;
  const baseB  = fighterBWinProbability / 100;
  const points = computeFlow(fighterA, fighterB, baseA, baseB, rounds);
  const n      = points.length;

  // Color: predicted winner gets accent, other fighter gets muted foreground
  const aIsWinner = predictedWinnerId === fighterA.id;
  const aStroke   = aIsWinner ? "var(--accent)"   : "rgba(241, 246, 251,0.45)";
  const bStroke   = aIsWinner ? "rgba(241, 246, 251,0.45)" : "var(--accent)";
  const aFillId   = "rmFlowFillA";
  const bFillId   = "rmFlowFillB";

  const last = points[n - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/70">
      {/* Section header */}
      <div className="border-b border-line/60 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mono-label">round momentum</p>
            <p className="mt-1 text-sm text-muted">
              Projected from historical round data, not per-round predictions.
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-px w-4 rounded"
                style={{ background: aStroke }}
              />
              {nameA}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-px w-4 rounded"
                style={{ background: bStroke }}
              />
              {nameB}
            </span>
          </div>
        </div>
      </div>

      {/* Chart + key */}
      <div className="p-3 md:p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "auto", display: "block" }}
          role="img"
          aria-label={`Round momentum projection, ${fighterA.name} vs ${fighterB.name}`}
        >
          <defs>
            <linearGradient id={aFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={aStroke} stopOpacity="0.16" />
              <stop offset="100%" stopColor={aStroke} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={bFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={bStroke} stopOpacity="0.16" />
              <stop offset="100%" stopColor={bStroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── Horizontal grid lines ─────────────────────────────── */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line
                x1={PAD.l} x2={W - PAD.r}
                y1={yAt(p)} y2={yAt(p)}
                stroke={p === 0.5 ? "rgba(154, 217, 255,0.20)" : "rgba(154, 217, 255,0.07)"}
                strokeDasharray={p === 0.5 ? "4 4" : "0"}
              />
              <text
                x={PAD.l - 8} y={yAt(p) + 4}
                textAnchor="end"
                fill="rgba(154, 217, 255,0.35)"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="0.06em"
              >
                {Math.round(p * 100)}
              </text>
            </g>
          ))}

          {/* ── Vertical round guides + labels ───────────────────── */}
          {points.map((d, i) => (
            <g key={d.rd}>
              <line
                x1={xAt(i, n)} x2={xAt(i, n)}
                y1={PAD.t} y2={H - PAD.b}
                stroke="rgba(154, 217, 255,0.05)"
                strokeDasharray="2 4"
              />
              <text
                x={xAt(i, n)} y={H - PAD.b + 18}
                textAnchor="middle"
                fill="rgba(154, 217, 255,0.40)"
                fontSize="10"
                fontFamily="monospace"
                letterSpacing="0.1em"
              >
                {d.rd}
              </text>
            </g>
          ))}

          {/* ── Area fills (subtle) ───────────────────────────────── */}
          <path d={buildArea(points, "a")} fill={`url(#${aFillId})`} />
          <path d={buildArea(points, "b")} fill={`url(#${bFillId})`} />

          {/* ── Probability lines ─────────────────────────────────── */}
          <path
            d={buildPath(points, "a")}
            stroke={aStroke}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={buildPath(points, "b")}
            stroke={bStroke}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── Dots at each checkpoint ───────────────────────────── */}
          {points.map((d, i) => (
            <g key={`dots-${d.rd}`}>
              <circle
                cx={xAt(i, n)} cy={yAt(d.a)}
                r="3"
                fill="var(--background)"
                stroke={aStroke}
                strokeWidth="1.5"
              />
              <circle
                cx={xAt(i, n)} cy={yAt(d.b)}
                r="3.5"
                fill="var(--background)"
                stroke={bStroke}
                strokeWidth="2"
              />
            </g>
          ))}

          {/* ── End value labels ──────────────────────────────────── */}
          <text
            x={xAt(n - 1, n) + 9}
            y={yAt(last.a) + 4}
            fill={aStroke}
            fontSize="11"
            fontFamily="monospace"
          >
            {Math.round(last.a * 100)}%
          </text>
          <text
            x={xAt(n - 1, n) + 9}
            y={yAt(last.b) + 4}
            fill={bStroke}
            fontSize="11"
            fontFamily="monospace"
          >
            {Math.round(last.b * 100)}%
          </text>
        </svg>

        {/* ── Key grid ─────────────────────────────────────────────── */}
        <div
          className={`mt-3 border-t border-line/60 pt-4 grid gap-3 ${
            rounds === 5 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-4"
          }`}
        >
          {points.map((d) => {
            const aLeads  = d.a >= d.b;
            const who     = aLeads ? nameA : nameB;
            const prob    = Math.max(d.a, d.b);
            const color   = aLeads ? aStroke : bStroke;

            return (
              <div key={`key-${d.rd}`} className="font-mono">
                <span className="block text-[10px] uppercase tracking-[0.1em] text-subtle/60">
                  {d.rd}
                </span>
                <span
                  className="mt-1 block text-[14px] font-medium"
                  style={{ color }}
                >
                  {who}
                </span>
                <span className="block text-[10px] tabular-nums text-subtle/60">
                  {Math.round(prob * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
