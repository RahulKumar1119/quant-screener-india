import { describe, it, expect } from "vitest";
import {
  formatIndianCurrency,
  indianCommaGrouping,
  formatPercentage,
} from "./indianFormat";

describe("formatIndianCurrency", () => {
  it("formats values >= 1 Crore with Cr suffix", () => {
    expect(formatIndianCurrency(1_00_00_000)).toBe("₹1.00 Cr");
    expect(formatIndianCurrency(5_50_00_000)).toBe("₹5.50 Cr");
    expect(formatIndianCurrency(123_45_00_000)).toBe("₹123.45 Cr");
  });

  it("formats values >= 1 Lakh but < 1 Crore with L suffix", () => {
    expect(formatIndianCurrency(1_00_000)).toBe("₹1.00 L");
    expect(formatIndianCurrency(5_50_000)).toBe("₹5.50 L");
    expect(formatIndianCurrency(99_99_999)).toBe("₹100.00 L");
  });

  it("formats values < 1 Lakh with Indian comma grouping", () => {
    expect(formatIndianCurrency(500)).toBe("₹500");
    expect(formatIndianCurrency(1234)).toBe("₹1,234");
    expect(formatIndianCurrency(12345)).toBe("₹12,345");
    expect(formatIndianCurrency(99999)).toBe("₹99,999");
  });

  it("handles zero", () => {
    expect(formatIndianCurrency(0)).toBe("₹0");
  });

  it("handles negative values with sign prefix", () => {
    expect(formatIndianCurrency(-5_00_00_000)).toBe("-₹5.00 Cr");
    expect(formatIndianCurrency(-2_50_000)).toBe("-₹2.50 L");
    expect(formatIndianCurrency(-5000)).toBe("-₹5,000");
  });

  it("always starts with ₹ (or -₹ for negatives)", () => {
    expect(formatIndianCurrency(42)).toMatch(/^₹/);
    expect(formatIndianCurrency(-42)).toMatch(/^-₹/);
  });
});

describe("indianCommaGrouping", () => {
  it("returns value as-is for 3 or fewer digits", () => {
    expect(indianCommaGrouping(0)).toBe("0");
    expect(indianCommaGrouping(5)).toBe("5");
    expect(indianCommaGrouping(99)).toBe("99");
    expect(indianCommaGrouping(999)).toBe("999");
  });

  it("groups rightmost 3 digits then pairs of 2", () => {
    expect(indianCommaGrouping(1234)).toBe("1,234");
    expect(indianCommaGrouping(12345)).toBe("12,345");
    expect(indianCommaGrouping(123456)).toBe("1,23,456");
    expect(indianCommaGrouping(1234567)).toBe("12,34,567");
    expect(indianCommaGrouping(12345678)).toBe("1,23,45,678");
  });

  it("rounds fractional values", () => {
    expect(indianCommaGrouping(1234.7)).toBe("1,235");
    expect(indianCommaGrouping(99999.4)).toBe("99,999");
  });
});

describe("formatPercentage", () => {
  it("formats to one decimal place with % suffix", () => {
    expect(formatPercentage(15.0)).toBe("15.0%");
    expect(formatPercentage(3.14159)).toBe("3.1%");
    expect(formatPercentage(0)).toBe("0.0%");
    expect(formatPercentage(100)).toBe("100.0%");
  });

  it("handles negative percentages", () => {
    expect(formatPercentage(-5.5)).toBe("-5.5%");
  });
});
