import type { SourcedFighter } from "@/lib/sourced-event";
import type { PredictionViewModel } from "@/lib/predictionViewModel";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { getStyleRadarDimensions, hasEnoughStyleRadarData } from "@/lib/style-radar";

/**
 * FightFeatureHero — the cinematic, editorial opening of a fight page.
 *
 * Design ethos: stop opening with a stats dashboard. Open with a magazine-cover
 * moment where the data is the visual story. Massive editorial typography
 * carries the matchup. The style fingerprint polygons of both fighters render
 * as low-opacity ambient watermarks behind the names — the radar shape becomes
 * scenography, not a chart. The model lean appears as a quiet editorial
 * callout, not a card.
 *
 * Strictly presentation. Reads everything from the canonical viewModel and
 * fighter records. No new data, no licensed images, no scraping. Built so a
 * single component upgrade lifts every fight page across every event.
 */

interface FightFeatureHeroProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  viewModel: PredictionViewModel;
  weightClass: string | null | undefined;
  rounds: number;
  cardPlacement: string;
  eventNameLower: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flagEmoji(code: string | undefined): string | null {
  if (!code) return null;
  const c = code.split("/")[0].trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  return Array.from(c).map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("");
}

// ─── Ambient style-fingerprint watermark ─────────────────────────────────────
// Renders the fighter's radar polygon as a soft background motif. No labels,
// no axes, no ticks — just the silhouette. Sized large and floated behind the
// name so the type stays the hero and the data becomes ambient scenography.

function FingerprintWatermark({
  fighter,
  side,
}: {
  fighter: SourcedFighter;
  side: "left" | "right";
}) {
  const dims = getStyleRadarDimensions(fighter.styleProfile);
  if (!hasEnoughStyleRadarData(fighter.styleProfile)) return null;

  const SIZE = 360;
  const CENTER = SIZE / 2;
  const RADIUS = 130;
  const count = dims.length;

  function point(index: number, value: number) {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const scaled = (value / 100) * RADIUS;
    return { x: CENTER + Math.cos(angle) * scaled, y: CENTER + Math.sin(angle) * scaled };
  }

  const polygonPoints = dims
    .map((d, i) => {
      const v = d.hasData ? (d.value ?? 0) : 0;
      const p = point(i, v);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // Outer guide ring at 100, drawn once to give the silhouette a frame.
  const guidePoints = dims
    .map((_, i) => {
      const p = point(i, 100);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 hidden lg:block ${
        side === "left" ? "-left-12 xl:-left-8" : "-right-12 xl:-right-8"
      }`}
      style={{ width: 540, opacity: 0.75 }}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={`fp-glow-${side}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(143,215,247,0.18)" />
            <stop offset="60%" stopColor="rgba(143,215,247,0.04)" />
            <stop offset="100%" stopColor="rgba(143,215,247,0)" />
          </radialGradient>
        </defs>
        {/* Soft accent halo behind the silhouette */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 30} fill={`url(#fp-glow-${side})`} />
        {/* Outer guide ring — quiet hexagonal/octagonal frame */}
        <polygon
          points={guidePoints}
          fill="none"
          stroke="var(--line-strong)"
          strokeOpacity={0.18}
          strokeWidth={0.8}
        />
        {/* The fighter's actual style silhouette */}
        <polygon
          points={polygonPoints}
          fill="rgba(226,232,240,0.04)"
          stroke="var(--foreground)"
          strokeOpacity={0.22}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Country marker ──────────────────────────────────────────────────────────

function CountryMarker({ fighter, align }: { fighter: SourcedFighter; align: "left" | "right" }) {
  const country = getCountryDisplay(fighter);
  if (!country) return null;
  return (
    <div className={`flex items-center gap-2.5 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {country.code && (
        <span className="text-xl leading-none" aria-hidden="true">
          {flagEmoji(country.code)}
        </span>
      )}
      <p className="mono-label">{country.label ?? "country pending"}</p>
    </div>
  );
}

// ─── Ranking chip ────────────────────────────────────────────────────────────

function RankingChip({ ranking, align }: { ranking: string | null | undefined; align: "left" | "right" }) {
  const formatted = formatRanking(ranking);
  if (formatted === "UNRANKED") return null;
  const isTitleHolder = formatted === "CHAMPION" || formatted === "IC";
  const cls = isTitleHolder
    ? "border-accent/40 bg-accent/10 text-accent"
    : "border-line bg-surface-2 text-foreground";
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${cls} ${
        align === "right" ? "self-end" : ""
      }`}
    >
      {formatted}
    </span>
  );
}

// ─── Fighter editorial column ────────────────────────────────────────────────

function FighterColumn({
  fighter,
  align,
  isCall,
  animationDelay,
}: {
  fighter: SourcedFighter;
  align: "left" | "right";
  isCall: boolean;
  animationDelay: string;
}) {
  const isRight = align === "right";
  return (
    <div
      className={`fl-animate-fade-up ${animationDelay} relative z-10 flex min-w-0 flex-col justify-between gap-5 px-5 py-6 md:px-8 md:py-8 lg:py-12 ${
        isRight ? "lg:items-end lg:text-right" : "lg:items-start"
      }`}
    >
      {/* Top metadata block — country + ranking */}
      <div className={`flex flex-col gap-3 ${isRight ? "lg:items-end" : "lg:items-start"}`}>
        <CountryMarker fighter={fighter} align={align} />
        <RankingChip ranking={fighter.ranking} align={align} />
      </div>

      {/*
        Name treatment — editorial. Stays on one line on lg+ via a tight
        font-stretch and conservative max-width; gracefully breaks on smaller
        widths. Tracking is pulled in heavily for that magazine-cover feel.
      */}
      <h2
        className={`text-balance text-[2.4rem] font-semibold leading-[0.96] tracking-[-0.05em] text-foreground md:text-[3.2rem] lg:text-[4rem] xl:text-[4.75rem] ${
          isRight ? "lg:text-right" : "lg:text-left"
        }`}
      >
        {fighter.name}
      </h2>

      {/* Bottom metadata block — record + the call accent line */}
      <div className={`flex flex-col gap-2 ${isRight ? "lg:items-end" : "lg:items-start"}`}>
        {fighter.record && (
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{fighter.record}</p>
        )}
        {isCall && (
          <span
            aria-hidden="true"
            className="mt-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent"
          >
            <span className="size-1 rounded-full bg-accent" />
            model lean
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Editorial model-call callout ────────────────────────────────────────────
// Sits at the centre-bottom of the hero, magazine-style. Reads as the
// editor's pull quote on the matchup. Suppressed when there's no named call.

function CallCallout({ vm }: { vm: PredictionViewModel }) {
  const callState = vm.callState;
  if (callState === "noLean") {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
        too close to call
      </p>
    );
  }
  if (!vm.predictedWinner || vm.winnerProbability == null) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
        pre-fight call · {vm.winnerProbability}%
      </p>
      <p className="text-lg font-semibold tracking-[-0.02em] text-accent md:text-xl">
        {vm.predictedWinner.name}
      </p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function FightFeatureHero({
  fighterA,
  fighterB,
  viewModel,
  weightClass,
  rounds,
  cardPlacement,
  eventNameLower,
}: FightFeatureHeroProps) {
  const calledA = viewModel.predictedWinner?.id === fighterA.id;
  const calledB = viewModel.predictedWinner?.id === fighterB.id;

  return (
    <section
      aria-label="Fight feature"
      className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface via-surface to-background/95 shadow-glow"
    >
      {/* Background grid pattern — premium technical texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Corner registration marks — broadcast / scouting feel */}
      <span className="pointer-events-none absolute left-4 top-4 z-20 h-3 w-3 border-l border-t border-line-strong/60" />
      <span className="pointer-events-none absolute right-4 top-4 z-20 h-3 w-3 border-r border-t border-line-strong/60" />
      <span className="pointer-events-none absolute bottom-4 left-4 z-20 h-3 w-3 border-b border-l border-line-strong/60" />
      <span className="pointer-events-none absolute bottom-4 right-4 z-20 h-3 w-3 border-b border-r border-line-strong/60" />

      {/* Top editorial metadata bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-5 py-3 md:px-7">
        <p className="mono-label">{eventNameLower}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
          {(weightClass ?? "weight class pending").toLowerCase()}
          {" · "}
          {rounds} rounds
          {" · "}
          {cardPlacement.toLowerCase()}
        </p>
      </div>

      {/* Ambient style fingerprint watermarks — one per fighter, drift to edges */}
      <FingerprintWatermark fighter={fighterA} side="left" />
      <FingerprintWatermark fighter={fighterB} side="right" />

      {/*
        The cinematic body — 3-column grid on lg+ (Fighter A | VS | Fighter B).
        Stacks on mobile with VS becoming a thin horizontal divider in the seam.
      */}
      <div className="relative grid gap-0 lg:grid-cols-[1fr_140px_1fr] lg:items-stretch">
        <FighterColumn
          fighter={fighterA}
          align="left"
          isCall={calledA}
          animationDelay="fl-delay-100"
        />

        {/* VS centre + editorial call callout */}
        <div className="fl-animate-fade-up fl-delay-200 relative z-10 flex flex-col items-center justify-center gap-5 border-y border-line/60 bg-background/35 px-4 py-6 text-center lg:border-x lg:border-y-0 lg:py-12">
          <p className="text-[2.4rem] font-light leading-none tracking-[-0.08em] text-foreground/65 md:text-[2.8rem] lg:text-[3.2rem]">
            VS
          </p>
          <CallCallout vm={viewModel} />
        </div>

        <FighterColumn
          fighter={fighterB}
          align="right"
          isCall={calledB}
          animationDelay="fl-delay-300"
        />
      </div>
    </section>
  );
}
