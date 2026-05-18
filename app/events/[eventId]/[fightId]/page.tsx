import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FightResultBanner } from "@/components/FightResultBanner";
import { FightPageTabs } from "@/components/FightPageTabs";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FightShapeSummary } from "@/components/FightShapeSummary";
import { FormResumeModule } from "@/components/FormResumeModule";
import { PathsToVictory } from "@/components/PathsToVictory";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { buildFightShapeModel } from "@/lib/fight-shape-model/model";
import { buildFightOutcomeModel } from "@/lib/fight-outcome-model/model";
import { getPredictionByFightId } from "@/lib/accuracy";
import { getAllFightParams, getEvent, getEventFight } from "@/lib/events/registry";
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
      description: `${wc} · ${event.event.name}. Signal-based outcome model with win probabilities and scenario paths.`,
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
}: {
  fighter: SourcedFighter;
  align?: "left" | "right";
}) {
  const isRight = align === "right";
  const country = getCountryDisplay(fighter);
  const ranking = formatRanking(fighter.ranking);

  const meta = [
    ranking !== "UNRANKED" ? ranking : null,
    fighter.stance ?? null,
    country?.label ?? null,
  ].filter(Boolean).join(" · ");

  const physicals = [
    fighter.record,
    fighter.height,
    fighter.reach ? `${fighter.reach} reach` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className={`flex flex-col justify-center gap-3 p-5 py-8 md:p-8 md:py-10 ${isRight ? "lg:items-end lg:text-right" : ""}`}>
      {/* Flag + meta */}
      <div className={`flex items-center gap-2 ${isRight ? "lg:flex-row-reverse" : ""}`}>
        {country?.code && (
          <span className="text-base leading-none" aria-hidden="true">
            {flagEmoji(country.code)}
          </span>
        )}
        <p className="mono-label">{meta}</p>
      </div>

      {/* Name */}
      <h2 className="text-4xl font-semibold leading-[0.95] tracking-[-0.05em] md:text-6xl lg:text-7xl">
        {fighter.name}
      </h2>

      {/* Physicals */}
      {physicals && (
        <p className="data-text text-xs text-subtle">{physicals}</p>
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
  const fightShapeModel = buildFightShapeModel(fight);
  const outcomeModel = buildFightOutcomeModel(fight, fightShapeModel);
  const prediction = getPredictionByFightId(fightId);

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

        {/* Hero panel */}
        <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 md:p-6">
            <div>
              <p className="mono-label">{event.event.name.toLowerCase()}</p>
              <p className="mt-2 text-sm text-muted">
                {(fight.weightClass ?? "weight class pending").toLowerCase()} ·{" "}
                {fight.rounds} rounds · {fight.cardPlacement.toLowerCase()}
              </p>
            </div>
          </div>
          {prediction && <FightResultBanner prediction={prediction} />}

          <div className="grid gap-0 lg:grid-cols-[1fr_220px_1fr] lg:items-stretch">
            <FighterHeroPanel fighter={fighterA} />

            <div className="flex items-center justify-center border-y border-line bg-background/30 px-5 py-8 text-center lg:border-x lg:border-y-0">
              <p className="text-[3.5rem] font-light leading-none tracking-[-0.08em] text-subtle/20 md:text-[5rem]">
                vs
              </p>
            </div>

            <FighterHeroPanel fighter={fighterB} align="right" />
          </div>
        </section>

        {/* Analysis tabs */}
        <div className="mt-6 md:mt-8">
          <FightPageTabs
            tabs={[
              { id: "call", label: "the call" },
              { id: "shape", label: "shape" },
              { id: "form", label: "form" },
              { id: "paths", label: "paths" },
            ]}
            panels={{
              call: (
                <>
                  <TheCall outcomeModel={outcomeModel} />
                  <FightShapeSummary fight={fight} modelOutput={fightShapeModel} />
                </>
              ),
              shape: (
                <StyleComparisonBars
                  fighterA={fighterA}
                  fighterB={fighterB}
                  modelOutput={fightShapeModel}
                  styleClashLabel={fight.styleClashLabel ?? undefined}
                />
              ),
              form: (
                <FormResumeModule
                  fighterA={fighterA}
                  fighterB={fighterB}
                  modelOutput={fightShapeModel}
                />
              ),
              paths: (
                <PathsToVictory fight={fight} modelOutput={fightShapeModel} />
              ),
            }}
          />
        </div>
      </main>
      <DisclaimerFooter />
    </>
  );
}
