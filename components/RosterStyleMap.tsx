import type { Event, Fighter, StyleProfile } from "@/lib/types";
import { RosterStyleMapSaveButton } from "./RosterStyleMapSaveButton";

interface RosterStyleMapProps {
  event: Event;
  fighters: Record<string, Fighter>;
}

const axes: Array<{ key: string; label: string }> = [
  { key: "striking", label: "striking" },
  { key: "wrestling", label: "wrestling" },
  { key: "grappling", label: "grappling" },
  { key: "cardio", label: "cardio" },
  { key: "defense", label: "defense" },
  { key: "output", label: "output" }
];

function axisScore(profile: StyleProfile, axis: string) {
  switch (axis) {
    case "striking":
      return Math.round((profile.strikingVolume + profile.strikingDefense) / 2);
    case "wrestling":
      return profile.wrestlingOffense;
    case "grappling":
      return Math.round((profile.controlThreat + profile.submissionThreat) / 2);
    case "cardio":
      return profile.cardioConsistency;
    case "defense":
      return Math.round((profile.strikingDefense + profile.takedownDefense) / 2);
    default:
      return profile.strikingVolume;
  }
}

function uniqueRoster(event: Event, fighters: Record<string, Fighter>) {
  const ids = event.fights.flatMap((fight) => [fight.fighterAId, fight.fighterBId]);
  return Array.from(new Set(ids)).map((id) => fighters[id]).filter(Boolean);
}

export function RosterStyleMap({ event, fighters }: RosterStyleMapProps) {
  const roster = uniqueRoster(event, fighters);

  return (
    <section className="section-shell py-8 md:py-12">
      <div className="module-card">
        <div className="module-header flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mono-label">creator asset / roster map</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
              style fingerprints for the full card.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              One scannable card-wide visual: every fighter, six style axes, ready to export as a creator reference.
            </p>
          </div>
          <RosterStyleMapSaveButton eventName={event.name} fighters={roster} />
        </div>

        <div className="module-body overflow-hidden">
          <div className="hidden gap-3 border-b border-line pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle md:grid md:grid-cols-[minmax(180px,1.2fr)_repeat(6,1fr)]">
            <span>fighter</span>
            {axes.map((axis) => (
              <span key={axis.key}>{axis.label}</span>
            ))}
          </div>
          <div className="divide-y divide-line">
            {roster.map((fighter, index) => (
              <div key={fighter.id} className="grid gap-3 py-4 md:grid-cols-[minmax(180px,1.2fr)_repeat(6,1fr)] md:items-center">
                <div>
                  <p className="font-semibold tracking-tight">{fighter.name}</p>
                  <p className="data-text mt-1 text-xs text-subtle">{fighter.record} / {fighter.ranking || "nr"}</p>
                </div>
                {axes.map((axis) => {
                  const value = axisScore(fighter.styleProfile, axis.key);
                  return (
                    <div key={axis.key} className="grid grid-cols-[72px_1fr_32px] items-center gap-2 md:block">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle md:hidden">{axis.label}</span>
                      <div className="h-2.5 rounded-full bg-background">
                        <div
                          className={`h-2.5 rounded-full ${index % 2 === 0 ? "bg-accent" : "bg-muted"}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="data-text text-right text-xs text-subtle md:mt-1 md:block md:text-left">{value}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
