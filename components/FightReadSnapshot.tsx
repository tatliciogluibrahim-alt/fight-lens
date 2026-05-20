import type { PredictionViewModel, ReadStrength } from "@/lib/predictionViewModel";

/*
 * FightReadSnapshot — a compact strip that surfaces the full read at a glance.
 *
 * Sits between the fighter hero and the tab navigation on every fight page.
 * The intent is that a user lands on the page, reads this strip, and already
 * knows the model call, the read strength, the method lean, the live path,
 * and what breaks the call — without clicking a single tab.
 *
 * Strictly presentation. Reads everything from the canonical viewModel; no
 * model math, no probability adjustments.
 */

interface FightReadSnapshotProps {
  viewModel: PredictionViewModel;
}

const READ_TONE: Record<ReadStrength, { dot: string; label: string }> = {
  strong: { dot: "bg-success", label: "text-success" },
  usable: { dot: "bg-accent", label: "text-accent" },
  thin: { dot: "bg-muted", label: "text-muted" },
  "data-pending": { dot: "bg-subtle/60", label: "text-subtle" },
};

const READ_LABEL: Record<ReadStrength, string> = {
  strong: "Strong",
  usable: "Usable",
  thin: "Thin",
  "data-pending": "Data pending",
};

function Cell({
  label,
  children,
  span = "col-span-1",
}: {
  label: string;
  children: React.ReactNode;
  span?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span}`}>
      <p className="mono-label">{label}</p>
      <div className="text-sm leading-snug text-foreground">{children}</div>
    </div>
  );
}

export function FightReadSnapshot({ viewModel: vm }: FightReadSnapshotProps) {
  if (vm.callState === "insufficientData" || vm.callState === "pending") {
    return (
      <section className="rounded-2xl border border-line bg-surface/70 px-5 py-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="status-pill">
            <span className="dot" />
            data pending
          </span>
          <p className="text-sm leading-6 text-muted">
            Win probability and read load once fighter stats are sourced.
          </p>
        </div>
      </section>
    );
  }

  const isNoLean = vm.callState === "noLean";
  const winnerName = vm.predictedWinner?.name;
  const winnerProb = vm.winnerProbability;
  const loserName = vm.livePathFighter?.name;
  const tone = READ_TONE[vm.readStrength];

  return (
    <section
      aria-label="Fight read snapshot"
      className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface/95 via-surface to-surface/90 px-5 py-5 md:px-7 md:py-6"
    >
      {/* Top edge accent — broadcast feel, not a card chrome */}
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="mono-label accent-rail !mb-0 !before:mb-3">fight read snapshot</p>
        <span className={`inline-flex items-center gap-2 rounded-full border border-line bg-background/45 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${tone.label}`}>
          <span className={`size-1.5 rounded-full ${tone.dot}`} />
          {READ_LABEL[vm.readStrength]} read
        </span>
      </div>

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Model call */}
        <Cell label="model call" span="lg:col-span-1">
          {isNoLean ? (
            <p className="text-base font-semibold tracking-tight text-foreground">
              Too close to call
            </p>
          ) : (
            <p className="flex items-baseline gap-2 text-base font-semibold tracking-tight text-foreground">
              <span className="text-accent">{winnerName}</span>
              <span className="data-text text-sm font-normal text-muted">{winnerProb}%</span>
            </p>
          )}
          <p className="data-text mt-0.5 text-[11px] uppercase tracking-[0.12em] text-subtle">
            {vm.publicPredictionSource}
          </p>
        </Cell>

        {/* Method lean */}
        <Cell label="most likely finish type" span="lg:col-span-1">
          <p className="text-base font-medium tracking-tight text-foreground">
            {vm.methodLean ?? "—"}
          </p>
          <p className="text-[11px] text-subtle">Directional only · separate from winner</p>
        </Cell>

        {/* Live path */}
        <Cell label="live path" span="lg:col-span-1">
          {isNoLean ? (
            <p className="text-sm text-muted">Both paths stay live until one edge separates.</p>
          ) : (
            <p className="text-sm leading-snug text-foreground">
              <span className="font-medium">{loserName}</span>
              <span className="text-subtle"> at </span>
              <span className="data-text">{vm.loserProbability}%</span>
            </p>
          )}
        </Cell>

        {/* What breaks the call */}
        <Cell label="what breaks the call" span="lg:col-span-1">
          <p className="line-clamp-3 text-sm leading-snug text-muted">
            {isNoLean
              ? `One repeatable edge would separate the read — ${vm.swingFactorLabel.toLowerCase()}.`
              : `${vm.swingFactorLabel}.`}
          </p>
        </Cell>
      </div>

      {/* Cross-link to shape — visual bridge between call and radar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
        <p className="text-xs leading-5 text-subtle">
          Winner forecast and fight shape are separate reads. Snapshot stays consistent across both.
        </p>
        <div className="flex gap-2 text-[11px] uppercase tracking-[0.12em]">
          <a href="#the-call" className="text-subtle transition hover:text-foreground">
            full call ↓
          </a>
          <span className="text-line-strong">·</span>
          <a href="#section-shape" className="text-subtle transition hover:text-foreground">
            fight shape ↓
          </a>
        </div>
      </div>
    </section>
  );
}
