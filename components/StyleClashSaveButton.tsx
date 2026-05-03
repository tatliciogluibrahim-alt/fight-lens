"use client";

import { useState } from "react";
import type { StyleExportFighter } from "@/lib/fight-shape";

interface StyleClashSaveButtonProps {
  fighterA: StyleExportFighter;
  fighterB: StyleExportFighter;
  filename?: string;
}

export function StyleClashSaveButton({ fighterA, fighterB, filename = "fight-lens-overlap" }: StyleClashSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);
      const { exportStyleClashCardAsPNG } = await import("@/lib/exportStyleClashCard");
      await exportStyleClashCardAsPNG(fighterA, fighterB, filename);
    } catch (error) {
      console.error(error);
      window.alert("The Style Clash card could not be exported yet.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isSaving}
        onClick={() => {
          void handleClick();
        }}
        className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle transition hover:bg-surface-2 hover:text-foreground disabled:cursor-wait disabled:opacity-60"
      >
        {isSaving ? "SAVING" : "SAVE AS IMAGE"}
      </button>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-subtle/60">
        export the shape of this matchup
      </span>
    </div>
  );
}
