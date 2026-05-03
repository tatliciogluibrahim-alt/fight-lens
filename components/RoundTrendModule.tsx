import type { Fight, Fighter, FightResult } from "@/lib/types";
import type { NormalizedFight } from "@/lib/normalized-event";

interface RoundTrendModuleProps {
  fight: Fight;
  fighterA: Fighter;
  fighterB: Fighter;
  normalizedFight?: NormalizedFight;
}

interface RoundModelFallback {
  earlyThreat: number | null;
  lateEvidence: number | null;
  averageFightTime?: string | null;
  roundOneWinCount?: number | null;
  winCount?: number | null;
  lateRoundSampleCount?: number | null;
  interpretation?: string | null;
}

const tierWeight = {
  "Top 10": 1.2,
  Ranked: 1,
  Unranked: 0.85
} as const;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rawRoundSignal(fight: FightResult, roundIndex: number) {
  const strike = fight.sigStrikeDifferentialByRound[roundIndex] ?? 0;
  const takedowns = fight.takedownsByRound[roundIndex] ?? 0;
  const control = fight.controlTimeByRound[roundIndex] ?? 0;
  return strike + takedowns * 6 + control / 18;
}

function weightedRoundScores(fighter: Fighter, rounds: 3 | 5) {
  const totals = Array.from({ length: rounds }, () => 0);
  const weights = Array.from({ length: rounds }, () => 0);

  fighter.lastFiveFights.slice(0, 5).forEach((fight, fightIndex) => {
    const recency = 1 - fightIndex * 0.12;
    const opponent = tierWeight[fight.opponentTier];
    const sampleWeight = recency * opponent;

    for (let round = 0; round < rounds; round += 1) {
      const availableRound = Math.min(round, fight.sigStrikeDifferentialByRound.length - 1);
      totals[round] += rawRoundSignal(fight, availableRound) * sampleWeight;
      weights[round] += sampleWeight;
    }
  });

  return totals.map((total, index) => {
    const base = weights[index] ? total / weights[index] : 0;
    return clamp(50 + base * 4.2 + fighter.styleProfile.cardioConsistency * 0.12);
  });
}

function normalizedRoundModel(normalizedFight: NormalizedFight | undefined, side: "fighterA" | "fighterB"): RoundModelFallback | undefined {
  return normalizedFight?.fighters[side].roundModel;
}

function modelValue(model: RoundModelFallback | undefined, key: "earlyThreat" | "lateEvidence") {
  const value = model?.[key];
  return typeof value === "number" && value > 0 ? value : null;
}

function trendStats(fighter: Fighter, model: RoundModelFallback | undefined, scores: number[]) {
  const early = modelValue(model, "earlyThreat") ?? scores[0] ?? 0;
  const mid = scores.length >= 3 ? Math.round((scores[1] + scores[2]) / 2) : scores[1] ?? scores[0] ?? 0;
  const late = modelValue(model, "lateEvidence") ?? Math.round((scores[scores.length - 2] + scores[scores.length - 1]) / 2);
  return {
    early: clamp(early),
    mid: clamp(mid),
    late: clamp(late),
    note: model?.interpretation ?? null
  };
}

function TrendBars({ fighter, scores, accent = false }: { fighter: Fighter; scores: number[]; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="mb-5">
        <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
        <p className="mono-label mt-1">weighted round trend</p>
      </div>
      <div className="space-y-3">
        {scores.map((score, index) => (
          <div key={`${fighter.id}-r${index + 1}`} className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <span className="data-text text-xs text-subtle">r{index + 1}</span>
            <div className="h-3 rounded-full bg-surface-2">
              <div
                className={`h-3 rounded-full ${accent ? "bg-accent" : "bg-muted"}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={`data-text text-right text-xs ${accent ? "text-accent" : "text-foreground"}`}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalTiles({ statsA, statsB }: { statsA: ReturnType<typeof trendStats>; statsB: ReturnType<typeof trendStats> }) {
  const rows = [
    ["early threat", statsA.early, statsB.early],
    ["middle stability", statsA.mid, statsB.mid],
    ["late evidence", statsA.late, statsB.late]
  ] as const;

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <p className="mono-label">round model signals</p>
      <div className="mt-5 space-y-4">
        {rows.map(([label, a, b]) => {
          const max = Math.max(a, b, 1);
          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className={`data-text text-sm ${a >= b ? "text-accent" : "text-muted"}`}>{a}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</span>
                <span className={`data-text text-sm ${b > a ? "text-foreground" : "text-muted"}`}>{b}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex justify-end rounded-l-full bg-surface-2">
                  <div className="h-2.5 rounded-l-full bg-accent" style={{ width: `${(a / max) * 100}%` }} />
                </div>
                <div className="rounded-r-full bg-surface-2">
                  <div className="h-2.5 rounded-r-full bg-muted" style={{ width: `${(b / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasSourcedRoundData(model: RoundModelFallback | undefined): boolean {
  return Boolean(
    model &&
    typeof model.earlyThreat === "number" &&
    model.earlyThreat > 0 &&
    typeof model.lateRoundSampleCount === "number" &&
    model.lateRoundSampleCount >= 3
  );
}

export function RoundTrendModule({ fight, fighterA, fighterB, normalizedFight }: RoundTrendModuleProps) {
  const modelA = normalizedRoundModel(normalizedFight, "fighterA");
  const modelB = normalizedRoundModel(normalizedFight, "fighterB");
  const isSourced = hasSourcedRoundData(modelA) && hasSourcedRoundData(modelB);

  const scoresA = weightedRoundScores(fighterA, fight.rounds);
  const scoresB = weightedRoundScores(fighterB, fight.rounds);
  const statsA = trendStats(fighterA, modelA, scoresA);
  const statsB = trendStats(fighterB, modelB, scoresB);

  return (
    <section id="section-round-trend" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">04 / round trend</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          where the fight changes by round.
        </h2>
        {isSourced ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Weighted trend blends recent striking differential, control time, takedowns, opponent tier, and recency. Early finishes raise early threat; they do not automatically mark late rounds as weak.
          </p>
        ) : null}
      </div>
      {isSourced ? (
        <div className="module-body grid gap-4 lg:grid-cols-[1fr_1fr]">
          <TrendBars fighter={fighterA} scores={scoresA} accent />
          <TrendBars fighter={fighterB} scores={scoresB} />
          <div className="lg:col-span-2">
            <SignalTiles statsA={statsA} statsB={statsB} />
            {statsA.note ? (
              <p className="data-text mt-4 text-xs leading-6 text-subtle">{statsA.note}</p>
            ) : null}
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
