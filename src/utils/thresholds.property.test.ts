import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getBadgeColor } from "./thresholds";

/**
 * Property 4: Threshold badge color mapping
 *
 * For any numeric metric value and its corresponding field (PE, ROE, ROCE,
 * Dividend Yield), the `getBadgeColor` function must return "green" if and
 * only if the value satisfies the favorable condition for that field, and
 * "red" otherwise. Unknown fields always return "neutral".
 *
 * **Validates: Requirements 3.3**
 */

const knownFields = fc.constantFrom(
  "pe_ratio",
  "roe",
  "roce",
  "dividend_yield"
);

const metricValue = fc.double({ min: -50, max: 200, noNaN: true });

function expectedColor(
  field: string,
  value: number
): "green" | "red" | "neutral" {
  switch (field) {
    case "pe_ratio":
      return value < 25 ? "green" : "red";
    case "roe":
      return value > 15 ? "green" : "red";
    case "roce":
      return value > 15 ? "green" : "red";
    case "dividend_yield":
      return value > 1.5 ? "green" : "red";
    default:
      return "neutral";
  }
}

describe("Property 4: Threshold badge color mapping", () => {
  it("getBadgeColor returns green iff value satisfies favorable condition for known fields", () => {
    fc.assert(
      fc.property(knownFields, metricValue, (field, value) => {
        const result = getBadgeColor(field, value);
        const expected = expectedColor(field, value);
        expect(result).toBe(expected);
      }),
      { numRuns: 150 }
    );
  });

  it("getBadgeColor returns neutral for unknown fields", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) =>
            !["pe_ratio", "roe", "roce", "dividend_yield"].includes(s)
        ),
        metricValue,
        (field, value) => {
          const result = getBadgeColor(field, value);
          expect(result).toBe("neutral");
        }
      ),
      { numRuns: 150 }
    );
  });
});
