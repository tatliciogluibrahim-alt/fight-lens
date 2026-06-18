/**
 * Event classification — the single source of truth for which card is the
 * "current/next" card, which are upcoming, and which are scored/past.
 *
 * Status is derived from PREDICTION OUTCOMES, not array order:
 *   - completed → every logged prediction has a recorded outcome → scored/past.
 *   - anything else → not yet fully scored → upcoming.
 *
 * The current card is the SOONEST upcoming event by date; this prevents a
 * completed card (e.g. a just-fought event still sitting first in the registry)
 * from rendering as "next/current".
 */
import type { SourcedEvent } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";

export type EventStatus = "cardBuilding" | "callsLogged" | "pendingOutcomes" | "completed";

/** Predictions belonging to a given event. */
export function predictionsForEvent(
  event: SourcedEvent,
  predictions: PredictionRecord[],
): PredictionRecord[] {
  const fightIds = new Set(event.fights.map((fight) => fight.id));
  return predictions.filter((prediction) => fightIds.has(prediction.fightId));
}

/** Canonical completion status for an event, from its logged predictions. */
export function eventStatus(event: SourcedEvent, predictions: PredictionRecord[]): EventStatus {
  const eventPredictions = predictionsForEvent(event, predictions);
  const resolved = eventPredictions.filter((prediction) => prediction.outcome !== null);
  if (eventPredictions.length === 0) return "cardBuilding";
  if (resolved.length === 0) return "callsLogged";
  if (resolved.length < eventPredictions.length) return "pendingOutcomes";
  return "completed";
}

/** Sortable timestamp from an event's display date; undated sorts last. */
function eventTimestamp(event: SourcedEvent): number {
  const parsed = event.event.date ? Date.parse(event.event.date) : NaN;
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

export interface ClassifiedEvents {
  /** Soonest non-completed card — the current/next card. */
  current: SourcedEvent | null;
  /** Remaining non-completed cards, soonest first. */
  upcoming: SourcedEvent[];
  /** Completed (fully scored) cards, most recent first. */
  past: SourcedEvent[];
}

/**
 * Bucket events into current / upcoming / past by status and date.
 * Completed cards never occupy the current slot.
 */
export function classifyEvents(
  events: SourcedEvent[],
  predictions: PredictionRecord[],
): ClassifiedEvents {
  const tagged = events.map((event) => ({
    event,
    status: eventStatus(event, predictions),
    t: eventTimestamp(event),
  }));

  const notCompleted = tagged
    .filter((x) => x.status !== "completed")
    .sort((a, b) => a.t - b.t); // soonest first
  const completed = tagged
    .filter((x) => x.status === "completed")
    .sort((a, b) => b.t - a.t); // most recent first

  return {
    current: notCompleted[0]?.event ?? null,
    upcoming: notCompleted.slice(1).map((x) => x.event),
    past: completed.map((x) => x.event),
  };
}
