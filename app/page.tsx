import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModuleEmptyState } from "@/components/ModuleEmptyState";
import { StyleClashExportCard } from "@/components/StyleClashExportCard";
import { hasCompleteExportStyleProfile } from "@/lib/fight-shape";
import { sourcedEvent } from "@/lib/sourced-event";

export default function Home() {
  const mainFight = sourcedEvent.fights[0];
  const fighterA = mainFight.fighters.fighterA;
  const fighterB = mainFight.fighters.fighterB;
  const exportFighterA = hasCompleteExportStyleProfile(fighterA.styleProfile)
    ? { name: fighterA.name, styleProfile: fighterA.styleProfile }
    : null;
  const exportFighterB = hasCompleteExportStyleProfile(fighterB.styleProfile)
    ? { name: fighterB.name, styleProfile: fighterB.styleProfile }
    : null;
  const canShowPreview = Boolean(exportFighterA && exportFighterB);

  return (
    <>
      <AppHeader />
      <main>
        <section className="section-shell py-10 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="mono-label">fight lens / ufc 328</p>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-8xl">
                see the fight.
                <span className="block text-accent">as shape.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens turns UFC matchups into clean visual reads — the clash, the cleaner path, and the swing factor. Built for creators and serious fans.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/events/ufc-328"
                  className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-6 font-semibold text-white transition hover:brightness-110"
                >
                  View UFC 328 Matchups
                </Link>
                <Link
                  href="/events/ufc-328/chimaev-strickland"
                  className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface/70 px-6 text-muted transition hover:bg-surface-2 hover:text-foreground"
                >
                  Main Event Read
                </Link>
              </div>
            </div>

            <div className="lens-card p-4 md:p-5">
              {canShowPreview ? (
                <StyleClashExportCard
                  fighterA={exportFighterA!}
                  fighterB={exportFighterB!}
                  styleClashLabel={mainFight.styleClashLabel}
                />
              ) : (
                <ModuleEmptyState
                  label="main event"
                  title="Preview pending."
                  body="Style metrics not complete enough to draw the matchup card."
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
