import { fightShapeExportAxes, getNullableFightShapeAxisScore, hasCompleteExportStyleProfile } from "@/lib/fight-shape";
import type { StyleExportFighter } from "@/lib/fight-shape";
import type { SourcedEvent, SourcedFighter } from "@/lib/sourced-event";
import { RosterStyleMapSaveButton } from "./RosterStyleMapSaveButton";

interface RosterStyleMapProps {
  event: SourcedEvent;
}

function uniqueRoster(event: SourcedEvent) {
  const fighters = event.fights.flatMap((fight) => [fight.fighters.fighterA, fight.fighters.fighterB]);
  return Array.from(new Map(fighters.map((fighter) => [fighter.ufcstatsId, fighter])).values());
}

function exportableRoster(roster: SourcedFighter[]) {
  const exportable: StyleExportFighter[] = [];

  for (const fighter of roster) {
    if (hasCompleteExportStyleProfile(fighter.styleProfile)) {
      exportable.push({
        name: fighter.name,
        record: fighter.record,
        ranking: fighter.ranking,
        styleProfile: fighter.styleProfile
      });
    }
  }

  return exportable;
}

export function RosterStyleMap({ event }: RosterStyleMapProps) {
  const roster = uniqueRoster(event);
  const exportable = exportableRoster(roster);

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
          {exportable.length ? (
            <RosterStyleMapSaveButton eventName={event.event.name} fighters={exportable} />
          ) : null}
        </div>

        <div className="module-body overflow-hidden">
          <div className="hidden gap-3 border-b border-line pb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle md:grid md:grid-cols-[minmax(180px,1.2fr)_repeat(6,1fr)]">
            <span>fighter</span>
            {fightShapeExportAxes.map((axis) => (
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
                {fightShapeExportAxes.map((axis) => {
                  const value = getNullableFightShapeAxisScore(fighter.styleProfile, axis.key);
                  return (
                    <div key={axis.key} className="grid grid-cols-[72px_1fr_32px] items-center gap-2 md:block">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle md:hidden">{axis.label}</span>
                      <div className="h-2.5 rounded-full bg-background">
                        <div
                          className={`h-2.5 rounded-full ${index % 2 === 0 ? "bg-accent" : "bg-muted"}`}
                          style={{ width: `${value ?? 0}%` }}
                        />
                      </div>
                      <span className="data-text text-right text-xs text-subtle md:mt-1 md:block md:text-left">{value ?? "n/a"}</span>
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
