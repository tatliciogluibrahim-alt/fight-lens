import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { ModelAccuracyCard } from "@/components/ModelAccuracyCard";
import { getLockedPredictions, getHistoricalBacktestReconstructions, getAccuracyMetrics } from "@/lib/accuracy";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";
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
  const { outcome, fighters } = record;
  const call = getPredictionRecordCall(record);

  let state: "correct" | "incorrect" | "pending" | "noresult" = "pending";
  let resultLine: string | null = null;

  if (outcome) {
    if (outcome.winner === "draw" || outcome.winner === "nc") {
      state = "noresult";
      resultLine = `${outcome.winner === "draw" ? "Draw" : "No Contest"} · ${methodLabel(outcome.method)} · R${outcome.round}`;
    } else {
      const correct = call.predictedSide ? outcome.winner === call.predictedSide : null;
      state = correct === null ? "noresult" : correct ? "correct" : "incorrect";
      const actualWinner = outcome.winner === "fighterA" ? fighters.fighterA : fighters.fighterB;
      resultLine = correct === null
        ? `${actualWinner} won · ${methodLabel(outcome.method)} · R${outcome.round} — no named call`
        : correct
        ? `${actualWinner} won · ${methodLabel(outcome.method)} · R${outcome.round}`
        : `${actualWinner} won · ${methodLabel(outcome.method)} · R${outcome.round} — called ${call.predictedWinnerName}`;
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
          {call.hasNamedCall ? (
            <>
              <span className="text-subtle">Call:</span>{" "}
              <span className="text-foreground">{call.predictedWinnerName}</span>{" "}
              <span className="data-text text-foreground">{call.winnerProbability}%</span>
            </>
          ) : (
            <span className="text-foreground">{call.displayedCallLabel}</span>
          )}
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
  // Public Model Record shows LOCKED calls only — pre-fight predictions
  // committed before the bell. Historical backtest reconstructions live
  // below in a separate, clearly labeled section.
  const lockedCalls = getLockedPredictions();
  const backtestReconstructions = getHistoricalBacktestReconstructions();
  const byEvent = groupByEvent(lockedCalls);

  const resolvedCount = lockedCalls.filter((r) => r.outcome !== null).length;
  const pendingCount = lockedCalls.filter((r) => r.outcome === null).length;

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
            <p className="mono-label accent-rail">model record</p>
            <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.05em] md:text-7xl">
              every call. <span className="text-accent">tracked.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
              Model calls are intended to be logged before each fight and scored after the official
              result. No edits to the call once a fight is on the clock.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-line bg-surface/70 px-4 py-2 text-xs font-medium text-muted">
                {lockedCalls.length} calls
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
              Model Record tracks calls logged before fights. Historical backtests are separate
              validation runs using only pre-fight data — they appear in a dedicated section below.
            </p>
          </div>
        </section>

        {/* Accuracy card */}
        <section className="section-shell py-4 md:py-8">
          <ModelAccuracyCard metrics={metrics} />
        </section>

        {/* Predictions by event */}
        <section className="section-shell py-6 md:py-10">
          <p className="mono-label mb-5">prediction log</p>
          <div className="space-y-4">
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

        {/* Historical validation — clearly separated from the public Model Record */}
        <section className="section-shell py-6 md:py-10">
          <div className="rounded-2xl border border-line bg-surface/50 p-5 md:p-6">
            <p className="mono-label">historical validation</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              not the public record.
            </h2>

            {/* Key separation callout */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-background/40 p-4">
                <p className="text-xs font-semibold text-foreground">Public Record (above)</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Calls logged before each fight. Scored after the official result.
                  Grade unlocks at 30 scored fights.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-background/40 p-4">
                <p className="text-xs font-semibold text-foreground">Historical Validation (this section)</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Retroactive model runs on 253 fights across 20 completed events.
                  Never publicly logged — used to test the model, not to claim calls.
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              These retroactive runs use only data that was available before each fight.
              They are <span className="text-foreground font-medium">not</span> the same
              as logged calls — they were never published before the bell, so they do not
              count toward the public Model Record above.
            </p>

            {backtestReconstructions.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-xl border border-line bg-background/30">
                {backtestReconstructions.map((record) => (
                  <PredictionRow key={record.fightId} record={record} />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-subtle/70">
                full validation corpus: n=253 · 20 events · 66% winner accuracy
              </p>
              <a
                href="/methodology"
                className="text-[11px] uppercase tracking-[0.1em] text-subtle/70 underline decoration-line underline-offset-2 hover:text-subtle"
              >
                methodology →
              </a>
            </div>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
