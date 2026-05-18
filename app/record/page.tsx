import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { getAllPredictions, getAccuracyMetrics } from "@/lib/accuracy";
import type { PredictionRecord } from "@/lib/accuracy/types";

export const metadata: Metadata = {
  title: "Model Record | Fight Lens",
  description: "Every Fight Lens prediction tracked against real outcomes. Full transparency."
};

function eventSlug(eventName: string): string | null {
  const match = eventName.match(/UFC\s+(\d+)/i);
  return match ? `ufc-${match[1]}` : null;
}

function methodLabel(method: string): string {
  switch (method) {
    case "ko_tko": return "KO/TKO";
    case "submission": return "SUB";
    case "decision": return "DEC";
    default: return method.toUpperCase();
  }
}

function PredictionRow({ record }: { record: PredictionRecord }) {
  const { outcome, prediction, fighters } = record;

  const modelPick =
    prediction.fighterAWinProbability > prediction.fighterBWinProbability
      ? fighters.fighterA
      : fighters.fighterB;
  const modelProb = Math.max(
    prediction.fighterAWinProbability,
    prediction.fighterBWinProbability
  );

  const wasCorrect = outcome
    ? outcome.winner === "draw" || outcome.winner === "nc"
      ? null
      : (outcome.winner === "fighterA" && prediction.fighterAWinProbability > prediction.fighterBWinProbability) ||
        (outcome.winner === "fighterB" && prediction.fighterBWinProbability > prediction.fighterAWinProbability)
    : null;

  const actualWinner = outcome
    ? outcome.winner === "fighterA"
      ? fighters.fighterA
      : outcome.winner === "fighterB"
        ? fighters.fighterB
        : outcome.winner === "draw"
          ? "Draw"
          : "NC"
    : null;

  return (
    <div className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
      {/* Fight */}
      <div>
        <p className="text-sm font-semibold">
          {fighters.fighterA} <span className="font-normal text-muted">vs</span> {fighters.fighterB}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
          {record.event}
          {record.isBacktestReconstruction ? " · backtest" : ""}
        </p>
      </div>

      {/* Model pick */}
      <div className="text-right md:text-left">
        <p className="text-sm text-muted">{modelPick}</p>
        <p className="font-mono text-[10px] text-subtle">{modelProb}% confidence</p>
      </div>

      {/* Actual result */}
      <div className="text-right md:text-left">
        {actualWinner ? (
          <>
            <p className="text-sm text-muted">{actualWinner}</p>
            {outcome && (
              <p className="font-mono text-[10px] text-subtle">
                {methodLabel(outcome.method)} · R{outcome.round}
              </p>
            )}
          </>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/60">pending</p>
        )}
      </div>

      {/* Outcome badge */}
      <div>
        {wasCorrect === true && (
          <span className="rounded-full bg-accent/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
            ✓ correct
          </span>
        )}
        {wasCorrect === false && (
          <span className="rounded-full bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            ✗ wrong
          </span>
        )}
        {wasCorrect === null && outcome && (
          <span className="rounded-full bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
            n/a
          </span>
        )}
        {!outcome && (
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/60">
            —
          </span>
        )}
      </div>

      {/* Link */}
      <div>
        {(() => {
          const slug = eventSlug(record.event);
          const href = slug
            ? `/events/${slug}/${record.fightId}`
            : record.isBacktestReconstruction
              ? `/backtests/${record.fightId}`
              : null;
          return href ? (
            <Link
              href={href}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle hover:text-foreground"
            >
              view lens →
            </Link>
          ) : null;
        })()}
      </div>
    </div>
  );
}

function groupByEvent(records: PredictionRecord[]): Map<string, PredictionRecord[]> {
  const map = new Map<string, PredictionRecord[]>();
  for (const r of records) {
    const existing = map.get(r.event) ?? [];
    existing.push(r);
    map.set(r.event, existing);
  }
  return map;
}

export default function RecordPage() {
  const metrics = getAccuracyMetrics();
  const predictions = getAllPredictions();
  const byEvent = groupByEvent(predictions);

  const resolvedCount = predictions.filter((r) => r.outcome !== null).length;
  const pendingCount = predictions.filter((r) => r.outcome === null).length;

  return (
    <>
      <AppHeader />
      <main>
        <section className="section-shell py-10 md:py-16">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
          >
            ← back
          </Link>

          <div className="mt-8">
            <p className="mono-label">model record</p>
            <h1 className="mt-5 text-5xl font-semibold leading-none tracking-[-0.05em] md:text-7xl">
              every pick. tracked.
            </h1>
            <p className="mt-4 text-sm text-muted">
              What the model called before each fight — locked in before the first bell. No edits.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full border border-line bg-surface/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {predictions.length} predictions
              </span>
              <span className="rounded-full border border-line bg-surface/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
                {resolvedCount} scored
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full border border-line bg-surface/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Accuracy card */}
        <section className="section-shell py-4 md:py-8">
          <ModelAccuracyCard metrics={metrics} />
        </section>

        {/* Predictions by event */}
        <section className="section-shell py-8 md:py-12">
          <p className="mono-label mb-6">prediction log</p>
          <div className="space-y-6">
            {Array.from(byEvent.entries()).map(([eventName, records]) => (
              <div key={eventName} className="overflow-hidden border border-line bg-surface/70">
                <div className="border-b border-line bg-surface-2/40 px-5 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    {eventName}
                  </p>
                </div>
                {records.map((record) => (
                  <PredictionRow key={record.fightId} record={record} />
                ))}
              </div>
            ))}
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
            outcome-v0.1 · signal-based · not a guarantee · backtest reconstructions labeled
          </p>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
