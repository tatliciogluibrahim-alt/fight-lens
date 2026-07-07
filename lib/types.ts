export type CardPlacement = "Main Card" | "Prelims" | "Early Prelims";
export type FightResultStatus = "W" | "L" | "D";

export interface StyleProfile {
  strikingVolume: number;
  strikingDefense: number;
  wrestlingOffense: number;
  takedownDefense: number;
  controlThreat: number;
  submissionThreat: number;
  cardioConsistency: number;
  opponentQuality: number;
}

export interface FightResult {
  opponent: string;
  date: string;
  result: FightResultStatus;
  method: string;
  round: number;
  time: string;
  opponentTier: "Top 10" | "Ranked" | "Unranked";
  sigStrikeDifferentialByRound: number[];
  takedownsByRound: number[];
  controlTimeByRound: number[];
  notes: string;
}

export interface ResumeHeat {
  score: number;
  label: string;
  explanation: string;
  factors: string[];
}

export interface Fighter {
  id: string;
  name: string;
  nickname?: string;
  countryCode: string;
  countryLabel: string;
  countryColors: string[];
  record: string;
  age: number;
  height: string;
  reach: string;
  stance: string;
  ranking?: string;
  styleProfile: StyleProfile;
  lastFiveFights: FightResult[];
  resumeHeat: ResumeHeat;
}

export interface FightPath {
  label: string;
  weight: number;
}

export interface KeyStatEdge {
  label: string;
  fighterA: number;
  fighterB: number;
  unit?: string;
}

export interface Fight {
  id: string;
  weightClass: string;
  rounds: 3 | 5;
  cardPlacement: CardPlacement;
  fighterAId: string;
  fighterBId: string;
  styleClashLabel: string;
  matchupQuestion: string;
  fightShapeSummary: string;
  keyStatEdges: KeyStatEdge[];
  pathsToVictory: {
    fighterA: FightPath[];
    fighterB: FightPath[];
  };
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  promotion: string;
  fights: Fight[];
}

export type DataProvenance = "mock" | "manual" | "sourced" | "derived";

export type PublicLensModelOutputKind =
  | "fight-shape"
  | "style-clash"
  | "form-resume"
  | "round-trend"
  | "tactical-routes"
  | "creator-card-brief";

export type LensModelOutputKind = PublicLensModelOutputKind | "internal-read";
export type LensModelOutputConfidence = "low" | "medium" | "high";

export interface LensModelOutputBase {
  id: string;
  kind: LensModelOutputKind;
  fightId?: string;
  eventId?: string;
  title: string;
  summary: string;
  provenance: DataProvenance;
  confidence?: LensModelOutputConfidence;
  visibility: "public" | "private";
}

export interface FightShapeLensOutput extends LensModelOutputBase {
  kind: "fight-shape";
  visibility: "public";
}

export interface StyleClashLensOutput extends LensModelOutputBase {
  kind: "style-clash";
  visibility: "public";
  axisDeltas: KeyStatEdge[];
}

export interface FormResumeLensOutput extends LensModelOutputBase {
  kind: "form-resume";
  visibility: "public";
  resumeNotes: string[];
}

export interface RoundTrendLensOutput extends LensModelOutputBase {
  kind: "round-trend";
  visibility: "public";
  roundSignals: Array<{
    round: number;
    fighterA: number | null;
    fighterB: number | null;
  }>;
}

export interface TacticalRoutesLensOutput extends LensModelOutputBase {
  kind: "tactical-routes";
  visibility: "public";
  routes: {
    fighterA: FightPath[];
    fighterB: FightPath[];
  };
}

export interface CreatorCardBriefLensOutput extends LensModelOutputBase {
  kind: "creator-card-brief";
  visibility: "public";
  exportFormat: "16:9" | "9:16" | "1:1" | "compact" | "roster";
  sourceOutputIds: string[];
}

interface PrivateInternalReadOutput extends LensModelOutputBase {
  kind: "internal-read";
  visibility: "private";
  summary: "";
  privatePlaceholderOnly: true;
}

export type PublicLensModelOutput =
  | FightShapeLensOutput
  | StyleClashLensOutput
  | FormResumeLensOutput
  | RoundTrendLensOutput
  | TacticalRoutesLensOutput
  | CreatorCardBriefLensOutput;

export type LensModelOutput = PublicLensModelOutput | PrivateInternalReadOutput;
