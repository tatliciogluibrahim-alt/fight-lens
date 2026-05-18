"use client";

import { hasCompleteExportStyleProfile } from "@/lib/fight-shape";
import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import { getStyleRadarCompleteness, getStyleRadarRead } from "@/lib/style-radar";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import { StyleClashLabel } from "./StyleClashLabel";
import { StyleClashSaveButton } from "./StyleClashSaveButton";
import { StyleRadarSaveButton } from "./StyleRadarSaveButton";

interface CreatorActionsProps {
  fight: SourcedFight;
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
}

export function CreatorActions({ fight, fighterA, fighterB, modelOutput }: CreatorActionsProps) {
  const exportFighterA = hasCompleteExportStyleProfile(fighterA.styleProfile)
    ? { name: fighterA.name, styleProfile: fighterA.styleProfile }
    : null;
  const exportFighterB = hasCompleteExportStyleProfile(fighterB.styleProfile)
    ? { name: fighterB.name, styleProfile: fighterB.styleProfile }
    : null;
  const canExportOverlap = Boolean(exportFighterA && exportFighterB);

  const completenessA = getStyleRadarCompleteness(fighterA.styleProfile);
  const completenessB = getStyleRadarCompleteness(fighterB.styleProfile);
  const canExportRadarA = completenessA.present >= 3 && fighterA.styleProfile != null;
  const canExportRadarB = completenessB.present >= 3 && fighterB.styleProfile != null;

  const radarFighterA = canExportRadarA
    ? {
        name: fighterA.name,
        record: fighterA.record,
        stance: fighterA.stance,
        ranking: fighterA.ranking,
        styleProfile: fighterA.styleProfile!,
        confidence: modelOutput.metrics.stylePressureIndex.fighterA.confidence,
        styleRead: getStyleRadarRead(fighterA.name, fighterA.styleProfile)
      }
    : null;

  const radarFighterB = canExportRadarB
    ? {
        name: fighterB.name,
        record: fighterB.record,
        stance: fighterB.stance,
        ranking: fighterB.ranking,
        styleProfile: fighterB.styleProfile!,
        confidence: modelOutput.metrics.stylePressureIndex.fighterB.confidence,
        styleRead: getStyleRadarRead(fighterB.name, fighterB.styleProfile)
      }
    : null;

  const hasAnyExport = canExportOverlap || canExportRadarA || canExportRadarB || fight.styleClashLabel;

  if (!hasAnyExport) {
    return null;
  }

  return (
    <section id="creator-assets" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">creator assets</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          take it with you.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Download the matchup card or individual radar cards for use in video thumbnails, threads, or previews. Copy the hook to paste directly.
        </p>
      </div>

      <div className="module-body space-y-4">
        {/* Copy hook */}
        {fight.styleClashLabel ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-background/45 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">copy hook</p>
            <StyleClashLabel label={fight.styleClashLabel} copyable />
          </div>
        ) : null}

        {/* Downloads */}
        <div className="flex flex-wrap gap-3">
          {canExportOverlap ? (
            <StyleClashSaveButton
              fighterA={exportFighterA!}
              fighterB={exportFighterB!}
              styleClashLabel={fight.styleClashLabel ?? undefined}
            />
          ) : null}
          {radarFighterA ? (
            <StyleRadarSaveButton
              fighter={radarFighterA}
              filename={`fight-lens-radar-${fighterA.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            />
          ) : null}
          {radarFighterB ? (
            <StyleRadarSaveButton
              fighter={radarFighterB}
              filename={`fight-lens-radar-${fighterB.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
