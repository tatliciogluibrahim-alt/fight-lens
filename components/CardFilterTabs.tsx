"use client";

import { useMemo, useState } from "react";
import { FightCard } from "./FightCard";
import type { CardPlacement } from "@/lib/types";
import type { SourcedFight } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";

const tabs: Array<CardPlacement | "All"> = ["All", "Main Card", "Prelims", "Early Prelims"];

interface CardFilterTabsProps {
  fights: SourcedFight[];
  eventId: string;
  predictions?: PredictionRecord[];
}

export function CardFilterTabs({ fights, eventId, predictions = [] }: CardFilterTabsProps) {
  const [activeTab, setActiveTab] = useState<CardPlacement | "All">("All");

  const predByFightId = useMemo(() => {
    const map = new Map<string, PredictionRecord>();
    for (const p of predictions) map.set(p.fightId, p);
    return map;
  }, [predictions]);

  const visibleFights = useMemo(() => {
    if (activeTab === "All") return fights;
    return fights.filter((fight) => fight.cardPlacement === activeTab);
  }, [activeTab, fights]);

  return (
    <section className="section-shell pb-10 md:pb-14">
      <div className="mb-5 flex gap-2 overflow-x-auto rounded-full border border-line bg-surface/60 p-1">
        {tabs.map((tab) => {
          const count =
            tab === "All" ? fights.length : fights.filter((f) => f.cardPlacement === tab).length;
          if (count === 0) return null;
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`tap-target shrink-0 rounded-full px-4 text-sm transition ${
                isActive
                  ? "bg-accent text-background font-semibold"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {tab.toLowerCase()}{" "}
              <span className="data-text opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-line bg-surface/80">
        {visibleFights.map((fight) => (
          <FightCard
            key={fight.id}
            eventId={eventId}
            fight={fight}
            prediction={predByFightId.get(fight.id)}
          />
        ))}
      </div>
    </section>
  );
}
