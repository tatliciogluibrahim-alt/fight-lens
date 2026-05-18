"use client";

import { useState, type ReactNode } from "react";

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

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto rounded-full border border-line bg-surface/60 p-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
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

      {/* Active panel */}
      <div className="space-y-5">
        {panels[active]}
      </div>
    </div>
  );
}
