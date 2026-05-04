import type { ReactNode } from "react";

interface ExportOptionCardProps {
  title: string;
  format: string;
  description: string;
  status: "ready" | "disabled";
  note: string;
  children?: ReactNode;
}

export function ExportOptionCard({ title, format, description, status, note, children }: ExportOptionCardProps) {
  const isReady = status === "ready";

  return (
    <article className={`flex min-h-[236px] flex-col justify-between rounded-2xl border p-4 transition-colors ${
      isReady
        ? "border-line bg-background/45"
        : "border-line/70 bg-background/25"
    }`}
    >
      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="mono-label">{format}</p>
          <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
            isReady
              ? "border-accent/45 bg-accent-soft text-accent"
              : "border-line bg-surface/45 text-subtle"
          }`}
          >
            {isReady ? "ready" : "held"}
          </span>
        </div>
        <h3 className="text-lg font-semibold leading-tight tracking-[-0.025em]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
        <p className="data-text max-w-[28ch] text-[10px] uppercase tracking-[0.08em] text-subtle">
          {note}
        </p>
        {children ?? (
          <button type="button" disabled className="export-button">
            Not Available
          </button>
        )}
      </div>
    </article>
  );
}
