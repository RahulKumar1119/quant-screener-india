import { describe, it, expect } from "vitest";
import { generateTradingDates, isWeekday } from "./tradingDates";

describe("isWeekday", () => {
  it("returns true for Monday through Friday", () => {
    // 2024-01-08 is a Monday
    expect(isWeekday("2024-01-08")).toBe(true);
    // 2024-01-09 is a Tuesday
    expect(isWeekday("2024-01-09")).toBe(true);
    // 2024-01-10 is a Wednesday
    expect(isWeekday("2024-01-10")).toBe(true);
    // 2024-01-11 is a Thursday
    expect(isWeekday("2024-01-11")).toBe(true);
    // 2024-01-12 is a Friday
    expect(isWeekday("2024-01-12")).toBe(true);
  });

  it("returns false for Saturday and Sunday", () => {
    // 2024-01-13 is a Saturday
    expect(isWeekday("2024-01-13")).toBe(false);
    // 2024-01-14 is a Sunday
    expect(isWeekday("2024-01-14")).toBe(false);
  });
});

describe("generateTradingDates", () => {
  it("generates the correct number of weekday dates", () => {
    const result = generateTradingDates(new Date("2024-01-08"), 5);
    expect(result).toHaveLength(5);
  });

  it("produces only weekday dates (no Saturdays or Sundays)", () => {
    const result = generateTradingDates(new Date("2024-01-08"), 10);
    for (const dateStr of result) {
      expect(isWeekday(dateStr)).toBe(true);
    }
  });

  it("returns dates in YYYY-MM-DD format", () => {
    const result = generateTradingDates(new Date("2024-01-08"), 3);
    for (const dateStr of result) {
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("skips weekends correctly when starting on a Friday", () => {
    // 2024-01-12 is a Friday
    const result = generateTradingDates(new Date("2024-01-12"), 3);
    expect(result[0]).toBe("2024-01-12"); // Friday
    expect(result[1]).toBe("2024-01-15"); // Monday (skips Sat/Sun)
    expect(result[2]).toBe("2024-01-16"); // Tuesday
  });

  it("skips the start date if it falls on a weekend", () => {
    // 2024-01-13 is a Saturday
    const result = generateTradingDates(new Date("2024-01-13"), 2);
    expect(result[0]).toBe("2024-01-15"); // Monday
    expect(result[1]).toBe("2024-01-16"); // Tuesday
  });

  it("returns an empty array when count is 0", () => {
    const result = generateTradingDates(new Date("2024-01-08"), 0);
    expect(result).toEqual([]);
  });

  it("generates consecutive weekdays for a full week starting Monday", () => {
    // 2024-01-08 is a Monday
    const result = generateTradingDates(new Date("2024-01-08"), 5);
    expect(result).toEqual([
      "2024-01-08",
      "2024-01-09",
      "2024-01-10",
      "2024-01-11",
      "2024-01-12",
    ]);
  });
});
