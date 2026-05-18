import type { StyleProfile } from "./types";

export type FightShapeMetricKey = keyof StyleProfile;
export type NullableStyleProfile = Record<FightShapeMetricKey, number | null>;
export type ExportStyleProfile = Record<Exclude<FightShapeMetricKey, "opponentQuality">, number> &
  Pick<NullableStyleProfile, "opponentQuality">;

export interface StyleExportFighter {
  name: string;
  record?: string | null;
  ranking?: string | null;
  styleProfile: ExportStyleProfile;
}

export interface FightShapeMetricDefinition {
  key: FightShapeMetricKey;
  label: string;
  shortLabel: string;
  definition: string;
  inputs: string[];
  scoreMeaning: string;
  provenance: "mock" | "manual" | "sourced" | "derived";
}

export const fightShapeMetricDefinitions: FightShapeMetricDefinition[] = [
  {
    key: "strikingVolume",
    label: "striking volume",
    shortLabel: "output",
    definition: "How often a fighter can create repeatable standing exchanges.",
    inputs: ["significant-strike pace", "recent output", "manual style context"],
    scoreMeaning: "Higher means more reliable minute-by-minute strike volume.",
    provenance: "derived"
  },
  {
    key: "strikingDefense",
    label: "striking defense",
    shortLabel: "strike defense",
    definition: "How cleanly a fighter avoids or softens incoming standing offense.",
    inputs: ["striking defense rate", "damage avoidance", "manual style context"],
    scoreMeaning: "Higher means fewer clean looks allowed in open-space exchanges.",
    provenance: "derived"
  },
  {
    key: "wrestlingOffense",
    label: "wrestling offense",
    shortLabel: "wrestling",
    definition: "How consistently a fighter can turn entries into takedowns or mat returns.",
    inputs: ["takedown rate", "entry reliability", "chain-wrestling context"],
    scoreMeaning: "Higher means stronger ability to force grappling sequences.",
    provenance: "derived"
  },
  {
    key: "takedownDefense",
    label: "takedown defense",
    shortLabel: "td defense",
    definition: "How reliably a fighter can deny entries, separate, or recover upright.",
    inputs: ["takedown defense rate", "get-up context", "opponent quality"],
    scoreMeaning: "Higher means stronger resistance to being held in wrestling layers.",
    provenance: "derived"
  },
  {
    key: "controlThreat",
    label: "control threat",
    shortLabel: "control",
    definition: "How much positional pressure a fighter can create once contact is made.",
    inputs: ["control time", "mat-return profile", "top-position threat"],
    scoreMeaning: "Higher means more ability to turn grips into controlled minutes.",
    provenance: "derived"
  },
  {
    key: "submissionThreat",
    label: "submission threat",
    shortLabel: "submission",
    definition: "How dangerous a fighter is in grappling phases where attacks can chain.",
    inputs: ["submission attempts", "finish history", "manual grappling context"],
    scoreMeaning: "Higher means more credible finishing danger when grappling exchanges open.",
    provenance: "derived"
  },
  {
    key: "cardioConsistency",
    label: "cardio consistency",
    shortLabel: "cardio",
    definition: "How stable a fighter's work rate and structure appear across available rounds.",
    inputs: ["round samples", "recent pace", "late-round evidence"],
    scoreMeaning: "Higher means more evidence of repeatable output deeper into fights.",
    provenance: "derived"
  },
  {
    key: "opponentQuality",
    label: "opponent quality",
    shortLabel: "opposition",
    definition: "A context layer for how demanding the recent and career sample has been.",
    inputs: ["ranked wins", "top-tier opponents", "manual tier review"],
    scoreMeaning: "Higher means the profile has been tested against stronger competition.",
    provenance: "manual"
  }
];

export type FightShapeAxisKey = "striking" | "wrestling" | "grappling" | "cardio" | "defense" | "output";

export interface FightShapeAxisDefinition {
  key: FightShapeAxisKey;
  label: string;
  definition: string;
  metricKeys: FightShapeMetricKey[];
}

export const fightShapeExportAxes: FightShapeAxisDefinition[] = [
  {
    key: "striking",
    label: "striking",
    definition: "Blends standing output with defensive reliability.",
    metricKeys: ["strikingVolume", "strikingDefense"]
  },
  {
    key: "wrestling",
    label: "wrestling",
    definition: "Shows takedown and mat-return pressure.",
    metricKeys: ["wrestlingOffense"]
  },
  {
    key: "grappling",
    label: "grappling",
    definition: "Combines control pressure with submission danger.",
    metricKeys: ["controlThreat", "submissionThreat"]
  },
  {
    key: "cardio",
    label: "cardio",
    definition: "Shows evidence of stable work across the scheduled shape.",
    metricKeys: ["cardioConsistency"]
  },
  {
    key: "defense",
    label: "defense",
    definition: "Combines striking defense and takedown denial.",
    metricKeys: ["strikingDefense", "takedownDefense"]
  },
  {
    key: "output",
    label: "output",
    definition: "Uses striking volume as the clearest public pace signal.",
    metricKeys: ["strikingVolume"]
  }
];

export function getFightShapeAxisScore(profile: ExportStyleProfile, axis: FightShapeAxisKey) {
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
    case "output":
      return profile.strikingVolume;
  }
}

type ProfileWithOptionalProvenance = NullableStyleProfile & {
  provenance?: Partial<Record<FightShapeMetricKey, string>>;
};

function hasMetric(profile: NullableStyleProfile, key: FightShapeMetricKey): profile is NullableStyleProfile & Record<typeof key, number> {
  const value = profile[key];
  const provenance = (profile as ProfileWithOptionalProvenance).provenance?.[key];

  if (value === 0 && provenance && provenance !== "sourced") {
    return false;
  }

  return typeof value === "number" && Number.isFinite(value);
}

export function getNullableFightShapeAxisScore(profile: NullableStyleProfile | null | undefined, axis: FightShapeAxisKey) {
  if (!profile) return null;
  switch (axis) {
    case "striking":
      return hasMetric(profile, "strikingVolume") && hasMetric(profile, "strikingDefense")
        ? Math.round((profile.strikingVolume + profile.strikingDefense) / 2)
        : null;
    case "wrestling":
      return hasMetric(profile, "wrestlingOffense") ? profile.wrestlingOffense : null;
    case "grappling":
      return hasMetric(profile, "controlThreat") && hasMetric(profile, "submissionThreat")
        ? Math.round((profile.controlThreat + profile.submissionThreat) / 2)
        : null;
    case "cardio":
      return hasMetric(profile, "cardioConsistency") ? profile.cardioConsistency : null;
    case "defense":
      return hasMetric(profile, "strikingDefense") && hasMetric(profile, "takedownDefense")
        ? Math.round((profile.strikingDefense + profile.takedownDefense) / 2)
        : null;
    case "output":
      return hasMetric(profile, "strikingVolume") ? profile.strikingVolume : null;
  }
}

export function hasCompleteExportStyleProfile(profile: NullableStyleProfile | null | undefined): profile is ExportStyleProfile {
  if (!profile) return false;
  return fightShapeExportAxes.every((axis) => getNullableFightShapeAxisScore(profile, axis.key) != null);
}
