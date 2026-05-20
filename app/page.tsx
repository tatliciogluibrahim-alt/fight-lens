import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { getAccuracyMetrics, getLockedPredictions } from "@/lib/accuracy";
import { getLatestEvent } from "@/lib/events/registry";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";
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
        {/* Hero */}
        <section className="section-shell py-12 md:py-20">
          <div className="max-w-4xl">
            <p className="mono-label">fight lens · forecast · tracked</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-8xl">
              predictive analysis.
              <span className="block text-accent">every call tracked.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
              Fight Lens models UFC matchups before each card, logs every public call, and scores
              every result. Signal-based — not a guarantee.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/events/${latestEvent.event.id}`}
                className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-6 font-semibold text-background transition hover:brightness-110"
              >
                {latestEvent.event.name.split(":")[0]} Matchups →
              </Link>
              <Link
                href="/record"
                className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-foreground transition hover:border-accent/40"
              >
                Model Record
              </Link>
            </div>
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
                <p className="mono-label">prediction log</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
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
