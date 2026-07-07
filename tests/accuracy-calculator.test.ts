import { describe, it, expect } from "vitest";
import { computeAccuracyMetrics } from "@/lib/accuracy/calculator";
import type {
  FighterSide,
  MethodType,
  PredictionMethodBreakdown,
  PredictionRecord,
} from "@/lib/accuracy/types";

// ─── Fixture builder ──────────────────────────────────────────────────────────

interface RecordSpec {
  fightId: string;
  modelVersion: string;
  /** 0–100 win probability for fighter A. B is the complement unless overridden. */
  a: number;
  b?: number;
  winner: FighterSide | "draw" | "nc" | null;
  method?: MethodType;
  methodBreakdown?: PredictionMethodBreakdown;
  recordedAt?: string;
}

function makeRecord(spec: RecordSpec): PredictionRecord {
  const a = spec.a;
  const b = spec.b ?? 100 - a;
  return {
    fightId: spec.fightId,
    event: "Test Card",
    fighters: { fighterA: "Fighter A", fighterB: "Fighter B" },
    generatedAt: "2026-01-01T00:00:00.000Z",
    modelVersion: spec.modelVersion,
    prediction: {
      fighterAWinProbability: a,
      fighterBWinProbability: b,
      methodBreakdown: spec.methodBreakdown ?? { decision: 60, koTko: 25, submission: 15 },
    },
    outcome:
      spec.winner === null
        ? null
        : {
            winner: spec.winner,
            method: spec.method ?? "decision",
            round: 3,
            time: "5:00",
            recordedAt: spec.recordedAt ?? "2026-01-02T00:00:00.000Z",
          },
  };
}

// A small fixture with hand-computed metrics. All four calls are current-model
// (v0.4, 58% threshold) named calls, so all four resolve.
//   R1  70/30  → A wins  (correct)   method decision (hit)   Brier 0.09
//   R2  80/20  → B wins  (WRONG)     method ko_tko  (hit)    Brier 0.64  (overconfident wrong)
//   R3  40/60  → B wins  (correct)   method submission (hit) Brier 0.16
//   R4  65/35  → A wins  (correct)   method "other" (excluded from method acc) Brier 0.1225
const KNOWN: PredictionRecord[] = [
  makeRecord({ fightId: "r1", modelVersion: "outcome-v0.4", a: 70, winner: "fighterA", method: "decision", methodBreakdown: { decision: 60, koTko: 25, submission: 15 } }),
  makeRecord({ fightId: "r2", modelVersion: "outcome-v0.4", a: 80, winner: "fighterB", method: "ko_tko", methodBreakdown: { decision: 20, koTko: 60, submission: 20 } }),
  makeRecord({ fightId: "r3", modelVersion: "outcome-v0.4", a: 40, winner: "fighterB", method: "submission", methodBreakdown: { decision: 20, koTko: 20, submission: 60 } }),
  makeRecord({ fightId: "r4", modelVersion: "outcome-v0.4", a: 65, winner: "fighterA", method: "other", methodBreakdown: { decision: 50, koTko: 30, submission: 20 } }),
];

describe("computeAccuracyMetrics — known fixture", () => {
  const m = computeAccuracyMetrics(KNOWN);

  it("counts totals and resolved calls", () => {
    expect(m.totalPredictions).toBe(4);
    expect(m.resolvedCount).toBe(4);
  });

  it("winnerAccuracy = 3/4 correct → 75%", () => {
    expect(m.winnerAccuracy).toBe(75);
  });

  it("methodAccuracy = 3/3 of scorable methods → 100% ('other' excluded)", () => {
    expect(m.methodAccuracy).toBe(100);
  });

  it("brierScore = mean(0.09, 0.64, 0.16, 0.1225) → 0.253", () => {
    expect(m.brierScore).toBe(0.253);
  });

  it("grade derives from winnerAccuracy + brier → D", () => {
    // 75% winners but a 0.253 Brier (one overconfident miss) caps it below C.
    expect(m.grade).toBe("D");
  });
});

describe("computeAccuracyMetrics — named-call gating", () => {
  it("excludes a below-threshold current-model call from resolvedCount but keeps it in totals", () => {
    const withTooClose = [
      ...KNOWN,
      // v0.4 favorite at 55% is under the 58% threshold → too close to call.
      makeRecord({ fightId: "close", modelVersion: "outcome-v0.4", a: 55, winner: "fighterA" }),
    ];
    const m = computeAccuracyMetrics(withTooClose);
    expect(m.totalPredictions).toBe(5);
    expect(m.resolvedCount).toBe(4); // the 55% call is dropped
    expect(m.winnerAccuracy).toBe(75); // unchanged
  });

  it("returns nulls when no call clears its threshold", () => {
    const allTooClose = [
      makeRecord({ fightId: "c1", modelVersion: "outcome-v0.4", a: 55, winner: "fighterA" }),
      makeRecord({ fightId: "c2", modelVersion: "outcome-v0.4", a: 51, winner: "fighterB" }),
    ];
    const m = computeAccuracyMetrics(allTooClose);
    expect(m.resolvedCount).toBe(0);
    expect(m.winnerAccuracy).toBeNull();
    expect(m.brierScore).toBeNull();
    expect(m.grade).toBeNull();
    expect(m.calibrationBuckets).toEqual([]);
  });
});

// ─── P0 REGRESSION LOCK ─────────────────────────────────────────────────────
//
// The calibration bucket decides which calls are "correct" via getNamedCallSide.
// It MUST pass resolveNamedCallThreshold(r.modelVersion) so legacy v0.1/v0.2
// calls (named at 52%) whose favorite sits in [52,58) are still counted as
// correct. If that threshold argument is ever dropped, the bucket falls back to
// the current 58% threshold, those legacy favorites resolve to `null` (no named
// side), and the bucket's actualWinRate collapses.
//
// This test builds legacy sub-58 winners in the 50–60% bucket and asserts they
// are counted. If someone drops the threshold arg, this test goes red.
describe("computeAccuracyMetrics — calibration bucket locks legacy threshold", () => {
  const MIXED: PredictionRecord[] = [
    // 50–60% bucket: legacy calls named under the 52% threshold, favorite in
    // [52,58), both WON. These are the calls the P0 bug silently dropped.
    makeRecord({ fightId: "legacy-a", modelVersion: "outcome-v0.1", a: 55, winner: "fighterA" }),
    makeRecord({ fightId: "legacy-b", modelVersion: "v0.2", a: 44, b: 56, winner: "fighterB" }),
    // Higher-confidence calls that clear the current 58% threshold too.
    makeRecord({ fightId: "conf-60", modelVersion: "outcome-v0.3", a: 62, winner: "fighterA" }),
    makeRecord({ fightId: "conf-70", modelVersion: "outcome-v0.4", a: 75, winner: "fighterA" }),
    makeRecord({ fightId: "conf-80", modelVersion: "outcome-v0.4", a: 85, winner: "fighterA" }),
  ];

  const m = computeAccuracyMetrics(MIXED);

  it("keeps the legacy sub-58 calls in the resolved set", () => {
    // If the threshold were dropped in resolvedRecords too, this would be 3.
    expect(m.resolvedCount).toBe(5);
  });

  it("the 50–60% bucket counts both legacy correct calls (actualWinRate = 1.0)", () => {
    const bucket = m.calibrationBuckets.find((b) => b.predictedMidpoint === 0.55);
    expect(bucket).toBeDefined();
    expect(bucket!.count).toBe(2);
    // With the threshold arg present → both legacy favorites won → 2/2 = 1.0.
    // Drop resolveNamedCallThreshold(r.modelVersion) from the bucket and this
    // becomes 0 (the legacy favorites resolve to no named side). That is the
    // regression this assertion guards.
    expect(bucket!.actualWinRate).toBe(1);
  });

  it("every legacy + high-confidence winner is scored correct", () => {
    expect(m.winnerAccuracy).toBe(100);
  });
});
