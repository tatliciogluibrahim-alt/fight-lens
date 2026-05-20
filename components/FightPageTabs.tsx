import type { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface FightPageTabsProps {
  tabs: Tab[];
  panels: Record<string, ReactNode>;
}

const SECTION_SCROLL_MARGIN = "scroll-mt-24 md:scroll-mt-28";

export function FightPageTabs({ tabs, panels }: FightPageTabsProps) {
  return (
    <div className="space-y-5">
      <nav aria-label="Fight read sections" className="bg-background py-2">
        <div className="flex gap-1.5 overflow-x-auto rounded-full border border-line bg-surface/95 p-1 shadow-sm">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#section-${tab.id}`}
              className="tap-target shrink-0 rounded-full px-5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              {tab.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-5">
        {tabs.map((tab) => (
          <section key={tab.id} id={`section-${tab.id}`} className={`${SECTION_SCROLL_MARGIN} space-y-5`}>
            <div className="fl-tab-panel space-y-5">
              {panels[tab.id]}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
