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

  // Build a single verdict string: "✓ Strickland · DEC" or "✗ picked Chimaev · Strickland won · DEC"
  let verdictText: string | null = null;
  if (outcome && actualWinner) {
    const method = methodLabel(outcome.method);
    if (winnerCorrect === true) {
      verdictText = `${actualWinner} · ${method}`;
    } else if (winnerCorrect === false) {
      verdictText = `picked ${modelPick} · ${actualWinner} won · ${method}`;
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-5 py-3 last:border-b-0">
      {/* Fight name + verdict inline */}
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p className="shrink-0 text-sm font-medium">
          {p.fighters.fighterA} <span className="font-normal text-subtle">vs</span> {p.fighters.fighterB}
        </p>
        {verdictText ? (
          <p className={`font-mono text-[11px] ${winnerCorrect ? "text-accent" : "text-muted"}`}>
            {winnerCorrect ? "✓" : "✗"} {verdictText}
          </p>
        ) : (
          <p className="font-mono text-[10px] text-subtle/60">pick: {modelPick}</p>
        )}
      </div>

      {/* Lens link */}
      <Link
        href={fightHref}
        className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle hover:text-foreground"
      >
        lens →
      </Link>
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
