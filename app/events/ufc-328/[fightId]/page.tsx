import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FightResultBanner } from "@/components/FightResultBanner";
import { FightPageTabs } from "@/components/FightPageTabs";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FighterNamePlate } from "@/components/FighterNamePlate";
import { FightReadSnapshot } from "@/components/FightReadSnapshot";
import { FightShapeSummary } from "@/components/FightShapeSummary";
import { FormResumeModule } from "@/components/FormResumeModule";
import { PathsToVictory } from "@/components/PathsToVictory";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { getPredictionByFightId } from "@/lib/accuracy";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
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

function flagEmoji(code: string | undefined): string | null {
  if (!code) return null;
  const c = code.split("/")[0].trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  return Array.from(c).map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("");
}

function FighterHeroPanel({
  fighter,
  align = "left"
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
    <div className={`flex min-w-0 flex-col justify-center gap-3 overflow-visible p-5 py-7 md:p-8 md:py-9 ${isRight ? "lg:items-end lg:text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${isRight ? "lg:flex-row-reverse" : ""}`}>
        {country?.code && (
          <span className="text-base leading-none" aria-hidden="true">
            {flagEmoji(country.code)}
          </span>
        )}
        <p className="mono-label">{meta}</p>
      </div>
      <FighterNamePlate name={fighter.name} align={align} />
      {physicals && (
        <p className="data-text text-xs text-subtle">{physicals}</p>
      )}
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
  const prediction = getPredictionByFightId(fightId);
  const {
    fightShapeModel,
    viewModel: vm,
  } = buildPredictionViewModelBundle({
    eventId: "ufc-328",
    fight,
    lockedPrediction: prediction,
  });

  return (
    <>
      <AppHeader />
      <main className="section-shell py-6 md:py-10">
        <Link
          href="/events/ufc-328"
          className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
        >
          ← back to {sourcedEvent.event.name.toLowerCase()}
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
          {vm.isScored && <FightResultBanner viewModel={vm} />}

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_128px_minmax(0,1fr)] lg:items-stretch">
            <FighterHeroPanel fighter={fighterA} />

            <div className="flex flex-col items-center justify-center gap-3 border-y border-line bg-background/30 px-4 py-6 text-center lg:border-x lg:border-y-0">
              <p className="text-[2.5rem] font-light leading-none tracking-[-0.08em] text-subtle/25 md:text-[3.5rem]">
                vs
              </p>
              <p className="mono-label text-[10px]">
                {(fight.weightClass ?? "").toLowerCase() || "weight class"}
              </p>
              <p className="mono-label text-[10px] text-subtle/60">{fight.rounds}R</p>
            </div>

            <FighterHeroPanel fighter={fighterB} align="right" />
          </div>
        </section>

        <div className="fl-animate-fade-up fl-delay-400 mt-6 md:mt-8">
          <FightReadSnapshot viewModel={vm} />
        </div>

        {/* Analysis tabs */}
        <div className="mt-6 md:mt-8">
          <FightPageTabs
            tabs={[
              { id: "call", label: "call" },
              { id: "shape", label: "shape" },
              { id: "details", label: "details" },
            ]}
            panels={{
              call: (
                <>
                  <TheCall viewModel={vm} />
                  <FightShapeSummary
                    fight={fight}
                    modelOutput={fightShapeModel}
                    predictedWinnerId={vm.predictedWinner?.id ?? null}
                  />
                </>
              ),
              shape: (
                <StyleComparisonBars
                  fighterA={fighterA}
                  fighterB={fighterB}
                  modelOutput={fightShapeModel}
                  predictedWinnerId={vm.predictedWinner?.id ?? null}
                />
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
      </main>
      <DisclaimerFooter />
    </>
  );
}
