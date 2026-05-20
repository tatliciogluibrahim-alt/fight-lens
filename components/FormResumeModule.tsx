import type { SourcedFighter } from "@/lib/sourced-event";
import type { FighterMetricScore, FightShapeModelOutput } from "@/lib/fight-shape-model/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ModuleEmptyState } from "./ModuleEmptyState";

interface FormResumeModuleProps {
  fighterA: SourcedFighter;
  fighterB: SourcedFighter;
  modelOutput: FightShapeModelOutput;
}

interface TrendFight {
  result: "W" | "L" | "D";
  opponent: string;
  method: string;
  roundLabel: string;
  time: string;
  context: string;
}

function resultLabel(result: string | null | undefined): "W" | "L" | "D" {
  const normalized = String(result ?? "").toLowerCase();
  if (normalized.startsWith("w")) return "W";
  if (normalized.startsWith("l")) return "L";
  return "D";
}

function buildTrendFights(fighter: SourcedFighter): TrendFight[] {
  return fighter.lastFive.slice(0, 5).map((fight, index) => ({
    result: resultLabel(fight.result),
    opponent: fight.opponentName ?? `opponent ${index + 1}`,
    method: fight.method ?? "method pending",
    roundLabel: fight.round ? `r${fight.round}` : "round pending",
    time: fight.time ?? "--:--",
    context: fight.eventName ?? fight.date ?? "fight history"
  }));
}

function FormMetricCard({ fighter, metric }: { fighter: SourcedFighter; metric: FighterMetricScore }) {
  const wins = fighter.fightHistory.filter((fight) => resultLabel(fight.result) === "W").length;
  const losses = fighter.fightHistory.filter((fight) => resultLabel(fight.result) === "L").length;

  if (metric.status === "insufficient" || metric.score == null) {
    return (
      <ModuleEmptyState
        label="adjusted form"
        title="Adjusted form pending."
        body="This needs at least three sourced recent fights before Fight Lens scores form."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label">adjusted form</p>
          <p className="mt-2 text-sm text-muted">{metric.label}</p>
        </div>
        <div className="text-right">
          <p className="data-text text-3xl text-foreground">
            {metric.score}
          </p>
          <div className="mt-2">
            <ConfidenceBadge label={metric.confidence} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <p className="data-text rounded-xl border border-line bg-background/55 px-3 py-2 text-xs text-subtle">
          {fighter.fightHistory.length} fights
        </p>
        <p className="data-text rounded-xl border border-line bg-background/55 px-3 py-2 text-xs text-subtle">
          {wins} wins
        </p>
        <p className="data-text rounded-xl border border-line bg-background/55 px-3 py-2 text-xs text-subtle">
          {losses} losses
        </p>
      </div>
    </div>
  );
}

function FighterFormCard({ fighter, metric }: { fighter: SourcedFighter; metric: FighterMetricScore }) {
  const rows = buildTrendFights(fighter);
  const hasSourced = rows.length > 0;

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{fighter.name}</h3>
          <p className="data-text mt-1 text-xs text-subtle">
            {fighter.record ?? "record pending"}
          </p>
        </div>
        <span className="rounded-full border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          last five + resume
        </span>
      </div>

      {hasSourced ? (
        <div className="space-y-2">
          {rows.map((fight, index) => (
            <div
              key={`${fighter.id}-${fight.opponent}-${index}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-surface/45 p-3"
            >
              <span
                className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                  fight.result === "W" ? "bg-muted text-background" : "border border-line text-muted"
                }`}
              >
                {fight.result}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{fight.opponent}</p>
                <p className="data-text text-xs text-subtle">
                  {fight.method} / {fight.roundLabel} / {fight.context}
                </p>
              </div>
              <span className="data-text text-xs text-muted">{fight.time}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-xs text-subtle">
          Fight history sourced for upcoming events.
        </p>
      )}

      <div className="mt-4">
        {fighter.fightHistory.length ? (
          <FormMetricCard fighter={fighter} metric={metric} />
        ) : (
          <ModuleEmptyState
            label="resume heat"
            title="Resume context pending."
            body="Opponent-tier context is not modeled yet, so Fight Lens is holding this score back."
          />
        )}
      </div>
    </div>
  );
}

export function FormResumeModule({ fighterA, fighterB, modelOutput }: FormResumeModuleProps) {
  const formA = modelOutput.metrics.opponentQualityAdjustedForm.fighterA;
  const formB = modelOutput.metrics.opponentQualityAdjustedForm.fighterB;

  return (
    <section id="section-form-resume" className="module-card scroll-mt-28">
      <div className="module-header">
        <p className="mono-label">form check</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          recent form.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Last-five results, with opponent quality kept in context.
        </p>
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <FighterFormCard fighter={fighterA} metric={formA} />
        <FighterFormCard fighter={fighterB} metric={formB} />
      </div>
    </section>
  );
}
