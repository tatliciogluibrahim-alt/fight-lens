interface ModuleEmptyStateProps {
  label: string;
  title: string;
  body: string;
}

export function ModuleEmptyState({ label, title, body }: ModuleEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <p className="mono-label">{label}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
