import { describe, it, expect } from "vitest";
import {
  NAMED_CALL_MIN_PROBABILITY,
  LEGACY_NAMED_CALL_MIN_PROBABILITY,
  parseModelMinorVersion,
  resolveNamedCallThreshold,
  getNamedCallSide,
  isTooCloseToCall,
} from "@/lib/predictionThresholds";

// These constants underpin the versioned named-call system. If they move, every
// locked historical call re-scores — so this suite pins them explicitly.
describe("threshold constants", () => {
  it("current model names a winner at 58%, legacy at 52%", () => {
    expect(NAMED_CALL_MIN_PROBABILITY).toBe(58);
    expect(LEGACY_NAMED_CALL_MIN_PROBABILITY).toBe(52);
  });
});

describe("parseModelMinorVersion", () => {
  it("extracts the minor number from prefixed and bare version strings", () => {
    expect(parseModelMinorVersion("outcome-v0.1")).toBe(1);
    expect(parseModelMinorVersion("v0.2")).toBe(2);
    expect(parseModelMinorVersion("outcome-v0.3")).toBe(3);
    expect(parseModelMinorVersion("outcome-v0.4")).toBe(4);
  });

  it("is case-insensitive and handles multi-digit minors", () => {
    expect(parseModelMinorVersion("V0.10")).toBe(10);
  });

  it("returns null for missing or unrecognizable versions", () => {
    expect(parseModelMinorVersion(null)).toBeNull();
    expect(parseModelMinorVersion(undefined)).toBeNull();
    expect(parseModelMinorVersion("")).toBeNull();
    expect(parseModelMinorVersion("garbage")).toBeNull();
  });
});

describe("resolveNamedCallThreshold", () => {
  it("gives legacy 52% to v0.1 / v0.2", () => {
    expect(resolveNamedCallThreshold("outcome-v0.1")).toBe(52);
    expect(resolveNamedCallThreshold("v0.2")).toBe(52);
  });

  it("gives current 58% to v0.3 (calibrated boundary) and v0.4", () => {
    expect(resolveNamedCallThreshold("outcome-v0.3")).toBe(58);
    expect(resolveNamedCallThreshold("outcome-v0.4")).toBe(58);
  });

  it("falls back to the current threshold for unknown / missing versions (live predictions)", () => {
    expect(resolveNamedCallThreshold(null)).toBe(58);
    expect(resolveNamedCallThreshold(undefined)).toBe(58);
    expect(resolveNamedCallThreshold("garbage")).toBe(58);
  });
});

describe("getNamedCallSide", () => {
  it("names the higher-probability fighter above the threshold", () => {
    expect(getNamedCallSide(60, 40, 58)).toBe("fighterA");
    expect(getNamedCallSide(40, 60, 58)).toBe("fighterB");
  });

  it("treats the threshold as INCLUSIVE (exact boundary is a named call)", () => {
    expect(getNamedCallSide(58, 42, 58)).toBe("fighterA");
  });

  it("returns null just below the threshold (too close to call)", () => {
    expect(getNamedCallSide(57, 43, 58)).toBeNull();
  });

  it("respects a legacy 52% threshold: 55% is a named call, 51% is not", () => {
    expect(getNamedCallSide(55, 45, 52)).toBe("fighterA");
    expect(getNamedCallSide(51, 49, 52)).toBeNull();
  });

  it("returns null on an exact tie even above the threshold", () => {
    expect(getNamedCallSide(55, 55, 52)).toBeNull();
  });

  it("defaults to the current 58% threshold when none is passed", () => {
    expect(getNamedCallSide(60, 40)).toBe("fighterA");
    // A 55% favorite is a named call under legacy (52) but NOT under the
    // default current threshold (58). This is exactly the drift the accuracy
    // code must avoid by passing resolveNamedCallThreshold(modelVersion).
    expect(getNamedCallSide(55, 45)).toBeNull();
  });
});

describe("isTooCloseToCall", () => {
  it("mirrors getNamedCallSide === null", () => {
    expect(isTooCloseToCall(57, 43, 58)).toBe(true);
    expect(isTooCloseToCall(60, 40, 58)).toBe(false);
    expect(isTooCloseToCall(55, 45, 52)).toBe(false);
  });
});
