import Link from "next/link";
import type { SourcedEvent } from "@/lib/sourced-event";

interface EventHeroProps {
  event: SourcedEvent;
}

export function EventHero({ event }: EventHeroProps) {
  const mainFight = event.fights[0];
  const mainFightLabel = mainFight
    ? `${mainFight.fighters.fighterA.name.split(" ").pop()?.toLowerCase()} vs. ${mainFight.fighters.fighterB.name.split(" ").pop()?.toLowerCase()}`
    : null;
  const mainFightClash = mainFight?.styleClashLabel ?? null;

  return (
    <section className="section-shell py-8 md:py-12">
      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
        <div className="lens-card p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mono-label">{event.event.promotion.toLowerCase()} / fight lens</p>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-6xl">
            {event.event.name.toLowerCase()}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
            Every fight on the card. Open the lens, see the shape, take the read.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["date", event.event.date ?? "date pending"],
              ["location", event.event.location ?? "location pending"],
              ["bouts", `${event.fights.length}`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-background/45 p-4">
                <p className="mono-label">{label}</p>
                <p className="data-text mt-2 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {mainFight && (
          <div className="lens-card flex flex-col justify-between p-5 md:p-8">
            <div>
              <p className="mono-label">main event</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em]">
                {mainFightLabel}
              </h2>
              {mainFightClash && (
                <p className="mono-label mt-3 text-accent">{mainFightClash}</p>
              )}
              <p className="mt-4 text-sm leading-6 text-muted">
                {mainFight.matchupQuestion ?? "Analysis loading — check back once fighter data is sourced."}
              </p>
            </div>
            <Link
              href={`/events/${event.event.id}/${mainFight.id}`}
              className="tap-target mt-8 inline-flex items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              open main lens
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
