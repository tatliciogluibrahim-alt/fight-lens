import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { event, fighters } from "@/lib/data";

export default function EventPage() {
  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={event} />
        <CardFilterTabs eventId={event.id} fights={event.fights} fighters={fighters} />
      </main>
      <DisclaimerFooter />
    </>
  );
}
