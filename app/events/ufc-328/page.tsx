import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { getAllPredictions, getLockedPredictions } from "@/lib/accuracy";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
import { sourcedEvent } from "@/lib/sourced-event";

export default function EventPage() {
  const predictions = getAllPredictions();
  const lockedPredictions = getLockedPredictions();
  const predictionByFightId = new Map(predictions.map((p) => [p.fightId, p]));
  const predictionViewModels = sourcedEvent.fights.map((fight) =>
    buildPredictionViewModelBundle({
      eventId: sourcedEvent.event.id,
      fight,
      lockedPrediction: predictionByFightId.get(fight.id) ?? null,
    }).viewModel,
  );

  const eventFightIds = new Set(sourcedEvent.fights.map((f) => f.id));
  const eventLockedPredictions = lockedPredictions.filter((p) =>
    eventFightIds.has(p.fightId),
  );

  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={sourcedEvent} lockedPredictions={eventLockedPredictions} />
        <CardFilterTabs
          eventId={sourcedEvent.event.id}
          fights={sourcedEvent.fights}
          predictions={predictions}
          predictionViewModels={predictionViewModels}
        />
      </main>
      <DisclaimerFooter />
    </>
  );
}
