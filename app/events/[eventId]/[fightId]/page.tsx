import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FightResultBanner } from "@/components/FightResultBanner";
import { FightPageTabs } from "@/components/FightPageTabs";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FighterNamePlate } from "@/components/FighterNamePlate";
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

// ─── Fighter hero panel ──────────────────────────────────────────────────────

function FighterHeroPanel({
  fighter,
  align = "left",
  cornerLabel,
  isCall,
  animationDelay,
}: {
  fighter: SourcedFighter;
  align?: "left" | "right";
  /** Mono "side" marker, e.g. "A" or "B" — broadcast scouting feel */
  cornerLabel?: string;
  /** True if this fighter is the model call. Adds a quiet accent rail above the name. */
  isCall?: boolean;
  /** Stagger class (e.g. "fl-delay-100") */
  animationDelay?: string;
}) {
  const isRight = align === "right";
  const country = getCountryDisplay(fighter);
  const ranking = formatRanking(fighter.ranking);

  // All metadata in a single compact line below the name —
  // prevents multi-row crowding and keeps the name visually isolated.
  const metadata = [
    ranking !== "UNRANKED" ? ranking : null,
    fighter.stance ?? null,
    fighter.record ?? null,
    fighter.height ?? null,
    fighter.reach ? `${fighter.reach} reach` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div
      className={`fl-animate-fade-up ${animationDelay ?? ""} relative flex min-w-0 flex-col justify-center gap-2.5 overflow-visible p-5 py-5 md:p-6 md:py-6 ${
        isRight ? "lg:items-end lg:text-right" : ""
      }`}
    >
      {/* Corner side marker */}
      {cornerLabel && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-4 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle/60 ${
            isRight ? "right-5" : "left-5"
          }`}
        >
          side · {cornerLabel}
        </span>
      )}

      {/* Flag + country label */}
      <div className={`flex items-center gap-2 ${isRight ? "lg:flex-row-reverse" : ""}`}>
        {country?.code && (
          <span className="text-base leading-none" aria-hidden="true">
            {flagEmoji(country.code)}
          </span>
        )}
        <p className="mono-label">{country?.label ?? "country pending"}</p>
      </div>

      {/* Quiet accent rail when this fighter is the model call */}
      {isCall && (
        <span
          aria-hidden="true"
          className={`block h-px w-12 bg-accent ${isRight ? "lg:ml-auto" : ""}`}
        />
      )}

      {/* Name — word-boundary-only line breaks via FighterNamePlate */}
      <FighterNamePlate name={fighter.name} align={align} />

      {/* Single compact metadata line — keeps name visually isolated */}
      {metadata && (
        <p className={`font-mono text-[10px] uppercase tracking-[0.1em] text-subtle ${isRight ? "lg:text-right" : ""}`}>
          {metadata}
        </p>
      )}
    </div>
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
          ← back to {event.event.name.toLowerCase()}
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

            <div className="grid gap-0 lg:grid-cols-[1fr_180px_1fr] lg:items-stretch">
              <FighterHeroPanel
                fighter={fighterA}
                cornerLabel="A"
                isCall={vm.predictedWinner?.id === fighterA.id}
                animationDelay="fl-delay-100"
              />

              {/* VS centre — compressed: removed duplicate weight/rounds (already in header strip) */}
              <div className="fl-animate-fade-up fl-delay-200 relative flex flex-col items-center justify-center gap-2 border-y border-line bg-background/40 px-4 py-4 text-center lg:border-x lg:border-y-0">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-2 hidden h-3 w-px -translate-x-1/2 bg-gradient-to-b from-accent/50 to-transparent lg:block"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 left-1/2 hidden h-3 w-px -translate-x-1/2 bg-gradient-to-t from-accent/50 to-transparent lg:block"
                />
                <p className="bg-gradient-to-b from-foreground/40 to-foreground/10 bg-clip-text text-[2.4rem] font-light leading-none tracking-[-0.08em] text-transparent md:text-[3rem]">
                  VS
                </p>
              </div>

              <FighterHeroPanel
                fighter={fighterB}
                align="right"
                cornerLabel="B"
                isCall={vm.predictedWinner?.id === fighterB.id}
                animationDelay="fl-delay-300"
              />
            </div>
          </section>

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
                    <ContextualNotes notes={fight.contextNotes} />
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
