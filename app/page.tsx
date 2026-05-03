import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { StyleClashExportCard } from "@/components/StyleClashExportCard";
import { event, getFighter } from "@/lib/data";

const modules = [
  ["01", "fight shape", "the first read: short collision, long minutes, or layered swing points", "fight-shape"],
  ["02", "style clash", "overlap visual with the clearest style deltas", "section-overlap"],
  ["03", "form + resume", "named recent opponents, methods, tiers, and resume strength", "section-form-resume"],
  ["04", "round trend", "weighted round-by-round performance signals", "section-round-trend"],
  ["05", "tactical routes", "where each fighter can control minutes", "section-paths"]
];

export default function Home() {
  const mainFight = event.fights[0];
  const fighterA = getFighter(mainFight.fighterAId);
  const fighterB = getFighter(mainFight.fighterBId);

  return (
    <>
      <AppHeader />
      <main>
        <section className="section-shell py-10 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="mono-label">ufc 328 / no betting layer</p>
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-8xl">
              no picks.
                <span className="block text-accent">just shape.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens is a matchup intelligence tool built for creators and analysts. No odds.
                Big dick pics. Just the read.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/events/ufc-328"
                  className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-6 font-semibold text-white transition hover:brightness-110"
                >
                  open ufc 328
                </Link>
                <Link
                  href="/events/ufc-328/chimaev-strickland"
                  className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface/70 px-6 text-muted transition hover:bg-surface-2 hover:text-foreground"
                >
                  open main lens
                </Link>
              </div>
            </div>

            <div className="lens-card p-4 md:p-5">
              <StyleClashExportCard fighterA={fighterA} fighterB={fighterB} />
            </div>
          </div>
        </section>

        <EventHero event={event} />

        <section className="section-shell py-8 md:py-12">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono-label">index</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                five reads per fight.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              Each read has a job: establish the matchup, show the clash, prove recent form,
              weight the round trend, then name the cleanest tactical routes.
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.35rem] border border-line bg-surface/70">
            {modules.map(([number, title, description, target]) => (
              <Link
                key={number}
                href={`/events/ufc-328/chimaev-strickland#${target}`}
                className="grid gap-3 border-b border-line p-5 transition last:border-b-0 hover:bg-surface-2 md:grid-cols-[80px_1fr_2fr_auto] md:items-center"
              >
                <span className="data-text text-sm text-subtle">/ {number}</span>
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                <p className="font-mono text-xs leading-6 text-muted">{description}</p>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-accent">jump</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
