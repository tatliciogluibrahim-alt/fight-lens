import type { SourcedFighter } from "@/lib/sourced-event";
import type { FighterMetricScore } from "@/lib/fight-shape-model/types";
import { getStyleRadarCompleteness, getStyleRadarRead } from "@/lib/style-radar";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { StyleRadar } from "./StyleRadar";
import { StyleRadarSaveButton } from "./StyleRadarSaveButton";

interface FighterStyleRadarCardProps {
  fighter: SourcedFighter;
  metric: FighterMetricScore;
  tone?: "accent" | "muted";
}

export function FighterStyleRadarCard({ fighter, metric, tone = "accent" }: FighterStyleRadarCardProps) {
  const completeness = getStyleRadarCompleteness(fighter.styleProfile);
  const styleRead = getStyleRadarRead(fighter.name, fighter.styleProfile);
  const canShowRadar = completeness.present >= 3;
  const showDebug = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

  if (!canShowRadar) {
    return (
      <ModuleEmptyState
        label={fighter.name}
        title="Style radar pending."
        body="This fighter needs more complete profile dimensions before Fight Lens draws a radar."
      />
    );
  }

  return (
    <article className="radar-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">{fighter.ranking ?? "nr"} / {fighter.stance ?? "stance pending"}</p>
          <h3 className={`mt-2 text-2xl font-semibold leading-tight tracking-[-0.035em] ${tone === "accent" ? "text-accent" : "text-foreground"}`}>
            {fighter.name}
          </h3>
        </div>
        <ConfidenceBadge label={metric.confidence} />
      </div>

      <div className="my-5 aspect-square w-full max-w-[360px] self-center">
        <StyleRadar profile={fighter.styleProfile} title={fighter.name} tone={tone} />
      </div>

      <p className="text-sm leading-6 text-muted">{styleRead}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="data-text text-xs text-subtle">
          {completeness.present}/{completeness.total} dimensions
        </p>
        <StyleRadarSaveButton
          fighter={{
            id: fighter.id,
            name: fighter.name,
            record: fighter.record,
            stance: fighter.stance,
            ranking: fighter.ranking,
            styleProfile: fighter.styleProfile,
            confidence: metric.confidence,
            styleRead
          }}
        />
      </div>

      {showDebug ? (
        <p className="data-text mt-4 text-[10px] leading-5 text-subtle">
          {Object.entries(fighter.styleProfile.provenance).map(([key, value]) => `${key}:${value}`).join(" / ")}
        </p>
      ) : null}
    </article>
  );
}
