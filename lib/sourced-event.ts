import normalizedEventJson from "@/data/normalized/events/ufc-328.json";
import type { CardPlacement, DataProvenance, FightPath, StyleProfile } from "./types";

export type CompletenessState = "sourced" | "partial" | "missing" | "manual" | "derived" | "manual-required";
export type StyleMetricProvenance = DataProvenance | "missing";

export interface SourcedLandedAttempted {
  landed: number | null;
  attempted: number | null;
  raw: string | null;
}

export interface SourcedTotals {
  kd: number | null;
  significantStrikes: SourcedLandedAttempted | null;
  significantStrikePercent: number | null;
  totalStrikes: SourcedLandedAttempted | null;
  takedowns: SourcedLandedAttempted | null;
  takedownPercent: number | null;
  submissionAttempts: number | null;
  reversals: number | null;
  control: string | null;
  controlSeconds: number | null;
}

export interface SourcedSignificantTotals {
  significantStrikes: SourcedLandedAttempted | null;
  significantStrikePercent: number | null;
  head: SourcedLandedAttempted | null;
  body: SourcedLandedAttempted | null;
  leg: SourcedLandedAttempted | null;
  distance: SourcedLandedAttempted | null;
  clinch: SourcedLandedAttempted | null;
  ground: SourcedLandedAttempted | null;
}

export interface SourcedRoundStat {
  round: number;
  totals: SourcedTotals | null;
  significant?: SourcedSignificantTotals | null;
}

export interface SourcedFightHistoryItem {
  opponentName: string | null;
  opponentUrl: string | null;
  eventName: string | null;
  eventUrl: string | null;
  date: string | null;
  result: string | null;
  method: string | null;
  round: number | null;
  time: string | null;
  fightUrl: string;
  totals: {
    totals: SourcedTotals | null;
    significant?: SourcedSignificantTotals | null;
  } | null;
  roundStats: SourcedRoundStat[];
  source: "ufcstats";
  sourceUrl: string;
}

export interface SourcedStyleProfile extends Record<keyof StyleProfile, number | null> {
  provenance: Record<keyof StyleProfile, StyleMetricProvenance>;
  note: string;
}

export interface SourcedRoundScore {
  round: number;
  sampleCount: number;
  score: number | null;
}

export interface SourcedRoundModel {
  roundSampleCount: number;
  lateRoundSampleCount: number;
  earlyThreat: number | null;
  lateEvidence: number | null;
  roundScores: SourcedRoundScore[];
  hasEnoughForTrend: boolean;
  interpretation: string;
  averageFightTime: string | null;
}

export interface DataCompleteness {
  hasProfile: boolean;
  hasFightHistory: boolean;
  hasFightTotals: boolean;
  hasRoundStats: boolean;
  lastFiveCount: number;
  roundSampleCount: number;
  lateRoundSampleCount: number;
}

export interface SourcedFighter {
  id: string;
  ufcstatsId: string;
  name: string;
  nickname: string | null;
  ranking: string | null;
  record: string | null;
  height: string | null;
  weight: string | null;
  reach: string | null;
  stance: string | null;
  dob: string | null;
  country: {
    code?: string;
    label?: string;
    colors?: string[];
  } | null;
  image: {
    url: string | null;
    status: string;
    credit: string | null;
  };
  ufcstatsUrl: string;
  source: "ufcstats";
  sourceUrl: string;
  scrapedAt: string | null;
  aggregateStats: Record<string, number | null> | null;
  styleProfile: SourcedStyleProfile | null;
  fightHistory: SourcedFightHistoryItem[];
  lastFive: SourcedFightHistoryItem[];
  resumeHeat: null;
  roundModel: SourcedRoundModel;
  dataCompleteness: DataCompleteness | null;
  sourceCoverage: string;
}

export interface SourcedKeyEdge {
  shortLabel: string;
  label: string;
  fighterA: number | null;
  fighterB: number | null;
  provenance: "sourced" | "missing";
}

export interface SourcedFight {
  id: string;
  ufcstatsFightId: string;
  ufcstatsFightUrl: string;
  cardPlacement: CardPlacement;
  rounds: 3 | 5;
  weightClass: string | null;
  status: "scheduled" | "completed" | "mixed";
  styleClashLabel?: string | null;
  matchupQuestion: string | null;
  fightShapeSummary: string | null;
  manualRead: string | null;
  result?: {
    winner: string;
    method: string;
    round: number | null;
  } | null;
  fighters: {
    fighterA: SourcedFighter;
    fighterB: SourcedFighter;
  };
  keyEdges: SourcedKeyEdge[];
  paths: {
    fighterA: FightPath[];
    fighterB: FightPath[];
  } | null;
  sourceMix: Record<string, CompletenessState>;
}

export interface SourcedEvent {
  schemaVersion: number;
  generatedAt: string;
  event: {
    id: string;
    ufcstatsId: string;
    name: string;
    date: string | null;
    location: string | null;
    promotion: string;
  };
  modeling: {
    principle: string;
    formulas: Record<string, string>;
  };
  fights: SourcedFight[];
}

export const sourcedEvent = normalizedEventJson as SourcedEvent;
export const sourcedFights = sourcedEvent.fights;

export function getSourcedFight(fightId: string): SourcedFight | undefined {
  return sourcedFights.find((fight) => fight.id === fightId);
}

export function getAllSourcedFighters() {
  const fighters = sourcedFights.flatMap((fight) => [fight.fighters.fighterA, fight.fighters.fighterB]);
  return Array.from(new Map(fighters.map((fighter) => [fighter.ufcstatsId, fighter])).values());
}
