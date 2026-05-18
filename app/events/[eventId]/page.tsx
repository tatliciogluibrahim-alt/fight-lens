import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { RosterStyleMap } from "@/components/RosterStyleMap";
import { getAllEventIds, getEvent } from "@/lib/events/registry";
import { getAllPredictions } from "@/lib/accuracy";

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

  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={event} />
        <CardFilterTabs eventId={event.event.id} fights={event.fights} predictions={predictions} />
        <RosterStyleMap event={event} />
      </main>
      <DisclaimerFooter />
    </>
  );
}
