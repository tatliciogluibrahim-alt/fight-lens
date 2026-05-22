import { getStyleRadarDimensions, hasEnoughStyleRadarData } from "@/lib/style-radar";
import type { NullableStyleProfile } from "@/lib/fight-shape";

interface StyleRadarProps {
  profile: NullableStyleProfile | null | undefined;
  tone?: "accent" | "muted";
  title: string;
}

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 110;
const LABEL_RADIUS = 148;
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
  const fill = tone === "accent" ? "rgba(245,158,11,0.14)" : "rgba(139,154,180,0.14)";
  const count = dimensions.length;

  const availablePoints = dimensions
    .map((dimension, index) => (
      !dimension.hasData || dimension.value == null
        ? null
        : {
            ...point(index, dimension.value, count),
            label: dimension.shortLabel,
            longLabel: dimension.label,
            value: dimension.value,
            key: dimension.key
          }
    ))
    .filter(Boolean) as Array<{ x: number; y: number; label: string; longLabel: string; value: number; key: string }>;

  const polygonPoints = dimensions.map((dimension, index) => point(index, dimension.hasData ? dimension.value ?? 0 : 0, count));

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-full w-full overflow-visible"
      role="img"
      aria-label={`${title} style radar`}
    >
      {/* Background halo + outer guide dash */}
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 20} fill={tone === "accent" ? "rgba(245,158,11,0.04)" : "rgba(139,154,180,0.04)"} />
      <circle cx={CENTER} cy={CENTER} r={RADIUS + 28} fill="none" stroke="var(--line)" strokeOpacity={0.52} strokeDasharray="2 7" />

      {/* Concentric guides */}
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

      {/* Axes + outer labels */}
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
              className="fill-subtle font-mono text-[10px] uppercase tracking-[0.12em]"
              opacity={hasValue ? 1 : 0.5}
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

      {/* Filled shape — animated bloom on mount via CSS keyframe */}
      {canFill ? (
        <polygon
          points={pointsToString(polygonPoints)}
          fill={fill}
          stroke={stroke}
          strokeWidth={2.4}
          strokeLinejoin="round"
          className="fl-radar-bloom"
        />
      ) : null}

      {/* Data dots: native SVG <title> gives a tooltip on hover, zero JS */}
      {availablePoints.map((item) => (
        <g key={`${item.label}-${item.value}`} className="fl-radar-bloom fl-radar-bloom-delay">
          <circle
            cx={item.x}
            cy={item.y}
            r={3.8}
            fill="var(--background)"
            stroke={stroke}
            strokeWidth={2}
            className="fl-radar-dot"
          >
            <title>{`${item.longLabel}: ${item.value}`}</title>
          </circle>
        </g>
      ))}

      {/* Centroid mark — soft pulse hints at an active read */}
      <circle cx={CENTER} cy={CENTER} r={3.5} fill="var(--subtle)" className="fl-radar-centroid" />
    </svg>
  );
}
