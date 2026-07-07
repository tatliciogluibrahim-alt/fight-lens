import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { CardModelSanity } from "@/components/ModelSanity";
import { CardReceiptModule } from "@/components/PostFightReceipt";
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
    description: event.fights.length > 0
      ? `${event.fights.length} fights modeled. Win probabilities, method breakdowns, and scenario paths for every bout on the card.`
      : "Event shell. Fight card and model calls pending.",
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);

  if (!event) notFound();

  const predictions = getAllPredictions();
  const lockedPredictions = getLockedPredictions();
  const predictionByFightId = new Map(predictions.map((p) => [p.fightId, p]));

  // Cancelled bouts (fighter withdrawal) are pulled from the live card, the
  // fight is not happening. The accountability trail lives on /record.
  const liveFights = event.fights.filter(
    (fight) => !predictionByFightId.get(fight.id)?.cancelled,
  );

  const predictionViewModels = liveFights.map((fight) =>
    buildPredictionViewModelBundle({
      eventId: event.event.id,
      fight,
      lockedPrediction: predictionByFightId.get(fight.id) ?? null,
    }).viewModel,
  );

  // Locked predictions for this event only, used to show status chip
  const eventFightIds = new Set(liveFights.map((f) => f.id));
  const eventLockedPredictions = lockedPredictions.filter(
    (p) => eventFightIds.has(p.fightId) && !p.cancelled,
  );

  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={event} lockedPredictions={eventLockedPredictions} />
        {/* Card receipt, post-fight scored summary. Renders only once the
            event carries a cardReceipt (after results are recorded). */}
        <CardReceiptModule receipt={event.event.cardReceipt} />
        {/* Card-level model read, the pre-fight read, still shown as context. */}
        <CardModelSanity
          summary={event.event.cardSummary}
          blindSpots={event.event.cardBlindSpots}
          environmentNote={event.event.environmentNote}
        />
        <CardFilterTabs
          eventId={event.event.id}
          fights={liveFights}
          predictions={predictions}
          predictionViewModels={predictionViewModels}
        />
      </main>
      <DisclaimerFooter />
    </>
  );
}
