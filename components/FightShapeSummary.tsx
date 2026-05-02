import type { Fight, Fighter } from "@/lib/types";

interface FightShapeSummaryProps {
  fight: Fight;
  fighterA: Fighter;
  fighterB: Fighter;
}

export function FightShapeSummary({ fight, fighterA, fighterB }: FightShapeSummaryProps) {
  return (
    <section id="fight-shape" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">01 / fight shape</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">the read.</h2>
        </div>
      </div>

      <div className="module-body grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <div>
          <p className="text-xl leading-8 text-foreground md:text-2xl md:leading-9">
            {fight.fightShapeSummary}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[fight.styleClashLabel, `${fight.rounds} rounds`, fight.weightClass].map((label) => (
              <span
                key={label}
                className="rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
              >
                {label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-line bg-background/45 p-5">
          <p className="mono-label">pressure point</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">first layer</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            {fighterA.name.split(" ")[0]} control threat:{" "}
            <span className="data-text text-foreground">{fighterA.styleProfile.controlThreat}</span>.{" "}
            {fighterB.name.split(" ")[0]} takedown defense:{" "}
            <span className="data-text text-foreground">{fighterB.styleProfile.takedownDefense}</span>.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-surface/70 p-4">
              <p className="mono-label">a axis</p>
              <p className="data-text mt-2 text-3xl text-accent">{fighterA.styleProfile.wrestlingOffense}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface/70 p-4">
              <p className="mono-label">b denial</p>
              <p className="data-text mt-2 text-3xl">{fighterB.styleProfile.takedownDefense}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
