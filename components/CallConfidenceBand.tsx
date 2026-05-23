/*
 * CallConfidenceBand — visual probability display for the model call.
 *
 * Renders the pick name + probability as the visual anchor, then a horizontal
 * track showing the model's confidence range around that call. The band
 * is derived from readStrength, not a statistical CI — labeled "model range"
 * to be honest about what it represents.
 *
 * Used in both MobileFightRead and TheCall (desktop). No betting language.
 * noLean state shows both probabilities side-by-side with no band.
 */

import type { ReadStrength } from "@/lib/predictionViewModel";
import type { RankingMismatch } from "@/lib/ranking-mismatch";

// Half-width of the confidence band per read strength (percentage points)
const BAND_HALF: Record<ReadStrength, number> = {
  strong:       5,
  usable:       9,
  thin:        13,
  "data-pending": 0,
};

interface CallConfidenceBandProps {
  winnerName:        string | null;
  winnerProbability: number | null;  // 0–100
  loserName:         string | null;
  loserProbability:  number | null;  // 0–100
  readStrength:      ReadStrength;
  isTooCloseToCall:  boolean;
  /** For noLean display — both fighters shown side by side */
  fighterAName:      string;
  fighterAProb:      number;
  fighterBName:      string;
  fighterBProb:      number;
  /**
   * Auto-derived ranking mismatch. When present, the band renders a small
   * "Ranking note" strip below the counter path so the disconnect between
   * model lean and fighter ranking is visible to the reader.
   */
  rankingMismatch?:  RankingMismatch | null;
}

export function CallConfidenceBand({
  winnerName,
  winnerProbability,
  loserName,
  loserProbability,
  readStrength,
  isTooCloseToCall,
  fighterAName,
  fighterAProb,
  fighterBName,
  fighterBProb,
  rankingMismatch,
}: CallConfidenceBandProps) {
  const half    = BAND_HALF[readStrength];
  const pin     = winnerProbability ?? 50;
  const lo      = Math.max(51, Math.round(pin - half));
  const hi      = Math.min(97, Math.round(pin + half));
  const hasBand = !isTooCloseToCall && readStrength !== "data-pending" && winnerProbability != null;

  return (
    <div className="space-y-5">
      {/* ── Pick header ───────────────────────────────────────────────── */}
      {isTooCloseToCall ? (
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Too close to call
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="font-mono text-sm text-muted">
              <span className="text-foreground">{fighterAName}</span>
              {" "}
              <span className="data-text text-foreground">{fighterAProb}%</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">·</span>
            <span className="font-mono text-sm text-muted">
              <span className="text-foreground">{fighterBName}</span>
              {" "}
              <span className="data-text text-foreground">{fighterBProb}%</span>
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
            no named model call · both paths remain viable
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-semibold leading-tight tracking-tight text-accent md:text-3xl">
            {winnerName}
          </span>
          <span className="font-mono text-xl tabular-nums text-foreground md:text-2xl">
            {winnerProbability}%
          </span>
        </div>
      )}

      {/* ── Confidence band track ──────────────────────────────────────── */}
      {hasBand && (
        <div className="space-y-2">
          {/* Track */}
          <div className="relative h-8">
            {/* Axis baseline */}
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />

            {/* Tick marks at 0, 25, 50, 75, 100 */}
            {[0, 25, 50, 75, 100].map((p) => (
              <span
                key={p}
                className="absolute top-1/2 h-1.5 w-px -translate-x-1/2 -translate-y-1/2 bg-subtle/30"
                style={{ left: `${p}%` }}
              />
            ))}

            {/* Confidence fill — gradient from transparent → accent/20 → transparent */}
            <div
              className="absolute border-x border-accent/35"
              style={{
                top:    "10px",
                bottom: "10px",
                left:   `${lo}%`,
                right:  `${100 - hi}%`,
                background:
                  "linear-gradient(90deg, rgba(143,215,247,0.04), rgba(143,215,247,0.18) 50%, rgba(143,215,247,0.04))",
              }}
            />

            {/* Probability pin */}
            <div
              className="absolute top-[3px] bottom-[3px] w-0.5 -translate-x-1/2 rounded-full bg-accent"
              style={{
                left:      `${pin}%`,
                boxShadow: "0 0 10px rgba(143,215,247,0.55)",
              }}
            >
              {/* Pin head dot */}
              <span className="absolute -left-[3px] -top-[3px] block size-2 rounded-full bg-accent" />
            </div>
          </div>

          {/* Labels row — tightened: 5 ticks compressed to confidence range only */}
          <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-subtle/55">
            <span>{lo}% lo</span>
            <span className="text-accent/70">confidence range</span>
            <span>{hi}% hi</span>
          </div>
        </div>
      )}

      {/* ── Counter path — tightened ──────────────────────────────────── */}
      {!isTooCloseToCall && loserName != null && loserProbability != null && (
        <div className="rounded-xl border border-line bg-background/35 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">counter path</p>
            <span className="font-mono text-sm tabular-nums text-foreground">{loserProbability}%</span>
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">
            <span className="font-medium">{loserName}</span>
            <span className="text-muted"> stays live if the matchup plays differently.</span>
          </p>
        </div>
      )}

      {/* ── Ranking note — auto-fires when model lean ≠ ranking ───────────
          Structural disclosure: when the model leans on the lower-ranked
          fighter by a meaningful margin (e.g. Lopes #2 vs Garcia #9 →
          model says Garcia 75%), surface that disconnect so the reader
          sees it alongside the lean rather than discovering it on their
          own. Never modifies the locked prediction or model math. */}
      {!isTooCloseToCall && rankingMismatch && (
        <div className={`rounded-xl border px-4 py-3 ${
          rankingMismatch.tier === "strong"
            ? "border-accent/30 bg-accent/[0.05]"
            : "border-line bg-surface-2/50"
        }`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
            ranking note · not in model
          </p>
          <p className="mt-1 text-sm leading-snug text-foreground">
            {rankingMismatch.copy}
          </p>
        </div>
      )}
    </div>
  );
}
