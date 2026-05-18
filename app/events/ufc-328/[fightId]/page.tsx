import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FightResultBanner } from "@/components/FightResultBanner";
import { FightPageTabs } from "@/components/FightPageTabs";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FightShapeSummary } from "@/components/FightShapeSummary";
import { FormResumeModule } from "@/components/FormResumeModule";
import { FighterAssetSlot } from "@/components/FighterAssetSlot";
import { PathsToVictory } from "@/components/PathsToVictory";
import { StyleClashLabel } from "@/components/StyleClashLabel";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
import { formatRanking } from "@/lib/display";
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
    <div className={`flex min-h-[340px] flex-col gap-5 p-5 md:p-8 ${isRight ? "lg:items-end lg:text-right" : ""}`}>
      <FighterAssetSlot
        fighter={fighter}
        fallbackName={fighter.name}
        fallbackCountry={{
          code: fighter.country?.code,
          label: fighter.country?.label,
          colors: fighter.country?.colors
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
        {[fighter.record, fighter.height, fighter.reach ? `${fighter.reach} reach` : null]
          .filter(Boolean)
          .join(" · ")}
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

            <div className="flex min-h-[240px] flex-col items-center justify-center gap-5 border-y border-line bg-background/30 py-8 px-5 text-center lg:min-h-[340px] lg:border-x lg:border-y-0">
              <p className="text-[5rem] font-light leading-none tracking-[-0.08em] text-subtle/25 md:text-[7rem]">
                vs
              </p>
              {fight.styleClashLabel && (
                <StyleClashLabel label={fight.styleClashLabel} copyable />
              )}
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
