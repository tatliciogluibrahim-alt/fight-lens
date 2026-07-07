import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

// Global not-found. Catches notFound() calls (unknown event/fight ids) and any
// unmatched route. Keeps the user inside the product with a way back, instead
// of the stock Next.js 404, which matters because fight links are shared and
// a scrapped or mistyped bout should not eject the reader to a blank page.
export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="section-shell py-16 md:py-24">
        <div className="max-w-xl">
          <p className="mono-label accent-rail">off the card</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">
            this read moved.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">
            The page you followed does not exist, or the bout was re-booked. It happens on a live
            card. Head back to the current card or the model record.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="tap-target inline-flex items-center justify-center rounded-full border border-accent/40 bg-surface-2/70 px-5 text-sm font-medium text-foreground transition hover:border-accent/70"
            >
              Browse cards
            </Link>
            <Link
              href="/record"
              className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface-2/70 px-5 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              View model record
            </Link>
          </div>
        </div>
      </main>
      <DisclaimerFooter />
    </>
  );
}
