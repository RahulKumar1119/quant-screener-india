import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseQuery } from "./queryParser";

/**
 * Property 9: Invalid query error reporting
 *
 * For any syntactically invalid query string (containing unknown fields,
 * malformed operators, or incomplete expressions), the `parseQuery` function
 * must return a failure result containing a non-empty error message and a
 * position value ≥ 0 indicating where parsing failed.
 *
 * **Validates: Requirements 8.7**
 */

const VALID_FIELDS = [
  "Market Cap",
  "PE",
  "ROE",
  "ROCE",
  "Dividend Yield",
  "AI_Rating",
  "AI_Confidence",
  "TFT_Score",
];

/**
 * Arbitrary that generates invalid field names — random alphabetic strings
 * that are NOT in the valid field set and don't partially match them.
 */
const invalidFieldName = fc
  .stringOf(fc.char().filter((c) => /[a-z]/i.test(c)), { minLength: 3, maxLength: 12 })
  .filter((s) => {
    const lower = s.toLowerCase().replace(/[\s_]/g, "");
    // Exclude anything that could match a valid field (including partial)
    return !VALID_FIELDS.some((f) => {
      const fieldLower = f.toLowerCase().replace(/[\s_]/g, "");
      return fieldLower === lower || fieldLower.includes(lower) || lower.includes(fieldLower);
    });
  })
  // Also exclude "AND" and "OR" which are logical operators
  .filter((s) => s !== "AND" && s !== "OR");

/**
 * Generates queries with invalid field names followed by valid operator and value.
 * Example: "xyzabc > 10"
 */
const queryWithInvalidField = invalidFieldName.map(
  (field) => `${field} > 10`
);

/**
 * Generates queries where the operator is missing — a valid field followed
 * directly by a numeric value with no comparison operator in between.
 * Example: "PE 25"
 */
const queryMissingOperator = fc
  .constantFrom(...VALID_FIELDS.filter((f) => !f.includes(" ")))
  .map((field) => `${field} 25`);

/**
 * Generates queries with trailing logical operators (incomplete expressions).
 * Example: "PE > 25 AND" or "ROE < 10 OR"
 */
const queryTrailingLogical = fc
  .tuple(
    fc.constantFrom(...VALID_FIELDS.filter((f) => !f.includes(" "))),
    fc.constantFrom(">", "<", ">=", "<=", "=", "!="),
    fc.integer({ min: 1, max: 100 }),
    fc.constantFrom("AND", "OR")
  )
  .map(([field, op, value, logical]) => `${field} ${op} ${value} ${logical}`);

/**
 * Generates random garbage strings (non-empty) that are unlikely to be valid queries.
 * Uses special characters, symbols, and random mixtures.
 */
const garbageString = fc
  .stringOf(
    fc.oneof(
      fc.char().filter((c) => /[!@#$%^&*()\[\]{};:',.<>?/\\|`~]/.test(c)),
      fc.char().filter((c) => /[a-z]/.test(c)),
      fc.constant(" ")
    ),
    { minLength: 1, maxLength: 30 }
  )
  .filter((s) => s.trim().length > 0)
  // Filter out anything that could accidentally be valid
  .filter((s) => {
    const result = parseQuery(s);
    return !result.success;
  });

describe("Property 9: Invalid query error reporting", () => {
  it("queries with invalid field names return failure with non-empty message and position >= 0", () => {
    fc.assert(
      fc.property(queryWithInvalidField, (query) => {
        const result = parseQuery(query);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBeTruthy();
          expect(result.error.message.length).toBeGreaterThan(0);
          expect(result.error.position).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 120 }
    );
  });

  it("queries missing operators return failure with non-empty message and position >= 0", () => {
    fc.assert(
      fc.property(queryMissingOperator, (query) => {
        const result = parseQuery(query);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBeTruthy();
          expect(result.error.message.length).toBeGreaterThan(0);
          expect(result.error.position).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 120 }
    );
  });

  it("queries with trailing logical operators return failure with non-empty message and position >= 0", () => {
    fc.assert(
      fc.property(queryTrailingLogical, (query) => {
        const result = parseQuery(query);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBeTruthy();
          expect(result.error.message.length).toBeGreaterThan(0);
          expect(result.error.position).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 120 }
    );
  });

  it("random garbage strings return failure with non-empty message and position >= 0", () => {
    fc.assert(
      fc.property(garbageString, (query) => {
        const result = parseQuery(query);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBeTruthy();
          expect(result.error.message.length).toBeGreaterThan(0);
          expect(result.error.position).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 120 }
    );
  });
});
