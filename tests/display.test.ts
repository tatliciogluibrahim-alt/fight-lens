import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatRanking,
  formatStyleClashLabel,
  getCountryDisplay,
  formatMatchup,
} from "@/lib/display";

describe("formatRanking", () => {
  it("returns UNRANKED for empty / null / whitespace / 'nr'", () => {
    expect(formatRanking(null)).toBe("UNRANKED");
    expect(formatRanking(undefined)).toBe("UNRANKED");
    expect(formatRanking("")).toBe("UNRANKED");
    expect(formatRanking("   ")).toBe("UNRANKED");
    expect(formatRanking("nr")).toBe("UNRANKED");
    expect(formatRanking("NR")).toBe("UNRANKED");
    expect(formatRanking("Nr")).toBe("UNRANKED");
  });

  it("returns CHAMPION for 'C' (any case)", () => {
    expect(formatRanking("C")).toBe("CHAMPION");
    expect(formatRanking("c")).toBe("CHAMPION");
  });

  it("upper-cases and trims a numeric rank", () => {
    expect(formatRanking("5")).toBe("5");
    expect(formatRanking("  3 ")).toBe("3");
  });
});

describe("formatStyleClashLabel", () => {
  it("returns the pending label for null / undefined only", () => {
    expect(formatStyleClashLabel(null)).toBe("MATCHUP SHAPE PENDING");
    expect(formatStyleClashLabel(undefined)).toBe("MATCHUP SHAPE PENDING");
  });

  it("upper-cases and trims a present label", () => {
    expect(formatStyleClashLabel("grappler vs striker")).toBe("GRAPPLER VS STRIKER");
    expect(formatStyleClashLabel("  wrestle-heavy  ")).toBe("WRESTLE-HEAVY");
  });

  it("passes an empty string through as empty (not the pending fallback)", () => {
    // ?? only catches null/undefined, so "" trims/uppercases to "".
    expect(formatStyleClashLabel("")).toBe("");
  });
});

describe("formatMatchup", () => {
  it("bills two fighters as 'A vs. B'", () => {
    expect(formatMatchup("Chimaev", "Strickland")).toBe("Chimaev vs. Strickland");
    expect(formatMatchup("Khamzat Chimaev", "Sean Strickland")).toBe(
      "Khamzat Chimaev vs. Sean Strickland",
    );
  });
});

describe("getCountryDisplay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("prefers sourced country data over the name fallback", () => {
    const custom = { code: "CA", label: "canada" };
    // Sean Strickland has a US fallback entry; the sourced value must win.
    expect(getCountryDisplay({ name: "Sean Strickland", country: custom })).toBe(custom);
  });

  it("uses the name-keyed fallback and does NOT warn on a hit", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = getCountryDisplay({ name: "Sean Strickland" });
    expect(result).toEqual({ code: "US", label: "united states" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns null and warns (with id hint) on a miss in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getCountryDisplay({ name: "Nobody McUnknown", id: "nobody-1" });

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain("Nobody McUnknown");
    expect(msg).toContain("nobody-1");
  });

  it("stays silent on a miss in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getCountryDisplay({ name: "Still Unknown" })).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});
