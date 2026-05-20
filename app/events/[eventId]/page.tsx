import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { getAllEventIds, getEvent } from "@/lib/events/registry";
import { getAllPredictions, getLockedPredictions } from "@/lib/accuracy";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export function generateStaticParams() {
  return getAllEventIds().map((eventId) => ({ eventId }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = getEvent(eventId);
  if (!event) return {};
  return {
    title: `${event.event.name} | Fight Lens`,
    description: `${event.fights.length} fights modeled. Win probabilities, method breakdowns, and scenario paths for every bout on the card.`,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);

  if (!event) notFound();

  const predictions = getAllPredictions();
  const lockedPredictions = getLockedPredictions();
  const predictionByFightId = new Map(predictions.map((p) => [p.fightId, p]));
  const predictionViewModels = event.fights.map((fight) =>
    buildPredictionViewModelBundle({
      eventId: event.event.id,
      fight,
      lockedPrediction: predictionByFightId.get(fight.id) ?? null,
    }).viewModel,
  );

  // Locked predictions for this event only — used to show status chip
  const eventFightIds = new Set(event.fights.map((f) => f.id));
  const eventLockedPredictions = lockedPredictions.filter((p) =>
    eventFightIds.has(p.fightId),
  );

  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={event} lockedPredictions={eventLockedPredictions} />
        <CardFilterTabs
          eventId={event.event.id}
          fights={event.fights}
          predictions={predictions}
          predictionViewModels={predictionViewModels}
        />
      </main>
      <DisclaimerFooter />
    </>
  );
}
