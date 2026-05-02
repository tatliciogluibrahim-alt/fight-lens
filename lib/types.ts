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
