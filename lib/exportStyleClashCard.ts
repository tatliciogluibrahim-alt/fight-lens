import type { Fighter, StyleProfile } from "./types";

const W = 1920;
const H = 1080;

const C = {
  bg: "#090908",
  panel: "#11100e",
  panelSoft: "#151310",
  line: "#2b2821",
  lineStrong: "#403a31",
  fg: "#f5efe6",
  muted: "#aaa196",
  subtle: "#746b60",
  accent: "#c85b3f",
  track: "#1b1915"
};

const axes = ["striking", "wrestling", "grappling", "cardio", "defense", "output"];

const flagPalettes: Record<string, string[]> = {
  AE: ["#CE1126", "#00732F", "#FFFFFF", "#000000"],
  SE: ["#006AA7", "#FECC00", "#006AA7"],
  US: ["#B22234", "#FFFFFF", "#3C3B6E"],
  MM: ["#FECB00", "#34B233", "#EA2839"],
  JP: ["#FFFFFF", "#BC002D", "#FFFFFF"],
  RU: ["#FFFFFF", "#0039A6", "#D52B1E"],
  DO: ["#CE1126", "#FFFFFF", "#002D62"],
  FR: ["#0055A4", "#FFFFFF", "#EF4135"],
  CM: ["#007A5E", "#FCD116", "#CE1126"],
  ES: ["#AA151B", "#F1BF00", "#AA151B"],
  UA: ["#0057B7", "#FFD700", "#0057B7"],
  PL: ["#FFFFFF", "#DC143C", "#DC143C"],
  BR: ["#009B3A", "#FFDF00", "#002776"],
  PE: ["#D91023", "#FFFFFF", "#D91023"]
};

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

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color = C.line, width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: {
  font: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  letterSpacing?: number;
}) {
  ctx.save();
  ctx.font = options.font;
  ctx.fillStyle = options.color ?? C.fg;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "alphabetic";

  if (!options.letterSpacing) {
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }

  const chars = Array.from(text);
  const totalWidth = chars.reduce((sum, char, index) => {
    return sum + ctx.measureText(char).width + (index < chars.length - 1 ? options.letterSpacing ?? 0 : 0);
  }, 0);
  let cursor = x;

  if (ctx.textAlign === "center") cursor -= totalWidth / 2;
  if (ctx.textAlign === "right" || ctx.textAlign === "end") cursor -= totalWidth;

  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + options.letterSpacing;
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color = C.fg) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, text, maxWidth).slice(0, 3);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  ctx.restore();
  return lines.length * lineHeight;
}

function flagCodes(fighter: Fighter) {
  return fighter.countryCode
    .split("/")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function drawFlag(ctx: CanvasRenderingContext2D, code: string, x: number, y: number, w = 58, h = 38) {
  const colors = flagPalettes[code] ?? [C.accent, C.fg, C.lineStrong];
  ctx.save();
  roundRect(ctx, x, y, w, h, 5);
  ctx.clip();
  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + (w / colors.length) * index, y, w / colors.length + 1, h);
  });
  ctx.restore();
  strokeRoundRect(ctx, x, y, w, h, 5, rgba(C.fg, 0.45), 1.5);
  drawText(ctx, code, x + w / 2, y + h / 2 + 5, {
    font: "700 12px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.bg,
    align: "center",
    baseline: "middle",
    letterSpacing: 0.8
  });
}

function drawFlagGroup(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number) {
  let cursor = x;
  for (const code of flagCodes(fighter)) {
    drawFlag(ctx, code, cursor, y);
    cursor += 66;
  }
  const compactLabel = fighter.countryCode.replaceAll("/", " / ").toUpperCase();
  drawText(ctx, compactLabel, cursor + 8, y + 24, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 2.3
  });

  ctx.save();
  ctx.font = "400 18px ui-monospace, SFMono-Regular, Consolas, monospace";
  const labelWidth = ctx.measureText(compactLabel).width + compactLabel.length * 2.3;
  ctx.restore();
  return cursor + 8 + labelWidth;
}

function drawLogo(ctx: CanvasRenderingContext2D) {
  fillRoundRect(ctx, 80, 70, 76, 76, 14, C.panelSoft);
  strokeRoundRect(ctx, 80, 70, 76, 76, 14, C.lineStrong, 2);
  fillRoundRect(ctx, 108, 98, 22, 22, 4, C.accent);
  drawText(ctx, "fight lens", 178, 104, {
    font: "700 30px Arial, Helvetica, sans-serif",
    color: C.fg,
    baseline: "middle"
  });
  drawText(ctx, "SEE THE SHAPE", 178, 143, {
    font: "400 17px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.5
  });
}

function drawRadar(ctx: CanvasRenderingContext2D, fighterA: Fighter, fighterB: Fighter, cx: number, cy: number, radius: number) {
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const scaled = (value / 100) * radius;
    return [cx + Math.cos(angle) * scaled, cy + Math.sin(angle) * scaled] as const;
  };

  const polygon = (fighter: Fighter) => axes.map((axis, index) => point(index, axisScore(fighter.styleProfile, axis)));

  ctx.save();
  ctx.lineWidth = 2;
  for (const value of [20, 40, 60, 80, 100]) {
    const points = axes.map((_, index) => point(index, value));
    ctx.beginPath();
    points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = rgba(C.lineStrong, value === 100 ? 0.9 : 0.55);
    ctx.stroke();
  }

  axes.forEach((axis, index) => {
    const [x, y] = point(index, 115);
    drawText(ctx, axis.toUpperCase(), x, y + 6, {
      font: "400 24px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: C.subtle,
      align: "center",
      baseline: "middle",
      letterSpacing: 3
    });
  });

  const drawPoly = (points: readonly (readonly [number, number])[], fill: string, stroke: string) => {
    ctx.beginPath();
    points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 5;
    ctx.fill();
    ctx.stroke();
  };

  drawPoly(polygon(fighterB), rgba(C.muted, 0.13), C.muted);
  drawPoly(polygon(fighterA), rgba(C.accent, 0.25), C.accent);
  ctx.fillStyle = C.subtle;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCompareRow(ctx: CanvasRenderingContext2D, label: string, a: number, b: number, x: number, y: number, w: number) {
  const max = Math.max(a, b, 1);
  const numberW = 70;
  const labelW = 170;
  const gap = 24;
  const barW = (w - numberW * 2 - labelW - gap * 4) / 2;
  const barH = 12;

  drawText(ctx, String(a), x, y + 7, {
    font: "400 30px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: a >= b ? C.accent : C.muted,
    baseline: "middle"
  });

  const leftX = x + numberW + gap;
  fillRoundRect(ctx, leftX, y, barW, barH, 999, C.track);
  fillRoundRect(ctx, leftX + barW - (barW * a) / max, y, (barW * a) / max, barH, 999, C.accent);

  drawText(ctx, label.toUpperCase(), leftX + barW + gap + labelW / 2, y + 8, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    align: "center",
    baseline: "middle",
    letterSpacing: 2.5
  });

  const rightX = leftX + barW + gap + labelW + gap;
  fillRoundRect(ctx, rightX, y, barW, barH, 999, C.track);
  fillRoundRect(ctx, rightX, y, (barW * b) / max, barH, 999, C.muted);

  drawText(ctx, String(b), rightX + barW + gap + numberW, y + 7, {
    font: "400 30px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: b > a ? C.fg : C.muted,
    align: "right",
    baseline: "middle"
  });
}

function drawCard(ctx: CanvasRenderingContext2D, fighterA: Fighter, fighterB: Fighter) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 520);
  glow.addColorStop(0, rgba(C.accent, 0.22));
  glow.addColorStop(1, rgba(C.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const vertical = ctx.createLinearGradient(0, 0, 0, H);
  vertical.addColorStop(0, rgba("#ffffff", 0.035));
  vertical.addColorStop(1, rgba("#ffffff", 0));
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, W, H);

  drawLogo(ctx);
  fillRoundRect(ctx, 1500, 70, 340, 60, 999, rgba(C.panel, 0.72));
  strokeRoundRect(ctx, 1500, 70, 340, 60, 999, C.lineStrong, 2);
  drawText(ctx, "PROTOTYPE DATA / 16:9", 1670, 108, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.accent,
    align: "center",
    baseline: "middle",
    letterSpacing: 3
  });

  const left = { x: 80, y: 205, w: 780, h: 795 };
  const right = { x: 930, y: 205, w: 910, h: 795 };

  fillRoundRect(ctx, left.x, left.y, left.w, left.h, 28, rgba(C.panel, 0.72));
  strokeRoundRect(ctx, left.x, left.y, left.w, left.h, 28, C.line, 2);

  drawText(ctx, "STYLE OVERLAP RADAR", left.x + 48, left.y + 70, {
    font: "400 20px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.8
  });
  drawText(ctx, `${fighterA.name.toLowerCase()} vs. ${fighterB.name.toLowerCase()}`, left.x + 48, left.y + 118, {
    font: "500 40px Arial, Helvetica, sans-serif",
    color: C.fg,
    baseline: "middle"
  });

  drawRadar(ctx, fighterA, fighterB, left.x + left.w / 2, left.y + 455, 185);

  const legendY = left.y + left.h - 75;
  fillRoundRect(ctx, left.x + 240, legendY, 12, 12, 3, C.accent);
  drawText(ctx, fighterA.name, left.x + 265, legendY + 10, {
    font: "400 20px Arial, Helvetica, sans-serif",
    color: C.muted,
    baseline: "middle"
  });
  fillRoundRect(ctx, left.x + 455, legendY, 12, 12, 3, C.muted);
  drawText(ctx, fighterB.name, left.x + 480, legendY + 10, {
    font: "400 20px Arial, Helvetica, sans-serif",
    color: C.muted,
    baseline: "middle"
  });

  const countryEnd = drawFlagGroup(ctx, fighterA, right.x, right.y + 42);
  drawText(ctx, "VS", countryEnd + 28, right.y + 66, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 2
  });
  drawFlagGroup(ctx, fighterB, countryEnd + 78, right.y + 42);

  const headlineHeight = drawWrappedText(
    ctx,
    "inverted profiles. pressure axis vs volume denial.",
    right.x,
    right.y + 150,
    right.w - 30,
    88,
    "600 84px Arial, Helvetica, sans-serif",
    C.fg
  );

  const startY = right.y + 150 + headlineHeight + 82;
  axes.forEach((axis, index) => {
    const y = startY + index * 78;
    drawCompareRow(ctx, axis, axisScore(fighterA.styleProfile, axis), axisScore(fighterB.styleProfile, axis), right.x, y, right.w - 10);
  });
}

export async function exportStyleClashCardAsPNG(fighterA: Fighter, fighterB: Fighter, filename = "fight-lens-overlap") {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create export canvas.");
  }

  drawCard(ctx, fighterA, fighterB);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not render PNG."));
    }, "image/png", 1);
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
