import type { PredictionViewModel } from "@/lib/predictionViewModel";

/*
 * FightReadSnapshot — compact at-a-glance strip.
 *
 * Sits between the fighter hero and the analysis sections.
 * Shows model call, method lean, live path, and what breaks the call.
 *
 * Strictly presentation. Reads everything from the canonical viewModel.
 * No read-strength pill — that signal is internal only.
 */

interface FightReadSnapshotProps {
  viewModel: PredictionViewModel;
}

function Cell({
  label,
  children,
  span = "col-span-1",
  prominent = false,
}: {
  label: string;
  children: React.ReactNode;
  span?: string;
  prominent?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span}`}>
      <p className="mono-label">{label}</p>
      <div className={prominent ? "leading-tight text-foreground" : "text-sm leading-snug text-foreground"}>
        {children}
      </div>
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

  return (
    <section
      aria-label="Fight read snapshot"
      className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface/95 via-surface to-surface/90 px-5 py-5 md:px-7 md:py-6"
    >
      {/* Top edge accent — broadcast feel */}
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <p className="mono-label mb-4">fight read snapshot</p>

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Model call */}
        <Cell label="model call" span="sm:col-span-2 lg:col-span-2" prominent>
          {isNoLean ? (
            <p className="text-2xl font-semibold tracking-[-0.035em] text-foreground md:text-3xl">
              Too close to call
            </p>
          ) : (
            <p className="text-2xl font-semibold tracking-[-0.035em] text-foreground md:text-3xl">
              <span className="text-accent">{winnerName}</span>
              <span className="data-text ml-2 text-xl font-normal text-foreground md:text-2xl">{winnerProb}%</span>
            </p>
          )}
          <p className="data-text mt-1 text-[11px] uppercase tracking-[0.12em] text-subtle">
            {isNoLean ? "No named win lean" : <>Win probability · {vm.publicPredictionSource}</>}
          </p>
        </Cell>

        {/* Method lean */}
        <Cell label="most likely finish type" span="lg:col-span-1">
          <p className="text-base font-medium tracking-tight text-foreground">
            {vm.methodLean ?? "—"}
          </p>
          <p className="text-[11px] text-subtle">Directional only</p>
        </Cell>

        {/* Live path */}
        <Cell label="live path" span="lg:col-span-1">
          {isNoLean ? (
            <p className="text-sm text-muted">Both paths live until one edge separates.</p>
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
            {vm.whatBreaksTheCall}
          </p>
        </Cell>
      </div>
    </section>
  );
}
