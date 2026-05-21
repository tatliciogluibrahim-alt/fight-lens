/**
 * Event Registry
 *
 * All events that Fight Lens has modeled are listed here.
 * To add a new event:
 *   1. Run `npm run ingest:ufcstats -- --event-url <url> --include-fights --include-fighters`
 *   2. Run `npm run normalize:data -- --event-id <slug>`
 *   3. Import the resulting JSON below and add to `orderedEvents` (newest first)
 *   4. Create prediction files in data/predictions/ and add to lib/accuracy/index.ts
 */

import ufcFreedom250Json from "@/data/normalized/events/ufc-freedom-250.json";
import ufc329Json from "@/data/normalized/events/ufc-329.json";
import ufc328Json from "@/data/normalized/events/ufc-328.json";
import type { SourcedEvent, SourcedFight } from "@/lib/sourced-event";

// Newest event first — the first entry is the "current" event
const orderedEvents: SourcedEvent[] = [
  ufcFreedom250Json as unknown as SourcedEvent,
  ufc329Json as unknown as SourcedEvent,
  ufc328Json as unknown as SourcedEvent,
];

export function getAllEvents(): SourcedEvent[] {
  return orderedEvents;
}

export function getEvent(eventId: string): SourcedEvent | null {
  return orderedEvents.find((e) => e.event.id === eventId) ?? null;
}

export function getAllEventIds(): string[] {
  return orderedEvents.map((e) => e.event.id);
}

export function getEventFight(eventId: string, fightId: string): SourcedFight | null {
  const event = getEvent(eventId);
  return event?.fights.find((f) => f.id === fightId) ?? null;
}

/** All [eventId, fightId] pairs — used by generateStaticParams */
export function getAllFightParams(): { eventId: string; fightId: string }[] {
  return orderedEvents.flatMap((event) =>
    event.fights.map((fight) => ({
      eventId: event.event.id,
      fightId: fight.id,
    })),
  );
}

/** The most recently added event (first in orderedEvents) */
export function getLatestEvent(): SourcedEvent {
  return orderedEvents[0];
}
