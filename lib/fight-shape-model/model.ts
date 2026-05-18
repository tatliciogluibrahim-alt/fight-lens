import type { SourcedFight, SourcedFightHistoryItem, SourcedFighter, SourcedRoundStat } from "../sourced-event";
import {
  formMetricConfidence,
  minConfidence,
  profileMetricConfidence,
  roundMetricConfidence,
  matchupDataConfidence
} from "./confidence";
import {
  explainForm,
  explainPath,
  explainPressure,
  explainSustainability,
  formLabel,
  metricStatus,
  pathReliabilityLabel,
  pressureLabel,
  sustainabilityLabel,
  topFactor
} from "./explain";
import { average, clampScore, normalizeToScore, parseClockToSeconds, weightedAverage } from "./normalization";
import type {
  ContextSignalScore,
  FighterMetricScore,
  FightShapeFactor,
  FightShapeModelOutput,
  RoundSustainabilityScore
} from "./types";

const MODEL_VERSION = "fight-shape-v0.1";

function stat(fighter: SourcedFighter, key: string) {
  const value = fighter.aggregateStats?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function factor(
  label: string,
  value: string,
  impact: FightShapeFactor["impact"] = "neutral",
  provenance: FightShapeFactor["provenance"] = "derived"
): FightShapeFactor {
  return { label, value, impact, provenance };
}

function fightDurationSeconds(fight: SourcedFightHistoryItem) {
  const clock = parseClockToSeconds(fight.time);
  if (clock == null || !fight.round) return null;
  return (fight.round - 1) * 300 + clock;
}

function recentRatePer15(fighter: SourcedFighter, selector: (fight: SourcedFightHistoryItem) => number | null) {
  const rows = fighter.lastFive
    .map((fight) => {
      const duration = fightDurationSeconds(fight);
      const value = selector(fight);
      if (!duration || value == null) return null;
      return { duration, value };
    })
    .filter(Boolean) as Array<{ duration: number; value: number }>;

  const seconds = rows.reduce((sum, row) => sum + row.duration, 0);
  if (!seconds) return null;

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (total / seconds) * 900;
}

function totalControlSeconds(fight: SourcedFightHistoryItem) {
  return fight.totals?.totals?.controlSeconds ?? null;
}

function hasProfileStats(fighter: SourcedFighter) {
  return Boolean(
    fighter.aggregateStats &&
      stat(fighter, "slpm") != null &&
      stat(fighter, "strikingDefense") != null &&
      stat(fighter, "takedownAverage") != null &&
      stat(fighter, "takedownDefense") != null
  );
}

function stylePressureFor(fighter: SourcedFighter, opponent: SourcedFighter): FighterMetricScore {
  const confidence = profileMetricConfidence(fighter, opponent);

  if (confidence === "Insufficient" || !hasProfileStats(fighter) || !hasProfileStats(opponent)) {
    return {
      key: "stylePressureIndex",
      fighterId: fighter.id,
      fighterName: fighter.name,
      score: null,
      label: "Insufficient",
      confidence: "Insufficient",
      status: "insufficient",
      explanation: "Profile stats are not complete enough to calculate matchup pressure.",
      factors: [factor("profile rates", "incomplete", "negative", "missing")],
      provenance: ["missing"]
    };
  }

  const tdRate = stat(fighter, "takedownAverage");
  const tdAccuracy = stat(fighter, "takedownAccuracy");
  const submissionRate = stat(fighter, "submissionAverage");
  const opponentTdDefense = stat(opponent, "takedownDefense");
  const recentControl = recentRatePer15(fighter, totalControlSeconds);

  const wrestlingOffense = weightedAverage([
    { value: normalizeToScore(tdRate, 0, 6), weight: 0.34 },
    { value: tdAccuracy, weight: 0.18 },
    { value: normalizeToScore(recentControl, 0, 360), weight: 0.3 },
    { value: normalizeToScore(submissionRate, 0, 2.5), weight: 0.18 }
  ]);
  const wrestlingStress = weightedAverage([
    { value: wrestlingOffense, weight: 0.72 },
    { value: opponentTdDefense == null ? null : 100 - opponentTdDefense, weight: 0.28 }
  ]);

  const slpm = stat(fighter, "slpm");
  const strikingAccuracy = stat(fighter, "strikingAccuracy");
  const opponentStrikingDefense = stat(opponent, "strikingDefense");
  const opponentAbsorbed = stat(opponent, "sapm");

  const strikingOffense = weightedAverage([
    { value: normalizeToScore(slpm, 1, 7), weight: 0.52 },
    { value: strikingAccuracy, weight: 0.24 },
    { value: normalizeToScore(opponentAbsorbed, 1.5, 6), weight: 0.24 }
  ]);
  const strikingStress = weightedAverage([
    { value: strikingOffense, weight: 0.68 },
    { value: opponentStrikingDefense == null ? null : 100 - opponentStrikingDefense, weight: 0.32 }
  ]);

  const pressureScore = weightedAverage([
    { value: Math.max(wrestlingStress ?? 0, strikingStress ?? 0), weight: 0.68 },
    { value: average([wrestlingStress, strikingStress]), weight: 0.32 }
  ]);
  const score = clampScore(pressureScore);

  const factors = [
    factor("wrestling pressure", `${wrestlingStress ?? "n/a"} signal`, (wrestlingStress ?? 0) >= (strikingStress ?? 0) ? "positive" : "neutral"),
    factor("striking pressure", `${strikingStress ?? "n/a"} signal`, (strikingStress ?? 0) > (wrestlingStress ?? 0) ? "positive" : "neutral"),
    factor("opponent takedown resistance", `${opponentTdDefense ?? "n/a"} defense`, "neutral", "sourced"),
    factor("recent control rate", recentControl == null ? "not available" : `${Math.round(recentControl)} sec/15`, recentControl == null ? "neutral" : "positive", recentControl == null ? "missing" : "sourced")
  ];

  return {
    key: "stylePressureIndex",
    fighterId: fighter.id,
    fighterName: fighter.name,
    score,
    label: pressureLabel(score),
    confidence,
    status: metricStatus(score, confidence),
    explanation: explainPressure(fighter.name, factors, confidence),
    factors,
    provenance: ["sourced", "derived"]
  };
}

function resultScore(fight: SourcedFightHistoryItem) {
  const result = String(fight.result ?? "").toLowerCase();
  const method = String(fight.method ?? "").toLowerCase();
  const duration = fightDurationSeconds(fight);

  let score = 50;
  if (result.startsWith("win")) score = 62;
  if (result.startsWith("loss")) score = 38;

  const isFinish = method.includes("ko") || method.includes("sub");
  const isDecision = method.includes("dec");

  if (result.startsWith("win") && isFinish) score += 8;
  if (result.startsWith("win") && isDecision) score += 4;
  if (result.startsWith("loss") && isFinish) score -= 8;
  if (result.startsWith("loss") && isDecision) score -= 3;

  if (duration != null && duration >= 900 && result.startsWith("win")) score += 2;
  if (duration != null && duration <= 300 && result.startsWith("loss")) score -= 3;

  return clampScore(score) ?? 50;
}

function opponentQualityAdjustedFormFor(fighter: SourcedFighter): FighterMetricScore {
  const confidence = formMetricConfidence(fighter);

  if (confidence === "Insufficient") {
    return {
      key: "opponentQualityAdjustedForm",
      fighterId: fighter.id,
      fighterName: fighter.name,
      score: null,
      label: "Insufficient",
      confidence,
      status: "insufficient",
      explanation: explainForm(fighter.name, confidence),
      factors: [factor("recent history", `${fighter.dataCompleteness?.lastFiveCount ?? 0} rows`, "negative", fighter.dataCompleteness?.lastFiveCount ?? 0 ? "sourced" : "missing")],
      provenance: [fighter.dataCompleteness?.lastFiveCount ?? 0 ? "sourced" : "missing"]
    };
  }

  const weights = [1, 0.88, 0.76, 0.64, 0.52];
  const score = weightedAverage(fighter.lastFive.slice(0, 5).map((fight, index) => ({
    value: resultScore(fight),
    weight: weights[index] ?? 0.5
  })));
  const clamped = clampScore(score);

  return {
    key: "opponentQualityAdjustedForm",
    fighterId: fighter.id,
    fighterName: fighter.name,
    score: clamped,
    label: formLabel(clamped),
    confidence,
    status: metricStatus(clamped, confidence),
    explanation: explainForm(fighter.name, confidence),
    factors: [
      factor("recent result shape", `${fighter.dataCompleteness?.lastFiveCount ?? 0} fights`, "positive", "sourced"),
      factor("method context", "finish/decision only", "neutral", "sourced"),
      factor("opponent tier context", "not modeled", "negative", "missing")
    ],
    provenance: ["sourced", "derived", "missing"]
  };
}

function landed(raw: { landed: number | null } | null | undefined) {
  return typeof raw?.landed === "number" ? raw.landed : null;
}

function attempted(raw: { attempted: number | null } | null | undefined) {
  return typeof raw?.attempted === "number" ? raw.attempted : null;
}

function roundImpact(round: SourcedRoundStat) {
  const sig = round.significant ?? round.totals;
  const totals = round.totals;

  const sigLanded = landed(sig?.significantStrikes);
  const sigAttempted = attempted(sig?.significantStrikes);
  const sigAccuracy = sigAttempted && sigAttempted >= 5 && sigLanded != null
    ? clampScore((sigLanded / sigAttempted) * 100)
    : null;
  const totalLanded = landed(totals?.totalStrikes);
  const tdLanded = landed(totals?.takedowns);
  const controlSeconds = totals?.controlSeconds ?? null;

  const strikingScore = weightedAverage([
    { value: normalizeToScore(sigLanded, 0, 45), weight: 0.56 },
    { value: sigAccuracy, weight: 0.24 },
    { value: normalizeToScore(totalLanded, 0, 90), weight: 0.2 }
  ]);
  const grapplingScore = weightedAverage([
    { value: normalizeToScore(controlSeconds, 0, 240), weight: 0.48 },
    { value: normalizeToScore(tdLanded, 0, 3), weight: 0.34 },
    { value: normalizeToScore(totals?.submissionAttempts, 0, 2), weight: 0.1 },
    { value: normalizeToScore(totals?.kd, 0, 1), weight: 0.08 }
  ]);

  return weightedAverage([
    { value: Math.max(strikingScore ?? 0, grapplingScore ?? 0), weight: 0.68 },
    { value: average([strikingScore, grapplingScore]), weight: 0.32 }
  ]);
}

function bucketAverage(rounds: SourcedRoundStat[], roundNumbers: number[]) {
  const values = rounds
    .filter((round) => roundNumbers.includes(round.round))
    .map(roundImpact)
    .filter((value) => value != null) as number[];

  if (!values.length) return null;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function allRoundStats(fighter: SourcedFighter) {
  return fighter.lastFive.flatMap((fight) => fight.roundStats ?? []);
}

function roundSustainabilityFor(fighter: SourcedFighter): RoundSustainabilityScore {
  const confidence = roundMetricConfidence(fighter);
  const rounds = allRoundStats(fighter);

  if (confidence === "Insufficient") {
    return {
      key: "roundSustainability",
      fighterId: fighter.id,
      fighterName: fighter.name,
      earlySignal: null,
      middleSignal: null,
      lateSignal: null,
      sustainabilityScore: null,
      label: "Insufficient",
      confidence,
      status: "insufficient",
      explanation: explainSustainability(fighter.name, confidence),
      factors: [
        factor("round sample", `${fighter.dataCompleteness?.roundSampleCount ?? 0} rounds`, "negative", fighter.dataCompleteness?.roundSampleCount ?? 0 ? "sourced" : "missing"),
        factor("late-round sample", `${fighter.dataCompleteness?.lateRoundSampleCount ?? 0} late rounds`, "negative", fighter.dataCompleteness?.lateRoundSampleCount ?? 0 ? "sourced" : "missing")
      ],
      provenance: [fighter.dataCompleteness?.roundSampleCount ?? 0 ? "sourced" : "missing"]
    };
  }

  const earlySignal = bucketAverage(rounds, [1]);
  const middleSignal = bucketAverage(rounds, [2, 3]);
  const lateSignal = bucketAverage(rounds, [4, 5]);
  const dropPenalty = earlySignal != null && lateSignal != null ? Math.max(0, earlySignal - lateSignal) * 0.25 : 0;
  const sustainabilityScore = clampScore((weightedAverage([
    { value: earlySignal, weight: 0.22 },
    { value: middleSignal, weight: 0.34 },
    { value: lateSignal, weight: 0.44 }
  ]) ?? 0) - dropPenalty);

  return {
    key: "roundSustainability",
    fighterId: fighter.id,
    fighterName: fighter.name,
    earlySignal,
    middleSignal,
    lateSignal,
    sustainabilityScore,
    label: sustainabilityLabel(sustainabilityScore),
    confidence,
    status: metricStatus(sustainabilityScore, confidence),
    explanation: explainSustainability(fighter.name, confidence),
    factors: [
      factor("early signal", `${earlySignal ?? "n/a"} score`, "neutral", earlySignal == null ? "missing" : "derived"),
      factor("middle signal", `${middleSignal ?? "n/a"} score`, "neutral", middleSignal == null ? "missing" : "derived"),
      factor("late signal", `${lateSignal ?? "n/a"} score`, lateSignal != null && earlySignal != null && lateSignal >= earlySignal ? "positive" : "neutral", lateSignal == null ? "missing" : "derived"),
      factor("late-round sample", `${fighter.dataCompleteness?.lateRoundSampleCount ?? 0} late rounds`, "positive", "sourced")
    ],
    provenance: ["sourced", "derived"]
  };
}

function pathDescription(metric: FighterMetricScore) {
  const top = topFactor(metric.factors);
  if (!top) return "No clear repeatable path yet.";
  if (top.label.includes("wrestling")) return "repeat takedown entries into control phases";
  if (top.label.includes("striking")) return "build pressure through standing volume";
  return `lean on ${top.label.toLowerCase()}`;
}

function pathReliabilityFor(
  fighter: SourcedFighter,
  pressure: FighterMetricScore,
  form: FighterMetricScore,
  sustainability: RoundSustainabilityScore
): FighterMetricScore {
  const confidence = minConfidence([pressure.confidence, form.confidence, sustainability.confidence]);

  if (
    confidence === "Insufficient" ||
    pressure.score == null ||
    form.score == null ||
    sustainability.sustainabilityScore == null
  ) {
    return {
      key: "pathReliability",
      fighterId: fighter.id,
      fighterName: fighter.name,
      score: null,
      label: "Insufficient",
      confidence: "Insufficient",
      status: "insufficient",
      explanation: explainPath(fighter.name, "", "Insufficient"),
      factors: [
        factor("style pressure", pressure.score == null ? "insufficient" : `${pressure.score} score`, pressure.score == null ? "negative" : "neutral", pressure.score == null ? "missing" : "derived"),
        factor("round sustainability", sustainability.sustainabilityScore == null ? "insufficient" : `${sustainability.sustainabilityScore} score`, sustainability.sustainabilityScore == null ? "negative" : "neutral", sustainability.sustainabilityScore == null ? "missing" : "derived")
      ],
      provenance: ["missing"]
    };
  }

  const description = pathDescription(pressure);
  const score = weightedAverage([
    { value: pressure.score, weight: 0.45 },
    { value: sustainability.sustainabilityScore, weight: 0.35 },
    { value: form.score, weight: 0.2 }
  ]);
  const clamped = clampScore(score);

  return {
    key: "pathReliability",
    fighterId: fighter.id,
    fighterName: fighter.name,
    score: clamped,
    label: pathReliabilityLabel(clamped),
    confidence,
    status: metricStatus(clamped, confidence),
    explanation: explainPath(fighter.name, description, confidence),
    factors: [
      factor("style pressure", `${pressure.score} score`, "positive", "derived"),
      factor("round sustainability", `${sustainability.sustainabilityScore} score`, "neutral", "derived"),
      factor("recent form", `${form.score} score`, "neutral", "derived")
    ],
    provenance: ["sourced", "derived"]
  };
}

function contextSignalScore(): ContextSignalScore {
  return {
    key: "contextSignalScore",
    score: null,
    label: "Insufficient",
    confidence: "Insufficient",
    status: "insufficient",
    explanation: "No public context signals added yet.",
    factors: [factor("Context Lens", "not added", "neutral", "missing")],
    provenance: ["missing"]
  };
}

function publicSummary(fight: SourcedFight, pressureA: FighterMetricScore, pressureB: FighterMetricScore, dataConfidence: string) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  if (pressureA.score == null && pressureB.score == null) {
    return "The current sourced sample is too thin to shape the pressure points for this matchup.";
  }

  const leader = (pressureA.score ?? 0) >= (pressureB.score ?? 0) ? pressureA : pressureB;
  const other = leader.fighterId === fighterA.id ? fighterB : fighterA;
  const factorName = topFactor(leader.factors)?.label.toLowerCase() ?? "style pressure";

  return `${leader.fighterName} shows the clearest ${factorName} signal in the current model. ${other.name} still has to be read through the same pressure, form, and sustainability lenses. Overall data confidence is ${dataConfidence.toLowerCase()}.`;
}

function warningsFor(fight: SourcedFight, roundA: RoundSustainabilityScore, roundB: RoundSustainabilityScore) {
  const warnings: string[] = [];

  if (fight.status === "scheduled") {
    warnings.push("Scheduled matchup pages have no completed fight-level stats yet.");
  }

  warnings.push("Opponent rank and tier context is not modeled broadly yet, so adjusted form is partial.");

  if (roundA.confidence === "Insufficient" || roundB.confidence === "Insufficient") {
    warnings.push("Round sustainability stays hidden when late-round samples are thin.");
  }

  return warnings;
}

export function buildFightShapeModel(fight: SourcedFight): FightShapeModelOutput {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const styleA = stylePressureFor(fighterA, fighterB);
  const styleB = stylePressureFor(fighterB, fighterA);
  const formA = opponentQualityAdjustedFormFor(fighterA);
  const formB = opponentQualityAdjustedFormFor(fighterB);
  const roundA = roundSustainabilityFor(fighterA);
  const roundB = roundSustainabilityFor(fighterB);
  const pathA = pathReliabilityFor(fighterA, styleA, formA, roundA);
  const pathB = pathReliabilityFor(fighterB, styleB, formB, roundB);
  const dataConfidence = matchupDataConfidence(fighterA, fighterB);
  const warnings = warningsFor(fight, roundA, roundB);

  return {
    matchupId: fight.id,
    fighterA: {
      id: fighterA.id,
      name: fighterA.name
    },
    fighterB: {
      id: fighterB.id,
      name: fighterB.name
    },
    metrics: {
      stylePressureIndex: {
        fighterA: styleA,
        fighterB: styleB
      },
      opponentQualityAdjustedForm: {
        fighterA: formA,
        fighterB: formB
      },
      roundSustainability: {
        fighterA: roundA,
        fighterB: roundB
      },
      pathReliability: {
        fighterA: pathA,
        fighterB: pathB
      },
      contextSignalScore: contextSignalScore()
    },
    dataConfidence,
    generatedAt: new Date().toISOString(),
    warnings,
    publicSummary: publicSummary(fight, styleA, styleB, dataConfidence.label),
    debug: process.env.NEXT_PUBLIC_DEBUG_MODE === "true"
      ? {
          modelVersion: MODEL_VERSION,
          notes: [
            "Scores are matchup-shape signals, not outcome calls.",
            "Opponent quality remains partial until opponent tier data is modeled."
          ]
        }
      : undefined
  };
}
