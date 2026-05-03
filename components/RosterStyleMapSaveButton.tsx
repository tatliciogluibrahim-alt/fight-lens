"use client";

import { useState } from "react";
import type { Fighter } from "@/lib/types";

interface RosterStyleMapSaveButtonProps {
  eventName: string;
  fighters: Fighter[];
}

export function RosterStyleMapSaveButton({ eventName, fighters }: RosterStyleMapSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);
      const { exportRosterStyleMapAsPNG } = await import("@/lib/exportRosterStyleMap");
      await exportRosterStyleMapAsPNG(eventName, fighters);
    } catch (error) {
      console.error(error);
      window.alert("The roster style map could not be exported yet.");
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
      {isSaving ? "SAVING" : "SAVE STYLE MAP"}
    </button>
  );
}
