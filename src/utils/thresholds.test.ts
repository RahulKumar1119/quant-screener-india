import { describe, it, expect } from "vitest";
import { getBadgeColor, ratingColorMap } from "./thresholds";
import type { ThresholdRule } from "./thresholds";

describe("getBadgeColor", () => {
  it("returns green for pe_ratio below 25", () => {
    expect(getBadgeColor("pe_ratio", 20)).toBe("green");
    expect(getBadgeColor("pe_ratio", 24.9)).toBe("green");
  });

  it("returns red for pe_ratio at or above 25", () => {
    expect(getBadgeColor("pe_ratio", 25)).toBe("red");
    expect(getBadgeColor("pe_ratio", 30)).toBe("red");
  });

  it("returns green for roe above 15", () => {
    expect(getBadgeColor("roe", 16)).toBe("green");
    expect(getBadgeColor("roe", 25)).toBe("green");
  });

  it("returns red for roe at or below 15", () => {
    expect(getBadgeColor("roe", 15)).toBe("red");
    expect(getBadgeColor("roe", 10)).toBe("red");
  });

  it("returns green for roce above 15", () => {
    expect(getBadgeColor("roce", 20)).toBe("green");
  });

  it("returns red for roce at or below 15", () => {
    expect(getBadgeColor("roce", 15)).toBe("red");
    expect(getBadgeColor("roce", 5)).toBe("red");
  });

  it("returns green for dividend_yield above 1.5", () => {
    expect(getBadgeColor("dividend_yield", 2)).toBe("green");
    expect(getBadgeColor("dividend_yield", 1.6)).toBe("green");
  });

  it("returns red for dividend_yield at or below 1.5", () => {
    expect(getBadgeColor("dividend_yield", 1.5)).toBe("red");
    expect(getBadgeColor("dividend_yield", 0.5)).toBe("red");
  });

  it("returns neutral for unknown fields", () => {
    expect(getBadgeColor("market_cap", 100000)).toBe("neutral");
    expect(getBadgeColor("unknown_field", 42)).toBe("neutral");
  });
});

describe("ratingColorMap", () => {
  it("maps STRONG BUY to emerald bg", () => {
    expect(ratingColorMap["STRONG BUY"]).toBe("bg-emerald-600 text-white");
  });

  it("maps BUY to green bg", () => {
    expect(ratingColorMap["BUY"]).toBe("bg-green-500 text-white");
  });

  it("maps HOLD to amber bg", () => {
    expect(ratingColorMap["HOLD"]).toBe("bg-amber-500 text-white");
  });

  it("maps SELL to red bg", () => {
    expect(ratingColorMap["SELL"]).toBe("bg-red-600 text-white");
  });
});

describe("ThresholdRule type", () => {
  it("can be used as a type annotation", () => {
    const rule: ThresholdRule = {
      field: "test_field",
      favorable: (v) => v > 0,
    };
    expect(rule.field).toBe("test_field");
    expect(rule.favorable(1)).toBe(true);
    expect(rule.favorable(-1)).toBe(false);
  });
});
