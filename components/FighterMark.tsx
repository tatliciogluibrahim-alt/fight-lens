interface FighterMarkProps {
  name: string;
  tone?: "accent" | "muted";
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "size-12",
  md: "size-16",
  lg: "size-24"
};

export function FighterMark({ name, tone = "accent", size = "md" }: FighterMarkProps) {
  const initial = name.slice(0, 1).toLowerCase();
  const isAccent = tone === "accent";

  return (
    <div
      aria-hidden="true"
      className={`${sizes[size]} relative overflow-hidden rounded-2xl border ${
        isAccent ? "border-accent/45 bg-accent-soft" : "border-line-strong bg-surface-2"
      }`}
    >
      <div
        className={`absolute -left-5 -top-4 h-16 w-24 rotate-[-18deg] rounded-full ${
          isAccent ? "bg-accent/65" : "bg-muted/28"
        }`}
      />
      <div className="absolute bottom-2 left-2 right-2 h-3 rounded-full bg-background/75" />
      <div className="absolute right-2 top-2 h-8 w-3 rounded-full bg-foreground/10" />
      <span className="absolute bottom-1 right-2 font-mono text-3xl font-semibold text-foreground/12">
        {initial}
      </span>
    </div>
  );
}
