import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { getAccuracyMetrics, getLockedPredictions } from "@/lib/accuracy";
import { getLatestEvent } from "@/lib/events/registry";
import { buildPredictionViewModelBundle, getPredictionRecordCall } from "@/lib/predictionViewModel";
import type { PredictionRecord } from "@/lib/accuracy/types";

function methodLabel(method: string): string {
  switch (method) {
    case "ko_tko": return "KO/TKO";
    case "submission": return "SUB";
    case "decision": return "DEC";
    default: return method.toUpperCase();
  }
}

function FightRow({ p, fightHref }: { p: PredictionRecord; fightHref: string }) {
  const call = getPredictionRecordCall(p);

  const outcome = p.outcome;
  const winnerCorrect = outcome && outcome.winner !== "draw" && outcome.winner !== "nc" && call.predictedSide
    ? outcome.winner === call.predictedSide
    : null;
  const actualWinner = outcome
    ? outcome.winner === "fighterA" ? p.fighters.fighterA
      : outcome.winner === "fighterB" ? p.fighters.fighterB
      : null
    : null;

  return (
    <Link
      href={fightHref}
      className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-5 py-4 transition hover:bg-surface-2/40 last:border-b-0"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">
          {p.fighters.fighterA} <span className="font-normal text-subtle">vs</span> {p.fighters.fighterB}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {call.hasNamedCall ? (
            <span className="text-muted">
              <span className="text-subtle">Call:</span>{" "}
              <span className="text-foreground">{call.predictedWinnerName}</span>{" "}
              <span className="data-text text-foreground">{call.winnerProbability}%</span>
            </span>
          ) : (
            <span className="font-medium text-foreground">{call.displayedCallLabel}</span>
          )}
          {outcome && winnerCorrect !== null && actualWinner && (
            <>
              <span className="text-line-strong">·</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${
                  winnerCorrect
                    ? "border border-success/25 bg-success/10 text-success"
                    : "border border-wrong/25 bg-wrong/10 text-wrong"
                }`}
              >
                <span className={`size-1 rounded-full ${winnerCorrect ? "bg-success" : "bg-wrong"}`} />
                {winnerCorrect ? "correct" : "incorrect"}
              </span>
              <span className="text-subtle">{actualWinner} · {methodLabel(outcome.method)}</span>
            </>
          )}
          {!outcome && (
            <span className="text-subtle">outcome pending</span>
          )}
        </div>
      </div>

      <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-subtle transition group-hover:text-accent">
        View Read →
      </span>
    </Link>
  );
}

const explainer = [
  {
    label: "calls logged",
    body: "Every model call is written down before the first bell — not reconstructed after.",
  },
  {
    label: "results tracked",
    body: "Each call is scored against the official result. Correct or incorrect, it stays on the record.",
  },
  {
    label: "backtest separate",
    body: "Historical validation runs are kept in a separate section. They do not count toward the public call record.",
  },
];

export default function Home() {
  const accuracyMetrics = getAccuracyMetrics();
  const predictions = getLockedPredictions();
  const latestEvent = getLatestEvent();
  const mainFight = latestEvent.fights[0];

  // Build the live preview for the main event of the next card. Pulls the
  // canonical view model so the homepage hero never shows different numbers
  // than the fight page would.
  const mainFightPrediction = predictions.find((p) => p.fightId === mainFight.id) ?? null;
  const { viewModel: mainVM } = buildPredictionViewModelBundle({
    eventId: latestEvent.event.id,
    fight: mainFight,
    lockedPrediction: mainFightPrediction,
  });

  // Group predictions by event, most recent first
  const eventGroups = predictions.reduce<Record<string, typeof predictions>>(
    (acc, p) => {
      if (!acc[p.event]) acc[p.event] = [];
      acc[p.event].push(p);
      return acc;
    },
    {}
  );
  const eventEntries = Object.entries(eventGroups).reverse();

  return (
    <>
      <AppHeader />
      <main>
        {/* Hero: 2-column on desktop — manifesto + live next-card preview */}
        <section className="section-shell pt-10 pb-8 md:pt-16 md:pb-12">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
            {/* Left: manifesto */}
            <div>
              <p className="mono-label accent-rail">fight lens · forecast · tracked</p>
              <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-7xl lg:text-[5.5rem]">
                predictive analysis.
                <span className="block text-accent">every call tracked.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Fight Lens models UFC matchups before each card, logs every public call,
                and scores every result. Signal-based — not a guarantee.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/events/${latestEvent.event.id}`}
                  className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-6 font-semibold text-background transition hover:brightness-110"
                >
                  Open {latestEvent.event.name.split(":")[0]} →
                </Link>
                <Link
                  href="/record"
                  className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-foreground transition hover:border-accent/40"
                >
                  Model Record
                </Link>
              </div>
            </div>

            {/* Right: next card preview — broadcast-style scouting card */}
            <Link
              href={`/events/${latestEvent.event.id}/${mainFight.id}`}
              className="group relative block overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80 p-5 transition hover:border-accent/35 md:p-7"
            >
              {/* HUD corner marks */}
              <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-accent/40" />
              <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-accent/40" />
              <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-accent/40" />
              <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-accent/40" />

              {/* Top: status + label */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="mono-label">next card · main event</p>
                <span className="status-pill is-live">
                  <span className="dot" />
                  forecast live
                </span>
              </div>

              {/* Event title */}
              <p className="data-text mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">
                {latestEvent.event.name}
              </p>

              {/* Matchup */}
              <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
                {mainFight.fighters.fighterA.name.split(" ").pop()}
                <span className="px-2 text-subtle">vs.</span>
                {mainFight.fighters.fighterB.name.split(" ").pop()}
              </h2>

              {/* Call line */}
              {mainVM.callState === "lockedCall" || mainVM.callState === "currentCall" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mono-label">model call</p>
                    <p className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-semibold tracking-tight text-accent md:text-2xl">
                        {mainVM.predictedWinner?.name}
                      </span>
                    </p>
                    <p className="data-text mt-1 text-3xl font-light leading-none text-foreground md:text-4xl">
                      {mainVM.winnerProbability}%
                    </p>
                  </div>
                  <div>
                    <p className="mono-label">most likely finish</p>
                    <p className="mt-2 text-lg font-medium text-foreground">
                      {mainVM.methodLean ?? "—"}
                    </p>
                    <p className="data-text mt-1 text-[11px] uppercase tracking-[0.12em] text-subtle">
                      directional only
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-muted">
                  {mainVM.displayedCallLabel}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-line/60 pt-4 text-[11px] uppercase tracking-[0.14em]">
                <span className="text-subtle">{latestEvent.event.date ?? "date pending"}</span>
                <span className="text-subtle transition group-hover:text-accent">open read →</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Product explainer — three pillars */}
        <section className="section-shell pb-8 md:pb-12">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface/70">
            <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
              {explainer.map((item) => (
                <div key={item.label} className="p-5 md:p-6">
                  <p className="mono-label text-accent">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Logged predictions */}
        {eventEntries.length > 0 && (
          <section className="section-shell py-6 md:py-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mono-label accent-rail">prediction log</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                  logged calls.
                </h2>
              </div>
              <Link
                href="/record"
                className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
              >
                full record →
              </Link>
            </div>

            <div className="space-y-4">
              {eventEntries.map(([eventName, eventPredictions]) => {
                const resolved = eventPredictions.filter((p) => p.outcome !== null);
                const correct = resolved.filter((p) => {
                  if (!p.outcome || p.outcome.winner === "draw" || p.outcome.winner === "nc") return false;
                  return getPredictionRecordCall(p).predictedSide === p.outcome.winner;
                });

                const ufcMatch = eventName.match(/UFC\s+(\d+)/i);
                const eventSlug = ufcMatch ? `ufc-${ufcMatch[1]}` : null;

                return (
                  <div
                    key={eventName}
                    className="overflow-hidden rounded-2xl border border-line bg-surface/70"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface-2/30 px-5 py-4">
                      <div>
                        <h3 className="font-semibold tracking-tight">{eventName}</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          {eventPredictions.length} call{eventPredictions.length !== 1 ? "s" : ""} logged
                          {resolved.length > 0
                            ? ` · ${correct.length}/${resolved.length} correct`
                            : " · outcomes pending"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {eventSlug && (
                          <Link
                            href={`/events/${eventSlug}`}
                            className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2 px-4 text-sm text-muted transition hover:border-accent/30 hover:text-foreground"
                          >
                            view matchups
                          </Link>
                        )}
                        {resolved.length > 0 && (
                          <Link
                            href="/record"
                            className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2 px-4 text-sm text-muted transition hover:border-accent/30 hover:text-foreground"
                          >
                            see record
                          </Link>
                        )}
                      </div>
                    </div>

                    <div>
                      {eventPredictions.slice(0, 5).map((p) => {
                        const fightHref = eventSlug
                          ? `/events/${eventSlug}/${p.fightId}`
                          : `/backtests/${p.fightId}`;
                        return <FightRow key={p.fightId} p={p} fightHref={fightHref} />;
                      })}
                      {eventPredictions.length > 5 && (
                        <div className="border-t border-line px-5 py-3">
                          <Link
                            href={eventSlug ? `/events/${eventSlug}` : "/record"}
                            className="text-xs text-subtle hover:text-foreground"
                          >
                            + {eventPredictions.length - 5} more fight{eventPredictions.length - 5 === 1 ? "" : "s"} →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Model accuracy — at the bottom, after the content */}
        <section className="section-shell py-8 md:py-12">
          <ModelAccuracyCard metrics={accuracyMetrics} />
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
