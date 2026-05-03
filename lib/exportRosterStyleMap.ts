import { fightShapeExportAxes, getFightShapeAxisScore } from "./fight-shape";
import type { StyleExportFighter } from "./fight-shape";

const W = 1920;
const H = 2160;

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

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color = C.fg, align: CanvasTextAlign = "left") {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
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

function drawLogo(ctx: CanvasRenderingContext2D) {
  fillRoundRect(ctx, 80, 70, 76, 76, 14, C.panelSoft);
  strokeRoundRect(ctx, 80, 70, 76, 76, 14, C.lineStrong, 2);
  fillRoundRect(ctx, 108, 98, 22, 22, 4, C.accent);
  drawText(ctx, "fight lens", 178, 104, "700 30px Arial, Helvetica, sans-serif");
  drawText(ctx, "CARD STYLE MAP", 178, 143, "400 17px ui-monospace, SFMono-Regular, Consolas, monospace", C.subtle);
}

function drawAxisBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, score: number, color: string) {
  fillRoundRect(ctx, x, y, w, 10, 999, C.track);
  fillRoundRect(ctx, x, y, (w * score) / 100, 10, 999, color);
}

function drawCard(ctx: CanvasRenderingContext2D, eventName: string, fighters: StyleExportFighter[]) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 620);
  glow.addColorStop(0, rgba(C.accent, 0.18));
  glow.addColorStop(1, rgba(C.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawLogo(ctx);
  fillRoundRect(ctx, 1500, 70, 340, 60, 999, rgba(C.panel, 0.72));
  strokeRoundRect(ctx, 1500, 70, 340, 60, 999, C.lineStrong, 2);
  drawText(ctx, "PROTOTYPE DATA / ROSTER", 1670, 108, "400 18px ui-monospace, SFMono-Regular, Consolas, monospace", C.accent, "center");

  drawText(ctx, eventName.toLowerCase(), 80, 245, "600 78px Arial, Helvetica, sans-serif");
  drawText(ctx, "every fighter fingerprinted across six style axes", 84, 315, "400 24px Arial, Helvetica, sans-serif", C.muted);

  const startY = 410;
  const rowH = 58;
  const nameX = 90;
  const recordX = 465;
  const axisStart = 660;
  const axisW = 165;
  const gap = 28;

  fightShapeExportAxes.forEach((axis, index) => {
    drawText(ctx, axis.label.toUpperCase(), axisStart + index * (axisW + gap), startY - 52, "400 17px ui-monospace, SFMono-Regular, Consolas, monospace", C.subtle, "center");
  });

  fighters.forEach((fighter, index) => {
    const y = startY + index * rowH;
    if (index % 2 === 0) {
      fillRoundRect(ctx, 70, y - 22, W - 140, 46, 10, rgba(C.panel, 0.42));
    }

    drawText(ctx, fighter.name, nameX, y, "600 25px Arial, Helvetica, sans-serif", C.fg);
    drawText(ctx, `${fighter.record} / ${fighter.ranking || "nr"}`, recordX, y, "400 18px ui-monospace, SFMono-Regular, Consolas, monospace", C.subtle);

    fightShapeExportAxes.forEach((axis, axisIndex) => {
      const score = getFightShapeAxisScore(fighter.styleProfile, axis.key);
      const x = axisStart + axisIndex * (axisW + gap) - axisW / 2;
      drawAxisBar(ctx, x, y - 5, axisW, score, index % 2 === 0 ? C.accent : C.muted);
      drawText(ctx, String(score), x + axisW + 12, y, "400 14px ui-monospace, SFMono-Regular, Consolas, monospace", C.subtle);
    });
  });
}

export async function exportRosterStyleMapAsPNG(eventName: string, fighters: StyleExportFighter[], filename = "fight-lens-roster-style-map") {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not create roster style map canvas.");

  drawCard(ctx, eventName, fighters);

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
