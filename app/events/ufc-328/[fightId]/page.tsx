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
import { getSourcedFight, sourcedEvent, sourcedFights } from "@/lib/sourced-event";
import type { SourcedFighter } from "@/lib/sourced-event";

interface MatchupPageProps {
  params: Promise<{
    fightId: string;
  }>;
}

export function generateStaticParams() {
  return sourcedFights.map((fight) => ({ fightId: fight.id }));
}

function FighterHeroPanel({
  fighter,
  align = "left"
}: {
  fighter: SourcedFighter;
  align?: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div className={`flex min-h-[390px] flex-col p-5 md:p-7 ${isRight ? "lg:text-right" : ""}`}>
      <div className={isRight ? "lg:ml-auto lg:w-fit" : ""}>
        <FighterAssetSlot
          fighter={fighter}
          fallbackName={fighter.name}
          fallbackCountry={{
            code: fighter.country?.code,
            label: fighter.country?.label,
            colors: fighter.country?.colors
          }}
          tone={isRight ? "muted" : "accent"}
          align={align}
        />
      </div>

      <div className="mt-6">
        <p className="mono-label">{formatRanking(fighter.ranking)} / {fighter.stance ?? "stance pending"}</p>
        <h2 className="mt-3 min-h-[1.92em] text-4xl font-semibold leading-[0.96] tracking-[-0.05em] md:text-6xl">
          {fighter.name}
        </h2>
      </div>

      <p className="data-text mt-auto pt-6 text-sm text-muted">
        {fighter.record ?? "record pending"} / {fighter.height ?? "height pending"} / {fighter.reach ?? "reach pending"} reach
      </p>
    </div>
  );
}

export default async function MatchupPage({ params }: MatchupPageProps) {
  const { fightId } = await params;
  const fight = getSourcedFight(fightId);

  if (!fight) {
    notFound();
  }

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
          href="/events/ufc-328"
          className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
        >
          ← back to matchups
        </Link>

        {/* Hero panel */}
        <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 md:p-6">
            <div>
              <p className="mono-label">{sourcedEvent.event.name.toLowerCase()}</p>
              <p className="mt-2 text-sm text-muted">
                {(fight.weightClass ?? "weight class pending").toLowerCase()} · {fight.rounds} rounds · {fight.cardPlacement.toLowerCase()}
              </p>
            </div>
          </div>
          {prediction && <FightResultBanner prediction={prediction} />}

          <div className="grid gap-0 lg:grid-cols-[1fr_220px_1fr] lg:items-stretch">
            <FighterHeroPanel fighter={fighterA} />

            <div className="flex min-h-[240px] flex-col border-y border-line bg-background/45 p-5 text-center lg:min-h-[390px] lg:border-x lg:border-y-0">
              <div className="flex flex-1 flex-col items-center justify-center space-y-4">
                <p className="text-8xl font-light tracking-[-0.08em] text-subtle/35">vs</p>
                <p className="data-text text-sm text-muted">
                  {fight.weightClass ?? "weight class pending"} / {fight.rounds} rounds
                </p>
                <div className="flex justify-center">
                  <StyleClashLabel label={fight.styleClashLabel} copyable />
                </div>
              </div>
              {canExport && (
                <div className="mt-6 flex justify-center">
                  <StyleClashSaveButton
                    fighterA={exportFighterA!}
                    fighterB={exportFighterB!}
                    styleClashLabel={fight.styleClashLabel ?? undefined}
                  />
                </div>
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
          <FormResumeModule fighterA={fighterA} fighterB={fighterB} modelOutput={fightShapeModel} />
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
