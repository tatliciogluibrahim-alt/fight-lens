interface ProbabilityBarProps {
  probA: number;
  probB: number;
  nameA: string;
  nameB: string;
  tooClose: boolean;
}

export function ProbabilityBar({ probA, probB, nameA, nameB, tooClose }: ProbabilityBarProps) {
  const callSide = tooClose ? "neutral" : probA > probB ? "left" : "right";
  const aIsCall = callSide === "left";
  const bIsCall = callSide === "right";
  const favName = aIsCall ? nameA : nameB;
  const favProb = Math.max(probA, probB);

  const colorA = tooClose ? "text-muted" : aIsCall ? "text-accent" : "text-subtle";
  const colorB = tooClose ? "text-muted" : bIsCall ? "text-accent" : "text-subtle";

  const leftWidth = tooClose ? "50%" : `${probA}%`;
  const rightWidth = tooClose ? "50%" : `${probB}%`;

  return (
    <div
      className="space-y-5"
      data-call-state={tooClose ? "no-call" : "named-call"}
      data-accent-side={callSide}
    >
      {/* Fighter name labels */}
      <div className="flex items-center justify-between gap-4">
        <p className="mono-label max-w-[42%] truncate text-left">{nameA}</p>
        <p className="mono-label shrink-0">vs</p>
        <p className="mono-label max-w-[42%] truncate text-right">{nameB}</p>
      </div>

      {/* Giant probability numbers */}
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={`data-text text-[5.5rem] font-light leading-none tracking-normal md:text-[8rem] lg:text-[10rem] ${colorA}`}
        >
          {probA}%
        </span>
        <span
          className={`data-text text-[5.5rem] font-light leading-none tracking-normal md:text-[8rem] lg:text-[10rem] ${colorB}`}
        >
          {probB}%
        </span>
      </div>

      {/* Two-sided rail: each fighter owns a side of the 50/50 axis. */}
      <div className="relative h-3 overflow-visible rounded-full bg-surface-2/80">
        <div className="absolute left-1/2 top-1/2 z-10 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-line" />
        <div className="grid h-full grid-cols-2 gap-px overflow-hidden rounded-full">
          <div className="flex h-full justify-end bg-surface-2/60">
            <div
              className={`h-full rounded-l-full ${
                aIsCall ? "bg-accent" : tooClose ? "bg-subtle/35" : "bg-subtle/45"
              }`}
              style={{ width: leftWidth }}
            />
          </div>
          <div className="flex h-full justify-start bg-surface-2/60">
            <div
              className={`h-full rounded-r-full ${
                bIsCall ? "bg-accent" : tooClose ? "bg-subtle/35" : "bg-subtle/45"
              }`}
              style={{ width: rightWidth }}
            />
          </div>
        </div>
      </div>

      {/* Lean label */}
      {tooClose ? (
        <p className="text-center mono-label">too close to call - no named lean</p>
      ) : (
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <span className="text-accent">{favName}</span>
          <span className="text-subtle"> · {favProb}% win probability</span>
        </p>
      )}
    </div>
  );
}
