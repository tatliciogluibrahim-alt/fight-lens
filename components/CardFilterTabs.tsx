"use client";

import { useMemo, useState } from "react";
import { FightCard } from "./FightCard";
import type { CardPlacement } from "@/lib/types";
import type { SourcedFight } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";

const tabs: Array<CardPlacement | "All"> = ["All", "Main Card", "Prelims", "Early Prelims"];

interface CardFilterTabsProps {
  fights: SourcedFight[];
  eventId: string;
  predictions?: PredictionRecord[];
  predictionViewModels?: PredictionViewModel[];
}

export function CardFilterTabs({ fights, eventId, predictions = [], predictionViewModels = [] }: CardFilterTabsProps) {
  const [activeTab, setActiveTab] = useState<CardPlacement | "All">("All");

  const predByFightId = useMemo(() => {
    const map = new Map<string, PredictionRecord>();
    for (const p of predictions) map.set(p.fightId, p);
    return map;
  }, [predictions]);

  const vmByFightId = useMemo(() => {
    const map = new Map<string, PredictionViewModel>();
    for (const vm of predictionViewModels) map.set(vm.fightId, vm);
    return map;
  }, [predictionViewModels]);

  const visibleFights = useMemo(() => {
    if (activeTab === "All") return fights;
    return fights.filter((fight) => fight.cardPlacement === activeTab);
  }, [activeTab, fights]);

  if (fights.length === 0) {
    return (
      <section className="section-shell pb-10 md:pb-14">
        <div className="rounded-2xl border border-line bg-surface/70 p-5 md:p-6">
          <p className="mono-label">fight card pending</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
            fight card pending.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Model calls unlock once fight data is available.
          </p>
        </div>
      </section>
    );
  }

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

      <div className="grid gap-3 sm:hidden">
        {visibleFights.map((fight) => (
          <div key={fight.id} className="overflow-hidden rounded-2xl border border-line bg-surface/75">
            <FightCard
              eventId={eventId}
              fight={fight}
              prediction={predByFightId.get(fight.id)}
              predictionViewModel={vmByFightId.get(fight.id)}
            />
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[1.35rem] border border-line bg-surface/80 sm:block">
        {visibleFights.map((fight) => (
          <FightCard
            key={fight.id}
            eventId={eventId}
            fight={fight}
            prediction={predByFightId.get(fight.id)}
            predictionViewModel={vmByFightId.get(fight.id)}
          />
        ))}
      </div>
    </section>
  );
}
