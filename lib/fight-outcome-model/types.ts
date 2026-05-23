export interface FighterOutcomeProbability {
  fighterId: string;
  fighterName: string;
  /** 0–100 — overall win probability */
  winProbability: number;
  /** 0–100 — % of this fighter's wins that go to decision (conditioned on them winning) */
  decisionProbability: number;
  /** 0–100 — % of this fighter's wins that are finishes */
  finishProbability: number;
  /** 0–100 — KO/TKO share of finishes */
  koTkoProbability: number;
  /** 0–100 — Submission share of finishes */
  submissionProbability: number;
  /** Human-readable lean label */
  leanLabel: "strong lean" | "lean" | "slight lean" | "no lean";
}

export interface MatchupMethodBreakdown {
  /** Overall probability fight goes to decision (0–100) */
  decision: number;
  /** Overall probability fight ends KO/TKO (0–100) */
  koTko: number;
  /** Overall probability fight ends by submission (0–100) */
  submission: number;
}

export type ScenarioId = "lean" | "upset" | "swing";

export interface OutcomeScenario {
  id: ScenarioId;
  /** Short label: "the call" | "counter path" | "what breaks the call" */
  title: string;
  /** Fighter name this scenario is about, or null for swing */
  fighterLabel: string | null;
  /** 2–3 sentence analytical description */
  description: string;
}

export type OutcomeModelConfidence = "high" | "medium" | "low" | "insufficient";

export interface FightOutcomeModelOutput {
  matchupId: string;
  fighterA: FighterOutcomeProbability;
  fighterB: FighterOutcomeProbability;
  /** True when no named public call should be made */
  tooClose: boolean;
  methodBreakdown: MatchupMethodBreakdown;
  scenarios: [OutcomeScenario, OutcomeScenario, OutcomeScenario];
  swingFactorLabel: string;
  swingFactorDescription: string;
  confidence: OutcomeModelConfidence;
  modelVersion: string;
  dataWarnings: string[];
}
