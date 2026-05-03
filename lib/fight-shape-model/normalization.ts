export function clampScore(value: number | null | undefined, min = 0, max = 100) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function normalizeToScore(value: number | null | undefined, min: number, max: number) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return null;
  if (max <= min) return null;
  return clampScore(((value - min) / (max - min)) * 100);
}

export function normalizeInverseToScore(value: number | null | undefined, min: number, max: number) {
  const score = normalizeToScore(value, min, max);
  return score == null ? null : 100 - score;
}

export function weightedAverage(
  entries: Array<{
    value: number | null | undefined;
    weight: number;
  }>
) {
  const valid = entries.filter((entry) => (
    typeof entry.value === "number" &&
    Number.isFinite(entry.value) &&
    entry.weight > 0
  )) as Array<{ value: number; weight: number }>;

  if (!valid.length) return null;

  const weightTotal = valid.reduce((sum, entry) => sum + entry.weight, 0);
  const valueTotal = valid.reduce((sum, entry) => sum + entry.value * entry.weight, 0);

  return clampScore(valueTotal / weightTotal);
}

export function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value)) as number[];
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function parseClockToSeconds(value: string | null | undefined) {
  const match = String(value ?? "").trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMetricValue(value: number | null | undefined, fallback = "n/a") {
  return value == null ? fallback : String(value);
}
