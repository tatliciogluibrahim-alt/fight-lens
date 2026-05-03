import Link from "next/link";
import type { SourcedEvent } from "@/lib/sourced-event";

interface EventHeroProps {
  event: SourcedEvent;
}

export function EventHero({ event }: EventHeroProps) {
  return (
    <section className="section-shell py-8 md:py-12">
      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
        <div className="lens-card p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mono-label">{event.event.promotion.toLowerCase()} / card dashboard</p>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-6xl">
            {event.event.name.toLowerCase()}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
            A clean card view for matchup shape, style clash, form plus resume context, round trend,
            and tactical routes.
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

        <div className="lens-card flex flex-col justify-between p-5 md:p-8">
          <div>
            <p className="mono-label">main lens</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em]">
              chimaev vs. strickland
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Control storm versus pressure jab. The first read is whether the fight becomes a
              short collision or a long minute-winning test.
            </p>
          </div>
          <Link
            href="/events/ufc-328/chimaev-strickland"
            className="tap-target mt-8 inline-flex items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            open main lens
          </Link>
        </div>
      </div>
    </section>
  );
}
