import { getStyleRadarDimensions } from "./style-radar";
import type { StyleRadarExportFighter } from "./style-radar";

const W = 1920;
const H = 1080;
const C = {
  bg: "#090908",
  panel: "#11100e",
  panelSoft: "#171512",
  line: "#2b2821",
  lineStrong: "#403a31",
  fg: "#f5efe6",
  muted: "#aaa196",
  subtle: "#746b60",
  accent: "#c85b3f",
  track: "#1b1915"
};

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

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color = C.line, width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
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
  const totalWidth = chars.reduce((sum, char, index) => (
    sum + ctx.measureText(char).width + (index < chars.length - 1 ? options.letterSpacing ?? 0 : 0)
  ), 0);
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

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color = C.fg, maxLines = 3) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  wrapText(ctx, text, maxWidth).slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D) {
  fillRoundRect(ctx, 80, 70, 76, 76, 18, C.panelSoft);
  strokeRoundRect(ctx, 80, 70, 76, 76, 18, C.lineStrong, 2);
  ctx.save();
  ctx.translate(118, 108);
  ctx.rotate(Math.PI / 4);
  strokeRoundRect(ctx, -16, -16, 32, 32, 5, C.accent, 4);
  fillRoundRect(ctx, -6, -6, 12, 12, 3, C.accent);
  ctx.restore();
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

function radarPoint(index: number, value: number, count: number, cx: number, cy: number, radius: number) {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const scaled = (value / 100) * radius;
  return [cx + Math.cos(angle) * scaled, cy + Math.sin(angle) * scaled] as const;
}

function drawRadar(ctx: CanvasRenderingContext2D, fighter: StyleRadarExportFighter, cx: number, cy: number, radius: number) {
  const dimensions = getStyleRadarDimensions(fighter.styleProfile);
  const count = dimensions.length;
  const available = dimensions.filter((dimension) => dimension.value != null);

  ctx.save();
  ctx.lineWidth = 2;

  for (const value of [25, 50, 75, 100]) {
    const points = dimensions.map((_, index) => radarPoint(index, value, count, cx, cy, radius));
    ctx.beginPath();
    points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = rgba(C.lineStrong, value === 100 ? 0.92 : 0.5);
    ctx.stroke();
  }

  dimensions.forEach((dimension, index) => {
    const [lineX, lineY] = radarPoint(index, 100, count, cx, cy, radius);
    ctx.strokeStyle = rgba(C.lineStrong, 0.52);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lineX, lineY);
    ctx.stroke();

    const [labelX, labelY] = radarPoint(index, 119, count, cx, cy, radius);
    drawText(ctx, dimension.shortLabel.toUpperCase(), labelX, labelY + 6, {
      font: "400 21px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: dimension.value == null ? rgba(C.subtle, 0.55) : C.subtle,
      align: "center",
      baseline: "middle",
      letterSpacing: 2.6
    });
  });

  if (available.length >= 3 && available.length === dimensions.length) {
    const points = dimensions.map((dimension, index) => radarPoint(index, dimension.value ?? 0, count, cx, cy, radius));
    ctx.beginPath();
    points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = rgba(C.accent, 0.22);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 5;
    ctx.fill();
    ctx.stroke();
  }

  dimensions.forEach((dimension, index) => {
    if (dimension.value == null) return;
    const [x, y] = radarPoint(index, dimension.value, count, cx, cy, radius);
    ctx.fillStyle = C.bg;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = C.subtle;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMetricRows(ctx: CanvasRenderingContext2D, fighter: StyleRadarExportFighter, x: number, y: number, w: number) {
  const dimensions = getStyleRadarDimensions(fighter.styleProfile);

  dimensions.forEach((dimension, index) => {
    const rowY = y + index * 54;
    const value = dimension.value;
    drawText(ctx, dimension.label.toUpperCase(), x, rowY + 9, {
      font: "400 16px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: C.subtle,
      baseline: "middle",
      letterSpacing: 2
    });
    drawText(ctx, value == null ? "N/A" : String(value), x + w, rowY + 9, {
      font: "400 24px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: value == null ? C.subtle : C.fg,
      align: "right",
      baseline: "middle"
    });
    fillRoundRect(ctx, x, rowY + 26, w, 9, 999, C.track);
    if (value != null) {
      fillRoundRect(ctx, x, rowY + 26, (w * value) / 100, 9, 999, C.accent);
    }
  });
}

function drawCard(ctx: CanvasRenderingContext2D, fighter: StyleRadarExportFighter) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 560);
  glow.addColorStop(0, rgba(C.accent, 0.2));
  glow.addColorStop(1, rgba(C.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  for (let x = 0; x < W; x += 96) {
    ctx.strokeStyle = rgba(C.lineStrong, 0.16);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 96) {
    ctx.strokeStyle = rgba(C.lineStrong, 0.16);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  drawLogo(ctx);
  fillRoundRect(ctx, 1510, 70, 330, 60, 999, rgba(C.panel, 0.72));
  strokeRoundRect(ctx, 1510, 70, 330, 60, 999, C.lineStrong, 2);
  drawText(ctx, "FIGHT LENS / 16:9", 1675, 108, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.accent,
    align: "center",
    baseline: "middle",
    letterSpacing: 3
  });

  const left = { x: 80, y: 205, w: 780, h: 795 };
  const right = { x: 930, y: 205, w: 910, h: 795 };
  fillRoundRect(ctx, left.x, left.y, left.w, left.h, 28, rgba(C.panel, 0.74));
  strokeRoundRect(ctx, left.x, left.y, left.w, left.h, 28, C.line, 2);
  fillRoundRect(ctx, right.x, right.y, right.w, right.h, 28, rgba(C.panel, 0.54));
  strokeRoundRect(ctx, right.x, right.y, right.w, right.h, 28, C.line, 2);

  drawText(ctx, "STYLE RADAR", left.x + 48, left.y + 70, {
    font: "400 20px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.8
  });
  drawRadar(ctx, fighter, left.x + left.w / 2, left.y + 455, 228);

  drawText(ctx, "STYLE FINGERPRINT", right.x + 48, right.y + 70, {
    font: "400 20px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.8
  });
  drawText(ctx, fighter.name, right.x + 48, right.y + 156, {
    font: "700 84px Arial, Helvetica, sans-serif",
    color: C.fg,
    baseline: "middle"
  });
  drawText(ctx, `${fighter.ranking ?? "NR"} / ${fighter.stance ?? "STANCE PENDING"} / ${fighter.confidence.toUpperCase()} CONFIDENCE`, right.x + 52, right.y + 228, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.accent,
    baseline: "middle",
    letterSpacing: 2.8
  });
  drawWrappedText(ctx, fighter.styleRead, right.x + 52, right.y + 286, right.w - 104, 52, "400 38px Arial, Helvetica, sans-serif", C.muted, 2);
  drawMetricRows(ctx, fighter, right.x + 52, right.y + 444, right.w - 104);
}

export async function exportStyleRadarCardAsPNG(fighter: StyleRadarExportFighter, filename = "fight-lens-style-radar") {
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

  drawCard(ctx, fighter);

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
