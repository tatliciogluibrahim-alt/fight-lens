"use client";

import { useState } from "react";
import type { StyleExportFighter } from "@/lib/fight-shape";

interface StyleClashSaveButtonProps {
  fighterA: StyleExportFighter;
  fighterB: StyleExportFighter;
  filename?: string;
  styleClashLabel?: string | null;
}

export function StyleClashSaveButton({ fighterA, fighterB, filename = "fight-lens-overlap", styleClashLabel }: StyleClashSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);
      const { exportStyleClashCardAsPNG } = await import("@/lib/exportStyleClashCard");
      await exportStyleClashCardAsPNG(fighterA, fighterB, filename, styleClashLabel);
    } catch (error) {
      console.error(error);
      window.alert("The Style Clash card could not be exported yet.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isSaving}
      onClick={() => {
        void handleClick();
      }}
      className="export-button"
    >
      {isSaving ? "Exporting" : "Export Matchup Radar"}
    </button>
  );
}
