import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { getAllEvents } from "@/lib/events/registry";
import { getLockedPredictions } from "@/lib/accuracy";
import { getPredictionRecordCall } from "@/lib/predictionViewModel";
import type { PredictionRecord } from "@/lib/accuracy/types";

export const metadata: Metadata = {
  title: "Events | Fight Lens",
  description:
    "Every UFC card Fight Lens has modeled. Browse upcoming forecasts and scored events.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EventStatus = "upcoming" | "partial" | "completed";

function statusFor(
  predictions: PredictionRecord[],
): EventStatus {
  if (predictions.length === 0) return "upcoming";
  const resolved = predictions.filter((p) => p.outcome !== null);
  if (resolved.length === 0) return "upcoming";
  if (resolved.length < predictions.length) return "partial";
  return "completed";
}

function StatusPill({ status, predictions }: { status: EventStatus; predictions: PredictionRecord[] }) {
  if (status === "upcoming") {
    return (
      <span className="status-pill is-live">
        <span className="dot" />
        upcoming · {predictions.length} calls logged
      </span>
    );
  }
  const resolved = predictions.filter((p) => p.outcome !== null);
  const correct = resolved.filter((p) => {
    if (!p.outcome || p.outcome.winner === "draw" || p.outcome.winner === "nc") return false;
    return getPredictionRecordCall(p).predictedSide === p.outcome.winner;
  });
  return (
    <span className="status-pill is-scored">
      <span className="dot" />
      {status === "partial" ? "partial · " : "completed · "}
      {correct.length}/{resolved.length} correct
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsIndexPage() {
  const events = getAllEvents();
  const allPredictions = getLockedPredictions();

  const currentEvent = events[0];
  const pastEvents = events.slice(1);

  function predictionsFor(eventId: string): PredictionRecord[] {
    const event = events.find((e) => e.event.id === eventId);
    if (!event) return [];
    const ids = new Set(event.fights.map((f) => f.id));
    return allPredictions.filter((p) => ids.has(p.fightId));
  }

  const currentPredictions = predictionsFor(currentEvent.event.id);
  const currentStatus = statusFor(currentPredictions);
  const mainFight = currentEvent.fights[0];

  return (
    <>
      <AppHeader />
      <main>
        {/* Hero */}
        <section className="section-shell py-10 md:py-16">
          <p className="mono-label accent-rail">events</p>
          <h1 className="mt-1 text-5xl font-semibold leading-[0.94] tracking-[-0.05em] md:text-7xl">
            every card. <span className="text-accent">modeled.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg md:leading-8">
            Browse every UFC card Fight Lens has read. Upcoming forecasts at the top,
            scored events below. Each fight links into the full read.
          </p>
        </section>

        {/* Current event — feature card */}
        <section className="section-shell pb-6">
          <Link
            href={`/events/${currentEvent.event.id}`}
            className="group block overflow-hidden rounded-2xl border border-line bg-surface/80 transition hover:border-accent/40"
          >
            <div className="grid gap-0 md:grid-cols-[1.4fr_0.9fr]">
              {/* Left: event identity */}
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="mono-label text-accent">current card</p>
                  <StatusPill status={currentStatus} predictions={currentPredictions} />
                </div>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
                  {currentEvent.event.name.toLowerCase()}
                </h2>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  <span>
                    <span className="text-subtle">date · </span>
                    {currentEvent.event.date ?? "pending"}
                  </span>
                  <span>
                    <span className="text-subtle">location · </span>
                    {currentEvent.event.location ?? "pending"}
                  </span>
                  <span>
                    <span className="text-subtle">bouts · </span>
                    {currentEvent.fights.length}
                  </span>
                </div>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground transition group-hover:text-accent">
                  Open full card →
                </p>
              </div>

              {/* Right: main event capsule */}
              {mainFight && (
                <div className="border-t border-line bg-background/40 p-6 md:border-l md:border-t-0 md:p-8">
                  <p className="mono-label">main event</p>
                  <p className="mt-3 text-lg font-semibold leading-tight tracking-tight">
                    {mainFight.fighters.fighterA.name}
                    <span className="font-normal text-subtle"> vs </span>
                    {mainFight.fighters.fighterB.name}
                  </p>
                  <p className="data-text mt-2 text-xs text-subtle">
                    {(mainFight.weightClass ?? "weight class").toLowerCase()} · {mainFight.rounds}r
                  </p>
                  {mainFight.matchupQuestion && (
                    <p className="mt-4 text-sm leading-6 text-muted">{mainFight.matchupQuestion}</p>
                  )}
                </div>
              )}
            </div>
          </Link>
        </section>

        {/* Past events */}
        {pastEvents.length > 0 && (
          <section className="section-shell py-8 md:py-12">
            <div className="mb-4 flex items-baseline justify-between">
              <p className="mono-label">past cards</p>
              <Link
                href="/record"
                className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
              >
                full record →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface/70">
              {pastEvents.map((event) => {
                const preds = predictionsFor(event.event.id);
                const status = statusFor(preds);
                return (
                  <Link
                    key={event.event.id}
                    href={`/events/${event.event.id}`}
                    className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line p-5 transition hover:bg-surface-2/40 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-semibold tracking-tight">
                          {event.event.name}
                        </p>
                        <StatusPill status={status} predictions={preds} />
                      </div>
                      <p className="data-text mt-1 text-xs text-subtle">
                        {event.event.date ?? "date pending"} · {event.fights.length} bouts
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-subtle transition group-hover:text-accent">
                      Open card →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Historical validation footnote — keeps separation clear */}
        <section className="section-shell pb-12 md:pb-16">
          <p className="mt-2 max-w-3xl text-xs leading-6 text-subtle">
            Historical validation runs (n=253 across 20 events) are kept separate from
            this list. They are not the same as logged pre-fight calls.{" "}
            <Link href="/record" className="underline decoration-line underline-offset-2 hover:text-muted">
              See the public record →
            </Link>
          </p>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
