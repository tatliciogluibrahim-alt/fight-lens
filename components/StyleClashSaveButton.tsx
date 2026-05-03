"use client";

import { useState } from "react";
import type { Fighter } from "@/lib/types";

interface StyleClashSaveButtonProps {
  fighterA: Fighter;
  fighterB: Fighter;
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
  );
}
