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
    <section className="section-shell py-6 md:py-10">
      <div className="lens-card p-5 md:p-8">
        {/* Header: promotion label + status */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="mono-label">{event.event.promotion.toLowerCase()} / fight lens</p>
          {statusChip}
        </div>

        {/* Event name */}
        <h1 className="mt-4 text-3xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-5xl">
          {event.event.name.toLowerCase()}
        </h1>

        {/* Date · location · bouts — compact inline strip */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span>{event.event.date ?? "date pending"}</span>
          <span>{event.event.location ?? "location pending"}</span>
          <span>{event.fights.length} bouts</span>
        </div>

        {/* Main event highlight — only when there's a main fight */}
        {mainFight && (
          <div className="mt-6 flex flex-col gap-4 border-t border-line/60 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mono-label">main event</p>
              <h2 className="mt-2 text-xl font-semibold leading-tight tracking-[-0.03em] md:text-2xl">
                {mainFightLabel}
              </h2>
              {mainFight.matchupQuestion && (
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  {mainFight.matchupQuestion}
                </p>
              )}
              {!mainFight.matchupQuestion && (
                <p className="mt-2 text-sm text-muted">
                  {mainFightHasCall
                    ? "Forecast is live."
                    : "Analysis loads closer to the event."}
                </p>
              )}
            </div>
            <Link
              href={`/events/${event.event.id}/${mainFight.id}`}
              className="tap-target inline-flex w-fit shrink-0 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
            >
              View main event read
            </Link>
          </div>
        )}

        {/* Instruction line */}
        <p className="mt-5 text-sm text-subtle">
          Choose a fight below — each read starts with the model call.
        </p>
      </div>
    </section>
  );
}
