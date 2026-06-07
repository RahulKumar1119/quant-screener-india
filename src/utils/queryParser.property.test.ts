import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { evaluateQuery } from "./queryParser";
import type {
  TickerSummary,
  ParsedQuery,
  QueryCondition,
  ComparisonOperator,
  LogicalOperator,
  AIRating,
  TrendOutlook,
} from "../types/index";

/**
 * Property 8: Custom screener query filtering
 *
 * For any valid parsed query and for any ticker in the result set returned by
 * `evaluateQuery`, every condition in the query must be satisfied by that
 * ticker's field values when combined with the specified logical operators.
 *
 * **Validates: Requirements 8.4, 8.6**
 */

// Field mapping matching queryParser.ts FIELD_MAP
const FIELD_MAP: Record<string, keyof TickerSummary> = {
  "Market Cap": "market_cap",
  PE: "pe_ratio",
  ROE: "roe",
  ROCE: "roce",
  "Dividend Yield": "dividend_yield",
  AI_Confidence: "ai_confidence",
  TFT_Score: "tft_score",
};

const NUMERIC_FIELDS = Object.keys(FIELD_MAP);
const COMPARISON_OPERATORS: ComparisonOperator[] = [">", "<", ">=", "<=", "=", "!="];

// --- Arbitraries ---

const aiRatingArb: fc.Arbitrary<AIRating> = fc.constantFrom(
  "STRONG BUY",
  "BUY",
  "HOLD",
  "SELL"
);

const trendOutlookArb: fc.Arbitrary<TrendOutlook> = fc.constantFrom(
  "Bullish",
  "Bearish",
  "Neutral"
);

/**
 * Generates random TickerSummary objects with realistic ranges.
 */
const tickerSummaryArb: fc.Arbitrary<TickerSummary> = fc.record({
  ticker: fc.stringMatching(/^[A-Z]{3,10}$/),
  company_name: fc.string({ minLength: 3, maxLength: 30 }),
  market_cap: fc.double({ min: 1e8, max: 1e13, noNaN: true }),
  pe_ratio: fc.double({ min: 1, max: 100, noNaN: true }),
  roe: fc.double({ min: -10, max: 50, noNaN: true }),
  roce: fc.double({ min: -5, max: 60, noNaN: true }),
  dividend_yield: fc.double({ min: 0, max: 10, noNaN: true }),
  ai_rating: aiRatingArb,
  ai_confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  tft_score: fc.integer({ min: 0, max: 100 }),
  tft_trend: trendOutlookArb,
});

/**
 * Generates a random numeric query condition with a valid field, operator, and value.
 */
const numericConditionArb: fc.Arbitrary<QueryCondition> = fc
  .record({
    field: fc.constantFrom(...NUMERIC_FIELDS),
    operator: fc.constantFrom(...COMPARISON_OPERATORS),
    value: fc.double({ min: -10, max: 1e13, noNaN: true }),
  });

/**
 * Generates a valid ParsedQuery with 1-3 conditions using numeric fields.
 */
const parsedQueryArb: fc.Arbitrary<ParsedQuery> = fc
  .integer({ min: 1, max: 3 })
  .chain((numConditions) => {
    const conditionsArb = fc.array(numericConditionArb, {
      minLength: numConditions,
      maxLength: numConditions,
    });
    const logicalOpsArb =
      numConditions > 1
        ? fc.array(fc.constantFrom<LogicalOperator>("AND", "OR"), {
            minLength: numConditions - 1,
            maxLength: numConditions - 1,
          })
        : fc.constant([] as LogicalOperator[]);

    return fc.tuple(conditionsArb, logicalOpsArb).map(([conditions, logicalOperators]) => ({
      conditions,
      logicalOperators,
    }));
  });

// --- Independent evaluation logic for verification ---

/**
 * Independently evaluates a single condition against a ticker (mirrors queryParser logic).
 */
function verifyCondition(condition: QueryCondition, ticker: TickerSummary): boolean {
  const fieldKey = FIELD_MAP[condition.field];
  if (!fieldKey) {
    return false;
  }

  const tickerValue = ticker[fieldKey];
  const conditionValue = condition.value;

  // Numeric comparison
  const numValue = Number(tickerValue);
  if (isNaN(numValue)) {
    return false;
  }

  const numCondValue = Number(conditionValue);
  if (isNaN(numCondValue)) {
    return false;
  }

  switch (condition.operator) {
    case ">":
      return numValue > numCondValue;
    case "<":
      return numValue < numCondValue;
    case ">=":
      return numValue >= numCondValue;
    case "<=":
      return numValue <= numCondValue;
    case "=":
      return numValue === numCondValue;
    case "!=":
      return numValue !== numCondValue;
    default:
      return false;
  }
}

/**
 * Independently evaluates a full parsed query with AND/OR precedence
 * (AND binds tighter than OR).
 */
function verifyQuery(query: ParsedQuery, ticker: TickerSummary): boolean {
  const { conditions, logicalOperators } = query;

  if (conditions.length === 0) {
    return true;
  }

  // Evaluate each condition individually
  const results = conditions.map((condition) => verifyCondition(condition, ticker));

  // Apply AND/OR precedence: group by OR, each group is ANDed
  const orGroups: boolean[][] = [[]];
  orGroups[0].push(results[0]);

  for (let i = 0; i < logicalOperators.length; i++) {
    if (logicalOperators[i] === "OR") {
      orGroups.push([results[i + 1]]);
    } else {
      // AND: add to current group
      orGroups[orGroups.length - 1].push(results[i + 1]);
    }
  }

  // Overall: any OR group where all AND conditions are true
  return orGroups.some((group) => group.every((result) => result));
}

// --- Property Test ---

describe("Property 8: Custom screener query filtering", () => {
  it("evaluateQuery result matches independent condition verification for any valid query and ticker", () => {
    fc.assert(
      fc.property(parsedQueryArb, tickerSummaryArb, (query, ticker) => {
        const actual = evaluateQuery(query, ticker);
        const expected = verifyQuery(query, ticker);

        expect(actual).toBe(expected);
      }),
      { numRuns: 120 }
    );
  });
});
