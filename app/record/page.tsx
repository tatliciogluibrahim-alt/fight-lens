import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { getAllPredictions, getAccuracyMetrics } from "@/lib/accuracy";
import type { PredictionRecord } from "@/lib/accuracy/types";

export const metadata: Metadata = {
  title: "Model Record | Fight Lens",
  description: "Every Fight Lens call logged before the fight and scored after the official result."
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

// ─── Result state chip ────────────────────────────────────────────────────────

function ResultStateChip({
  state,
}: {
  state: "correct" | "incorrect" | "pending" | "noresult";
}) {
  const config = {
    correct: {
      label: "Model correct",
      className: "border-success/30 bg-success-soft text-success",
      dot: "bg-success",
    },
    incorrect: {
      label: "Model incorrect",
      className: "border-wrong/30 bg-wrong-soft text-wrong",
      dot: "bg-wrong",
    },
    pending: {
      label: "Pending",
      className: "border-line bg-surface-2/70 text-subtle",
      dot: "bg-subtle/60",
    },
    noresult: {
      label: "No result",
      className: "border-line bg-surface-2/70 text-muted",
      dot: "bg-muted/50",
    },
  }[state];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${config.className}`}
    >
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ─── Prediction row ───────────────────────────────────────────────────────────

function PredictionRow({ record }: { record: PredictionRecord }) {
  const { outcome, prediction, fighters } = record;

  const modelPick =
    prediction.fighterAWinProbability >= prediction.fighterBWinProbability
      ? fighters.fighterA
      : fighters.fighterB;
  const modelProb = Math.max(prediction.fighterAWinProbability, prediction.fighterBWinProbability);

  let state: "correct" | "incorrect" | "pending" | "noresult" = "pending";
  let resultLine: string | null = null;

  if (outcome) {
    if (outcome.winner === "draw" || outcome.winner === "nc") {
      state = "noresult";
      resultLine = `${outcome.winner === "draw" ? "Draw" : "No Contest"} · ${methodLabel(outcome.method)} · R${outcome.round}`;
    } else {
      const correct =
        (outcome.winner === "fighterA" && prediction.fighterAWinProbability >= prediction.fighterBWinProbability) ||
        (outcome.winner === "fighterB" && prediction.fighterBWinProbability > prediction.fighterAWinProbability);
      state = correct ? "correct" : "incorrect";
      const actualWinner = outcome.winner === "fighterA" ? fighters.fighterA : fighters.fighterB;
      resultLine = correct
        ? `${actualWinner} won · ${methodLabel(outcome.method)} · R${outcome.round}`
        : `${actualWinner} won · ${methodLabel(outcome.method)} · R${outcome.round} — called ${modelPick}`;
    }
  }

  const slug = eventSlug(record.event);
  const href = slug
    ? `/events/${slug}/${record.fightId}`
    : record.isBacktestReconstruction
      ? `/backtests/${record.fightId}`
      : null;

  return (
    <div className="group grid gap-2 border-b border-line px-5 py-4 transition hover:bg-surface-2/30 last:border-b-0 md:grid-cols-[1.6fr_2fr_auto] md:items-center md:gap-4">
      {/* Names + call */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {fighters.fighterA} <span className="font-normal text-subtle">vs</span> {fighters.fighterB}
        </p>
        <p className="mt-1 text-xs text-muted">
          <span className="text-subtle">Call:</span>{" "}
          <span className="text-foreground">{modelPick}</span>{" "}
          <span className="data-text text-foreground">{modelProb}%</span>
        </p>
      </div>

      {/* Verdict */}
      <div className="flex flex-wrap items-center gap-3">
        <ResultStateChip state={state} />
        {resultLine && (
          <p className="text-xs text-muted">{resultLine}</p>
        )}
      </div>

      {/* CTA */}
      {href ? (
        <Link
          href={href}
          className="tap-target inline-flex items-center justify-center self-start rounded-full border border-line bg-surface-2/70 px-4 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground md:self-auto"
        >
          View Read →
        </Link>
      ) : (
        <span className="text-xs text-subtle">—</span>
      )}
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
            className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
          >
            ← back
          </Link>

          <div className="mt-8">
            <p className="mono-label">model record</p>
            <h1 className="mt-5 text-5xl font-semibold leading-none tracking-[-0.05em] md:text-7xl">
              every call. <span className="text-accent">tracked.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
              Model calls are intended to be logged before each fight and scored after the official
              result. No edits to the call once a fight is on the clock.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-line bg-surface/70 px-4 py-2 text-xs font-medium text-muted">
                {predictions.length} calls
              </span>
              <span className="rounded-full border border-accent/30 bg-accent/[0.08] px-4 py-2 text-xs font-medium text-accent">
                {resolvedCount} scored
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full border border-line bg-surface/70 px-4 py-2 text-xs font-medium text-subtle">
                  {pendingCount} pending
                </span>
              )}
            </div>

            <p className="mt-5 max-w-2xl text-xs leading-6 text-subtle">
              Early sample. The model improved after defensive opponent totals were added to the
              data pipeline, but the record needs more scored fights before any grade unlocks.
            </p>
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
              <div key={eventName} className="overflow-hidden rounded-2xl border border-line bg-surface/70">
                <div className="border-b border-line bg-surface-2/40 px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {eventName}
                  </p>
                </div>
                {records.map((record) => (
                  <PredictionRow key={record.fightId} record={record} />
                ))}
              </div>
            ))}
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.1em] text-subtle/70">
            signal-based forecast · not a guarantee · outcome-v0.2
          </p>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
