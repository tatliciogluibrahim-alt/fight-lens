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

type EventStatus = "forecastPending" | "forecastLive" | "pendingOutcomes" | "completed";

type EventStats = {
  eventPredictions: PredictionRecord[];
  resolved: PredictionRecord[];
  correct: PredictionRecord[];
  status: EventStatus;
  countLabel: string;
};

function predictionsForEvent(event: SourcedEvent, predictions: PredictionRecord[]) {
  const fightIds = new Set(event.fights.map((fight) => fight.id));
  return predictions.filter((prediction) => fightIds.has(prediction.fightId));
}

function eventStats(event: SourcedEvent, predictions: PredictionRecord[]): EventStats {
  const eventPredictions = predictionsForEvent(event, predictions);
  const resolved = eventPredictions.filter((prediction) => prediction.outcome !== null);
  const correct = resolved.filter((prediction) => {
    if (!prediction.outcome || prediction.outcome.winner === "draw" || prediction.outcome.winner === "nc") return false;
    return getPredictionRecordCall(prediction).predictedSide === prediction.outcome.winner;
  });
  const status: EventStatus =
    eventPredictions.length === 0
      ? "forecastPending"
      : resolved.length === 0
        ? "forecastLive"
        : resolved.length < eventPredictions.length
          ? "pendingOutcomes"
          : "completed";
  const countLabel =
    status === "completed"
      ? `${resolved.length} scored · ${correct.length}/${resolved.length} correct`
      : status === "forecastLive"
        ? `${eventPredictions.length} calls logged`
        : event.fights.length > 0
          ? `${event.fights.length} bouts · calls pending`
          : "fight card pending";

  return { eventPredictions, resolved, correct, status, countLabel };
}

function StatusPill({ stats }: { stats: EventStats }) {
  if (stats.status === "forecastPending") {
    return (
      <span className="status-pill">
        <span className="dot" />
        forecast pending
      </span>
    );
  }

  if (stats.status === "forecastLive") {
    return (
      <span className="status-pill is-live">
        <span className="dot" />
        forecast live · {stats.eventPredictions.length} calls logged
      </span>
    );
  }

  return (
    <span className="status-pill is-scored">
      <span className="dot" />
      {stats.status === "pendingOutcomes" ? "pending outcomes" : "completed"}
    </span>
  );
}

function EventCard({
  event,
  predictions,
  label,
  priority = false,
}: {
  event: SourcedEvent;
  predictions: PredictionRecord[];
  label: string;
  priority?: boolean;
}) {
  const stats = eventStats(event, predictions);
  const mainFight = event.fights[0];

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition hover:border-accent/35 hover:bg-surface-2/30 ${
        priority ? "border-accent/30 bg-surface" : "border-line bg-surface/70"
      }`}
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className={`mono-label ${priority ? "text-accent" : ""}`}>{label}</p>
          <StatusPill stats={stats} />
        </div>

        <h2 className={`mt-4 font-semibold leading-tight tracking-[-0.04em] ${priority ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`}>
          {event.event.name}
        </h2>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span>{event.event.date ?? "date pending"}</span>
          <span>{event.event.location ?? "location pending"}</span>
          <span>{stats.countLabel}</span>
        </div>

        <div className="mt-5 border-t border-line/60 pt-4">
          <p className="mono-label">main event</p>
          {mainFight ? (
            <>
              <p className="mt-2 text-base font-semibold leading-tight tracking-tight text-foreground">
                {mainFight.fighters.fighterA.name}
                <span className="font-normal text-subtle"> vs </span>
                {mainFight.fighters.fighterB.name}
              </p>
              {mainFight.weightClass && (
                <p className="data-text mt-1 text-xs uppercase tracking-[0.12em] text-subtle">
                  {mainFight.weightClass.toLowerCase()} · {mainFight.rounds}R
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">
              Fight card pending. Model calls unlock once fight data is available.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
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

      {stats.resolved.length > 0 && (
        <div className="border-t border-line bg-background/35 px-5 py-3 text-xs text-muted md:px-6">
          {stats.resolved.length} scored · {stats.correct.length}/{stats.resolved.length} model calls correct
        </div>
      )}
    </article>
  );
}

export default function EventsIndexPage() {
  const events = getAllEvents();
  const allPredictions = getLockedPredictions();
  const nextEvent = events[0] ?? null;
  const upcomingEvents = events.slice(1).filter((event) => eventStats(event, allPredictions).status !== "completed");
  const pastEvents = events.filter((event) => eventStats(event, allPredictions).status === "completed");

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
            Start with the next forecast, then browse scored cards and jump into any fight read.
            Public record stays separate from historical validation.
          </p>
        </section>

        {nextEvent && (
          <section className="section-shell pb-8 md:pb-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mono-label accent-rail">next card</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">start here.</h2>
              </div>
            </div>
            <EventCard event={nextEvent} predictions={allPredictions} label="next card" priority />
          </section>
        )}

        {upcomingEvents.length > 0 && (
          <section className="section-shell py-6 md:py-10">
            <div className="mb-4">
              <p className="mono-label accent-rail">upcoming</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">forecast cards.</h2>
            </div>
            <div className="grid gap-4">
              {upcomingEvents.map((event) => (
                <EventCard key={event.event.id} event={event} predictions={allPredictions} label="upcoming card" />
              ))}
            </div>
          </section>
        )}

        {pastEvents.length > 0 && (
          <section className="section-shell py-6 md:py-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mono-label accent-rail">past scored</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">scored cards.</h2>
              </div>
              <Link href="/record" className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground">
                model record →
              </Link>
            </div>
            <div className="grid gap-4">
              {pastEvents.map((event) => (
                <EventCard key={event.event.id} event={event} predictions={allPredictions} label="past scored" />
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
