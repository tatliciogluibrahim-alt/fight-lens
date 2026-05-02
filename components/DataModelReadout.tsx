import type { NormalizedFight } from "@/lib/normalized-event";

interface DataModelReadoutProps {
  fight?: NormalizedFight;
}

function MetricTile({
  label,
  a,
  b,
  suffix = ""
}: {
  label: string;
  a: number | string | null;
  b: number | string | null;
  suffix?: string;
}) {
  return (
    <div className="border-t border-line p-4 md:border-l md:border-t-0">
      <p className="mono-label">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <p className="data-text text-2xl text-accent">
          {a ?? "n/a"}
          {a != null ? suffix : ""}
        </p>
        <p className="data-text text-2xl text-foreground">
          {b ?? "n/a"}
          {b != null ? suffix : ""}
        </p>
      </div>
    </div>
  );
}

export function DataModelReadout({ fight }: DataModelReadoutProps) {
  if (!fight) return null;

  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;
  const sourceItems = Object.entries(fight.sourceMix);

  return (
    <section className="module-card">
      <div className="module-header grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="mono-label">source model / readable layer</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            facts in, fight shape out.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Source stats are converted into signals and confidence. Round-one success raises early
            threat; it does not create a late-round weakness by itself.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          {sourceItems.map(([key, value]) => (
            <span
              key={key}
              className="rounded-full border border-line bg-background/65 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle"
            >
              {key}: {value}
            </span>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3">
        <div className="p-4">
          <p className="mono-label">fighter axis</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm font-semibold text-accent">{fighterA.name}</p>
              <p className="data-text mt-1 text-xs text-subtle">{fighterA.sourceCoverage}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{fighterB.name}</p>
              <p className="data-text mt-1 text-xs text-subtle">{fighterB.sourceCoverage}</p>
            </div>
          </div>
        </div>

        <MetricTile
          label="early threat"
          a={fighterA.roundModel.earlyThreat}
          b={fighterB.roundModel.earlyThreat}
          suffix="%"
        />
        <MetricTile
          label="late evidence"
          a={fighterA.roundModel.lateEvidence}
          b={fighterB.roundModel.lateEvidence}
          suffix="%"
        />
      </div>

      <div className="border-t border-line bg-background/35 p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <p className="text-sm leading-6 text-muted">
            <span className="text-foreground">model note:</span> {fighterA.roundModel.interpretation}
          </p>
          <p className="data-text text-xs leading-6 text-subtle">
            {fighterA.name}: r1 wins {fighterA.roundModel.roundOneWinCount}/{fighterA.roundModel.winCount} · late samples{" "}
            {fighterA.roundModel.lateRoundSampleCount}. {fighterB.name}: r1 wins{" "}
            {fighterB.roundModel.roundOneWinCount}/{fighterB.roundModel.winCount} · late samples{" "}
            {fighterB.roundModel.lateRoundSampleCount}.
          </p>
        </div>
      </div>
    </section>
  );
}
