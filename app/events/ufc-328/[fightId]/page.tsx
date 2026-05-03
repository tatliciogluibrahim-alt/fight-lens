import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FightShapeSummary } from "@/components/FightShapeSummary";
import { FormResumeModule } from "@/components/FormResumeModule";
import { FighterAssetSlot } from "@/components/FighterAssetSlot";
import { PathsToVictory } from "@/components/PathsToVictory";
import { RoundTrendModule } from "@/components/RoundTrendModule";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
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
        <p className="mono-label">{fighter.ranking || "nr"} / {fighter.stance ?? "stance pending"}</p>
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

  return (
    <>
      <AppHeader />
      <main className="section-shell py-6 md:py-10">
        <Link
          href="/events/ufc-328"
          className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
        >
          back to card
        </Link>

        <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 md:p-6">
            <div>
              <p className="mono-label">{sourcedEvent.event.name.toLowerCase()}</p>
              <p className="mt-2 text-sm text-muted">
                {(fight.weightClass ?? "weight class pending").toLowerCase()} · {fight.rounds} rounds · {fight.cardPlacement.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_220px_1fr] lg:items-stretch">
            <FighterHeroPanel fighter={fighterA} />

          <div className="grid min-h-[240px] border-y border-line bg-background/45 p-5 text-center lg:min-h-[390px] lg:border-x lg:border-y-0">
            <div className="m-auto">
              <p className="mono-label">matchup lens</p>
              <p className="my-3 text-6xl font-light tracking-[-0.08em] text-subtle md:text-7xl">vs</p>
              <p className="data-text text-sm text-muted">
                {fight.weightClass ?? "weight class pending"} / {fight.rounds} rounds
              </p>
              <p className="mx-auto mt-4 max-w-[24ch] text-sm leading-6 text-muted">
                {fight.styleClashLabel ?? "matchup data ready"}
              </p>
            </div>
          </div>

          <FighterHeroPanel fighter={fighterB} align="right" />
          </div>
        </section>

        <div className="mt-6 space-y-5 md:mt-8 md:space-y-6">
          <FightShapeSummary fight={fight} />
          <StyleComparisonBars fighterA={fighterA} fighterB={fighterB} styleClashLabel={fight.styleClashLabel ?? undefined} />
          <FormResumeModule fighterA={fighterA} fighterB={fighterB} />
          <RoundTrendModule fight={fight} />
          <PathsToVictory fight={fight} />
        </div>
      </main>
      <DisclaimerFooter />
    </>
  );
}
