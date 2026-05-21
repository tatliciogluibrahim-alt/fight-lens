import Link from "next/link";
import type { SourcedEvent } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";

interface EventHeroProps {
  event: SourcedEvent;
  lockedPredictions?: PredictionRecord[];
}

function eventMainEvent(event: SourcedEvent) {
  const mainFight = event.fights[0];
  if (event.event.mainEvent) return `${event.event.mainEvent.fighterA} vs. ${event.event.mainEvent.fighterB}`;
  return mainFight
    ? `${mainFight.fighters.fighterA.name.split(" ").pop()?.toLowerCase()} vs. ${mainFight.fighters.fighterB.name.split(" ").pop()?.toLowerCase()}`
    : null;
}

function featuredBout(event: SourcedEvent) {
  const bout = event.event.featuredBouts?.[0];
  return bout ? `${bout.fighterA} vs. ${bout.fighterB}` : null;
}

function eventBroadcastLine(event: SourcedEvent) {
  if (event.event.broadcast && event.event.mainCardTime) return `${event.event.broadcast} · ${event.event.mainCardTime}`;
  return event.event.broadcast ?? event.event.mainCardTime ?? null;
}

function eventStatusChip(event: SourcedEvent, lockedPredictions: PredictionRecord[]) {
  if (lockedPredictions.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
        <span className="size-1.5 rounded-full bg-subtle/60" />
        card building · event details live
      </span>
    );
  }

  const resolved = lockedPredictions.filter((p) => p.outcome !== null);

  if (resolved.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
        <span className="size-1.5 animate-pulse rounded-full bg-accent/70" />
        forecast live · {lockedPredictions.length} calls logged · outcomes pending
      </span>
    );
  }

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
  const mainFightLabel = eventMainEvent(event);
  const mainFightHasCall =
    mainFight != null &&
    lockedPredictions.some((p) => p.fightId === mainFight.id);

  const statusChip = eventStatusChip(event, lockedPredictions);
  const broadcastLine = eventBroadcastLine(event);

  return (
    <section className="section-shell py-5 md:py-10">
      <div className="sm:hidden">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/80">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              {statusChip}
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.04em] text-foreground">
              {event.event.name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {event.event.date ?? "date TBA"}
              {event.event.location ? ` · ${event.event.location}` : ""}
            </p>
            {event.event.venue ? <p className="mt-1 text-xs text-subtle">{event.event.venue}</p> : null}
            {broadcastLine ? <p className="mt-1 text-xs text-subtle">{broadcastLine}</p> : null}
          </div>
          <div className="border-t border-line/60 bg-background/25 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
              {event.fights.length > 0 ? "main event · tap a fight below to read the model call" : "forecast opens when fight data is ready"}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="lens-card p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mono-label">{event.event.promotion.toLowerCase()} / fight lens</p>
            {statusChip}
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-5xl">
            {event.event.name.toLowerCase()}
          </h1>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span>{event.event.date ?? "date TBA"}</span>
            <span>{event.event.location ?? "location TBA"}</span>
            <span>{event.fights.length > 0 ? `${event.fights.length} bouts` : "model calls not published yet"}</span>
            {broadcastLine ? <span>{broadcastLine}</span> : null}
          </div>
          {event.event.venue ? <p className="mt-2 text-sm text-subtle">{event.event.venue}</p> : null}

          {mainFightLabel && (
            <div className="mt-6 flex flex-col gap-4 border-t border-line/60 pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mono-label">main event</p>
                <h2 className="mt-2 text-xl font-semibold leading-tight tracking-[-0.03em] md:text-2xl">
                  {mainFightLabel}
                </h2>
                {featuredBout(event) ? (
                  <p className="mt-2 text-sm text-muted">
                    <span className="text-subtle">also listed · </span>{featuredBout(event)}
                  </p>
                ) : mainFight?.matchupQuestion ? (
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                    {mainFight.matchupQuestion}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    {mainFightHasCall
                      ? "Forecast is live."
                      : "Forecast opens when fight data is ready."}
                  </p>
                )}
              </div>
              {mainFight ? (
                <Link
                  href={`/events/${event.event.id}/${mainFight.id}`}
                  className="tap-target inline-flex w-fit shrink-0 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
                >
                  View main event read
                </Link>
              ) : null}
            </div>
          )}

          <p className="mt-5 text-sm text-subtle">
            {event.fights.length > 0
              ? "Choose a fight below — each read starts with the model call."
              : "Fight rows and model calls will appear once the card is available."}
          </p>
        </div>
      </div>
    </section>
  );
}
