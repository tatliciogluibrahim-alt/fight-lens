"use client";

import { useRef, useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface FightPageTabsProps {
  tabs: Tab[];
  panels: Record<string, ReactNode>;
}

export function FightPageTabs({ tabs, panels }: FightPageTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const panelRef = useRef<HTMLDivElement>(null);

  function handleTabChange(id: string) {
    setActive(id);
    // After React renders the new panel, scroll the panel top into view so
    // users land at the start of the content rather than mid-page.
    requestAnimationFrame(() => {
      if (!panelRef.current) return;
      const top = panelRef.current.getBoundingClientRect().top + window.scrollY;
      // 64px sticky main header + 56px sticky tab bar + 8px gap
      window.scrollTo({ top: top - 128, behavior: "smooth" });
    });
  }

  return (
    <div className="space-y-4">
      {/*
        Tab bar — sticky just below the main AppHeader (h-16 = 64px, so top-16).
        z-20 keeps it below the header's z-30 but above page content.
        bg-background/95 + backdrop-blur gives a clean separation from content below.
      */}
      <div className="sticky top-16 z-20 bg-background/95 py-2 backdrop-blur-sm">
        <div className="flex gap-1.5 overflow-x-auto rounded-full border border-line bg-surface/95 p-1 shadow-sm">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`tap-target shrink-0 rounded-full px-5 text-sm transition ${
                  isActive
                    ? "bg-accent text-background font-semibold"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/*
        Active panel. ref is used by handleTabChange to find the correct scroll
        target. scroll-mt-32 (128px) covers the stacked sticky header + tab bar
        if the panel is itself the target of a hash-navigation link.
      */}
      <div ref={panelRef} className="scroll-mt-32 space-y-5">
        {panels[active]}
      </div>
    </div>
  );
}
