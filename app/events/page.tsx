import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { getAllEvents } from "@/lib/events/registry";
import { getLockedPredictions } from "@/lib/accuracy";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { SourcedEvent } from "@/lib/sourced-event";

export const metadata: Metadata = {
  title: "Events | Fight Lens",
  description:
    "Browse every UFC card Fight Lens has modeled, from the current forecast to scored past cards.",
};

type EventStatus = "upcoming" | "pending outcomes" | "completed";

function predictionsForEvent(event: SourcedEvent, predictions: PredictionRecord[]) {
  const fightIds = new Set(event.fights.map((fight) => fight.id));
  return predictions.filter((prediction) => fightIds.has(prediction.fightId));
}

function eventStats(event: SourcedEvent, predictions: PredictionRecord[]) {
  const eventPredictions = predictionsForEvent(event, predictions);
  const resolved = eventPredictions.filter((prediction) => prediction.outcome !== null);
  const correct = resolved.filter((prediction) => {
    if (!prediction.outcome || prediction.outcome.winner === "draw" || prediction.outcome.winner === "nc") return false;
    return getPredictionRecordCall(prediction).predictedSide === prediction.outcome.winner;
  });
  const status: EventStatus =
    resolved.length === 0
      ? "upcoming"
      : resolved.length < eventPredictions.length
        ? "pending outcomes"
        : "completed";

  return { eventPredictions, resolved, correct, status };
}

function StatusPill({ status, callsLogged }: { status: EventStatus; callsLogged: number }) {
  if (status === "upcoming") {
    return (
      <span className="status-pill is-live">
        <span className="dot" />
        forecast live · {callsLogged} calls logged
      </span>
    );
  }

  return (
    <span className="status-pill is-scored">
      <span className="dot" />
      {status}
    </span>
  );
}

function EventCard({
  event,
  predictions,
  priority = false,
}: {
  event: SourcedEvent;
  predictions: PredictionRecord[];
  priority?: boolean;
}) {
  const stats = eventStats(event, predictions);
  const mainFight = event.fights[0];

  return (
    <article className={`overflow-hidden rounded-2xl border ${priority ? "border-accent/30 bg-surface" : "border-line bg-surface/70"}`}>
      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <p className={`mono-label ${priority ? "text-accent" : ""}`}>
              {priority ? "current / upcoming card" : "past card"}
            </p>
            <StatusPill status={stats.status} callsLogged={stats.eventPredictions.length} />
          </div>

          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
            {event.event.name}
          </h2>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <span><span className="text-subtle">date · </span>{event.event.date ?? "pending"}</span>
            <span><span className="text-subtle">location · </span>{event.event.location ?? "pending"}</span>
            <span>
              <span className="text-subtle">{stats.status === "completed" ? "scored · " : "calls logged · "}</span>
              {stats.status === "completed" ? stats.resolved.length : stats.eventPredictions.length}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/events/${event.event.id}`}
              className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
            >
              Open card
            </Link>
            {stats.resolved.length > 0 && (
              <Link
                href="/record"
                className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2 px-5 text-sm text-muted transition hover:border-accent/30 hover:text-foreground"
              >
                See record
              </Link>
            )}
          </div>
        </div>

        <div className="border-t border-line bg-background/35 p-5 md:p-7 lg:border-l lg:border-t-0">
          <p className="mono-label">main event</p>
          {mainFight ? (
            <>
              <p className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground">
                {mainFight.fighters.fighterA.name}
                <span className="font-normal text-subtle"> vs </span>
                {mainFight.fighters.fighterB.name}
              </p>
              <p className="data-text mt-2 text-xs uppercase tracking-[0.12em] text-subtle">
                {(mainFight.weightClass ?? "weight pending").toLowerCase()} · {mainFight.rounds} rounds
              </p>
              {mainFight.matchupQuestion && (
                <p className="mt-4 text-sm leading-6 text-muted">{mainFight.matchupQuestion}</p>
              )}
              <Link
                href={`/events/${event.event.id}/${mainFight.id}`}
                className="mt-5 inline-flex text-xs uppercase tracking-[0.14em] text-subtle transition hover:text-accent"
              >
                View read →
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Main event pending.</p>
          )}

          {stats.resolved.length > 0 && (
            <div className="mt-5 border-t border-line/60 pt-4 text-xs text-muted">
              {stats.resolved.length} scored · {stats.correct.length}/{stats.resolved.length} model calls correct
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function EventsIndexPage() {
  const events = getAllEvents();
  const allPredictions = getLockedPredictions();
  const currentEvent = events[0];
  const pastEvents = events.slice(1);

  return (
    <>
      <AppHeader />
      <main>
        <section className="section-shell py-10 md:py-16">
          <p className="mono-label accent-rail">events</p>
          <h1 className="mt-1 text-5xl font-semibold leading-[0.94] tracking-[-0.05em] md:text-7xl">
            open a card. <span className="text-accent">read the calls.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
            Start with the current forecast, then browse scored cards and jump into any fight read.
            The public record stays separate from historical validation.
          </p>
        </section>

        {currentEvent && (
          <section className="section-shell pb-8 md:pb-12">
            <EventCard event={currentEvent} predictions={allPredictions} priority />
          </section>
        )}

        {pastEvents.length > 0 && (
          <section className="section-shell py-8 md:py-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mono-label accent-rail">past cards</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">past cards, scored.</h2>
              </div>
              <Link href="/record" className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground">
                model record →
              </Link>
            </div>
            <div className="grid gap-4">
              {pastEvents.map((event) => (
                <EventCard key={event.event.id} event={event} predictions={allPredictions} />
              ))}
            </div>
          </section>
        )}

        <section className="section-shell pb-12 md:pb-16">
          <div className="rounded-2xl border border-line bg-surface/70 p-5 md:p-6">
            <p className="mono-label">record separation</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Public Model Record shows logged public calls only. Historical validation and backtest rows are
              retroactive checks, clearly labeled on the record page, and do not count as public logged calls.
            </p>
            <Link href="/record" className="mt-4 inline-flex text-xs uppercase tracking-[0.14em] text-subtle hover:text-accent">
              View Model Record →
            </Link>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
