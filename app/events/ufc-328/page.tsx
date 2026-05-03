import { AppHeader } from "@/components/AppHeader";
import { CardFilterTabs } from "@/components/CardFilterTabs";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { EventHero } from "@/components/EventHero";
import { RosterStyleMap } from "@/components/RosterStyleMap";
import { event, fighters } from "@/lib/data";

export default function EventPage() {
  return (
    <>
      <AppHeader />
      <main>
        <EventHero event={event} />
        <RosterStyleMap event={event} fighters={fighters} />
        <CardFilterTabs eventId={event.id} fights={event.fights} fighters={fighters} />
      </main>
      <DisclaimerFooter />
    </>
  );
}
