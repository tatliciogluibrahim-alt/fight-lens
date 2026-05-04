"use client";

import { useState } from "react";
import type { HookCardExportOptions } from "@/lib/export/exportHookCard";

interface HookCardSaveButtonProps {
  options: HookCardExportOptions;
  filename?: string;
  label?: string;
}

export function HookCardSaveButton({ options, filename, label = "Download Hook Card" }: HookCardSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    try {
      setIsSaving(true);
      const { exportHookCardAsPNG } = await import("@/lib/export/exportHookCard");
      await exportHookCardAsPNG(options, filename);
    } catch (error) {
      console.error(error);
      window.alert("The hook card could not be exported yet.");
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
      {isSaving ? "Downloading" : label}
    </button>
  );
}
