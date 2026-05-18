import { fightShapeMetricDefinitions } from "./fight-shape";
import type { FightShapeMetricKey, NullableStyleProfile } from "./fight-shape";
import type { FightShapeConfidenceLabel } from "./fight-shape-model/types";
import type { StyleMetricProvenance } from "./sourced-event";

export type RadarStyleProfile = NullableStyleProfile & {
  provenance?: Partial<Record<FightShapeMetricKey, StyleMetricProvenance>>;
  note?: string;
};

export interface StyleRadarDimension {
  key: FightShapeMetricKey;
  label: string;
  shortLabel: string;
  value: number | null;
  hasData: boolean;
  confidence: "modeled" | "limited" | "missing";
  sourceScope: "UFCStats scope" | "manual context" | "not modeled";
  provenance: StyleMetricProvenance;
  displayValue: string;
  signalLabel: string;
}

export interface StyleRadarExportFighter {
  id?: string;
  name: string;
  record?: string | null;
  stance?: string | null;
  ranking?: string | null;
  styleProfile: RadarStyleProfile;
  confidence: FightShapeConfidenceLabel;
  styleRead: string;
}

function getProvenance(profile: RadarStyleProfile, key: FightShapeMetricKey): StyleMetricProvenance {
  return profile.provenance?.[key] ?? (profile[key] == null ? "missing" : "derived");
}

function isModeledZero(profile: RadarStyleProfile, key: FightShapeMetricKey) {
  const provenance = getProvenance(profile, key);
  return profile[key] === 0 && provenance !== "sourced";
}

export function getStyleRadarDimensions(profile: RadarStyleProfile | null | undefined): StyleRadarDimension[] {
  if (!profile) {
    return fightShapeMetricDefinitions.map((metric) => ({
      key: metric.key,
      label: metric.label,
      shortLabel: metric.shortLabel,
      value: null,
      hasData: false,
      confidence: "missing" as const,
      sourceScope: "not modeled" as const,
      provenance: "missing" as const,
      displayValue: "Insufficient sample",
      signalLabel: "Not modeled yet"
    }));
  }
  return fightShapeMetricDefinitions.map((metric) => {
    const value = profile[metric.key];
    const provenance = getProvenance(profile, metric.key);
    const hasData = value != null && !isModeledZero(profile, metric.key);
    const sourceScope = provenance === "manual" ? "manual context" : provenance === "missing" ? "not modeled" : "UFCStats scope";

    return {
      key: metric.key,
      label: metric.label,
      shortLabel: metric.shortLabel,
      value,
      hasData,
      confidence: hasData ? "modeled" : value === 0 ? "limited" : "missing",
      sourceScope,
      provenance,
      displayValue: hasData ? String(value) : value === 0 ? "No recent signal" : "Insufficient sample",
      signalLabel: hasData ? `${provenance} · ${sourceScope}` : value === 0 ? "No recent UFC signal" : "Not modeled yet"
    };
  });
}

export function hasEnoughStyleRadarData(profile: RadarStyleProfile | null | undefined) {
  return getStyleRadarDimensions(profile).filter((dimension) => dimension.hasData).length >= 3;
}

export function getStyleRadarCompleteness(profile: RadarStyleProfile | null | undefined) {
  const dimensions = getStyleRadarDimensions(profile);
  const present = dimensions.filter((dimension) => dimension.hasData).length;

  return {
    present,
    total: dimensions.length,
    missing: dimensions.filter((dimension) => !dimension.hasData).map((dimension) => dimension.label)
  };
}

export function getStyleRadarRead(name: string, profile: RadarStyleProfile | null | undefined) {
  const top = getStyleRadarDimensions(profile)
    .filter((dimension): dimension is StyleRadarDimension & { value: number } => dimension.hasData && dimension.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  if (top.length < 2) {
    return `${name}'s style read needs more complete profile data.`;
  }

  return `${name}'s current radar reflects recent sourced signals, led by ${top[0].label} and ${top[1].label}.`;
}
