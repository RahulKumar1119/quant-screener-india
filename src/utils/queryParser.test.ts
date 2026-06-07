import { describe, it, expect } from "vitest";
import { parseQuery, evaluateQuery } from "./queryParser";
import type { TickerSummary, ParsedQuery } from "../types/index";

const mockTicker: TickerSummary = {
  ticker: "RELIANCE",
  company_name: "Reliance Industries",
  market_cap: 1500000000000,
  pe_ratio: 22.5,
  roe: 18.3,
  roce: 20.1,
  dividend_yield: 0.5,
  ai_rating: "STRONG BUY",
  ai_confidence: 0.85,
  tft_score: 75,
  tft_trend: "Bullish",
};

describe("parseQuery", () => {
  it("parses a simple numeric condition", () => {
    const result = parseQuery("PE < 25");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions).toHaveLength(1);
      expect(result.parsed.conditions[0]).toEqual({
        field: "PE",
        operator: "<",
        value: 25,
      });
      expect(result.parsed.logicalOperators).toHaveLength(0);
    }
  });

  it("parses a condition with multi-word field", () => {
    const result = parseQuery("Market Cap > 10000000000");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions[0]).toEqual({
        field: "Market Cap",
        operator: ">",
        value: 10000000000,
      });
    }
  });

  it("parses AND-connected conditions", () => {
    const result = parseQuery("PE < 25 AND ROE > 15");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions).toHaveLength(2);
      expect(result.parsed.logicalOperators).toEqual(["AND"]);
      expect(result.parsed.conditions[0]).toEqual({
        field: "PE",
        operator: "<",
        value: 25,
      });
      expect(result.parsed.conditions[1]).toEqual({
        field: "ROE",
        operator: ">",
        value: 15,
      });
    }
  });

  it("parses OR-connected conditions", () => {
    const result = parseQuery("TFT_Score >= 70 OR AI_Confidence > 0.8");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions).toHaveLength(2);
      expect(result.parsed.logicalOperators).toEqual(["OR"]);
    }
  });

  it("parses quoted string values", () => {
    const result = parseQuery('AI_Rating = "STRONG BUY"');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions[0]).toEqual({
        field: "AI_Rating",
        operator: "=",
        value: "STRONG BUY",
      });
    }
  });

  it("parses multi-word field Dividend Yield", () => {
    const result = parseQuery("Dividend Yield > 1.5");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions[0]).toEqual({
        field: "Dividend Yield",
        operator: ">",
        value: 1.5,
      });
    }
  });

  it("parses != operator", () => {
    const result = parseQuery('AI_Rating != "SELL"');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions[0].operator).toBe("!=");
    }
  });

  it("parses complex query with mixed AND and OR", () => {
    const result = parseQuery("PE < 25 AND ROE > 15 OR TFT_Score >= 80");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.conditions).toHaveLength(3);
      expect(result.parsed.logicalOperators).toEqual(["AND", "OR"]);
    }
  });

  it("returns error for empty query", () => {
    const result = parseQuery("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Empty query");
      expect(result.error.position).toBe(0);
    }
  });

  it("returns error for unknown field with suggestion", () => {
    const result = parseQuery("MarketCap > 100");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Unknown field");
      expect(result.error.message).toContain("Market Cap");
      expect(result.error.position).toBe(0);
    }
  });

  it("returns error for missing operator", () => {
    const result = parseQuery("PE 25");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("comparison operator");
    }
  });

  it("returns error for missing value after operator", () => {
    const result = parseQuery("PE >");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Expected a value");
    }
  });

  it("returns error for trailing logical operator", () => {
    const result = parseQuery("PE > 25 AND");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain(
        "Expected a condition after logical operator"
      );
    }
  });
});

describe("evaluateQuery", () => {
  it("evaluates greater than correctly", () => {
    const query: ParsedQuery = {
      conditions: [{ field: "PE", operator: ">", value: 20 }],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates less than correctly", () => {
    const query: ParsedQuery = {
      conditions: [{ field: "PE", operator: "<", value: 25 }],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates greater than or equal correctly", () => {
    const query: ParsedQuery = {
      conditions: [{ field: "TFT_Score", operator: ">=", value: 75 }],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates less than or equal correctly", () => {
    const query: ParsedQuery = {
      conditions: [{ field: "ROE", operator: "<=", value: 18.3 }],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates equality correctly", () => {
    const query: ParsedQuery = {
      conditions: [{ field: "AI_Rating", operator: "=", value: "STRONG BUY" }],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates inequality correctly", () => {
    const query: ParsedQuery = {
      conditions: [{ field: "AI_Rating", operator: "!=", value: "SELL" }],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates AND logic correctly - both true", () => {
    const query: ParsedQuery = {
      conditions: [
        { field: "PE", operator: "<", value: 25 },
        { field: "ROE", operator: ">", value: 15 },
      ],
      logicalOperators: ["AND"],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates AND logic correctly - one false", () => {
    const query: ParsedQuery = {
      conditions: [
        { field: "PE", operator: "<", value: 20 },
        { field: "ROE", operator: ">", value: 15 },
      ],
      logicalOperators: ["AND"],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(false);
  });

  it("evaluates OR logic correctly - one true", () => {
    const query: ParsedQuery = {
      conditions: [
        { field: "PE", operator: "<", value: 20 },
        { field: "ROE", operator: ">", value: 15 },
      ],
      logicalOperators: ["OR"],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates OR logic correctly - both false", () => {
    const query: ParsedQuery = {
      conditions: [
        { field: "PE", operator: "<", value: 10 },
        { field: "ROE", operator: ">", value: 30 },
      ],
      logicalOperators: ["OR"],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(false);
  });

  it("AND binds tighter than OR", () => {
    // PE < 20 AND ROE > 15 OR TFT_Score >= 70
    // Should be: (PE<20 AND ROE>15) OR (TFT_Score>=70)
    // (false AND true) OR true => false OR true => true
    const query: ParsedQuery = {
      conditions: [
        { field: "PE", operator: "<", value: 20 },
        { field: "ROE", operator: ">", value: 15 },
        { field: "TFT_Score", operator: ">=", value: 70 },
      ],
      logicalOperators: ["AND", "OR"],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("AND binds tighter than OR - complex case", () => {
    // TFT_Score >= 100 OR PE < 25 AND ROE > 15
    // Should be: (TFT_Score>=100) OR (PE<25 AND ROE>15)
    // false OR (true AND true) => false OR true => true
    const query: ParsedQuery = {
      conditions: [
        { field: "TFT_Score", operator: ">=", value: 100 },
        { field: "PE", operator: "<", value: 25 },
        { field: "ROE", operator: ">", value: 15 },
      ],
      logicalOperators: ["OR", "AND"],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates Market Cap condition with large numbers", () => {
    const query: ParsedQuery = {
      conditions: [
        { field: "Market Cap", operator: ">", value: 1000000000000 },
      ],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("evaluates decimal values correctly", () => {
    const query: ParsedQuery = {
      conditions: [
        { field: "AI_Confidence", operator: ">", value: 0.8 },
      ],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });

  it("returns true for empty conditions", () => {
    const query: ParsedQuery = {
      conditions: [],
      logicalOperators: [],
    };
    expect(evaluateQuery(query, mockTicker)).toBe(true);
  });
});
