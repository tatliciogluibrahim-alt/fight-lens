import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FightResultBanner } from "@/components/FightResultBanner";
import { FightPageTabs } from "@/components/FightPageTabs";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FormResumeModule } from "@/components/FormResumeModule";
import { PathsToVictory } from "@/components/PathsToVictory";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { getAccuracyMetrics, getPredictionByFightId } from "@/lib/accuracy";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
import { getAllFightParams, getEvent, getEventFight } from "@/lib/events/registry";
import { MobileFightRead } from "@/components/MobileFightRead";
import { ContextualNotes } from "@/components/ContextualNotes";
import { RoundMomentumFlow } from "@/components/RoundMomentumFlow";
import type { SourcedFighter } from "@/lib/sourced-event";

interface MatchupPageProps {
  params: Promise<{ eventId: string; fightId: string }>;
}

export function generateStaticParams() {
  return getAllFightParams();
}

export async function generateMetadata({ params }: MatchupPageProps): Promise<Metadata> {
  const { eventId, fightId } = await params;
  const event = getEvent(eventId);
  const fight = getEventFight(eventId, fightId);
  if (!event || !fight) return {};

  const nameA = fight.fighters.fighterA.name;
  const nameB = fight.fighters.fighterB.name;
  const wc = fight.weightClass ?? "UFC";

  return {
    title: `${nameA} vs. ${nameB} | ${event.event.name} | Fight Lens`,
    description: `${wc} matchup analysis. Win probabilities, method breakdown, and scenario paths for ${nameA} vs. ${nameB} at ${event.event.name}.`,
    openGraph: {
      title: `${nameA} vs. ${nameB} — Fight Lens`,
      description: `${wc} · ${event.event.name}. Directional model lean with win probability, method lean, and counter path.`,
      type: "article",
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flagEmoji(code: string | undefined): string | null {
  if (!code) return null;
  const c = code.split("/")[0].trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  return Array.from(c).map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("");
}

// ─── Tale-of-the-tape parsers ────────────────────────────────────────────────
// Only parseAge is needed now — the head-to-head row renders height/reach/
// stance as their original display strings ("5' 7\"", "70\"", "Orthodox").
// Returns null on malformed input so the row can silently skip the cell.

function parseAge(dob: string | null | undefined, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

// ─── Ranking chip ────────────────────────────────────────────────────────────
// Above-the-name pill badge. Champion + Interim Champion get accent treatment;
// numeric ranks get neutral treatment. "UNRANKED" is suppressed entirely.

function RankingChip({ ranking, align = "left" }: { ranking: string | null | undefined; align?: "left" | "right" }) {
  const formatted = formatRanking(ranking);
  if (formatted === "UNRANKED") return null;
  const isTitleHolder = formatted === "CHAMPION" || formatted === "IC";
  const cls = isTitleHolder
    ? "border-accent/40 bg-accent/10 text-accent"
    : "border-line bg-surface-2 text-foreground";
  const isRight = align === "right";
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${cls} ${isRight ? "lg:self-end" : ""}`}
    >
      {formatted}
    </span>
  );
}

// ─── Fighter hero panel ──────────────────────────────────────────────────────

function FighterHeroPanel({
  fighter,
  align = "left",
  isCall,
  animationDelay,
}: {
  fighter: SourcedFighter;
  align?: "left" | "right";
  /** True if this fighter is the model call. Adds an accent rail along the full panel edge. */
  isCall?: boolean;
  /** Stagger class (e.g. "fl-delay-100") */
  animationDelay?: string;
}) {
  const isRight = align === "right";
  const country = getCountryDisplay(fighter);

  return (
    <div
      className={`fl-animate-fade-up ${animationDelay ?? ""} relative flex min-w-0 flex-col justify-center gap-2.5 overflow-visible p-5 py-5 md:p-6 md:py-5 ${
        isRight ? "lg:items-end lg:text-right" : "lg:items-start"
      }`}
    >
      {/*
        Full-height accent rail for the model-call fighter — fills horizontal
        whitespace on wide desktops with a premium visual treatment instead of
        the previous tiny 12px rail. (Answer #4: fill width with visual content.)
      */}
      {isCall && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-accent/55 to-transparent ${
            isRight ? "right-0" : "left-0"
          }`}
        />
      )}

      {/* Country: enlarged flag + label, sits in the corner where SIDE A/B used to be */}
      <div className={`flex items-center gap-2.5 ${isRight ? "lg:flex-row-reverse" : ""}`}>
        {country?.code && (
          <span className="text-2xl leading-none" aria-hidden="true">
            {flagEmoji(country.code)}
          </span>
        )}
        <p className="mono-label">{country?.label ?? "country pending"}</p>
      </div>

      {/* Ranking chip — above the name, accent-coloured for title-holders */}
      <RankingChip ranking={fighter.ranking} align={align} />

      {/*
        Name — single line treatment per answer #1. Stays responsive: scales
        from 3xl on small desktop to 5xl on lg+. break-words is a safety net
        for unusually long names but never stacks first/last across lines.
      */}
      <h2
        className={`text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-foreground md:text-4xl lg:text-5xl break-words ${
          isRight ? "lg:text-right" : ""
        }`}
      >
        {fighter.name}
      </h2>

      {/* Record — single quieter line below the name */}
      {fighter.record && (
        <p className={`font-mono text-xs uppercase tracking-[0.12em] text-muted ${isRight ? "lg:text-right" : ""}`}>
          {fighter.record}
        </p>
      )}
    </div>
  );
}

// ─── VS centerpiece ──────────────────────────────────────────────────────────
// Minimal: just the "VS" mark between fighters. Earlier draft carried a delta
// strip (reach Δ, height Δ, age Δ) but it crowded the column visually; the
// same data now lives only in the Tale-of-the-Tape row below the hero where
// it has the horizontal room to breathe.

function VsCenterpiece() {
  return (
    <div className="fl-animate-fade-up fl-delay-200 relative flex items-center justify-center border-y border-line bg-background/40 px-4 py-4 text-center lg:border-x lg:border-y-0">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-2 hidden h-3 w-px -translate-x-1/2 bg-gradient-to-b from-accent/50 to-transparent lg:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-1/2 hidden h-3 w-px -translate-x-1/2 bg-gradient-to-t from-accent/50 to-transparent lg:block"
      />
      <p className="text-[2.4rem] font-light leading-none tracking-[-0.08em] text-foreground/65 md:text-[3rem]">
        VS
      </p>
    </div>
  );
}

// ─── Head-to-head physicals row ──────────────────────────────────────────────
// Answer #3: full side-by-side physicals row below the hero, scouting-feel.
// Reads as 4 columns: HEIGHT · REACH · STANCE · AGE, each showing
// fighter A's value next to fighter B's. Silently omits rows where data is
// missing on either side.

function TaleOfTheTapeRow({ fighterA, fighterB }: { fighterA: SourcedFighter; fighterB: SourcedFighter }) {
  type Cell = { label: string; valueA: string; valueB: string };
  const cells: Cell[] = [];

  if (fighterA.height && fighterB.height) {
    cells.push({ label: "height", valueA: fighterA.height, valueB: fighterB.height });
  }
  if (fighterA.reach && fighterB.reach) {
    cells.push({ label: "reach", valueA: fighterA.reach, valueB: fighterB.reach });
  }
  if (fighterA.stance && fighterB.stance) {
    cells.push({ label: "stance", valueA: fighterA.stance, valueB: fighterB.stance });
  }
  const ageA = parseAge(fighterA.dob);
  const ageB = parseAge(fighterB.dob);
  if (ageA != null && ageB != null) {
    cells.push({ label: "age", valueA: `${ageA}`, valueB: `${ageB}` });
  }

  if (cells.length === 0) return null;

  return (
    <section
      aria-label="Tale of the tape"
      className="fl-animate-fade-up fl-delay-400 mt-4 overflow-hidden rounded-xl border border-line bg-surface/60"
    >
      <div
        className="grid divide-y divide-line md:divide-y-0 md:divide-x"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <div key={cell.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3">
            <p className="text-sm font-medium text-foreground text-right tabular-nums">{cell.valueA}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-subtle">{cell.label}</p>
            <p className="text-sm font-medium text-foreground tabular-nums">{cell.valueB}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function MatchupPage({ params }: MatchupPageProps) {
  const { eventId, fightId } = await params;
  const event = getEvent(eventId);
  const fight = getEventFight(eventId, fightId);

  if (!event || !fight) notFound();

  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const prediction = getPredictionByFightId(fightId);
  const {
    fightShapeModel,
    viewModel: vm,
  } = buildPredictionViewModelBundle({
    eventId,
    fight,
    lockedPrediction: prediction,
  });
  const accuracyMetrics = getAccuracyMetrics();

  return (
    <>
      <AppHeader />
      <main className="section-shell py-6 md:py-10">
        <Link
          href={`/events/${eventId}`}
          className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
        >
          ← back to {(event.event.shortName ?? "card").toLowerCase()}
        </Link>

        {/* ════════════════════════════════════════════════════════════════════
            MOBILE read — visible only below sm (640 px)
            Flow: matchup header → call → method lean → scenarios →
                  shape accordion → record proof.
            ════════════════════════════════════════════════════════════════════ */}
        <div className="sm:hidden mt-5">
          <MobileFightRead
            fight={fight}
            fighterA={fighterA}
            fighterB={fighterB}
            viewModel={vm}
            winnerAccuracy={accuracyMetrics.winnerAccuracy}
            resolvedCount={accuracyMetrics.resolvedCount}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            DESKTOP read — visible only at sm+ (640 px and up)
            Fighter hero → snapshot → call/shape/details sections.
            ════════════════════════════════════════════════════════════════════ */}
        <div className="hidden sm:block">
          {/* Fighter hero */}
          <section className="mt-5 overflow-hidden rounded-xl border border-line bg-surface shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 md:px-6 md:py-4">
              <div>
                <p className="mono-label">{event.event.name.toLowerCase()}</p>
                <p className="mt-1.5 text-xs text-muted md:text-sm">
                  {(fight.weightClass ?? "weight class pending").toLowerCase()} ·{" "}
                  {fight.rounds} rounds · {fight.cardPlacement.toLowerCase()}
                </p>
              </div>
            </div>
            {vm.isScored && <FightResultBanner viewModel={vm} />}

            <div className="grid gap-0 lg:grid-cols-[1fr_160px_1fr] lg:items-stretch">
              <FighterHeroPanel
                fighter={fighterA}
                isCall={vm.predictedWinner?.id === fighterA.id}
                animationDelay="fl-delay-100"
              />
              <VsCenterpiece />
              <FighterHeroPanel
                fighter={fighterB}
                align="right"
                isCall={vm.predictedWinner?.id === fighterB.id}
                animationDelay="fl-delay-300"
              />
            </div>
          </section>

          {/*
            Tale of the tape — head-to-head physicals row below the hero.
            Auto-omits rows where data is missing on either side, and the
            entire module silently disappears when no data is comparable.
            Single shared component so this implementation applies to every
            fight on the card.
          */}
          <TaleOfTheTapeRow fighterA={fighterA} fighterB={fighterB} />

          {/*
           * Phase 2: FightReadSnapshot removed on desktop. It duplicated the
           * model call + method lean + counter path that TheCall renders
           * immediately below — three call surfaces stacked was too heavy.
           * TheCall is now the single source of the model lean above the fold.
           */}

          {/* Analysis sections — one scroll page, hash anchors preserved */}
          <div className="fl-animate-fade-up fl-delay-400 mt-5 md:mt-6">
            <FightPageTabs
              tabs={[
                { id: "call", label: "call" },
                { id: "shape", label: "shape" },
                { id: "details", label: "details" },
              ]}
              panels={{
                call: (
                  <div className="space-y-6">
                    <TheCall viewModel={vm} />
                    {/*
                      ContextualNotes sits inside the call section on desktop so
                      manual context (the "not in model" disclosures) reads next
                      to the lean — matching the mobile flow. Burying it in the
                      "details" section forced a serious reader to scroll past
                      shape + form/resume just to see the disclaimer that often
                      explains why the lean looks the way it does.
                    */}
                    <ContextualNotes notes={fight.contextNotes} />
                    <RoundMomentumFlow
                      fighterA={fighterA}
                      fighterB={fighterB}
                      rounds={fight.rounds}
                      fighterAWinProbability={vm.fighterA.winProbability}
                      fighterBWinProbability={vm.fighterB.winProbability}
                      predictedWinnerId={vm.predictedWinner?.id ?? null}
                    />
                  </div>
                ),
                shape: (
                  <div className="space-y-6">
                    <StyleComparisonBars
                      fighterA={fighterA}
                      fighterB={fighterB}
                      predictedWinnerId={vm.predictedWinner?.id ?? null}
                    />
                  </div>
                ),
                details: (
                  <>
                    <FormResumeModule
                      fighterA={fighterA}
                      fighterB={fighterB}
                      modelOutput={fightShapeModel}
                    />
                    <PathsToVictory
                      fight={fight}
                      modelOutput={fightShapeModel}
                      viewModel={vm}
                    />
                  </>
                ),
              }}
            />
          </div>
        </div>
      </main>
      <DisclaimerFooter />
    </>
  );
}
