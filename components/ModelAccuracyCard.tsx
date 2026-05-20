import type { AccuracyMetrics, ModelGrade } from "@/lib/accuracy/types";

interface ModelAccuracyCardProps {
  metrics: AccuracyMetrics;
  compact?: boolean;
}

// ─── Grade display ────────────────────────────────────────────────────────────

// Grade is only shown once sample size is meaningful (≥30 fights scored)
const GRADE_MIN_SAMPLE = 30;

const gradeConfig: Record<ModelGrade, { color: string; label: string }> = {
  A: { color: "text-accent", label: "Strong read accuracy" },
  B: { color: "text-foreground", label: "Solid read accuracy" },
  C: { color: "text-muted", label: "Developing read accuracy" },
  D: { color: "text-subtle", label: "Near-random — more fights needed" },
  F: { color: "text-subtle", label: "Overclaiming — needs recalibration" },
};

// ─── Compact badge (for homepage) ────────────────────────────────────────────

export function ModelAccuracyBadge({ metrics }: { metrics: AccuracyMetrics }) {
  if (!metrics.resolvedCount) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
        <span className="size-1.5 rounded-full bg-subtle" />
        model: tracking
      </span>
    );
  }

  const correctCount =
    metrics.winnerAccuracy != null
      ? Math.round((metrics.winnerAccuracy / 100) * metrics.resolvedCount)
      : null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
      <span className="size-1.5 rounded-full bg-accent" />
      model: {correctCount != null ? `${correctCount}/${metrics.resolvedCount} calls` : `${metrics.resolvedCount} scored`}
      {metrics.grade && metrics.resolvedCount >= GRADE_MIN_SAMPLE ? ` · grade ${metrics.grade}` : ""}
    </span>
  );
}

// ─── Confidence breakdown table ───────────────────────────────────────────────

function CalibrationTable({ metrics }: { metrics: AccuracyMetrics }) {
  const populated = metrics.calibrationBuckets.filter((b) => b.count > 0);
  if (!populated.length) return null;

  return (
    <div>
      <p className="mono-label mb-3">predicted vs. actual win rate by confidence</p>
      <div className="divide-y divide-line rounded-xl border border-line overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-surface-2/50 px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">confidence range</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">predicted</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">actual</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">n</span>
        </div>
        {populated.map((bucket) => {
          const diff = Math.abs(bucket.actualWinRate - bucket.predictedMidpoint);
          const isClose = diff <= 0.08;
          return (
            <div
              key={bucket.rangeLabel}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3"
            >
              <span className="font-mono text-[11px] text-muted">{bucket.rangeLabel}</span>
              <span className="data-text text-sm text-subtle">
                {Math.round(bucket.predictedMidpoint * 100)}%
              </span>
              <span className={`data-text text-sm ${isClose ? "text-accent" : "text-muted"}`}>
                {Math.round(bucket.actualWinRate * 100)}%
              </span>
              <span className="data-text text-sm text-subtle">{bucket.count}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
        directional only at small n — calibration stabilises after 30+ fights per bucket
      </p>
    </div>
  );
}

// ─── Full accuracy card ───────────────────────────────────────────────────────

export function ModelAccuracyCard({ metrics, compact = false }: ModelAccuracyCardProps) {
  const hasData = metrics.resolvedCount > 0;
  const showGrade = metrics.resolvedCount >= GRADE_MIN_SAMPLE && metrics.grade != null;
  const grade = showGrade ? metrics.grade : null;
  const gradeDisplay = grade ? gradeConfig[grade] : null;

  if (!hasData) {
    return (
      <div className={compact ? "" : "module-card"}>
        <div className={compact ? "" : "module-header"}>
          <p className="mono-label">model record</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            tracking.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Accuracy numbers build as fights resolve. {metrics.totalPredictions} call{metrics.totalPredictions !== 1 ? "s" : ""} locked — outcomes pending.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "module-card"}>
      <div className={compact ? "" : "module-header"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mono-label">model record</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              {grade ? (
                <span className={gradeDisplay?.color}>grade {grade}.</span>
              ) : (
                "record in progress."
              )}
            </h2>
            {gradeDisplay ? (
              <p className="mt-2 text-sm text-muted">{gradeDisplay.label}</p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {metrics.resolvedCount} fight{metrics.resolvedCount !== 1 ? "s" : ""} scored — grade unlocks at 30.
              </p>
            )}
          </div>
          <div className="grid gap-2 text-right">
            <div className="rounded-xl border border-line bg-background/45 px-4 py-3">
              <p className="data-text text-3xl text-foreground">
                {metrics.resolvedCount}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                fights scored
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={compact ? "mt-4 space-y-4" : "module-body space-y-6"}>
        {/* Core metrics — 2-stat layout */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-background/45 p-4">
            <p className="data-text text-3xl text-accent">
              {metrics.winnerAccuracy != null ? `${metrics.winnerAccuracy}%` : "—"}
            </p>
            <p className="mono-label mt-2">call accuracy</p>
            <p className="mt-1 text-xs text-subtle">model call was correct</p>
          </div>
          <div className="rounded-xl border border-line bg-background/45 p-4">
            <p className="data-text text-3xl text-foreground">
              {metrics.methodAccuracy != null ? `${metrics.methodAccuracy}%` : "—"}
            </p>
            <p className="mono-label mt-2">finish vs. decision read</p>
            <p className="mt-1 text-xs text-subtle">method type directionally correct</p>
          </div>
        </div>

        {/* Sample size note */}
        <p className="font-mono text-[11px] text-muted -mt-2">
          Logged public calls only — historical backtest runs are tracked separately.
        </p>

        {!compact && <CalibrationTable metrics={metrics} />}

        {/* Data note */}
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/70">
          signal-based · not a guarantee · outcome-v0.2
          {metrics.lastUpdated
            ? ` · updated ${new Date(metrics.lastUpdated).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
            : ""}
        </p>
      </div>
    </div>
  );
}
