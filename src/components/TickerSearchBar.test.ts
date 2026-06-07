import { describe, it, expect } from "vitest";
import type { TickerSummary } from "../types/index";

/**
 * Tests for the ticker search filtering logic used by TickerSearchBar.
 * The component performs case-insensitive substring matching on ticker symbol
 * and returns at most 10 results.
 */

// Replicate the filtering logic from TickerSearchBar
function filterTickers(tickers: TickerSummary[], query: string): TickerSummary[] {
  if (query.trim().length === 0) return [];
  const lowerQuery = query.toLowerCase();
  const filtered = tickers.filter((t) =>
    t.ticker.toLowerCase().includes(lowerQuery)
  );
  return filtered.slice(0, 10);
}

function makeTicker(ticker: string, companyName = "Test Co"): TickerSummary {
  return {
    ticker,
    company_name: companyName,
    market_cap: 100000,
    pe_ratio: 20,
    roe: 15,
    roce: 18,
    dividend_yield: 1.5,
    ai_rating: "BUY",
    ai_confidence: 0.8,
    tft_score: 70,
    tft_trend: "Bullish",
  };
}

describe("TickerSearchBar filtering logic", () => {
  const sampleTickers: TickerSummary[] = [
    makeTicker("RELIANCE", "Reliance Industries"),
    makeTicker("TCS", "Tata Consultancy Services"),
    makeTicker("INFY", "Infosys"),
    makeTicker("HDFCBANK", "HDFC Bank"),
    makeTicker("ICICIBANK", "ICICI Bank"),
    makeTicker("TATAMOTORS", "Tata Motors"),
    makeTicker("TATASTEEL", "Tata Steel"),
    makeTicker("BAJFINANCE", "Bajaj Finance"),
    makeTicker("WIPRO", "Wipro"),
    makeTicker("SBIN", "State Bank of India"),
    makeTicker("JNKINDIA", "JNK India"),
    makeTicker("INDIANHOTEL", "Indian Hotels"),
  ];

  it("returns empty array for empty query", () => {
    expect(filterTickers(sampleTickers, "")).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    expect(filterTickers(sampleTickers, "   ")).toEqual([]);
  });

  it("performs case-insensitive substring match on ticker symbol", () => {
    const result = filterTickers(sampleTickers, "tata");
    expect(result).toHaveLength(2);
    expect(result[0].ticker).toBe("TATAMOTORS");
    expect(result[1].ticker).toBe("TATASTEEL");
  });

  it("matches partial substrings", () => {
    const result = filterTickers(sampleTickers, "bank");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.ticker)).toContain("HDFCBANK");
    expect(result.map((t) => t.ticker)).toContain("ICICIBANK");
  });

  it("is case-insensitive — uppercase query", () => {
    const result = filterTickers(sampleTickers, "INFY");
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("INFY");
  });

  it("is case-insensitive — mixed case query", () => {
    const result = filterTickers(sampleTickers, "Rel");
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("RELIANCE");
  });

  it("returns at most 10 results", () => {
    // Create 15 tickers that all match
    const manyTickers = Array.from({ length: 15 }, (_, i) =>
      makeTicker(`TEST${i}`, `Test Company ${i}`)
    );
    const result = filterTickers(manyTickers, "test");
    expect(result).toHaveLength(10);
  });

  it("returns no results for unmatched query", () => {
    const result = filterTickers(sampleTickers, "xyz");
    expect(result).toEqual([]);
  });

  it("matches ticker containing the search string anywhere", () => {
    const result = filterTickers(sampleTickers, "india");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.ticker)).toContain("JNKINDIA");
    expect(result.map((t) => t.ticker)).toContain("INDIANHOTEL");
  });
});
