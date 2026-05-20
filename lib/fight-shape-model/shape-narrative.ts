/**
 * Shape narrative — analyst-style plain English copy for the fight-shape
 * section. Compares the two fighters across the radar axes and picks:
 *   1. Biggest edge   — axis with the largest signed delta
 *   2. Closest        — axis with the smallest delta where both have data
 *   3. Swing / worth-watching — secondary axis, biased toward the model
 *                       call's predicted loser when known so the copy reads
 *                       as a counter-path
 *
 * Strictly presentation. Does not change model math, prediction values, or
 * anything the public record consumes. The model call always wins over
 * shape — these helpers never claim a winner, they describe style.
 *
 * Copy guardrails:
 *   - Never name a winner.
 *   - Never use betting language (lock, parlay, wager, odds, guaranteed).
 *   - Never use banned phrases: "matchup stress", "pressure point",
 *     "style-pressure read", "best bet".
 *   - Always say "shape" or "style" — never "forecast".
 *   - Surface thin-sample caveats instead of forcing a confident claim.
 */

import { getStyleRadarDimensions } from "@/lib/style-radar";
import type { NullableStyleProfile } from "@/lib/fight-shape";

export interface NarrativeAxisCard {
  kind: "biggest-edge" | "closest" | "swing" | "watching";
  title: string;
  axisLabel: string;
  body: string;
  leaderName?: string | null;
  delta?: number;
  scoreA?: number;
  scoreB?: number;
}

export interface ShapeNarrative {
  /** 1–2 analyst-style sentences. Never names a winner. */
  headline: string | null;
  /** 1–3 cards explaining the shape in human terms. */
  cards: NarrativeAxisCard[];
  /** Optional thin-sample note. Null when coverage is fine. */
  caveat: string | null;
}

interface NarrativeArgs {
  fighterAName: string;
  fighterAId: string;
  fighterBName: string;
  fighterBId: string;
  profileA: NullableStyleProfile | null | undefined;
  profileB: NullableStyleProfile | null | undefined;
  predictedWinnerId: string | null;
}

interface AxisRow {
  key: string;
  shortLabel: string;
  label: string;
  scoreA: number;
  scoreB: number;
  delta: number; // signed: positive = A leads, negative = B leads
  absDelta: number;
}

const TOTAL_AXES = 8; // fightShapeMetricDefinitions length

function lastName(name: string): string {
  return name.split(" ").pop() ?? name;
}

function comparableAxes(
  profileA: NullableStyleProfile | null | undefined,
  profileB: NullableStyleProfile | null | undefined,
): AxisRow[] {
  const dimsA = getStyleRadarDimensions(profileA);
  const dimsB = getStyleRadarDimensions(profileB);
  const rows: AxisRow[] = [];
  for (const a of dimsA) {
    const b = dimsB.find((d) => d.key === a.key);
    if (!b) continue;
    if (!a.hasData || !b.hasData || a.value == null || b.value == null) continue;
    const delta = a.value - b.value;
    rows.push({
      key: a.key,
      shortLabel: a.shortLabel,
      label: a.label,
      scoreA: a.value,
      scoreB: b.value,
      delta,
      absDelta: Math.abs(delta),
    });
  }
  return rows;
}

// ── Per-axis fight-language ──────────────────────────────────────────────────
// Short, specific, never implying a winner. Keep these under 14 words.

function biggestEdgeBody(row: AxisRow, leader: string): string {
  const lead = lastName(leader);
  switch (row.shortLabel) {
    case "output":
      return `${lead} has the cleaner volume shape across recent rounds.`;
    case "strike defense":
      return `${lead}'s defensive shell reads more reliable in standing exchanges.`;
    case "wrestling":
      return `${lead} can force more grappling sequences than the other side has answered for.`;
    case "td defense":
      return `${lead} has the stronger record of denying entries and resetting upright.`;
    case "control":
      return `${lead} turns grips into controlled minutes more often.`;
    case "submission":
      return `${lead} carries more credible finishing danger if the fight hits the mat.`;
    case "cardio":
      return `${lead} shows steadier pace evidence into the later rounds.`;
    case "opposition":
      return `${lead}'s recent sample has been tested against tougher competition.`;
    default:
      return `${lead} carries the cleaner ${row.shortLabel.toLowerCase()} signal.`;
  }
}

function closestBody(row: AxisRow): string {
  switch (row.shortLabel) {
    case "output":
      return "The output read is tight — neither side runs away with the volume picture.";
    case "strike defense":
      return "The defensive read is much tighter than the bigger gap elsewhere.";
    case "wrestling":
      return "The wrestling picture reads close — entries and denials look similar on tape.";
    case "td defense":
      return "Takedown denial profiles read similarly. This is where exchanges could reset.";
    case "control":
      return "Control work reads close. Whoever finds a grip first sets the pace.";
    case "submission":
      return "Submission danger looks similar — neither side leans on the finish.";
    case "cardio":
      return "Cardio reads close. Neither fighter's late-round shape pulls decisively.";
    case "opposition":
      return "Career sample quality is similar. Neither has been more or less tested.";
    default:
      return `Both fighters profile similarly on ${row.shortLabel.toLowerCase()}.`;
  }
}

function swingBody(row: AxisRow, underdog: string): string {
  const lead = lastName(underdog);
  switch (row.shortLabel) {
    case "output":
      return `${lead}'s path improves if volume becomes the deciding factor.`;
    case "strike defense":
      return `${lead}'s defensive read could neutralize the call if exchanges stay clean.`;
    case "wrestling":
      return `${lead}'s ability to force grappling could reshape the matchup.`;
    case "td defense":
      return `${lead}'s denial work could keep the fight where they want it.`;
    case "control":
      return `${lead}'s grappling pressure could turn the read if exchanges drift to the mat.`;
    case "submission":
      return `${lead}'s finishing danger could break the call if a grappling sequence opens.`;
    case "cardio":
      return `${lead}'s late-round shape could decide it if the fight goes long.`;
    case "opposition":
      return `${lead}'s tested resume reads as the harder one. Worth weighing into the call.`;
    default:
      return `${lead} carries the ${row.shortLabel.toLowerCase()} edge — worth watching.`;
  }
}

function watchingBody(row: AxisRow, leader: string): string {
  const lead = lastName(leader);
  return `${lead} carries the ${row.shortLabel.toLowerCase()} edge here — the next clearest separator after the biggest.`;
}

// ── Headline composer ────────────────────────────────────────────────────────

function buildHeadline(
  rows: AxisRow[],
  biggest: AxisRow,
  biggestLeader: string,
): string {
  const tightAll = rows.every((r) => r.absDelta < 8);
  if (tightAll) {
    return "On shape, this matchup reads close — small edges across the board, no axis pulling decisively. Style-only read.";
  }

  const lead = lastName(biggestLeader);
  const axis = biggest.shortLabel.toLowerCase();
  const supporting = rows
    .filter((r) => r.key !== biggest.key)
    .filter((r) => Math.sign(r.delta) === Math.sign(biggest.delta) && r.absDelta >= 10);

  if (biggest.absDelta >= 25) {
    return `${lead}'s ${axis} is the cleanest signal on the board. The supporting axes read tighter — this is a style map, not the model call.`;
  }

  if (biggest.absDelta >= 15) {
    if (supporting.length >= 1) {
      return `${lead} holds the clearer edge on ${axis}, with the next-clearest signal pointing the same way. Shape only — not a winner forecast.`;
    }
    return `${lead} holds the clearer edge on ${axis}. Other axes read tighter, so the shape doesn't separate cleanly.`;
  }

  return `${lead} carries a modest ${axis} edge, but the shape doesn't separate cleanly. Read it as a style map, not a call.`;
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function buildShapeNarrative(args: NarrativeArgs): ShapeNarrative {
  const {
    fighterAName,
    fighterAId,
    fighterBName,
    fighterBId,
    profileA,
    profileB,
    predictedWinnerId,
  } = args;

  const rows = comparableAxes(profileA, profileB);

  if (rows.length === 0) {
    return {
      headline: "Shape read pending — at least one fighter has limited recent UFC samples.",
      cards: [],
      caveat: null,
    };
  }

  const byAbsDeltaDesc = [...rows].sort((a, b) => b.absDelta - a.absDelta);
  const byAbsDeltaAsc = [...rows].sort((a, b) => a.absDelta - b.absDelta);

  const biggest = byAbsDeltaDesc[0];
  const closest = byAbsDeltaAsc[0];

  const biggestLeader = biggest.delta > 0 ? fighterAName : fighterBName;

  // Swing: the axis where the model-call underdog has their biggest edge.
  // Falls back to "worth watching" when:
  //   - the call is too close (no predicted winner), or
  //   - the underdog has no positive edge anywhere
  const predictedLoserId =
    predictedWinnerId === fighterAId
      ? fighterBId
      : predictedWinnerId === fighterBId
        ? fighterAId
        : null;
  const predictedLoserName =
    predictedLoserId === fighterAId
      ? fighterAName
      : predictedLoserId === fighterBId
        ? fighterBName
        : null;

  let swing: AxisRow | null = null;
  let swingKind: "swing" | "watching" = "watching";

  if (predictedLoserId) {
    const underdogIsA = predictedLoserId === fighterAId;
    const underdogEdges = byAbsDeltaDesc
      .filter((r) => r.key !== biggest.key)
      .filter((r) => (underdogIsA ? r.delta > 0 : r.delta < 0))
      .filter((r) => r.absDelta >= 6);
    if (underdogEdges.length > 0) {
      swing = underdogEdges[0];
      swingKind = "swing";
    }
  }

  if (!swing) {
    // No counter-path edge — fall back to the second-biggest separator
    swing = byAbsDeltaDesc.find((r) => r.key !== biggest.key && r.absDelta >= 6) ?? null;
    swingKind = "watching";
  }

  // ── Cards ──────────────────────────────────────────────────────────────────
  const cards: NarrativeAxisCard[] = [];

  cards.push({
    kind: "biggest-edge",
    title: "Biggest edge",
    axisLabel: biggest.label,
    body: biggestEdgeBody(biggest, biggestLeader),
    leaderName: biggestLeader,
    delta: Math.round(biggest.absDelta),
    scoreA: biggest.scoreA,
    scoreB: biggest.scoreB,
  });

  // Only show closest if it isn't also the biggest (single-axis edge case)
  if (closest.key !== biggest.key) {
    cards.push({
      kind: "closest",
      title: "Closest category",
      axisLabel: closest.label,
      body: closestBody(closest),
      delta: Math.round(closest.absDelta),
      scoreA: closest.scoreA,
      scoreB: closest.scoreB,
    });
  }

  if (swing && swing.key !== biggest.key) {
    const swingLeader = swing.delta > 0 ? fighterAName : fighterBName;
    if (swingKind === "swing" && predictedLoserName) {
      cards.push({
        kind: "swing",
        title: "Swing category",
        axisLabel: swing.label,
        body: swingBody(swing, predictedLoserName),
        leaderName: swingLeader,
        delta: Math.round(swing.absDelta),
        scoreA: swing.scoreA,
        scoreB: swing.scoreB,
      });
    } else {
      cards.push({
        kind: "watching",
        title: "Worth watching",
        axisLabel: swing.label,
        body: watchingBody(swing, swingLeader),
        leaderName: swingLeader,
        delta: Math.round(swing.absDelta),
        scoreA: swing.scoreA,
        scoreB: swing.scoreB,
      });
    }
  }

  // ── Headline + caveat ──────────────────────────────────────────────────────
  const headline = buildHeadline(rows, biggest, biggestLeader);

  const caveat =
    rows.length < 4
      ? `Limited sample — only ${rows.length} of ${TOTAL_AXES} axes have sourced data on both sides. The read gets thinner where samples are short.`
      : null;

  return { headline, cards, caveat };
}
