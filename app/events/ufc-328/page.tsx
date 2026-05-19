import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { getAllPredictions } from "@/lib/accuracy";
import { buildPredictionViewModelBundle } from "@/lib/predictionViewModel";
import { sourcedEvent } from "@/lib/sourced-event";

export default function EventPage() {
  const predictions = getAllPredictions();
  const predictionByFightId = new Map(predictions.map((p) => [p.fightId, p]));
  const predictionViewModels = sourcedEvent.fights.map((fight) =>
    buildPredictionViewModelBundle({
      eventId: sourcedEvent.event.id,
      fight,
      lockedPrediction: predictionByFightId.get(fight.id) ?? null,
    }).viewModel,
  );

  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={sourcedEvent} />
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
