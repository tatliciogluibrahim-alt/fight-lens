import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { HomeEventSelector, type HomeEventOption } from "@/components/HomeEventSelector";
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
    body: "Each fight starts with the model call, likely finish type, and what could break the call.",
  },
  {
    title: "Explore the shape",
    body: "Optional context. The radar shows how the fight style tilts, not the winner forecast.",
  },
  {
    title: "Check the record",
    body: "Every logged call is scored after the official result.",
  },
];

type EventStatus = "cardBuilding" | "forecastLive" | "pendingOutcomes" | "completed";

type EventStats = {
  predictions: PredictionRecord[];
  resolved: PredictionRecord[];
  correct: PredictionRecord[];
  status: EventStatus;
  countLabel: string;
};

function eventShortName(event: SourcedEvent) {
  return event.event.shortName ?? event.event.name.split(":")[0] ?? event.event.name;
}

function eventLocation(event: SourcedEvent) {
  return event.event.location ?? "location TBA";
}

function eventVenue(event: SourcedEvent) {
  return event.event.venue ?? null;
}

function eventBroadcastLine(event: SourcedEvent) {
  if (event.event.broadcast && event.event.mainCardTime) return `${event.event.broadcast} · ${event.event.mainCardTime}`;
  return event.event.broadcast ?? event.event.mainCardTime ?? null;
}

function eventMainEvent(event: SourcedEvent, fight?: SourcedFight) {
  if (event.event.mainEvent) {
    return `${event.event.mainEvent.fighterA} vs ${event.event.mainEvent.fighterB}`;
  }
  if (fight) {
    return `${fight.fighters.fighterA.name} vs ${fight.fighters.fighterB.name}`;
  }
  return null;
}

function featuredBout(event: SourcedEvent) {
  const bout = event.event.featuredBouts?.[0];
  return bout ? `${bout.fighterA} vs ${bout.fighterB}` : null;
}

function predictionsForEvent(event: SourcedEvent, predictions: PredictionRecord[]) {
  const fightIds = new Set(event.fights.map((fight) => fight.id));
  return predictions.filter((prediction) => fightIds.has(prediction.fightId));
}

function eventStats(event: SourcedEvent, predictions: PredictionRecord[]): EventStats {
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
    eventPredictions.length === 0
      ? "cardBuilding"
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
          ? `${event.fights.length} bouts · model calls not published yet`
          : "event details live";

  return {
    predictions: eventPredictions,
    resolved,
    correct,
    status,
    countLabel,
  };
}

function StatusPill({ stats }: { stats: EventStats }) {
  if (stats.status === "cardBuilding") {
    return (
      <span className="status-pill">
        <span className="dot" />
        card building
      </span>
    );
  }

  if (stats.status === "forecastLive") {
    return (
      <span className="status-pill is-live">
        <span className="dot" />
        forecast live · {stats.predictions.length} calls logged
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

function MainEventLine({ event, fight }: { event: SourcedEvent; fight?: SourcedFight }) {
  const mainEvent = eventMainEvent(event, fight);
  if (!mainEvent) {
    return <p className="mt-3 text-sm leading-6 text-muted">Forecast opens when fight data is ready.</p>;
  }

  return (
    <p className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground">
      {mainEvent}
    </p>
  );
}

function AccuracyBar({ value }: { value: number | null }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div
        className="fl-bar-fill h-full rounded-full bg-accent/75"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function ProofStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-background/35 px-3 py-2.5">
      <p className="data-text text-xl leading-none text-foreground md:text-2xl">{value}</p>
      <p className="mono-label mt-1">{label}</p>
    </div>
  );
}

function selectorOption(event: SourcedEvent, predictions: PredictionRecord[], label: string, ctaLabel: string): HomeEventOption {
  const stats = eventStats(event, predictions);
  const mainFight = event.fights[0];
  return {
    id: event.event.id,
    optionLabel: eventShortName(event),
    title: event.event.name,
    statusLabel: stats.status === "cardBuilding" ? "Card building" : stats.status === "forecastLive" ? "Forecast live" : stats.status === "pendingOutcomes" ? "Pending outcomes" : "Completed",
    statusDetail: label === "Past scored" ? stats.countLabel : stats.countLabel,
    date: event.event.date ?? "date TBA",
    location: eventLocation(event),
    venue: eventVenue(event),
    broadcastLine: eventBroadcastLine(event),
    mainEvent: eventMainEvent(event, mainFight),
    featuredBout: featuredBout(event),
    href: `/events/${event.event.id}`,
    ctaLabel,
  };
}

export default function Home() {
  const accuracyMetrics = getAccuracyMetrics();
  const predictions = getLockedPredictions();
  const events = getAllEvents();
  const latestEvent = getLatestEvent();
  const latestStats = eventStats(latestEvent, predictions);
  const mainFight = latestEvent.fights[0];
  const mainFightPrediction = mainFight
    ? predictions.find((prediction) => prediction.fightId === mainFight.id) ?? null
    : null;
  const mainVM = mainFight
    ? buildPredictionViewModelBundle({
      eventId: latestEvent.event.id,
      fight: mainFight,
      lockedPrediction: mainFightPrediction,
    }).viewModel
    : null;
  const correctCount = accuracyMetrics.winnerAccuracy != null
    ? Math.round((accuracyMetrics.winnerAccuracy / 100) * accuracyMetrics.resolvedCount)
    : null;
  const upcomingEvent = events.slice(1).find((event) => eventStats(event, predictions).status !== "completed") ?? null;
  const pastScoredEvent = events.find((event) => eventStats(event, predictions).status === "completed") ?? null;
  const discoveryOptions = [
    selectorOption(latestEvent, predictions, "Next card", "Open card"),
    upcomingEvent ? selectorOption(upcomingEvent, predictions, "Upcoming card", "Open card") : null,
    pastScoredEvent ? selectorOption(pastScoredEvent, predictions, "Past scored", "View scored card") : null,
  ].filter((item): item is HomeEventOption => Boolean(item));

  return (
    <>
      <AppHeader />
      <main>
        <section className="sm:hidden section-shell pt-6 pb-5">
          <div className="rounded-2xl border border-line bg-surface/70 p-5">
            <p className="mono-label accent-rail">fight lens · forecast · tracked</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[0.96] tracking-[-0.06em] text-foreground">
              predictive analysis.
              <span className="block text-accent">every call tracked.</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">
              Fight Lens models UFC matchups before each card, logs every public call,
              and scores every result after the fight.
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href={`/events/${latestEvent.event.id}`}
                className="tap-target flex w-full items-center justify-center rounded-full bg-accent font-semibold text-background transition hover:brightness-110"
              >
                Open {eventShortName(latestEvent)}
              </Link>
              <Link
                href="/record"
                className="tap-target flex w-full items-center justify-center rounded-full border border-line-strong bg-surface-2 text-foreground transition hover:border-accent/40"
              >
                View Model Record
              </Link>
            </div>
          </div>
        </section>

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
                  Open {eventShortName(latestEvent)}
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
                <StatusPill stats={latestStats} />
              </div>

              <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
                {latestEvent.event.name}
              </h2>
              <p className="data-text mt-2 text-xs uppercase tracking-[0.16em] text-subtle">
                {latestEvent.event.date ?? "date TBA"} · {eventLocation(latestEvent)}
              </p>
              {eventVenue(latestEvent) ? <p className="mt-2 text-sm text-subtle">{eventVenue(latestEvent)}</p> : null}
              {eventBroadcastLine(latestEvent) ? <p className="mt-1 text-xs text-subtle">{eventBroadcastLine(latestEvent)}</p> : null}

              <div className="mt-6 border-t border-line/60 pt-5">
                <p className="mono-label">main event</p>
                <MainEventLine event={latestEvent} fight={mainFight} />
                {featuredBout(latestEvent) ? (
                  <p className="mt-2 text-sm text-muted"><span className="text-subtle">also listed · </span>{featuredBout(latestEvent)}</p>
                ) : null}
                {mainVM?.isNamedCall ? (
                  <div className="mt-4 border-l border-accent/40 pl-4">
                    <p className="mono-label">model call</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-accent md:text-2xl">
                      {mainVM.predictedWinner?.name}
                      {mainVM.winnerProbability != null && (
                        <span className="data-text ml-2 text-foreground">{mainVM.winnerProbability}%</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted">
                    Forecast opens when fight data is ready.
                  </p>
                )}
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
          <HomeEventSelector events={discoveryOptions} />
        </section>

        <section className="section-shell py-6 md:py-8">
          <div className="rounded-2xl border border-line bg-surface/70 p-4 md:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="mono-label">public model record</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">logged calls only.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  The public record is pre-fight calls only. Historical validation and backtests stay separate.
                </p>
              </div>
              <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4 lg:w-[520px]">
                <ProofStat value={predictions.length} label="Calls" />
                <ProofStat value={accuracyMetrics.resolvedCount} label="Scored" />
                <ProofStat value={correctCount ?? "—"} label="Correct" />
                <ProofStat value={accuracyMetrics.winnerAccuracy != null ? `${accuracyMetrics.winnerAccuracy}%` : "—"} label="Accuracy" />
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:hidden">
                <div className="rounded-xl border border-line bg-background/35 px-3 py-2.5">
                  <p className="data-text text-2xl leading-none text-foreground">{accuracyMetrics.winnerAccuracy}%</p>
                  <p className="mono-label mt-1">accuracy</p>
                </div>
                <div className="rounded-xl border border-line bg-background/35 px-3 py-2.5">
                  <p className="data-text text-2xl leading-none text-foreground">{accuracyMetrics.resolvedCount}</p>
                  <p className="mono-label mt-1">scored</p>
                </div>
                <Link
                  href="/record"
                  className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-sm text-foreground transition hover:border-accent/40"
                >
                  Record
                </Link>
              </div>
            </div>
            <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-[1fr_auto] sm:items-center">
              <AccuracyBar value={accuracyMetrics.winnerAccuracy} />
              <Link
                href="/record"
                className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-5 text-sm text-foreground transition hover:border-accent/40"
              >
                View Model Record
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
