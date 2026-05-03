import type { PublicLensModelOutputKind } from "./types";

export type CreatorExportStatus = "ready" | "draft" | "planned";
export type CreatorExportFormat = "16:9" | "9:16" | "1:1" | "compact" | "roster";

export interface CreatorExportStrategyItem {
  id: string;
  label: string;
  format: CreatorExportFormat;
  sourceOutputKind: PublicLensModelOutputKind;
  status: CreatorExportStatus;
  surface: "matchup" | "event" | "backtest";
  purpose: string;
  currentExport?: {
    module: string;
    functionName: string;
  };
}

export const creatorExportStrategy = {
  principle: "Creator exports should carry one clear read, one proof layer, and a quiet confidence cue.",
  guardrails: [
    "Keep current PNG export functions stable while new formats are added.",
    "Use public matchup, event, or backtest outputs as sources.",
    "Show source context in debug views without labeling every number.",
    "Avoid result calls, hype language, and scoreboard-style framing."
  ],
  items: [
    {
      id: "style-clash-overlap",
      label: "Style Clash overlap",
      format: "16:9",
      sourceOutputKind: "style-clash",
      status: "ready",
      surface: "matchup",
      purpose: "Primary share card for a matchup's six-axis style overlap.",
      currentExport: {
        module: "@/lib/exportStyleClashCard",
        functionName: "exportStyleClashCardAsPNG"
      }
    },
    {
      id: "roster-style-map",
      label: "Roster style map",
      format: "roster",
      sourceOutputKind: "style-clash",
      status: "ready",
      surface: "event",
      purpose: "Card-wide reference that fingerprints every fighter across shared axes.",
      currentExport: {
        module: "@/lib/exportRosterStyleMap",
        functionName: "exportRosterStyleMapAsPNG"
      }
    },
    {
      id: "fight-shape-story",
      label: "Fight Shape story",
      format: "9:16",
      sourceOutputKind: "fight-shape",
      status: "draft",
      surface: "matchup",
      purpose: "Vertical creator cut for the matchup summary and strongest pressure point."
    },
    {
      id: "round-trend-proof",
      label: "Round Trend proof",
      format: "compact",
      sourceOutputKind: "round-trend",
      status: "planned",
      surface: "backtest",
      purpose: "Small proof card for what changed across rounds after completed results exist."
    },
    {
      id: "creator-brief",
      label: "Creator brief",
      format: "1:1",
      sourceOutputKind: "creator-card-brief",
      status: "planned",
      surface: "matchup",
      purpose: "Square brief that packages headline, matchup metadata, and confidence context."
    }
  ] satisfies CreatorExportStrategyItem[]
};
