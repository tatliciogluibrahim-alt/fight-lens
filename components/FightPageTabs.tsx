"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface FightPageTabsProps {
  tabs: Tab[];
  panels: Record<string, ReactNode>;
}

const STICKY_SCROLL_OFFSET = 176;

function hashToTabId(hash: string) {
  const clean = hash.replace(/^#/, "");
  if (clean === "the-call") return "call";
  if (clean.startsWith("section-")) return clean.replace("section-", "");
  return clean;
}

export function FightPageTabs({ tabs, panels }: FightPageTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const panelRef = useRef<HTMLDivElement>(null);

  function isKnownTab(id: string) {
    return tabs.some((tab) => tab.id === id);
  }

  function scrollToPanel(id: string, behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(`section-${id}`) ?? panelRef.current;
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: Math.max(top - STICKY_SCROLL_OFFSET, 0),
          behavior,
        });
      });
    });
  }

  function handleTabChange(id: string, updateHash = true) {
    if (!isKnownTab(id)) return;
    setActive(id);
    if (updateHash) window.history.replaceState(null, "", `#section-${id}`);
    scrollToPanel(id);
  }

  useEffect(() => {
    function syncFromHash() {
      const id = hashToTabId(window.location.hash);
      if (!tabs.some((tab) => tab.id === id)) return;
      setActive(id);
      scrollToPanel(id, "auto");
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [tabs]);

  return (
    <div className="space-y-4">
      {/*
        Tab bar — sticky just below the main AppHeader (h-16 = 64px, so top-16).
        z-20 keeps it below the header's z-30 but above page content.
        solid background keeps the sticky row from visually covering section titles.
      */}
      <div className="sticky top-16 z-20 bg-background py-2">
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
        Active panel. This wrapper is the single canonical hash target for
        #section-call, #section-shape, and #section-details. The scroll helper
        waits for the new panel to mount before applying the sticky-header
        offset, so hash jumps land with the section heading visible.
      */}
      <div ref={panelRef} id={`section-${active}`} className="scroll-mt-44 space-y-5">
        <div key={active} className="fl-tab-panel space-y-5">
          {panels[active]}
        </div>
      </div>
    </div>
  );
}
