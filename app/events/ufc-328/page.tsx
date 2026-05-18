import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { sourcedEvent } from "@/lib/sourced-event";

export default function EventPage() {
  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={sourcedEvent} />
        <CardFilterTabs eventId={sourcedEvent.event.id} fights={sourcedEvent.fights} />
      </main>
      <DisclaimerFooter />
    </>
  );
}
