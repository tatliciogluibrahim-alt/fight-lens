import type { FightShapeConfidenceLabel } from "@/lib/fight-shape-model/types";

interface ConfidenceBadgeProps {
  label: FightShapeConfidenceLabel;
}

export function ConfidenceBadge({ label }: ConfidenceBadgeProps) {
  const tone = {
    High: "border-accent/40 text-accent",
    Medium: "border-line-strong text-foreground",
    Low: "border-line text-muted",
    Insufficient: "border-line text-subtle"
  }[label];

  return (
    <span className={`inline-flex rounded-full border bg-background/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${tone}`}>
      {label} confidence
    </span>
  );
}
