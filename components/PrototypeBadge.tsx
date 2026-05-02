interface PrototypeBadgeProps {
  className?: string;
}

export function PrototypeBadge({ className = "" }: PrototypeBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border border-accent/25 bg-accent-soft px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-accent ${className}`}
    >
      prototype data
    </span>
  );
}
