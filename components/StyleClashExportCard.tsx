import type { CSSProperties } from "react";
import { fightShapeExportAxes, getFightShapeAxisScore } from "@/lib/fight-shape";
import type { StyleExportFighter } from "@/lib/fight-shape";

const exportColors = {
  background: "#090908",
  panelAlt: "#171512",
  line: "#2b2821",
  lineStrong: "#403a31",
  foreground: "#f5efe6",
  muted: "#aaa196",
  subtle: "#746b60",
  accent: "#c85b3f"
};

interface StyleClashExportCardProps {
  fighterA: StyleExportFighter;
  fighterB: StyleExportFighter;
  id?: string;
  mode?: "preview" | "source";
}

function RadarExport({ fighterA, fighterB, source }: { fighterA: StyleExportFighter; fighterB: StyleExportFighter; source: boolean }) {
  const size = 360;
  const center = size / 2;
  const radius = 124;

  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index / fightShapeExportAxes.length) * Math.PI * 2;
    const scaled = (value / 100) * radius;
    return [center + Math.cos(angle) * scaled, center + Math.sin(angle) * scaled];
  };

  const polygon = (fighter: StyleExportFighter) =>
    fightShapeExportAxes
      .map((axis, index) => point(index, getFightShapeAxisScore(fighter.styleProfile, axis.key)).join(","))
      .join(" ");

  const ring = (scale: number) => fightShapeExportAxes.map((_, index) => point(index, scale).join(",")).join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Six-axis style overlap radar"
    >
      {[20, 40, 60, 80, 100].map((value) => (
        <polygon key={value} points={ring(value)} fill="none" stroke={exportColors.lineStrong} strokeWidth="1.2" />
      ))}
      {fightShapeExportAxes.map((axis, index) => {
        const [x, y] = point(index, 114);
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={exportColors.subtle}
            fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
            fontSize={source ? 15 : 11}
            letterSpacing="2"
          >
            {axis.label.toUpperCase()}
          </text>
        );
      })}
      <polygon points={polygon(fighterB)} fill={exportColors.muted} fillOpacity="0.12" stroke={exportColors.muted} strokeWidth="3" />
      <polygon points={polygon(fighterA)} fill={exportColors.accent} fillOpacity="0.24" stroke={exportColors.accent} strokeWidth="3" />
      <circle cx={center} cy={center} r="4" fill={exportColors.subtle} />
    </svg>
  );
}

function Legend({ fighterA, fighterB, source }: { fighterA: StyleExportFighter; fighterB: StyleExportFighter; source: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: source ? 24 : 12, alignItems: "center" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: source ? 12 : 8, color: exportColors.foreground, fontSize: source ? 22 : 12 }}>
        <span style={{ width: source ? 14 : 9, height: source ? 14 : 9, borderRadius: 4, background: exportColors.accent }} />
        {fighterA.name}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: source ? 12 : 8, color: exportColors.muted, fontSize: source ? 22 : 12 }}>
        <span style={{ width: source ? 14 : 9, height: source ? 14 : 9, borderRadius: 4, background: exportColors.muted }} />
        {fighterB.name}
      </span>
    </div>
  );
}

function CompareLine({ label, a, b, source }: { label: string; a: number; b: number; source: boolean }) {
  const max = Math.max(a, b, 1);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: source ? "70px 1fr 180px 1fr 70px" : "38px 1fr 86px 1fr 38px",
        alignItems: "center",
        gap: source ? 24 : 10,
        minHeight: source ? 58 : 30
      }}
    >
      <span
        style={{
          color: a >= b ? exportColors.accent : exportColors.muted,
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: source ? 30 : 13,
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {a}
      </span>
      <div style={{ display: "flex", justifyContent: "flex-end", height: source ? 12 : 6, background: "#12110f" }}>
        <span style={{ width: `${(a / max) * 100}%`, background: exportColors.accent }} />
      </div>
      <span
        style={{
          color: exportColors.subtle,
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: source ? 18 : 9,
          letterSpacing: "0.16em",
          textAlign: "center",
          textTransform: "uppercase"
        }}
      >
        {label}
      </span>
      <div style={{ height: source ? 12 : 6, background: "#12110f" }}>
        <span
          style={{
            display: "block",
            width: `${(b / max) * 100}%`,
            height: "100%",
            background: exportColors.muted
          }}
        />
      </div>
      <span
        style={{
          color: b > a ? exportColors.foreground : exportColors.muted,
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: source ? 30 : 13,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right"
        }}
      >
        {b}
      </span>
    </div>
  );
}

export function StyleClashExportCard({ fighterA, fighterB, id, mode = "preview" }: StyleClashExportCardProps) {
  const source = mode === "source";
  const title = `${fighterA.name.toLowerCase()} vs. ${fighterB.name.toLowerCase()}`;

  const cardStyle: CSSProperties = {
    width: source ? 1920 : "100%",
    height: source ? 1080 : undefined,
    aspectRatio: source ? undefined : "16 / 9",
    overflow: "hidden",
    border: `1px solid ${exportColors.lineStrong}`,
    borderRadius: source ? 0 : 18,
    background:
      "radial-gradient(circle at 0% 0%, rgba(200,91,63,0.16), transparent 360px), linear-gradient(180deg, #11100e 0%, #090908 100%)",
    color: exportColors.foreground,
    fontFamily: "Inter, Geist, Arial, Helvetica, sans-serif",
    position: "relative",
    padding: source ? "68px 80px" : "clamp(18px, 4vw, 34px)",
    boxSizing: "border-box"
  };

  return (
    <article id={id} style={cardStyle} aria-label={`${title} style clash creator card`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: source ? 22 : 10 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: source ? 70 : 34,
              height: source ? 70 : 34,
              borderRadius: 10,
              border: `1px solid ${exportColors.lineStrong}`,
              background: exportColors.panelAlt
            }}
          >
            <span style={{ width: source ? 22 : 10, height: source ? 22 : 10, borderRadius: 3, background: exportColors.accent }} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: source ? 32 : 15, fontWeight: 700, letterSpacing: "-0.03em" }}>fight lens</p>
            <p
              style={{
                margin: 0,
                marginTop: 4,
                color: exportColors.subtle,
                fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                fontSize: source ? 18 : 8,
                letterSpacing: "0.18em",
                textTransform: "uppercase"
              }}
            >
              see the shape
            </p>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${exportColors.lineStrong}`,
            borderRadius: 999,
            color: exportColors.accent,
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
            fontSize: source ? 18 : 9,
            letterSpacing: "0.16em",
            padding: source ? "16px 24px" : "7px 11px",
            textTransform: "uppercase"
          }}
        >
          fight lens / 16:9
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.92fr 1.08fr",
          gap: source ? 68 : "clamp(18px, 4vw, 34px)",
          height: source ? 820 : "calc(100% - 140px)",
          marginTop: source ? 54 : "clamp(18px, 4vw, 30px)"
        }}
      >
        <section
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            minWidth: 0,
            border: `1px solid ${exportColors.line}`,
            borderRadius: source ? 32 : 14,
            background: "rgba(9,9,8,0.68)",
            padding: source ? 44 : "clamp(14px, 3vw, 24px)"
          }}
        >
          <p
            style={{
              margin: 0,
              color: exportColors.subtle,
              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              fontSize: source ? 20 : 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase"
            }}
          >
            overlap radar
          </p>

          <div style={{ alignSelf: "center", justifySelf: "center", width: source ? 610 : "min(78%, 360px)", aspectRatio: "1 / 1" }}>
            <RadarExport fighterA={fighterA} fighterB={fighterB} source={source} />
          </div>
        </section>

        <section style={{ display: "flex", minWidth: 0, flexDirection: "column", justifyContent: "center" }}>
          <p
            style={{
              margin: 0,
              color: exportColors.subtle,
              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              fontSize: source ? 20 : 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase"
            }}
          >
            {title}
          </p>
          <div style={{ marginTop: source ? 18 : 8 }}>
            <Legend fighterA={fighterA} fighterB={fighterB} source={source} />
          </div>

          <h1
            style={{
              maxWidth: source ? 930 : "100%",
              margin: source ? "46px 0 0" : "clamp(14px, 3vw, 24px) 0 0",
              fontSize: source ? 86 : "clamp(24px, 5vw, 46px)",
              lineHeight: 0.98,
              letterSpacing: "-0.055em"
            }}
          >
            inverted profiles. pressure axis vs volume denial.
          </h1>

          <div style={{ display: "grid", gap: source ? 18 : 8, marginTop: source ? 58 : "clamp(16px, 3vw, 28px)" }}>
            {fightShapeExportAxes.map((axis) => (
              <CompareLine
                key={axis.key}
                label={axis.label}
                a={getFightShapeAxisScore(fighterA.styleProfile, axis.key)}
                b={getFightShapeAxisScore(fighterB.styleProfile, axis.key)}
                source={source}
              />
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
