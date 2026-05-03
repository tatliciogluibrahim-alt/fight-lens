import { fightShapeMetricDefinitions } from "./fight-shape";
import type { NullableStyleProfile } from "./fight-shape";
import type { FightShapeConfidenceLabel } from "./fight-shape-model/types";

export interface StyleRadarDimension {
  key: keyof NullableStyleProfile;
  label: string;
  shortLabel: string;
  value: number | null;
}

export interface StyleRadarExportFighter {
  id?: string;
  name: string;
  record?: string | null;
  stance?: string | null;
  ranking?: string | null;
  styleProfile: NullableStyleProfile;
  confidence: FightShapeConfidenceLabel;
  styleRead: string;
}

export function getStyleRadarDimensions(profile: NullableStyleProfile): StyleRadarDimension[] {
  return fightShapeMetricDefinitions.map((metric) => ({
    key: metric.key,
    label: metric.label,
    shortLabel: metric.shortLabel,
    value: profile[metric.key]
  }));
}

export function hasEnoughStyleRadarData(profile: NullableStyleProfile) {
  return getStyleRadarDimensions(profile).filter((dimension) => dimension.value != null).length >= 3;
}

export function getStyleRadarCompleteness(profile: NullableStyleProfile) {
  const dimensions = getStyleRadarDimensions(profile);
  const present = dimensions.filter((dimension) => dimension.value != null).length;

  return {
    present,
    total: dimensions.length,
    missing: dimensions.filter((dimension) => dimension.value == null).map((dimension) => dimension.label)
  };
}

export function getStyleRadarRead(name: string, profile: NullableStyleProfile) {
  const top = getStyleRadarDimensions(profile)
    .filter((dimension): dimension is StyleRadarDimension & { value: number } => dimension.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  if (top.length < 2) {
    return `${name}'s style read needs more complete profile data.`;
  }

  return `${name}'s current shape leans through ${top[0].label} and ${top[1].label}.`;
}
