import type { SourcedFight, SourcedFighter, SourcedRoundScore } from "@/lib/sourced-event";

interface RoundTrendModuleProps {
  fight: SourcedFight;
}

function hasEnoughRoundData(fighter: SourcedFighter) {
  return Boolean(
    fighter.roundModel.earlyThreat != null &&
      fighter.roundModel.lateRoundSampleCount >= 3 &&
      fighter.roundModel.hasEnoughForTrend
  );
}

function TrendBars({ fighter, scores, accent = false }: { fighter: SourcedFighter; scores: SourcedRoundScore[]; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="mb-5">
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        <p className="mono-label mt-1">round trend</p>
      </div>
      <div className="space-y-3">
        {scores.map((round) => {
          const score = round.score ?? 0;

          return (
            <div key={`${fighter.id}-r${round.round}`} className="grid grid-cols-[44px_1fr_74px] items-center gap-3">
              <span className="data-text text-xs text-subtle">r{round.round}</span>
              <div className="h-3 rounded-full bg-surface-2">
                <div
                  className={`h-3 rounded-full ${accent ? "bg-accent" : "bg-muted"}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`data-text text-right text-xs ${accent ? "text-accent" : "text-foreground"}`}>
                {round.score ?? "n/a"} / {round.sampleCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignalTiles({ fighterA, fighterB }: { fighterA: SourcedFighter; fighterB: SourcedFighter }) {
  const rows = [
    ["early threat", fighterA.roundModel.earlyThreat, fighterB.roundModel.earlyThreat],
    ["late evidence", fighterA.roundModel.lateEvidence, fighterB.roundModel.lateEvidence],
    ["round samples", fighterA.roundModel.roundSampleCount, fighterB.roundModel.roundSampleCount]
  ] as const;

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <p className="mono-label">round model signals</p>
      <div className="mt-5 space-y-4">
        {rows.map(([label, a, b]) => {
          const max = Math.max(a ?? 0, b ?? 0, 1);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className={`data-text text-sm ${(a ?? 0) >= (b ?? 0) ? "text-accent" : "text-muted"}`}>{a ?? "n/a"}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</span>
                <span className={`data-text text-sm ${(b ?? 0) > (a ?? 0) ? "text-foreground" : "text-muted"}`}>{b ?? "n/a"}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex justify-end rounded-l-full bg-surface-2">
                  <div className="h-2.5 rounded-l-full bg-accent" style={{ width: `${((a ?? 0) / max) * 100}%` }} />
                </div>
                <div className="rounded-r-full bg-surface-2">
                  <div className="h-2.5 rounded-r-full bg-muted" style={{ width: `${((b ?? 0) / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoundTrendModule({ fight }: RoundTrendModuleProps) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const canShowTrend = hasEnoughRoundData(fighterA) && hasEnoughRoundData(fighterB);

  return (
    <section id="section-round-trend" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">04 / round trend</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          where the fight changes by round.
        </h2>
        {canShowTrend ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Round trend uses completed fight-detail rounds only. Missing rounds stay out of the chart.
          </p>
        ) : null}
      </div>
      {canShowTrend ? (
        <div className="module-body grid gap-4 lg:grid-cols-[1fr_1fr]">
          <TrendBars fighter={fighterA} scores={fighterA.roundModel.roundScores} accent />
          <TrendBars fighter={fighterB} scores={fighterB.roundModel.roundScores} />
          <div className="lg:col-span-2">
            <SignalTiles fighterA={fighterA} fighterB={fighterB} />
            <p className="data-text mt-4 text-xs leading-6 text-subtle">{fighterA.roundModel.interpretation}</p>
          </div>
        </div>
      ) : (
        <div className="module-body">
          <p className="text-xs text-subtle">
            Not enough data to see the shape of this fight by round.
          </p>
        </div>
      )}
    </section>
  );
}
