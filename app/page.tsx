import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { getAccuracyMetrics, getLockedPredictions } from "@/lib/accuracy";
import { getAllEvents, getLatestEvent } from "@/lib/events/registry";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";

const startSteps = [
  {
    title: "Start with the card",
    body: "Open the current event and scan the fights.",
  },
  {
    title: "Read the call",
    body: "Each fight starts with the model call, read strength, likely finish type, and what could break the call.",
  },
  {
    title: "Explore the shape",
    body: "Optional deeper context. The radar shows how the fight style tilts, not the winner forecast.",
  },
  {
    title: "Check the record",
    body: "Every logged call is scored after the official result.",
  },
];

type EventStatus = "upcoming" | "pending outcomes" | "completed";

function eventShortName(eventName: string) {
  return eventName.split(":")[0] ?? eventName;
}

function predictionsForEvent(event: SourcedEvent, predictions: PredictionRecord[]) {
  const fightIds = new Set(event.fights.map((fight) => fight.id));
  return predictions.filter((prediction) => fightIds.has(prediction.fightId));
}

function eventStats(event: SourcedEvent, predictions: PredictionRecord[]) {
  const eventPredictions = predictionsForEvent(event, predictions);
  const resolved = eventPredictions.filter((prediction) => prediction.outcome !== null);
  const correct = resolved.filter((prediction) => {
    if (!prediction.outcome || prediction.outcome.winner === "draw" || prediction.outcome.winner === "nc") {
      return false;
    }

    const a = prediction.prediction.fighterAWinProbability;
    const b = prediction.prediction.fighterBWinProbability;
    const calledSide = Math.max(a, b) < 52 ? null : a > b ? "fighterA" : "fighterB";
    return calledSide === prediction.outcome.winner;
  });

  const status: EventStatus =
    resolved.length === 0
      ? "upcoming"
      : resolved.length < eventPredictions.length
        ? "pending outcomes"
        : "completed";

  return {
    predictions: eventPredictions,
    resolved,
    correct,
    status,
  };
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

function MainEventLine({ fight }: { fight: SourcedFight | undefined }) {
  if (!fight) return null;
  return (
    <p className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground">
      {fight.fighters.fighterA.name}
      <span className="font-normal text-subtle"> vs </span>
      {fight.fighters.fighterB.name}
    </p>
  );
}

function EventDiscoveryCard({
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
    <div className={`overflow-hidden rounded-2xl border ${priority ? "border-accent/30 bg-surface" : "border-line bg-surface/70"}`}>
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className={`mono-label ${priority ? "text-accent" : ""}`}>
            {priority ? "current / upcoming card" : "past card"}
          </p>
          <StatusPill status={stats.status} callsLogged={stats.predictions.length} />
        </div>

        <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.035em] md:text-3xl">
          {event.event.name}
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span>{event.event.date ?? "date pending"}</span>
          <span>{event.event.location ?? "location pending"}</span>
          <span>{stats.status === "completed" ? `${stats.resolved.length} scored` : `${stats.predictions.length} calls logged`}</span>
        </div>

        <div className="mt-5 border-t border-line/60 pt-4">
          <p className="mono-label">main event</p>
          <MainEventLine fight={mainFight} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/events/${event.event.id}`}
            className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
          >
            Open card
          </Link>
        </div>
      </div>

      {stats.resolved.length > 0 && (
        <div className="border-t border-line bg-background/35 px-5 py-3 text-xs text-muted md:px-6">
          {stats.resolved.length} scored · {stats.correct.length}/{stats.resolved.length} model calls correct
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const accuracyMetrics = getAccuracyMetrics();
  const predictions = getLockedPredictions();
  const events = getAllEvents();
  const latestEvent = getLatestEvent();
  const pastEvents = events.slice(1, 3);
  const latestStats = eventStats(latestEvent, predictions);
  const mainFight = latestEvent.fights[0];
  const mainFightPrediction = predictions.find((prediction) => prediction.fightId === mainFight?.id) ?? null;
  const { viewModel: mainVM } = buildPredictionViewModelBundle({
    eventId: latestEvent.event.id,
    fight: mainFight,
    lockedPrediction: mainFightPrediction,
  });
  const correctCount = accuracyMetrics.winnerAccuracy != null
    ? Math.round((accuracyMetrics.winnerAccuracy / 100) * accuracyMetrics.resolvedCount)
    : null;

  return (
    <>
      <AppHeader />
      <main>
        {/* ════════════════════════════════════════════════════════════════════
            MOBILE hero — visible only below sm (640 px)
            One dominant current-card block: event name, status, main event
            matchup, model call, and one "Open card" CTA.
            Accuracy strip below for record proof.
            ════════════════════════════════════════════════════════════════════ */}
        <section className="sm:hidden section-shell pt-5 pb-6">
          {/* Current card */}
          <div className="overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80">
            <span
              aria-hidden="true"
              className="block h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
            />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mono-label text-accent">current card</p>
                <StatusPill status={latestStats.status} callsLogged={latestStats.predictions.length} />
              </div>
              <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.04em] text-foreground">
                {latestEvent.event.name}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                {latestEvent.event.date ?? "date pending"}
              </p>

              {mainFight && (
                <div className="mt-5 border-t border-line/60 pt-4">
                  <p className="mono-label">main event</p>
                  <MainEventLine fight={mainFight} />
                  {mainVM.isNamedCall && (
                    <div className="mt-3 border-l-2 border-accent/50 pl-3">
                      <p className="mono-label">model call</p>
                      <p className="mt-1 text-lg font-semibold tracking-tight text-accent">
                        {mainVM.predictedWinner?.name}
                        {mainVM.winnerProbability != null && (
                          <span className="data-text ml-2 text-base font-normal text-foreground">
                            {mainVM.winnerProbability}%
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Link
                href={`/events/${latestEvent.event.id}`}
                className="tap-target mt-5 flex w-full items-center justify-center rounded-full bg-accent font-semibold text-background transition hover:brightness-110"
              >
                Open card
              </Link>
            </div>
          </div>

          {/* Accuracy strip */}
          {accuracyMetrics.resolvedCount > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-surface/70 px-5 py-4">
              <div className="flex items-center gap-6">
                {accuracyMetrics.winnerAccuracy != null && (
                  <div>
                    <p className="data-text text-xl text-foreground">{accuracyMetrics.winnerAccuracy}%</p>
                    <p className="mono-label mt-0.5">accuracy</p>
                  </div>
                )}
                <div>
                  <p className="data-text text-xl text-foreground">{accuracyMetrics.resolvedCount}</p>
                  <p className="mono-label mt-0.5">scored</p>
                </div>
              </div>
              <Link
                href="/record"
                className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-sm text-foreground transition hover:border-accent/40"
              >
                Record →
              </Link>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            DESKTOP hero — visible only at sm+ (640 px and up)
            Two-column layout: tagline + CTAs | current event card.
            ════════════════════════════════════════════════════════════════════ */}
        <section className="hidden sm:block section-shell pt-10 pb-8 md:pt-16 md:pb-12">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div className="fl-animate-fade-up">
              <p className="mono-label accent-rail">fight lens · forecast · tracked</p>
              <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-7xl lg:text-[5.4rem]">
                predictive analysis.
                <span className="block text-accent">every call tracked.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens models UFC matchups before each card, logs every public call,
                and scores every result after the fight.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/events/${latestEvent.event.id}`}
                  className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-6 font-semibold text-background transition hover:brightness-110"
                >
                  Open {eventShortName(latestEvent.event.name)}
                </Link>
                <Link
                  href="/record"
                  className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-foreground transition hover:border-accent/40"
                >
                  View Model Record
                </Link>
              </div>
            </div>

            <div className="fl-animate-fade-up fl-delay-200 relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80 p-5 md:p-7">
              <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-accent/40" />
              <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-accent/40" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="mono-label">next card</p>
                <StatusPill status={latestStats.status} callsLogged={latestStats.predictions.length} />
              </div>

              <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
                {latestEvent.event.name}
              </h2>
              <p className="data-text mt-2 text-xs uppercase tracking-[0.16em] text-subtle">
                {latestEvent.event.date ?? "date pending"} · {latestEvent.event.location ?? "location pending"}
              </p>

              <div className="mt-6 border-t border-line/60 pt-5">
                <p className="mono-label">main event</p>
                <MainEventLine fight={mainFight} />
                <div className="mt-4 border-l border-accent/40 pl-4">
                  <p className="mono-label">model call</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-accent md:text-2xl">
                    {mainVM.isNamedCall ? mainVM.predictedWinner?.name : mainVM.displayedCallLabel}
                    {mainVM.winnerProbability != null && (
                      <span className="data-text ml-2 text-foreground">{mainVM.winnerProbability}%</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/events/${latestEvent.event.id}`}
                  className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
                >
                  Open card
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* "How to use" — desktop only (4-column grid adds no value on mobile) */}
        <section className="hidden sm:block section-shell pb-8 md:pb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono-label accent-rail">start here</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">how to use Fight Lens.</h2>
            </div>
            <Link href="/methodology" className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground">
              how it works →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {startSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-line bg-surface/70 p-5">
                <p className="data-text text-sm text-subtle">0{index + 1}</p>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell py-6 md:py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono-label accent-rail">event discovery</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">find a card.</h2>
            </div>
            <Link href="/events" className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground">
              all events →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <EventDiscoveryCard event={latestEvent} predictions={predictions} priority />
            <div className="grid gap-4">
              {pastEvents.map((event) => (
                <EventDiscoveryCard key={event.event.id} event={event} predictions={predictions} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell py-8 md:py-12">
          <div className="rounded-2xl border border-line bg-surface/70 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="mono-label">public model record</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">logged calls only.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  The public record is pre-fight calls only. Historical validation and backtests stay separate.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-background/45 px-4 py-3">
                  <p className="data-text text-2xl text-foreground">{predictions.length}</p>
                  <p className="mono-label mt-1">calls</p>
                </div>
                <div className="rounded-xl border border-line bg-background/45 px-4 py-3">
                  <p className="data-text text-2xl text-accent">{accuracyMetrics.resolvedCount}</p>
                  <p className="mono-label mt-1">scored</p>
                </div>
                <div className="rounded-xl border border-line bg-background/45 px-4 py-3">
                  <p className="data-text text-2xl text-foreground">{correctCount ?? "—"}</p>
                  <p className="mono-label mt-1">correct</p>
                </div>
              </div>
            </div>
            <Link
              href="/record"
              className="tap-target mt-5 inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-5 text-sm text-foreground transition hover:border-accent/40"
            >
              View Model Record
            </Link>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
