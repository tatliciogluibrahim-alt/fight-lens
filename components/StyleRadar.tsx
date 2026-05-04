import { getStyleRadarDimensions, hasEnoughStyleRadarData } from "@/lib/style-radar";
import type { NullableStyleProfile } from "@/lib/fight-shape";

interface StyleRadarProps {
  profile: NullableStyleProfile;
  tone?: "accent" | "muted";
  title: string;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 104;
const LABEL_RADIUS = 136;
const RINGS = [25, 50, 75, 100];

function point(index: number, value: number, count: number, radius = RADIUS) {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const scaled = (value / 100) * radius;
  return {
    x: CENTER + Math.cos(angle) * scaled,
    y: CENTER + Math.sin(angle) * scaled
  };
}

function pointsToString(points: Array<{ x: number; y: number }>) {
  return points.map((item) => `${item.x},${item.y}`).join(" ");
}

export function StyleRadar({ profile, tone = "accent", title }: StyleRadarProps) {
  const dimensions = getStyleRadarDimensions(profile);
  const canFill = hasEnoughStyleRadarData(profile) && dimensions.every((dimension) => dimension.hasData);
  const stroke = tone === "accent" ? "var(--accent)" : "var(--muted)";
  const fill = tone === "accent" ? "rgba(200,91,63,0.18)" : "rgba(170,161,150,0.12)";
  const count = dimensions.length;

  const availablePoints = dimensions
    .map((dimension, index) => (
      !dimension.hasData || dimension.value == null
        ? null
        : {
            ...point(index, dimension.value, count),
            label: dimension.shortLabel,
            value: dimension.value
          }
    ))
    .filter(Boolean) as Array<{ x: number; y: number; label: string; value: number }>;

  const polygonPoints = dimensions.map((dimension, index) => point(index, dimension.hasData ? dimension.value ?? 0 : 0, count));

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-full w-full overflow-visible"
      role="img"
      aria-label={`${title} style radar`}
    >
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 18} fill={tone === "accent" ? "rgba(200,91,63,0.05)" : "rgba(245,239,230,0.045)"} />
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 28} fill="none" stroke="var(--line)" strokeOpacity={0.52} strokeDasharray="2 7" />

      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={pointsToString(dimensions.map((_, index) => point(index, ring, count)))}
          fill="none"
          stroke="var(--line-strong)"
          strokeOpacity={ring === 100 ? 0.9 : 0.46}
          strokeWidth={ring === 100 ? 1.2 : 0.8}
        />
      ))}

      {dimensions.map((dimension, index) => {
        const end = point(index, 100, count);
        const labelPoint = point(index, 100, count, LABEL_RADIUS);
        const hasValue = dimension.hasData;

        return (
          <g key={dimension.key}>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={end.x}
              y2={end.y}
              stroke="var(--line-strong)"
              strokeOpacity={0.5}
              strokeWidth={0.8}
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-subtle font-mono text-[9px] uppercase tracking-[0.16em]"
              opacity={hasValue ? 1 : 0.45}
            >
              {dimension.shortLabel}
            </text>
            <circle
              cx={end.x}
              cy={end.y}
              r={hasValue ? 2.2 : 1.6}
              fill={hasValue ? stroke : "var(--line-strong)"}
              opacity={hasValue ? 0.75 : 0.45}
            />
          </g>
        );
      })}

      {canFill ? (
        <polygon
          points={pointsToString(polygonPoints)}
          fill={fill}
          stroke={stroke}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      ) : null}

      {availablePoints.map((item) => (
        <circle
          key={`${item.label}-${item.value}`}
          cx={item.x}
          cy={item.y}
          r={3.8}
          fill="var(--background)"
          stroke={stroke}
          strokeWidth={2}
        />
      ))}

      <circle cx={CENTER} cy={CENTER} r={3.5} fill="var(--subtle)" opacity={0.78} />
    </svg>
  );
}
