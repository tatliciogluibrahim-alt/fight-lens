import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { event } from "@/lib/data";

const modules = [
  ["01", "fight shape", "the first read: short collision, long minutes, or layered swing points", "fight-shape"],
  ["02", "style clash", "overlap visual, side-by-side pressure, volume, control, and defense", "section-overlap"],
  ["03", "recent momentum", "named opponents and form context from recent fights", "section-momentum"],
  ["04", "resume heat", "opponent quality without hype", "section-resume"],
  ["05", "key edges", "measurable deltas that explain the matchup", "section-edges"],
  ["06", "paths to victory", "tactical routes, not predictions", "section-paths"]
];

export default function Home() {
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
                No picks. Just the read.
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
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-line bg-background/70">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
                  OVERLAP CARD / PREVIEW PENDING
                </p>
              </div>
            </div>
          </div>
        </section>

        <EventHero event={event} />

        <section className="section-shell py-8 md:py-12">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono-label">index</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                six blocks per fight.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              This is the navigation model for each matchup. Click a block to jump into that
              section of the main lens; each one should become an exportable creator asset.
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
