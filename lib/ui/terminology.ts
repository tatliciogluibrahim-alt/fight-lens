/**
 * terminology — centralized public language for Fight Lens
 *
 * All copy that appears in the UI should come from this file,
 * or at least be consistent with the labels defined here.
 *
 * APPROVED vocabulary:
 *   model call, model lean, forecast, win probability, win lean,
 *   method lean, swing factor, live path, confidence, read strength,
 *   model record, not a guarantee, signal-based, locked before the fight,
 *   call accuracy, finish vs. decision read, view read
 *
 * BANNED vocabulary (never use in public-facing UI):
 *   bet, best bet, lock, odds, parlay, unit, wager, guaranteed,
 *   free money, profit, financial advice, smash spot, automatic play,
 *   pick (prefer "call" unless clearly referring to a logged historical call)
 *
 * Why this matters:
 *   Fight Lens is not a betting product. Language that sounds like betting
 *   advice undermines trust and creates legal/regulatory risk.
 *   The product describes matchup shape, not guaranteed outcomes.
 */

// ─── Model call language ──────────────────────────────────────────────────────

export const TERMS = {
  /** The model's top pick for a fight */
  MODEL_CALL: "model call",

  /** When the model has a slight preference */
  MODEL_LEAN: "model lean",

  /** Predicted win probability — always shown as a range or specific number */
  WIN_PROBABILITY: "win probability",

  /** The model's method prediction (finish/decision direction) */
  METHOD_LEAN: "finish vs. decision lean",

  /** Scenario where the other fighter still wins — kept "live" so it stays grounded */
  LIVE_PATH: "live path",

  /** Plain-English read of how strong the model's signal is */
  READ_STRENGTH: "read strength",

  /** Primary CTA into a fight's full read */
  VIEW_READ: "View Read",

  /** Scenario that would change the model's call */
  SWING_FACTOR: "swing factor",

  /** The model's confidence level */
  CONFIDENCE: "confidence",

  /** All predictions tracked vs actual outcomes */
  MODEL_RECORD: "model record",

  /** Standard disclaimer for all predictions */
  NOT_A_GUARANTEE: "not a guarantee",

  /** All predictions locked before the first bell — no editing after */
  LOCKED_BEFORE_FIGHT: "locked before the fight",

  /** The model uses public signals, not personal judgment */
  SIGNAL_BASED: "signal-based",

  /** Used in accuracy tracking — how often the top pick was right */
  CALL_ACCURACY: "call accuracy",

  /** Used in accuracy tracking — finish vs. decision direction */
  METHOD_ACCURACY: "finish vs. decision read",
} as const;

// ─── UI labels ────────────────────────────────────────────────────────────────

/** Confidence level display labels */
export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
  insufficient: "data pending",
};

/** Method type display labels */
export const METHOD_LABELS: Record<string, string> = {
  ko_tko: "KO/TKO",
  submission: "submission",
  decision: "decision",
  other: "other",
};

/** Outcome display labels (for completed fights) */
export const OUTCOME_LABELS: Record<string, string> = {
  fighterA: "fighter a",
  fighterB: "fighter b",
  draw: "draw",
  nc: "no contest",
};

// ─── Footer / disclaimer copy ─────────────────────────────────────────────────

/** Short disclaimer for fight pages */
export const FIGHT_PAGE_DISCLAIMER =
  "Signal-based · not a guarantee · Fight Lens does not provide betting advice";

/** Short footer for model record */
export const RECORD_DISCLAIMER =
  "outcome-v0.1 · signal-based · not a guarantee · backtest reconstructions labeled";

/** Short footer for accuracy sections */
export const ACCURACY_DISCLAIMER =
  "signal-based · not a guarantee · outcome-v0.1";
