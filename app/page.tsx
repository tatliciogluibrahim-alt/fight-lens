import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { getAccuracyMetrics, getAllPredictions } from "@/lib/accuracy";
import { getLatestEvent } from "@/lib/events/registry";
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
  const modelPick =
    p.prediction.fighterAWinProbability >= p.prediction.fighterBWinProbability
      ? p.fighters.fighterA
      : p.fighters.fighterB;
  const modelProb = Math.max(p.prediction.fighterAWinProbability, p.prediction.fighterBWinProbability);

  const outcome = p.outcome;
  const winnerCorrect = outcome && outcome.winner !== "draw" && outcome.winner !== "nc"
    ? (outcome.winner === "fighterA" && p.prediction.fighterAWinProbability >= p.prediction.fighterBWinProbability) ||
      (outcome.winner === "fighterB" && p.prediction.fighterBWinProbability > p.prediction.fighterAWinProbability)
    : null;
  const actualWinner = outcome
    ? outcome.winner === "fighterA" ? p.fighters.fighterA
      : outcome.winner === "fighterB" ? p.fighters.fighterB
      : null
    : null;

  return (
    <Link
      href={fightHref}
      className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-5 py-3 transition hover:bg-surface-2/30 last:border-b-0"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="shrink-0 text-sm font-medium text-foreground">
          {p.fighters.fighterA} <span className="font-normal text-subtle">vs</span> {p.fighters.fighterB}
        </p>
        <p className="text-xs text-muted">
          <span className="text-subtle">Call:</span>{" "}
          <span className="text-foreground">{modelPick}</span>{" "}
          <span className="data-text text-foreground">{modelProb}%</span>
          {outcome && winnerCorrect !== null && actualWinner && (
            <>
              <span className="text-subtle"> · </span>
              <span className={winnerCorrect ? "text-success" : "text-wrong"}>
                {winnerCorrect ? "Model correct" : "Model incorrect"}
                <span className="text-subtle"> · {actualWinner} · {methodLabel(outcome.method)}</span>
              </span>
            </>
          )}
        </p>
      </div>

      <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-subtle transition group-hover:text-accent">
        View Read →
      </span>
    </Link>
  );
}

export default function Home() {
  const accuracyMetrics = getAccuracyMetrics();
  const predictions = getAllPredictions();
  const latestEvent = getLatestEvent();

  // Group predictions by event
  const eventGroups = predictions.reduce<Record<string, typeof predictions>>(
    (acc, p) => {
      if (!acc[p.event]) acc[p.event] = [];
      acc[p.event].push(p);
      return acc;
    },
    {}
  );

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
              Fight Lens models UFC matchups before each card, shows the win lean, and tracks every
              result after the fight. Signal-based — not a guarantee.
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

        {/* Model accuracy */}
        <section className="section-shell py-4 md:py-8">
          <ModelAccuracyCard metrics={accuracyMetrics} />
        </section>

        {/* Events analyzed */}
        <section className="section-shell py-10 md:py-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mono-label">events modeled</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                {Object.keys(eventGroups).length} event{Object.keys(eventGroups).length !== 1 ? "s" : ""} in the model.
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
            {Object.entries(eventGroups).reverse().map(([eventName, eventPredictions]) => {
              const resolved = eventPredictions.filter((p) => p.outcome !== null);
              const correct = resolved.filter((p) => {
                if (!p.outcome || p.outcome.winner === "draw" || p.outcome.winner === "nc") return false;
                return (
                  (p.outcome.winner === "fighterA" && p.prediction.fighterAWinProbability > p.prediction.fighterBWinProbability) ||
                  (p.outcome.winner === "fighterB" && p.prediction.fighterBWinProbability > p.prediction.fighterAWinProbability)
                );
              });

              const ufcMatch = eventName.match(/UFC\s+(\d+)/i);
              const eventSlug = ufcMatch ? `ufc-${ufcMatch[1]}` : null;

              return (
                <div
                  key={eventName}
                  className="overflow-hidden rounded-2xl border border-line bg-surface/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
                    <div>
                      <h3 className="font-semibold tracking-tight">{eventName}</h3>
                      <p className="mt-1 text-xs text-muted">
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
                      <div className="px-5 py-3">
                        <p className="text-xs text-subtle">
                          + {eventPredictions.length - 5} more {eventPredictions.length - 5 === 1 ? "fight" : "fights"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
