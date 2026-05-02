import type { FightPath, Fighter } from "@/lib/types";
import { PrototypeBadge } from "./PrototypeBadge";

interface PathsToVictoryProps {
  fighterA: Fighter;
  fighterB: Fighter;
  pathsA: FightPath[];
  pathsB: FightPath[];
}

function PathList({ fighter, paths, accent = false }: { fighter: Fighter; paths: FightPath[]; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <h3 className="font-semibold tracking-tight">{fighter.name}</h3>
      <div className="mt-5 space-y-5">
        {paths.map((path, index) => (
          <div key={path.label}>
            <div className="mb-2 grid grid-cols-[auto_1fr_auto] gap-3">
              <span className="data-text text-xs text-subtle">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-sm text-muted">{path.label}</p>
              <span className={`data-text text-sm ${accent ? "text-accent" : "text-foreground"}`}>
                {path.weight}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-2">
              <div
                className={`h-2.5 rounded-full ${accent ? "bg-accent" : "bg-muted"}`}
                style={{ width: `${path.weight}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PathsToVictory({ fighterA, fighterB, pathsA, pathsB }: PathsToVictoryProps) {
  return (
    <section id="paths-to-victory" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">06 / paths to victory</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            tactical routes.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Tactical routes, not predictions. The weights are placeholder scouting scores for how
            clearly each route shows up in the matchup shape.
          </p>
        </div>
        <PrototypeBadge />
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <PathList fighter={fighterA} paths={pathsA} accent />
        <PathList fighter={fighterB} paths={pathsB} />
      </div>
    </section>
  );
}
