import Link from "next/link";
import type { SourcedEvent } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";

interface EventHeroProps {
  event: SourcedEvent;
  lockedPredictions?: PredictionRecord[];
}

function eventStatusChip(lockedPredictions: PredictionRecord[]) {
  if (lockedPredictions.length === 0) return null;

  const resolved = lockedPredictions.filter((p) => p.outcome !== null);

  if (resolved.length === 0) {
    // All pending — upcoming event
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
        <span className="size-1.5 animate-pulse rounded-full bg-accent/70" />
        forecast live · {lockedPredictions.length} calls logged · outcomes pending
      </span>
    );
  }

  // Some or all resolved — completed
  const correct = resolved.filter((p) => {
    if (!p.outcome || p.outcome.winner === "draw" || p.outcome.winner === "nc") return false;
    return getPredictionRecordCall(p).predictedSide === p.outcome.winner;
  });

  const allResolved = resolved.length === lockedPredictions.length;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
      <span className="size-1.5 rounded-full bg-success" />
      {allResolved ? "completed" : "partial results"} · {correct.length}/{resolved.length} correct
    </span>
  );
}

export function EventHero({ event, lockedPredictions = [] }: EventHeroProps) {
  const mainFight = event.fights[0];
  const mainFightLabel = mainFight
    ? `${mainFight.fighters.fighterA.name.split(" ").pop()?.toLowerCase()} vs. ${mainFight.fighters.fighterB.name.split(" ").pop()?.toLowerCase()}`
    : null;
  // Check if main fight has a live locked prediction — avoids showing
  // "stats pending" when a model call already exists.
  const mainFightHasCall =
    mainFight != null &&
    lockedPredictions.some((p) => p.fightId === mainFight.id);

  const statusChip = eventStatusChip(lockedPredictions);

  return (
    <section className="section-shell py-8 md:py-12">
      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
        <div className="lens-card p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mono-label">{event.event.promotion.toLowerCase()} / fight lens</p>
            {statusChip}
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-6xl">
            {event.event.name.toLowerCase()}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
            Choose a fight below. Each read starts with the model call, then optional shape context.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["date", event.event.date ?? "date pending"],
              ["location", event.event.location ?? "location pending"],
              ["bouts", `${event.fights.length}`],
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
              <p className="mt-4 text-sm leading-6 text-muted">
                {mainFight.matchupQuestion ??
                  (mainFightHasCall
                    ? "Forecast is live. Result will be scored after the fight."
                    : "Analysis loads closer to the event.")}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/events/${event.event.id}/${mainFight.id}`}
                className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
              >
                View main event read
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
