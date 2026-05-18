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

  const outcome = p.outcome;
  const actualWinner = outcome
    ? outcome.winner === "fighterA" ? p.fighters.fighterA
      : outcome.winner === "fighterB" ? p.fighters.fighterB
      : outcome.winner
    : null;

  const winnerCorrect = outcome && outcome.winner !== "draw" && outcome.winner !== "nc"
    ? (outcome.winner === "fighterA" && p.prediction.fighterAWinProbability >= p.prediction.fighterBWinProbability) ||
      (outcome.winner === "fighterB" && p.prediction.fighterBWinProbability > p.prediction.fighterAWinProbability)
    : null;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
      {/* Fight names */}
      <p className="text-sm font-medium">
        {p.fighters.fighterA} <span className="text-subtle font-normal">vs</span> {p.fighters.fighterB}
      </p>

      {/* Predicted */}
      <div className="hidden sm:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">predicted</p>
        <p className="mt-0.5 text-sm text-muted">{modelPick}</p>
      </div>

      {/* Outcome */}
      <div className="hidden sm:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">outcome</p>
        {actualWinner ? (
          <p className="mt-0.5 text-sm text-muted">
            {actualWinner}
            {outcome && <span className="ml-1 text-subtle">· {methodLabel(outcome.method)}</span>}
          </p>
        ) : (
          <p className="mt-0.5 font-mono text-[10px] text-subtle/60">pending</p>
        )}
      </div>

      {/* Verdict + lens link */}
      <div className="flex items-center gap-3">
        {winnerCorrect === true && (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">✓</span>
        )}
        {winnerCorrect === false && (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">✗</span>
        )}
        <Link
          href={fightHref}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle hover:text-foreground"
        >
          lens →
        </Link>
      </div>
    </div>
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
            <p className="mono-label">fight lens · predictive analysis</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.065em] md:text-8xl">
              predictive analysis.
              <span className="block text-accent">every outcome tracked.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
              Fight Lens models UFC matchups before each card. Win probabilities, method breakdowns, and scenario paths — built from style shape, form, and stat differentials. Every call logged. Every outcome checked.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/events/${latestEvent.event.id}`}
                className="tap-target inline-flex items-center justify-center rounded-full bg-accent px-6 font-semibold text-white transition hover:brightness-110"
              >
                {latestEvent.event.name.split(":")[0]} Matchups
              </Link>
              <Link
                href="/record"
                className="tap-target inline-flex items-center justify-center rounded-full border border-line-strong bg-surface/70 px-6 text-muted transition hover:bg-surface-2 hover:text-foreground"
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
              <p className="mono-label">events analyzed</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                {Object.keys(eventGroups).length} event{Object.keys(eventGroups).length !== 1 ? "s" : ""} in the model.
              </h2>
            </div>
            <Link
              href="/record"
              className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
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

              // Derive event slug from name ("UFC 328: ..." → "ufc-328")
              const ufcMatch = eventName.match(/UFC\s+(\d+)/i);
              const eventSlug = ufcMatch ? `ufc-${ufcMatch[1]}` : null;

              return (
                <div
                  key={eventName}
                  className="overflow-hidden border border-line bg-surface/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
                    <div>
                      <h3 className="font-semibold tracking-tight">{eventName}</h3>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                        {eventPredictions.length} fight{eventPredictions.length !== 1 ? "s" : ""} modeled
                        {resolved.length > 0
                          ? ` · ${correct.length}/${resolved.length} correct`
                          : " · outcomes pending"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {eventSlug && (
                        <Link
                          href={`/events/${eventSlug}`}
                          className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2 px-4 text-sm text-muted transition hover:text-foreground"
                        >
                          view matchups
                        </Link>
                      )}
                      {resolved.length > 0 && (
                        <Link
                          href="/record"
                          className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2 px-4 text-sm text-muted transition hover:text-foreground"
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
                        <p className="font-mono text-[10px] text-subtle/60">
                          + {eventPredictions.length - 5} more fights
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
