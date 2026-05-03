"use client";

import { useState } from "react";

interface SaveSectionButtonProps {
  elementId: string;
  filename: string;
}

export function SaveSectionButton({ elementId, filename }: SaveSectionButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);
      const { exportSectionAsPNG } = await import("@/lib/exportSection");
      await exportSectionAsPNG(elementId, filename);
    } catch (error) {
      console.error(error);
      window.alert("This creator card is not ready to export yet.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isSaving}
      data-export-ignore="true"
      onClick={() => {
        void handleClick();
      }}
      className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle transition hover:bg-surface-2 hover:text-foreground disabled:cursor-wait disabled:opacity-60"
    >
      {isSaving ? "SAVING" : "SAVE AS IMAGE"}
    </button>
  );
}
