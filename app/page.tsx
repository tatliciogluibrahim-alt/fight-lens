import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { PrototypeBadge } from "@/components/PrototypeBadge";
import { event } from "@/lib/data";

const modules = [
  ["01", "fight shape", "the first read: short collision, long minutes, or layered swing points", "fight-shape"],
  ["02", "style clash", "overlap visual, side-by-side pressure, volume, control, and defense", "style-clash"],
  ["03", "recent momentum", "named opponents and form context from recent fights", "last-five-trend"],
  ["04", "resume heat", "opponent quality without hype", "resume-heat"],
  ["05", "key edges", "measurable deltas that explain the matchup", "key-edges"],
  ["06", "paths to victory", "tactical routes, not predictions", "paths-to-victory"],
  ["07", "creator cards", "export-style visuals built from the matchup read", "creator-cards"]
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
                <PrototypeBadge />
                <p className="mono-label">ufc 328 / no betting layer</p>
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-8xl">
              no picks.
                <span className="block text-accent">just shape.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens is a clean matchup intelligence dashboard for creators, analysts, and
                fight teams. It compresses style, momentum, resume heat, and tactical routes into
                visual blocks built to screenshot.
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

            <div className="lens-card p-5 md:p-6">
              <p className="mono-label">creator output</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["01", "shape"],
                  ["02", "style"],
                  ["03", "edges"]
                ].map(([number, label]) => (
                  <div key={label} className="rounded-2xl border border-line bg-background/45 p-4 text-center">
                    <p className="data-text text-2xl text-foreground">{number}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-muted">
                Every module is framed as an exportable read: one question, one visual, one useful
                line.
              </p>
            </div>
          </div>
        </section>

        <EventHero event={event} />

        <section className="section-shell py-8 md:py-12">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono-label">index</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                seven blocks per fight.
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
