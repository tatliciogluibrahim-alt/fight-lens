import type { Fighter } from "@/lib/types";
import { PrototypeBadge } from "./PrototypeBadge";

interface ResumeHeatCardProps {
  fighterA: Fighter;
  fighterB: Fighter;
}

function HeatCard({ fighter, accent = false }: { fighter: Fighter; accent?: boolean }) {
  const filled = Math.round(fighter.resumeHeat.score / 8.33);

  return (
    <div className="rounded-2xl border border-line bg-background/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{fighter.name}</h3>
          <p className="mt-1 text-sm text-muted">{fighter.resumeHeat.label}</p>
        </div>
        <p className={`data-text text-3xl ${accent ? "text-accent" : "text-foreground"}`}>
          {fighter.resumeHeat.score}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-1">
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className={`h-6 rounded-md ${
              index < filled ? (accent ? "bg-accent" : "bg-muted") : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-muted">{fighter.resumeHeat.explanation}</p>
      <div className="mt-4 space-y-2">
        {fighter.resumeHeat.factors.map((factor) => (
          <p key={factor} className="data-text text-xs text-subtle">
            / {factor}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ResumeHeatCard({ fighterA, fighterB }: ResumeHeatCardProps) {
  return (
    <section id="resume-heat" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">04 / resume heat</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            opponent quality.
          </h2>
        </div>
        <PrototypeBadge />
      </div>
      <div className="module-body grid gap-4 lg:grid-cols-2">
        <HeatCard fighter={fighterA} accent />
        <HeatCard fighter={fighterB} />
      </div>
    </section>
  );
}
