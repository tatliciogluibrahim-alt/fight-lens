export type ExportFormat = "16:9" | "1:1" | "9:16";

export const EXPORT_SIZES: Record<ExportFormat, { width: number; height: number; watermark: string }> = {
  "16:9": { width: 1920, height: 1080, watermark: "FIGHT LENS / 16:9" },
  "1:1": { width: 1600, height: 1600, watermark: "FIGHT LENS / 1:1" },
  "9:16": { width: 1080, height: 1920, watermark: "FIGHT LENS / 9:16" }
};

export const EXPORT_COLORS = {
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

export function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const n = Number.parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

export function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color = EXPORT_COLORS.line, width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: {
  font: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  letterSpacing?: number;
}) {
  ctx.save();
  ctx.font = options.font;
  ctx.fillStyle = options.color ?? EXPORT_COLORS.fg;
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

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
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

export function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color = EXPORT_COLORS.fg, maxLines = 3) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  ctx.restore();
  return lines.length * lineHeight;
}

export function drawFittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, maxSize: number, minSize: number, options?: {
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}) {
  let size = maxSize;
  const weight = options?.weight ?? 700;

  ctx.save();
  do {
    ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size -= 4;
  } while (size > minSize);

  ctx.fillStyle = options?.color ?? EXPORT_COLORS.fg;
  ctx.textAlign = options?.align ?? "left";
  ctx.textBaseline = options?.baseline ?? "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}

export function drawTacticalGrid(ctx: CanvasRenderingContext2D, width: number, height: number, step = 96) {
  ctx.save();
  ctx.strokeStyle = rgba(EXPORT_COLORS.lineStrong, 0.15);
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawExportBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const C = EXPORT_COLORS;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height) * 0.42);
  glow.addColorStop(0, rgba(C.accent, 0.22));
  glow.addColorStop(1, rgba(C.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const soft = ctx.createRadialGradient(width, height * 0.15, 0, width, height * 0.15, Math.max(width, height) * 0.45);
  soft.addColorStop(0, rgba(C.fg, 0.055));
  soft.addColorStop(1, rgba(C.fg, 0));
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, width, height);

  drawTacticalGrid(ctx, width, height);
}

export function drawLensLogo(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const C = EXPORT_COLORS;
  fillRoundRect(ctx, x, y, 76 * scale, 76 * scale, 18 * scale, C.panelSoft);
  strokeRoundRect(ctx, x, y, 76 * scale, 76 * scale, 18 * scale, C.lineStrong, 2 * scale);
  ctx.save();
  ctx.translate(x + 38 * scale, y + 38 * scale);
  ctx.rotate(Math.PI / 4);
  strokeRoundRect(ctx, -16 * scale, -16 * scale, 32 * scale, 32 * scale, 5 * scale, C.accent, 4 * scale);
  fillRoundRect(ctx, -6 * scale, -6 * scale, 12 * scale, 12 * scale, 3 * scale, C.accent);
  ctx.restore();
  drawText(ctx, "fight lens", x + 98 * scale, y + 34 * scale, {
    font: `700 ${30 * scale}px Arial, Helvetica, sans-serif`,
    color: C.fg,
    baseline: "middle"
  });
  drawText(ctx, "SEE THE SHAPE", x + 98 * scale, y + 72 * scale, {
    font: `400 ${17 * scale}px ui-monospace, SFMono-Regular, Consolas, monospace`,
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.5 * scale
  });
}

export function drawWatermark(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width = 330) {
  const C = EXPORT_COLORS;
  fillRoundRect(ctx, x, y, width, 60, 999, rgba(C.panel, 0.72));
  strokeRoundRect(ctx, x, y, width, 60, 999, C.lineStrong, 2);
  drawText(ctx, text, x + width / 2, y + 38, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.accent,
    align: "center",
    baseline: "middle",
    letterSpacing: 3
  });
}

export async function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string) {
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

export function formatFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
