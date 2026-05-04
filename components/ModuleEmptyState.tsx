interface ModuleEmptyStateProps {
  label: string;
  title: string;
  body: string;
}

export function ModuleEmptyState({ label, title, body }: ModuleEmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-background/45 p-5">
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-accent/45 via-foreground/10 to-transparent" />
      <p className="mono-label">{label}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
