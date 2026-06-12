import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FightResultBanner } from "@/components/FightResultBanner";
import { FightPageTabs } from "@/components/FightPageTabs";
import { TheCall } from "@/components/TheCall";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { FightFeatureHero } from "@/components/FightFeatureHero";
import { FormResumeModule } from "@/components/FormResumeModule";
import { PathsToVictory } from "@/components/PathsToVictory";
import { StyleComparisonBars } from "@/components/StyleComparisonBars";
import { getAccuracyMetrics, getPredictionByFightId } from "@/lib/accuracy";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
import { getAllFightParams, getEvent, getEventFight } from "@/lib/events/registry";
import { MobileFightRead } from "@/components/MobileFightRead";
import { ContextualNotes } from "@/components/ContextualNotes";
import { ModelContextFooter } from "@/components/ModelSanity";
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
// Age parser kept here because it's only used by the Tale-of-the-Tape row
// below. The bigger flag/country/ranking/name helpers moved into
// FightFeatureHero with the rest of the cinematic hero treatment.

function parseAge(dob: string | null | undefined, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
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
          {/*
            Fight Feature Hero — the cinematic, editorial opening of every
            fight page. Replaces the previous fighter-hero grid. Uses the
            style fingerprint silhouettes as ambient watermarks, massive
            editorial type for fighter names, and an editorial-style model
            call callout in the centre. The whole hero is one component so
            every fight across every event gets the upgrade at once.
          */}
          <div className="mt-5">
            <FightFeatureHero
              fighterA={fighterA}
              fighterB={fighterB}
              viewModel={vm}
              weightClass={fight.weightClass}
              rounds={fight.rounds}
              cardPlacement={fight.cardPlacement}
              eventNameLower={event.event.name.toLowerCase()}
            />
          </div>

          {vm.isScored && (
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <FightResultBanner viewModel={vm} />
            </div>
          )}

          {/* Tale of the tape — head-to-head physicals strip below the hero */}
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
                    <TheCall viewModel={vm} modelSanity={fight.modelSanity} />
                    {/*
                      ContextualNotes sits inside the call section on desktop so
                      manual context (the "not in model" disclosures) reads next
                      to the lean — matching the mobile flow. Burying it in the
                      "details" section forced a serious reader to scroll past
                      shape + form/resume just to see the disclaimer that often
                      explains why the lean looks the way it does.
                    */}
                    <ContextualNotes notes={fight.contextNotes} />
                    {/* Market sanity + blind-spot tags — after manual context */}
                    <ModelContextFooter sanity={fight.modelSanity} />
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
