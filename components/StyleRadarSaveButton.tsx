"use client";

import { useState } from "react";
import type { StyleRadarExportFighter } from "@/lib/style-radar";

interface StyleRadarSaveButtonProps {
  fighter: StyleRadarExportFighter;
  filename?: string;
}

export function StyleRadarSaveButton({ fighter, filename }: StyleRadarSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);
      const { exportStyleRadarCardAsPNG } = await import("@/lib/exportStyleRadarCard");
      await exportStyleRadarCardAsPNG(fighter, filename ?? `fight-lens-style-radar-${fighter.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    } catch (error) {
      console.error(error);
      window.alert("The Style Radar card could not be exported yet.");
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
      {isSaving ? "Downloading" : "Download Style Radar"}
    </button>
  );
}
