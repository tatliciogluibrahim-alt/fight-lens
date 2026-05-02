import type { Fight } from "@/lib/types";

interface KeyStatEdgesProps {
  fight: Fight;
}

export function KeyStatEdges({ fight }: KeyStatEdgesProps) {
  return (
    <section id="key-edges" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">05 / key edges</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            head-to-head deltas.
          </h2>
        </div>
      </div>

      <div className="module-body divide-y divide-line rounded-2xl border border-line bg-background/35">
        {fight.keyStatEdges.map((edge) => {
          const max = Math.max(edge.fighterA, edge.fighterB, 1);

          return (
            <div key={edge.label} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="data-text text-sm text-accent">
                    {edge.fighterA}
                    {edge.unit}
                  </span>
                </div>
                <div className="flex justify-end rounded-full bg-background">
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(edge.fighterA / max) * 100}%` }} />
                </div>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle md:w-44 md:text-center">
                {edge.label}
              </p>
              <div>
                <div className="mb-2 flex justify-end">
                  <span className="data-text text-sm text-muted">
                    {edge.fighterB}
                    {edge.unit}
                  </span>
                </div>
                <div className="rounded-full bg-background">
                  <div className="h-2.5 rounded-full bg-muted" style={{ width: `${(edge.fighterB / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
