import { formatStyleClashLabel } from "@/lib/display";

interface StyleClashLabelProps {
  label: string | null | undefined;
  className?: string;
}

export function StyleClashLabel({ label, className = "" }: StyleClashLabelProps) {
  const displayLabel = formatStyleClashLabel(label);

  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:text-[11px] ${className}`}
    >
      {displayLabel}
    </span>
  );
}
