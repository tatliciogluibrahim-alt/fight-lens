import { formatStyleClashLabel } from "@/lib/display";
import {
  EXPORT_COLORS,
  EXPORT_SIZES,
  drawExportBackdrop,
  drawFittedText,
  drawLensLogo,
  drawText,
  drawWatermark,
  drawWrappedText,
  downloadCanvasAsPNG,
  fillRoundRect,
  formatFilePart,
  rgba,
  strokeRoundRect
} from "./exportUtils";

export type HookCardExportFormat = "16:9" | "1:1";

export interface HookCardExportOptions {
  format: HookCardExportFormat;
  fightLabel: string;
  eventName?: string | null;
  styleClashLabel?: string | null;
  keyPressurePoint?: string | null;
  confidenceLabel?: string | null;
  sourceNote?: string | null;
}

function drawCapsule(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  const C = EXPORT_COLORS;
  ctx.save();
  ctx.font = "400 20px ui-monospace, SFMono-Regular, Consolas, monospace";
  const width = Math.min(maxWidth, Math.max(170, ctx.measureText(text).width + 62));
  ctx.restore();
  fillRoundRect(ctx, x, y, width, 58, 999, rgba(C.panel, 0.74));
  strokeRoundRect(ctx, x, y, width, 58, 999, C.lineStrong, 2);
  drawText(ctx, text, x + 31, y + 29, {
    font: "400 20px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.accent,
    baseline: "middle",
    letterSpacing: 2.5
  });
}

function drawSignalBars(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const C = EXPORT_COLORS;
  const rows = [
    ["STYLE CLASH", 0.84, C.accent],
    ["KEY PRESSURE", 0.62, C.muted],
    ["CREATOR CUT", 0.72, C.fg]
  ] as const;

  rows.forEach(([label, value, color], index) => {
    const rowY = y + index * 62;
    drawText(ctx, label, x, rowY + 12, {
      font: "400 17px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: C.subtle,
      baseline: "middle",
      letterSpacing: 2.3
    });
    fillRoundRect(ctx, x, rowY + 30, width, 10, 999, C.track);
    fillRoundRect(ctx, x, rowY + 30, width * value, 10, 999, color);
  });
}

function drawHookCard169(ctx: CanvasRenderingContext2D, options: HookCardExportOptions) {
  const C = EXPORT_COLORS;
  const { width, height, watermark } = EXPORT_SIZES["16:9"];
  const fightLabel = options.fightLabel.toUpperCase();
  const clashLabel = formatStyleClashLabel(options.styleClashLabel);
  const pressure = options.keyPressurePoint ?? "Key pressure point needs more sourced data.";
  const sourceNote = options.sourceNote ?? "UFCStats scope + Fight Shape model";

  drawExportBackdrop(ctx, width, height);
  drawLensLogo(ctx, 80, 70);
  drawWatermark(ctx, watermark, 1500, 70, 340);

  const left = { x: 80, y: 210, w: 600, h: 790 };
  const right = { x: 760, y: 210, w: 1080, h: 790 };
  fillRoundRect(ctx, left.x, left.y, left.w, left.h, 30, rgba(C.panel, 0.72));
  strokeRoundRect(ctx, left.x, left.y, left.w, left.h, 30, C.line, 2);
  fillRoundRect(ctx, right.x, right.y, right.w, right.h, 30, rgba(C.panel, 0.48));
  strokeRoundRect(ctx, right.x, right.y, right.w, right.h, 30, C.line, 2);

  drawText(ctx, "CREATOR HOOK", left.x + 48, left.y + 70, {
    font: "400 20px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.8
  });
  drawFittedText(ctx, fightLabel, left.x + 48, left.y + 158, left.w - 96, 48, 30, {
    color: C.fg,
    weight: 600
  });
  if (options.eventName) {
    drawText(ctx, options.eventName.toUpperCase(), left.x + 48, left.y + 224, {
      font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: C.subtle,
      baseline: "middle",
      letterSpacing: 2.3
    });
  }

  drawSignalBars(ctx, left.x + 48, left.y + 360, left.w - 96);
  drawText(ctx, `${options.confidenceLabel ?? "Limited"} confidence`, left.x + 48, left.y + 705, {
    font: "400 22px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.muted,
    baseline: "middle",
    letterSpacing: 2.4
  });
  drawWrappedText(ctx, sourceNote, left.x + 48, left.y + 744, left.w - 96, 28, "400 20px Arial, Helvetica, sans-serif", C.subtle, 2);

  drawCapsule(ctx, "STYLE CLASH LABEL", right.x + 56, right.y + 58, 520);
  drawWrappedText(ctx, clashLabel, right.x + 56, right.y + 170, right.w - 112, 106, "700 98px Arial, Helvetica, sans-serif", C.fg, 3);

  fillRoundRect(ctx, right.x + 56, right.y + 558, right.w - 112, 154, 24, rgba(C.bg, 0.56));
  strokeRoundRect(ctx, right.x + 56, right.y + 558, right.w - 112, 154, 24, C.line, 2);
  drawText(ctx, "KEY PRESSURE POINT", right.x + 88, right.y + 608, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.2
  });
  drawWrappedText(ctx, pressure, right.x + 88, right.y + 638, right.w - 176, 34, "400 27px Arial, Helvetica, sans-serif", C.muted, 2);
}

function drawHookCardSquare(ctx: CanvasRenderingContext2D, options: HookCardExportOptions) {
  const C = EXPORT_COLORS;
  const { width, height, watermark } = EXPORT_SIZES["1:1"];
  const fightLabel = options.fightLabel.toUpperCase();
  const clashLabel = formatStyleClashLabel(options.styleClashLabel);
  const pressure = options.keyPressurePoint ?? "Key pressure point needs more sourced data.";
  const sourceNote = options.sourceNote ?? "UFCStats scope + Fight Shape model";

  drawExportBackdrop(ctx, width, height);
  drawLensLogo(ctx, 88, 88, 1.04);
  drawWatermark(ctx, watermark, 1130, 88, 360);

  const frame = { x: 88, y: 245, w: 1404, h: 1266 };
  fillRoundRect(ctx, frame.x, frame.y, frame.w, frame.h, 34, rgba(C.panel, 0.58));
  strokeRoundRect(ctx, frame.x, frame.y, frame.w, frame.h, 34, C.line, 2);

  drawCapsule(ctx, "STYLE CLASH HOOK", frame.x + 64, frame.y + 68, 520);
  drawFittedText(ctx, fightLabel, frame.x + 64, frame.y + 186, frame.w - 128, 56, 34, {
    color: C.subtle,
    weight: 500
  });

  const labelHeight = drawWrappedText(ctx, clashLabel, frame.x + 64, frame.y + 292, frame.w - 128, 118, "700 110px Arial, Helvetica, sans-serif", C.fg, 3);
  const pressureY = Math.max(frame.y + 720, frame.y + 292 + labelHeight + 96);

  fillRoundRect(ctx, frame.x + 64, pressureY, frame.w - 128, 250, 26, rgba(C.bg, 0.56));
  strokeRoundRect(ctx, frame.x + 64, pressureY, frame.w - 128, 250, 26, C.line, 2);
  drawText(ctx, "KEY PRESSURE POINT", frame.x + 104, pressureY + 64, {
    font: "400 18px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.subtle,
    baseline: "middle",
    letterSpacing: 3.2
  });
  drawWrappedText(ctx, pressure, frame.x + 104, pressureY + 102, frame.w - 208, 40, "400 32px Arial, Helvetica, sans-serif", C.muted, 3);

  drawText(ctx, `${options.confidenceLabel ?? "Limited"} confidence`, frame.x + 64, frame.y + frame.h - 126, {
    font: "400 22px ui-monospace, SFMono-Regular, Consolas, monospace",
    color: C.accent,
    baseline: "middle",
    letterSpacing: 2.4
  });
  drawWrappedText(ctx, sourceNote, frame.x + 64, frame.y + frame.h - 86, frame.w - 128, 30, "400 21px Arial, Helvetica, sans-serif", C.subtle, 2);
}

export async function exportHookCardAsPNG(options: HookCardExportOptions, filename?: string) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const size = EXPORT_SIZES[options.format];
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create export canvas.");
  }

  if (options.format === "16:9") {
    drawHookCard169(ctx, options);
  } else {
    drawHookCardSquare(ctx, options);
  }

  const baseName = filename ?? `fight-lens-hook-${formatFilePart(options.fightLabel)}-${options.format.replace(":", "x")}`;
  await downloadCanvasAsPNG(canvas, baseName);
}
