import { fightShapeExportAxes, getNullableFightShapeAxisScore, hasCompleteExportStyleProfile } from "@/lib/fight-shape";
import { formatRanking } from "@/lib/display";
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
    <section className="section-shell pb-10 md:pb-14">
      <div className="module-card">
        <div className="module-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mono-label">creator asset</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">
              full-card style map.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Optional roster-wide reference. The fight list above stays the primary way to move between matchups.
            </p>
          </div>
          {exportable.length ? (
            <RosterStyleMapSaveButton eventName={event.event.name} fighters={exportable} />
          ) : null}
        </div>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-line px-5 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle transition hover:bg-surface-2/50 hover:text-foreground md:px-7">
            <span>view table</span>
            <span className="text-accent group-open:hidden">open</span>
            <span className="hidden text-accent group-open:inline">close</span>
          </summary>

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
                    <p className="data-text mt-1 text-xs text-subtle">{fighter.record} / {formatRanking(fighter.ranking)}</p>
                  </div>
                  {fightShapeExportAxes.map((axis) => {
                    const value = getNullableFightShapeAxisScore(fighter.styleProfile, axis.key);
                    const displayValue = value === 0 ? "limited signal" : value ?? "limited signal";
                    return (
                      <div key={axis.key} className="grid grid-cols-[72px_1fr_92px] items-center gap-2 md:block">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle md:hidden">{axis.label}</span>
                        <div className="h-2.5 rounded-full bg-background">
                          {value != null && value > 0 ? (
                            <div
                              className={`h-2.5 rounded-full ${index % 2 === 0 ? "bg-accent" : "bg-muted"}`}
                              style={{ width: `${value}%` }}
                            />
                          ) : null}
                        </div>
                        <span className="data-text text-right text-xs text-subtle md:mt-1 md:block md:text-left">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
