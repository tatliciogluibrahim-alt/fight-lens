import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CreatorActions } from "@/components/CreatorActions";
import { FightResultBanner } from "@/components/FightResultBanner";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FightShapeSummary } from "@/components/FightShapeSummary";
import { FormResumeModule } from "@/components/FormResumeModule";
import { FighterAssetSlot } from "@/components/FighterAssetSlot";
import { PathsToVictory } from "@/components/PathsToVictory";
import { StyleClashLabel } from "@/components/StyleClashLabel";
import { StyleClashSaveButton } from "@/components/StyleClashSaveButton";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
import { formatRanking } from "@/lib/display";
import { hasCompleteExportStyleProfile } from "@/lib/fight-shape";
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

// ─── Fighter hero panel ──────────────────────────────────────────────────────

function FighterHeroPanel({
  fighter,
  align = "left",
}: {
  fighter: SourcedFighter;
  align?: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div
      className={`flex min-h-[340px] flex-col gap-5 p-5 md:p-8 ${
        isRight ? "lg:items-end lg:text-right" : ""
      }`}
    >
      <FighterAssetSlot
        fighter={fighter}
        fallbackName={fighter.name}
        fallbackCountry={{
          code: fighter.country?.code,
          label: fighter.country?.label,
          colors: fighter.country?.colors,
        }}
        tone={isRight ? "muted" : "accent"}
      />

      <div className="flex-1">
        <p className="mono-label">
          {formatRanking(fighter.ranking)}
          {fighter.stance ? ` · ${fighter.stance}` : ""}
          {fighter.country?.label ? ` · ${fighter.country.label}` : ""}
        </p>
        <h2 className="mt-3 text-4xl font-semibold leading-[0.95] tracking-[-0.05em] md:text-6xl">
          {fighter.name}
        </h2>
      </div>

      <p className="data-text text-xs text-subtle">
        {[
          fighter.record,
          fighter.height,
          fighter.reach ? `${fighter.reach} reach` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
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

  const exportFighterA = hasCompleteExportStyleProfile(fighterA.styleProfile)
    ? { name: fighterA.name, styleProfile: fighterA.styleProfile }
    : null;
  const exportFighterB = hasCompleteExportStyleProfile(fighterB.styleProfile)
    ? { name: fighterB.name, styleProfile: fighterB.styleProfile }
    : null;
  const canExport = Boolean(exportFighterA && exportFighterB);

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

            <div className="flex min-h-[240px] flex-col items-center justify-between border-y border-line bg-background/30 px-5 py-8 text-center lg:min-h-[340px] lg:border-x lg:border-y-0">
              <div />
              <div className="flex flex-col items-center gap-5">
                <p className="text-[5rem] font-light leading-none tracking-[-0.08em] text-subtle/25 md:text-[7rem]">
                  vs
                </p>
                {fight.styleClashLabel && (
                  <StyleClashLabel label={fight.styleClashLabel} copyable />
                )}
              </div>
              {canExport ? (
                <StyleClashSaveButton
                  fighterA={exportFighterA!}
                  fighterB={exportFighterB!}
                  styleClashLabel={fight.styleClashLabel ?? undefined}
                />
              ) : (
                <div />
              )}
            </div>

            <FighterHeroPanel fighter={fighterB} align="right" />
          </div>
        </section>

        {/* Analysis sections */}
        <div className="mt-6 space-y-5 md:mt-8 md:space-y-6">
          <TheCall outcomeModel={outcomeModel} />
          <FightShapeSummary fight={fight} modelOutput={fightShapeModel} />
          <StyleComparisonBars
            fighterA={fighterA}
            fighterB={fighterB}
            modelOutput={fightShapeModel}
            styleClashLabel={fight.styleClashLabel ?? undefined}
          />
          <FormResumeModule
            fighterA={fighterA}
            fighterB={fighterB}
            modelOutput={fightShapeModel}
          />
          <PathsToVictory fight={fight} modelOutput={fightShapeModel} />
          <CreatorActions
            fight={fight}
            fighterA={fighterA}
            fighterB={fighterB}
            modelOutput={fightShapeModel}
          />
        </div>
      </main>
      <DisclaimerFooter />
    </>
  );
}
