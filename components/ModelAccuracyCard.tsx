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

function MetricBar({ value, quiet = false }: { value: number | null; quiet?: boolean }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div
        className={`fl-bar-fill h-full rounded-full ${quiet ? "bg-muted/35" : "bg-accent/75"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ─── Confidence breakdown table ───────────────────────────────────────────────

function CalibrationTable({ metrics }: { metrics: AccuracyMetrics }) {
  const populated = metrics.calibrationBuckets.filter((b) => b.count > 0);
  if (!populated.length) return null;

  return (
    <div>
      <p className="mono-label mb-3">confidence calibration</p>
      <div className="space-y-2 rounded-xl border border-line bg-background/25 p-3">
        {populated.map((bucket) => {
          const predicted = Math.round(bucket.predictedMidpoint * 100);
          const actual = Math.round(bucket.actualWinRate * 100);
          const diff = Math.abs(bucket.actualWinRate - bucket.predictedMidpoint);
          const isClose = diff <= 0.08;
          return (
            <div key={bucket.rangeLabel} className="rounded-lg border border-line/70 bg-surface/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] text-muted">{bucket.rangeLabel}</p>
                <p className="data-text text-xs text-subtle">n={bucket.count}</p>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-subtle">
                    <span>predicted</span>
                    <span className="data-text">{predicted}%</span>
                  </div>
                  <MetricBar value={predicted} quiet />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-subtle">
                    <span>actual</span>
                    <span className={`data-text ${isClose ? "text-accent" : "text-muted"}`}>{actual}%</span>
                  </div>
                  <MetricBar value={actual} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/60">
        directional only at small n — calibration stabilizes after more scored calls
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
  const correctCount =
    metrics.winnerAccuracy != null
      ? Math.round((metrics.winnerAccuracy / 100) * metrics.resolvedCount)
      : null;

  if (!hasData) {
    return (
      <div className={compact ? "" : "module-card"}>
        <div className={compact ? "" : "module-header"}>
          <p className="mono-label">model record</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
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
        <div className="grid gap-5 md:grid-cols-[1fr_260px] md:items-end">
          <div>
            <p className="mono-label">public model record</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
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
                {metrics.resolvedCount} fights scored — grade unlocks at 30.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-accent/25 bg-background/45 p-4">
            <p className="data-text text-5xl leading-none text-accent md:text-6xl">
              {metrics.winnerAccuracy != null ? `${metrics.winnerAccuracy}%` : "—"}
            </p>
            <p className="mono-label mt-2">call accuracy</p>
            <p className="mt-1 text-sm text-muted">
              {correctCount != null ? `${correctCount} correct of ${metrics.resolvedCount} scored fights.` : "Scored calls pending."}
            </p>
            <div className="mt-3">
              <MetricBar value={metrics.winnerAccuracy} />
            </div>
          </div>
        </div>
      </div>

      <div className={compact ? "mt-4 space-y-4" : "module-body space-y-5"}>
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <div className="rounded-xl border border-line bg-background/35 p-4">
            <p className="mono-label">sample context</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-line bg-surface/55 px-2 py-3">
                <p className="data-text text-2xl text-foreground">{metrics.totalPredictions}</p>
                <p className="mono-label mt-1">calls</p>
              </div>
              <div className="rounded-lg border border-line bg-surface/55 px-2 py-3">
                <p className="data-text text-2xl text-foreground">{metrics.resolvedCount}</p>
                <p className="mono-label mt-1">scored</p>
              </div>
              <div className="rounded-lg border border-line bg-surface/55 px-2 py-3">
                <p className="data-text text-2xl text-foreground">30</p>
                <p className="mono-label mt-1">grade at</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-subtle">
              Logged public calls only. Historical validation and backtests stay separate.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-background/35 p-4">
            <p className="data-text text-3xl text-foreground">
              {metrics.methodAccuracy != null ? `${metrics.methodAccuracy}%` : "—"}
            </p>
            <p className="mono-label mt-2">method read</p>
            <p className="mt-1 text-xs text-subtle">Directional only. Small sample.</p>
            <div className="mt-3">
              <MetricBar value={metrics.methodAccuracy} quiet />
            </div>
          </div>
        </div>

        {!compact && <CalibrationTable metrics={metrics} />}

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
