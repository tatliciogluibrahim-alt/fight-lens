import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { HomeEventSelector, type HomeEventOption } from "@/components/HomeEventSelector";
import { getAccuracyMetrics, getLockedPredictions } from "@/lib/accuracy";
import { getAllEvents, getLatestEvent, findMainEventFight } from "@/lib/events/registry";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";

const startSteps = [
  {
    title: "Start with the card",
    body: "Open the current event and scan the fights.",
  },
  {
    title: "Read the model lean",
    body: "Each fight starts with the model lean, likely finish type, and what could flip the call. It is directional — not a guarantee.",
  },
  {
    title: "Explore the style fingerprint",
    body: "Optional context. The radar shows how the fight style tilts, not the winner forecast.",
  },
  {
    title: "Check the record",
    body: "Every pre-fight call is logged before the bell and scored after the official result.",
  },
];

type EventStatus = "cardBuilding" | "callsLogged" | "pendingOutcomes" | "completed";

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
        ? "callsLogged"
        : resolved.length < eventPredictions.length
          ? "pendingOutcomes"
          : "completed";

  const countLabel =
    status === "completed"
      ? `${resolved.length} scored · ${correct.length}/${resolved.length} correct`
      : status === "callsLogged"
        ? `${eventPredictions.length} calls logged · outcomes pending`
        : event.fights.length > 0
          ? `${event.fights.length} bouts · model calls not published yet`
          : "fight card pending";

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
        forecast pending
      </span>
    );
  }

  if (stats.status === "callsLogged") {
    return (
      <span className="status-pill is-active">
        <span className="dot" />
        calls logged · {stats.predictions.length}
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
    return <p className="mt-3 text-sm leading-6 text-muted">Model calls unlock once fight data is available.</p>;
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

function RecordProofStrip({
  totalCalls,
  resolvedCount,
  correctCount,
  winnerAccuracy,
}: {
  totalCalls: number;
  resolvedCount: number;
  correctCount: number | null;
  winnerAccuracy: number | null;
}) {
  return (
    <section className="section-shell py-4 md:py-6">
      <div className="rounded-2xl border border-line bg-surface/70 p-3 md:p-4">
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[auto_auto_auto_1fr_auto] sm:gap-4">
          <div className="rounded-xl border border-line bg-background/35 px-3 py-2">
            <p className="data-text text-2xl leading-none text-accent">{winnerAccuracy != null ? String(winnerAccuracy) + "%" : "—"}</p>
            <p className="mono-label mt-1">named-call</p>
          </div>
          <div className="rounded-xl border border-line bg-background/35 px-3 py-2">
            <p className="data-text text-2xl leading-none text-foreground">{resolvedCount}</p>
            <p className="mono-label mt-1">scored</p>
          </div>
          <div className="hidden rounded-xl border border-line bg-background/35 px-3 py-2 sm:block">
            <p className="data-text text-2xl leading-none text-foreground">{correctCount ?? "—"}</p>
            <p className="mono-label mt-1">correct</p>
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="mono-label">public model record</p>
            <p className="mt-1 text-xs leading-5 text-muted">{totalCalls} public logged calls. Historical validation stays separate.</p>
            <div className="mt-2">
              <AccuracyBar value={winnerAccuracy} />
            </div>
          </div>
          <Link
            href="/record"
            className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-sm text-foreground transition hover:border-accent/40"
          >
            Record
          </Link>
        </div>
      </div>
    </section>
  );
}

function CurrentCardModule({
  event,
  stats,
  mainFight,
  viewModel,
}: {
  event: SourcedEvent;
  stats: EventStats;
  mainFight?: SourcedFight;
  viewModel: ReturnType<typeof buildPredictionViewModelBundle>["viewModel"] | null;
}) {
  return (
    <section className="section-shell py-4 md:py-8">
      <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80 p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono-label accent-rail">current card</p>
          <StatusPill stats={stats} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
              {event.event.name}
            </h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span>{event.event.date ?? "date TBA"}</span>
              <span>{eventLocation(event)}</span>
              {eventBroadcastLine(event) ? <span>{eventBroadcastLine(event)}</span> : null}
            </div>
            {eventVenue(event) ? <p className="mt-2 text-sm text-subtle">{eventVenue(event)}</p> : null}
          </div>
          <Link
            href={"/events/" + event.event.id}
            className="tap-target inline-flex w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110 sm:w-auto"
          >
            Open card
          </Link>
        </div>

        <div className="mt-5 grid gap-4 border-t border-line/60 pt-5 md:grid-cols-[1fr_auto]">
          <div>
            <p className="mono-label">main event</p>
            <MainEventLine event={event} fight={mainFight} />
            {featuredBout(event) ? (
              <p className="mt-2 text-sm text-muted"><span className="text-subtle">also listed · </span>{featuredBout(event)}</p>
            ) : null}
          </div>
          {viewModel?.isNamedCall ? (
            <div className="rounded-2xl border border-line bg-background/35 p-4 md:min-w-[240px]">
              <p className="mono-label">model lean</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-accent">
                {viewModel.predictedWinner?.name}
              </p>
              {viewModel.winnerProbability != null ? (
                <p className="data-text mt-1 text-2xl text-foreground">{viewModel.winnerProbability}%</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-background/35 p-4 md:min-w-[240px]">
              <p className="mono-label">model status</p>
              <p className="mt-2 text-sm leading-6 text-muted">Model calls unlock once fight data is available.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function selectorOption(event: SourcedEvent, predictions: PredictionRecord[], label: string, ctaLabel: string): HomeEventOption {
  const stats = eventStats(event, predictions);
  const mainFight = findMainEventFight(event);
  return {
    id: event.event.id,
    optionLabel: eventShortName(event),
    title: event.event.name,
    statusLabel: stats.status === "cardBuilding" ? "Forecast pending" : stats.status === "callsLogged" ? "Calls logged" : stats.status === "pendingOutcomes" ? "Pending outcomes" : "Completed",
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
  const mainFight = findMainEventFight(latestEvent);
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
        <section className="sm:hidden section-shell pt-7 pb-5">
          <div className="fl-animate-fade-up">
            <p className="mono-label accent-rail">fight lens · forecast · tracked</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[0.96] tracking-[-0.06em] text-foreground">
              forecast the card.
              <span className="block text-accent">track the result.</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">
              Predictive analysis for sourced UFC cards. Public calls are logged before the fight and scored after the result.
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

        <section className="hidden sm:block section-shell pt-10 pb-6 md:pt-16 md:pb-8">
          <div className="fl-animate-fade-up max-w-4xl">
            <p className="mono-label accent-rail">fight lens · forecast · tracked</p>
            <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-7xl lg:text-[5.4rem]">
              forecast the card.
              <span className="block text-accent">track the result.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
              Predictive analysis for sourced UFC cards. Public calls are logged before the fight and scored after the result.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={"/events/" + latestEvent.event.id}
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
        </section>


        <CurrentCardModule
          event={latestEvent}
          stats={latestStats}
          mainFight={mainFight}
          viewModel={mainVM}
        />

        <RecordProofStrip
          totalCalls={predictions.length}
          resolvedCount={accuracyMetrics.resolvedCount}
          correctCount={correctCount}
          winnerAccuracy={accuracyMetrics.winnerAccuracy}
        />

        {/* Portfolio framing — what Fight Lens is */}
        <section className="section-shell py-4 md:py-6">
          <div className="rounded-2xl border border-line bg-surface/40 p-5 md:p-6">
            <p className="mono-label accent-rail">what this is</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Fight Lens explores the trust problem in predictive sports analysis: how to make pre-fight calls explainable, logged, and accountable. Calls are locked before the bell. Style shape explains the tilt. Manual context flags what the model cannot see. Results are tracked publicly.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">early prototype</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">not betting advice</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">model lean · not a guarantee</span>
            </div>
          </div>
        </section>

        {/* Mobile: slim "browse more" link — homepage is already hero → card → record on small screens */}
        <section className="sm:hidden section-shell pb-4">
          <Link
            href="/events"
            className="block w-full rounded-2xl border border-line bg-surface/60 px-4 py-4 text-center font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:border-line-strong hover:text-foreground transition"
          >
            Browse all cards →
          </Link>
        </section>

        {/* Desktop: full event selector with card discovery */}
        <section className="hidden sm:block section-shell py-6 md:py-10">
          <HomeEventSelector events={discoveryOptions} />
        </section>

        <section className="hidden sm:block section-shell pb-8 md:pb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono-label accent-rail">start here</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">how Fight Lens works.</h2>
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
      </main>
      <DisclaimerFooter />
    </>
  );
}
