import type { Fighter, StyleProfile } from "@/lib/types";
import { CountryFlag } from "./CountryFlag";
import { SaveSectionButton } from "./SaveSectionButton";

const rows: Array<{ key: keyof StyleProfile; label: string }> = [
  { key: "strikingVolume", label: "striking volume" },
  { key: "strikingDefense", label: "striking defense" },
  { key: "wrestlingOffense", label: "wrestling offense" },
  { key: "takedownDefense", label: "takedown defense" },
  { key: "controlThreat", label: "control threat" },
  { key: "submissionThreat", label: "submission threat" },
  { key: "cardioConsistency", label: "cardio" },
  { key: "opponentQuality", label: "opponent quality" }
];

interface StyleComparisonBarsProps {
  fighterA: Fighter;
  fighterB: Fighter;
  styleClashLabel?: string;
}

function axisScore(profile: StyleProfile, axis: string) {
  switch (axis) {
    case "striking":
      return Math.round((profile.strikingVolume + profile.strikingDefense) / 2);
    case "wrestling":
      return profile.wrestlingOffense;
    case "grappling":
      return Math.round((profile.controlThreat + profile.submissionThreat) / 2);
    case "cardio":
      return profile.cardioConsistency;
    case "defense":
      return Math.round((profile.strikingDefense + profile.takedownDefense) / 2);
    default:
      return profile.strikingVolume;
  }
}

function RadarSketch({ fighterA, fighterB }: StyleComparisonBarsProps) {
  const axes = ["striking", "wrestling", "grappling", "cardio", "defense", "output"];
  const size = 280;
  const center = size / 2;
  const radius = 96;

  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const scaled = (value / 100) * radius;
    return [center + Math.cos(angle) * scaled, center + Math.sin(angle) * scaled];
  };

  const polygon = (fighter: Fighter) =>
    axes.map((axis, index) => point(index, axisScore(fighter.styleProfile, axis)).join(",")).join(" ");

  const ring = (scale: number) =>
    axes.map((_, index) => point(index, scale).join(",")).join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto size-full max-h-72 max-w-72"
      role="img"
    >
      <title>style overlap radar</title>
      <desc>Six-axis radar comparing the two fighters&apos; style profiles.</desc>
      {[20, 40, 60, 80, 100].map((value) => (
        <polygon key={value} points={ring(value)} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {axes.map((axis, index) => {
        const [x, y] = point(index, 112);
        return (
          <text
            key={axis}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-subtle font-mono text-[10px] uppercase tracking-[0.14em]"
          >
            {axis}
          </text>
        );
      })}
      <polygon points={polygon(fighterA)} fill="var(--accent)" fillOpacity="0.22" stroke="var(--accent)" strokeWidth="2" />
      <polygon points={polygon(fighterB)} fill="var(--muted)" fillOpacity="0.12" stroke="var(--muted)" strokeWidth="2" />
      <circle cx={center} cy={center} r="3" fill="var(--subtle)" />
    </svg>
  );
}

function CreatorOverlapCard({ fighterA, fighterB }: StyleComparisonBarsProps) {
  const sixAxes = ["striking", "wrestling", "grappling", "cardio", "defense", "output"];

  return (
    <div className="border border-line bg-background p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="mono-label">creator card / overlap</p>
        <p className="data-text text-xs text-subtle">16:9 ready</p>
      </div>
      <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="rounded-2xl border border-line bg-surface/55 p-4">
          <RadarSketch fighterA={fighterA} fighterB={fighterB} />
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-2"><span className="size-2 rounded-sm bg-accent" />{fighterA.name}</span>
            <span className="inline-flex items-center gap-2"><span className="size-2 rounded-sm bg-muted" />{fighterB.name}</span>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <CountryFlag code={fighterA.countryCode} colors={fighterA.countryColors} label={fighterA.countryLabel} size="md" />
            <span className="data-text text-xs text-subtle">vs</span>
            <CountryFlag code={fighterB.countryCode} colors={fighterB.countryColors} label={fighterB.countryLabel} size="md" />
          </div>
          <h3 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] md:text-4xl">
            inverted profiles. pressure axis vs volume denial.
          </h3>
          <div className="mt-6 space-y-3">
            {sixAxes.map((axis) => {
              const a = axisScore(fighterA.styleProfile, axis);
              const b = axisScore(fighterB.styleProfile, axis);
              const max = Math.max(a, b, 1);
              return (
                <div key={axis} className="grid grid-cols-[42px_1fr_84px_1fr_42px] items-center gap-3">
                  <span className={`data-text text-xs ${a >= b ? "text-accent" : "text-muted"}`}>{a}</span>
                  <div className="flex justify-end bg-surface-2">
                    <div className="h-1.5 bg-accent" style={{ width: `${(a / max) * 100}%` }} />
                  </div>
                  <span className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{axis}</span>
                  <div className="bg-surface-2">
                    <div className="h-1.5 bg-muted" style={{ width: `${(b / max) * 100}%` }} />
                  </div>
                  <span className={`data-text text-right text-xs ${b > a ? "text-foreground" : "text-muted"}`}>{b}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StyleComparisonBars({ fighterA, fighterB, styleClashLabel }: StyleComparisonBarsProps) {
  const hasFighterData = Boolean(fighterA.name && fighterB.name);

  return (
    <section id="section-overlap" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">02 / style clash</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">the overlap.</h2>
        </div>
        <SaveSectionButton elementId="section-overlap" filename="fight-lens-overlap" />
      </div>

      <div className="module-body space-y-6">
        <CreatorOverlapCard fighterA={fighterA} fighterB={fighterB} />

        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          {!hasFighterData ? (
            <p className="text-sm leading-6 text-muted">
              0-100 placeholder scouting bars compare pressure, defense, control, finishing threat,
              and opponent quality. The intent is fast read first, detail second.
            </p>
          ) : null}
          <div className={hasFighterData ? "space-y-6" : "mt-6 space-y-6"}>
            <div>
              <p className="mono-label">fighter a</p>
              <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] md:text-4xl text-accent">
                {fighterA.name}
              </h3>
              <p className="data-text mt-2 text-sm text-muted">
                {fighterA.record} / {fighterA.stance}
              </p>
            </div>
            <div>
              <p className="mono-label">fighter b</p>
              <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] md:text-4xl text-foreground">
                {fighterB.name}
              </h3>
              <p className="data-text mt-2 text-sm text-muted">
                {fighterB.record} / {fighterB.stance}
              </p>
            </div>
            {styleClashLabel ? (
              <span className="inline-flex rounded-full border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                {styleClashLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="divide-y divide-line rounded-2xl border border-line bg-background/35">
          {rows.map((row) => {
            const a = fighterA.styleProfile[row.key];
            const b = fighterB.styleProfile[row.key];
            const max = Math.max(a, b, 1);

            return (
              <div key={row.key} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className={`data-text text-sm ${a >= b ? "text-accent" : "text-muted"}`}>
                    {a}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{row.label}</span>
                  <span className={`data-text text-sm ${b > a ? "text-foreground" : "text-muted"}`}>
                    {b}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex justify-end rounded-l-full bg-background">
                    <div className="h-2.5 rounded-l-full bg-accent" style={{ width: `${(a / max) * 100}%` }} />
                  </div>
                  <div className="rounded-r-full bg-background">
                    <div className="h-2.5 rounded-r-full bg-muted" style={{ width: `${(b / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}
