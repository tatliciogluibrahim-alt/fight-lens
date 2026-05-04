"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { formatStyleClashLabel } from "@/lib/display";

interface StyleClashLabelProps {
  label: string | null | undefined;
  copyable?: boolean;
  className?: string;
}

export function StyleClashLabel({ label, copyable = false, className = "" }: StyleClashLabelProps) {
  const [copied, setCopied] = useState(false);
  const displayLabel = formatStyleClashLabel(label);

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(displayLabel);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error(error);
      window.alert("The style clash label could not be copied yet.");
    }
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:text-[11px] ${className}`}
    >
      <span>{displayLabel}</span>
      {copyable ? (
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-line bg-background/55 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-subtle transition hover:border-accent hover:text-foreground"
          aria-label={`Copy ${displayLabel}`}
        >
          {copied ? "copied" : "copy"}
        </button>
      ) : null}
    </span>
  );
}
