import type { FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import { hasCompleteExportStyleProfile } from "@/lib/fight-shape";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import { sourcedEvent } from "@/lib/sourced-event";
import { ExportOptionCard } from "./ExportOptionCard";
import { HookCardSaveButton } from "./HookCardSaveButton";
import { StyleClashSaveButton } from "@/components/StyleClashSaveButton";

interface ExportStudioProps {
  fight: SourcedFight;
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
}

export function ExportStudio({ fight, fighterA, fighterB, modelOutput }: ExportStudioProps) {
  const fightLabel = `${fighterA.name} vs. ${fighterB.name}`;
  const eventName = sourcedEvent.event.name;

  const exportFighterA = hasCompleteExportStyleProfile(fighterA.styleProfile)
    ? { name: fighterA.name, record: fighterA.record, styleProfile: fighterA.styleProfile }
    : null;
  const exportFighterB = hasCompleteExportStyleProfile(fighterB.styleProfile)
    ? { name: fighterB.name, record: fighterB.record, styleProfile: fighterB.styleProfile }
    : null;

  const canExportStyleClash = Boolean(exportFighterA && exportFighterB);
  const canExportHookCard = Boolean(fight.styleClashLabel);

  const hookCardBase = {
    fightLabel,
    eventName,
    styleClashLabel: fight.styleClashLabel,
    keyPressurePoint: modelOutput.publicSummary || fight.fightShapeSummary,
    confidenceLabel: modelOutput.dataConfidence.label,
    sourceNote: "UFCStats scope + Fight Shape model"
  };

  return (
    <section id="export-studio" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">export studio</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          make the read portable.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Creator-ready cards for the shape of the fight. Use in video thumbnails, X threads,
          newsletters, or fight previews.
        </p>
      </div>

      <div className="module-body grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExportOptionCard
          title="Style Overlap Card"
          format="16:9 · 1920 × 1080"
          description="Six-axis style comparison across striking, wrestling, grappling, defense, cardio, and output. The primary matchup share card."
          status={canExportStyleClash ? "ready" : "disabled"}
          note={
            canExportStyleClash
              ? "Canvas-rendered at full resolution."
              : "Style profile not complete for one or both fighters."
          }
        >
          {canExportStyleClash ? (
            <StyleClashSaveButton
              fighterA={exportFighterA!}
              fighterB={exportFighterB!}
              styleClashLabel={fight.styleClashLabel ?? undefined}
            />
          ) : null}
        </ExportOptionCard>

        <ExportOptionCard
          title="Creator Hook Card"
          format="16:9 · 1920 × 1080"
          description="Style clash label, signal bars, and pressure context in one card. Built for video thumbnails and thread headers."
          status={canExportHookCard ? "ready" : "disabled"}
          note={
            canExportHookCard
              ? "Canvas-rendered. No betting language."
              : "Needs a style clash label to generate."
          }
        >
          {canExportHookCard ? (
            <HookCardSaveButton
              options={{ ...hookCardBase, format: "16:9" }}
              label="Download Hook Card"
            />
          ) : null}
        </ExportOptionCard>

        <ExportOptionCard
          title="Square Hook Card"
          format="1:1 · 1600 × 1600"
          description="Same intelligence, square format. Works for Instagram posts and profile thumbnails."
          status={canExportHookCard ? "ready" : "disabled"}
          note={
            canExportHookCard
              ? "Canvas-rendered at 1600 × 1600."
              : "Needs a style clash label to generate."
          }
        >
          {canExportHookCard ? (
            <HookCardSaveButton
              options={{ ...hookCardBase, format: "1:1" }}
              label="Download Square Card"
            />
          ) : null}
        </ExportOptionCard>

        <ExportOptionCard
          title="Vertical Story Card"
          format="9:16 · 1080 × 1920"
          description="A full-height card for Instagram and YouTube Stories. Includes matchup summary and pressure point."
          status="disabled"
          note="Coming in a future update."
        />
      </div>
    </section>
  );
}
