import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { getAllEvents } from "@/lib/events/registry";
import { getLockedPredictions } from "@/lib/accuracy";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";
import { classifyEvents, eventStatus, type EventStatus } from "@/lib/events/classify";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";

export const metadata: Metadata = {
  title: "Events | Fight Lens",
  description:
    "Browse every UFC card Fight Lens has modeled, from the current forecast to scored past cards.",
};

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
  const status: EventStatus = eventStatus(event, predictions);
  const countLabel =
    status === "completed"
      ? `${resolved.length} scored · ${correct.length}/${resolved.length} correct`
      : status === "callsLogged"
        ? `${eventPredictions.length} calls logged · outcomes pending`
        : event.fights.length > 0
          ? `${event.fights.length} bouts · model calls not published yet`
          : "fight card pending";

  return { eventPredictions, resolved, correct, status, countLabel };
}

function StatusPill({ stats }: { stats: EventStats }) {
  if (stats.status === "cardBuilding") {
    return (
      <span className="status-pill">
        <span className="dot" />
        forecast pending
      </span>
    );
  }

  if (stats.status === "callsLogged") {
    return (
      <span className="status-pill is-active">
        <span className="dot" />
        calls logged · {stats.eventPredictions.length}
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

function eventMainEvent(event: SourcedEvent, fight?: SourcedFight) {
  if (event.event.mainEvent) return `${event.event.mainEvent.fighterA} vs ${event.event.mainEvent.fighterB}`;
  if (fight) return `${fight.fighters.fighterA.name} vs ${fight.fighters.fighterB.name}`;
  return null;
}

function eventLocation(event: SourcedEvent) {
  return event.event.location ?? "location TBA";
}

function eventBroadcastLine(event: SourcedEvent) {
  if (event.event.broadcast && event.event.mainCardTime) return `${event.event.broadcast} · ${event.event.mainCardTime}`;
  return event.event.broadcast ?? event.event.mainCardTime ?? null;
}

function featuredBout(event: SourcedEvent) {
  const bout = event.event.featuredBouts?.[0];
  return bout ? `${bout.fighterA} vs ${bout.fighterB}` : null;
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
  const mainEvent = eventMainEvent(event, mainFight);
  const broadcastLine = eventBroadcastLine(event);

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition hover:border-accent/35 hover:bg-surface-2/30 ${
        priority ? "border-accent/30 bg-surface" : "border-line bg-surface/70"
      }`}
    >
      <div className="sm:hidden p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`mono-label ${priority ? "text-accent" : ""}`}>{label}</p>
          <StatusPill stats={stats} />
        </div>

        <h2 className="mt-3 text-xl font-semibold leading-tight tracking-[-0.035em] text-foreground">
          {event.event.name}
        </h2>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{event.event.date ?? "date TBA"}</span>
          <span>{eventLocation(event)}</span>
        </div>

        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="mono-label">main event</p>
          <p className="mt-1.5 text-sm font-semibold leading-tight tracking-tight text-foreground">
            {mainEvent ?? "Model calls unlock once fight data is available."}
          </p>
          <p className="mt-1.5 text-xs text-subtle">{stats.countLabel}</p>
        </div>

        <Link
          href={"/events/" + event.event.id}
          className="tap-target mt-4 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
        >
          Open card
        </Link>
      </div>

      <div className="hidden sm:block p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className={`mono-label ${priority ? "text-accent" : ""}`}>{label}</p>
          <StatusPill stats={stats} />
        </div>

        <h2 className={`mt-4 font-semibold leading-tight tracking-[-0.04em] ${priority ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`}>
          {event.event.name}
        </h2>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span>{event.event.date ?? "date TBA"}</span>
          <span>{eventLocation(event)}</span>
          <span>{stats.countLabel}</span>
        </div>
        {event.event.venue ? <p className="mt-2 text-sm text-subtle">{event.event.venue}</p> : null}
        {broadcastLine ? <p className="mt-1 text-xs text-subtle">{broadcastLine}</p> : null}

        <div className="mt-5 border-t border-line/60 pt-4">
          <p className="mono-label">main event</p>
          {mainEvent ? (
            <>
              <p className="mt-2 text-base font-semibold leading-tight tracking-tight text-foreground">
                {mainEvent}
              </p>
              {mainFight?.weightClass ? (
                <p className="data-text mt-1 text-xs uppercase tracking-[0.12em] text-subtle">
                  {mainFight.weightClass.toLowerCase()} · {mainFight.rounds}R
                </p>
              ) : null}
              {featuredBout(event) ? (
                <p className="mt-2 text-sm text-muted"><span className="text-subtle">also listed · </span>{featuredBout(event)}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">
              Model calls unlock once fight data is available.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/events/${event.event.id}`}
            className="tap-target inline-flex w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110 sm:w-auto"
          >
            Open card
          </Link>
          {stats.resolved.length > 0 && (
            <Link
              href="/record"
              className="tap-target inline-flex w-full items-center justify-center rounded-full border border-line bg-surface-2 px-5 text-sm text-muted transition hover:border-accent/30 hover:text-foreground sm:w-auto"
            >
              See record
            </Link>
          )}
        </div>
      </div>

      {stats.resolved.length > 0 && (
        <div className="hidden border-t border-line bg-background/35 px-5 py-3 text-xs text-muted sm:block md:px-6">
          {stats.resolved.length} scored · {stats.correct.length}/{stats.resolved.length} model calls correct
        </div>
      )}
    </article>
  );
}

export default function EventsIndexPage() {
  const events = getAllEvents();
  const allPredictions = getLockedPredictions();
  // Bucket by status/date — a completed card never occupies the next-card slot.
  const { current: nextEvent, upcoming: upcomingEvents, past: pastEvents } = classifyEvents(
    events,
    allPredictions,
  );

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
            Start with the next card, then browse logged forecasts and scored cards.
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
