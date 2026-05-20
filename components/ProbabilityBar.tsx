interface ProbabilityBarProps {
  probA: number;
  probB: number;
  nameA: string;
  nameB: string;
  tooClose: boolean;
}

export function ProbabilityBar({ probA, probB, nameA, nameB, tooClose }: ProbabilityBarProps) {
  const aIsCall = !tooClose && probA > probB;
  const bIsCall = !tooClose && probB > probA;
  const calledName = aIsCall ? nameA : bIsCall ? nameB : null;
  const calledProb = aIsCall ? probA : bIsCall ? probB : null;
  const otherName = aIsCall ? nameB : bIsCall ? nameA : null;
  const otherProb = aIsCall ? probB : bIsCall ? probA : null;

  if (tooClose || !calledName || calledProb == null || !otherName || otherProb == null) {
    return (
      <div className="space-y-5" data-call-state="no-call" data-accent-side="neutral">
        <div className="flex items-center justify-between gap-4">
          <p className="mono-label max-w-[42%] truncate text-left">{nameA}</p>
          <p className="mono-label shrink-0">vs</p>
          <p className="mono-label max-w-[42%] truncate text-right">{nameB}</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface/60 p-6 text-center md:p-8">
          <p className="mono-label">model call</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-6xl">
            Too close to call
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-background/40 p-4">
              <p className="truncate text-sm font-medium text-foreground">{nameA}</p>
              <p className="data-text mt-1 text-2xl text-muted">{probA}%</p>
            </div>
            <div className="rounded-xl border border-line bg-background/40 p-4">
              <p className="truncate text-sm font-medium text-foreground">{nameB}</p>
              <p className="data-text mt-1 text-2xl text-muted">{probB}%</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-subtle">
            No named model call. The probabilities do not separate enough.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-5"
      data-call-state="named-call"
      data-accent-side={aIsCall ? "left" : "right"}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="mono-label max-w-[42%] truncate text-left">{nameA}</p>
        <p className="mono-label shrink-0">vs</p>
        <p className="mono-label max-w-[42%] truncate text-right">{nameB}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.35fr_0.65fr] md:items-stretch">
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-6 md:p-8">
          <p className="mono-label text-accent">model call</p>
          <p className="mt-3 text-4xl font-semibold leading-none tracking-[-0.055em] text-accent md:text-6xl">
            {calledName}
          </p>
          <p className="data-text mt-4 text-5xl font-light leading-none text-foreground md:text-7xl">
            {calledProb}%
          </p>
          <p className="mt-2 text-sm text-muted">win probability</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface/60 p-6 md:p-7">
          <p className="mono-label">live path</p>
          <p className="mt-3 text-xl font-semibold leading-tight tracking-[-0.03em] text-foreground">
            {otherName}
          </p>
          <p className="data-text mt-3 text-3xl text-muted md:text-4xl">
            {otherProb}%
          </p>
          <p className="mt-2 text-xs text-subtle">Still live if the fight shifts.</p>
        </div>
      </div>
    </div>
  );
}
