"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface FightPageTabsProps {
  tabs: Tab[];
  panels: Record<string, ReactNode>;
}

function hashToTabId(hash: string) {
  const clean = hash.replace(/^#/, "");
  if (clean === "the-call") return "call";
  if (clean.startsWith("section-")) return clean.replace("section-", "");
  return clean;
}

const SECTION_SCROLL_MARGIN = "scroll-mt-40 md:scroll-mt-44";
const ACTIVE_SECTION_OFFSET = 190;

export function FightPageTabs({ tabs, panels }: FightPageTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  function isKnownTab(id: string) {
    return tabs.some((tab) => tab.id === id);
  }

  function scrollToSection(id: string, behavior: ScrollBehavior = "smooth") {
    requestAnimationFrame(() => {
      const target = document.getElementById(`section-${id}`);
      target?.scrollIntoView({ block: "start", behavior });
    });
  }

  function handleTabChange(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    if (!isKnownTab(id)) return;
    setActive(id);
    window.history.pushState(null, "", `#section-${id}`);
    scrollToSection(id);
  }

  useEffect(() => {
    function syncFromHash() {
      const id = hashToTabId(window.location.hash);
      if (!tabs.some((tab) => tab.id === id)) return;
      setActive(id);
      scrollToSection(id, "auto");
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [tabs]);

  useEffect(() => {
    function updateActiveFromScroll() {
      let current = tabs[0]?.id ?? "";

      for (const tab of tabs) {
        const section = document.getElementById(`section-${tab.id}`);
        if (!section) continue;
        if (section.getBoundingClientRect().top <= ACTIVE_SECTION_OFFSET) {
          current = tab.id;
        }
      }

      if (!current) return;
      setActive((previous) => {
        if (previous === current) return previous;
        const hash = `#section-${current}`;
        if (window.location.hash && window.location.hash !== hash) {
          window.history.replaceState(null, "", hash);
        }
        return current;
      });
    }

    updateActiveFromScroll();
    window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll);
    return () => {
      window.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, [tabs]);

  return (
    <div className="space-y-4">
      {/*
        Sticky section navigation. Solid background keeps the row from covering
        section headings, and each link targets a stable section that exists in
        the HTML before hydration.
      */}
      <nav aria-label="Fight read sections" className="sticky top-16 z-20 bg-background py-2">
        <div className="flex gap-1.5 overflow-x-auto rounded-full border border-line bg-surface/95 p-1 shadow-sm">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <a
                key={tab.id}
                href={`#section-${tab.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={(event) => handleTabChange(event, tab.id)}
                className={`tap-target shrink-0 rounded-full px-5 text-sm transition ${
                  isActive
                    ? "bg-accent text-background font-semibold"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/*
        One clean anchor per section. CSS scroll-margin owns the sticky header
        offset for direct hash loads and repeated tab clicks.
      */}
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
