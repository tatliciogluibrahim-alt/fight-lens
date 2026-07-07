import type { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface FightPageTabsProps {
  tabs: Tab[];
  panels: Record<string, ReactNode>;
}

/**
 * FightPageTabs, renders all fight sections stacked on one scroll page.
 *
 * The visible tab nav row has been removed. Each section retains its
 * #section-{id} anchor so existing deep-links (e.g. #section-call,
 * #section-shape, #section-details) keep working.
 */

const SECTION_SCROLL_MARGIN = "scroll-mt-24 md:scroll-mt-28";

export function FightPageTabs({ tabs, panels }: FightPageTabsProps) {
  return (
    <div className="space-y-8">
      {tabs.map((tab) => (
        <section
          key={tab.id}
          id={`section-${tab.id}`}
          className={`${SECTION_SCROLL_MARGIN} space-y-5`}
        >
          {panels[tab.id]}
        </section>
      ))}
    </div>
  );
}
