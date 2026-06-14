import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchTickerData, fetchAllTickers, ApiError } from "./client";
import type { TickerResponse, AllTickersResponse } from "../types/index";

const mockTickerResponse: TickerResponse = {
  ticker: "JNKINDIA",
  company_name: "JNK India Limited",
  profile: {
    market_cap: 458700000000,
    pe_ratio: 22.4,
    roe: 18.7,
    roce: 21.3,
    dividend_yield: 1.2,
  },
  xgboost: { rating: "STRONG BUY", confidence: 0.87 },
  tft_score: { score: 72, trend_outlook: "Bullish" },
  gemma_summary: "Based on current fundamentals, JNKINDIA demonstrates strong growth.",
  historical: {
    dates: ["2024-12-18", "2024-12-19"],
    close_prices: [230.0, 232.5],
  },
  quarterly_financials: [
    {
      quarter: "Q3 FY25",
      revenue: 12500000000,
      expenses: 9800000000,
      operating_profit: 2700000000,
      net_profit: 1900000000,
      margin_pct: 15.2,
    },
  ],
};

const mockAllTickersResponse: AllTickersResponse = {
  tickers: [
    {
      ticker: "JNKINDIA",
      company_name: "JNK India Limited",
      market_cap: 458700000000,
      pe_ratio: 22.4,
      roe: 18.7,
      roce: 21.3,
      dividend_yield: 1.2,
      ai_rating: "STRONG BUY",
      ai_confidence: 0.87,
      tft_score: 72,
      tft_trend: "Bullish",
    },
  ],
};

describe("API Client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("fetchTickerData", () => {
    it("returns typed TickerResponse on success", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTickerResponse),
      });

      const result = await fetchTickerData("JNKINDIA");
      expect(result).toEqual(mockTickerResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/screener/JNKINDIA");
    });

    it("encodes ticker symbols with special characters", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTickerResponse),
      });

      await fetchTickerData("M&M");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/screener/M%26M");
    });

    it("throws ApiError with detail on 404", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: "Ticker not found on NSE: INVALID" }),
      });

      await expect(fetchTickerData("INVALID")).rejects.toThrow(ApiError);
      try {
        await fetchTickerData("INVALID");
      } catch (e) {
        const err = e as ApiError;
        expect(err.detail).toBe("Ticker not found on NSE: INVALID");
        expect(err.statusCode).toBe(404);
        expect(err.retryAfter).toBeUndefined();
      }
    });

    it("throws ApiError with retry_after on 503", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "Retry-After": "30" }),
        json: () =>
          Promise.resolve({
            detail: "NSE India data source is currently unavailable. Please retry later.",
            retry_after: 30,
          }),
      });

      await expect(fetchTickerData("JNKINDIA")).rejects.toThrow(ApiError);
      try {
        await fetchTickerData("JNKINDIA");
      } catch (e) {
        const err = e as ApiError;
        expect(err.detail).toBe("NSE India data source is currently unavailable. Please retry later.");
        expect(err.statusCode).toBe(503);
        expect(err.retryAfter).toBe(30);
      }
    });

    it("throws ApiError with retry_after on 429", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "5" }),
        json: () =>
          Promise.resolve({
            detail: "Rate limit exceeded. Please wait before retrying.",
            retry_after: 5,
          }),
      });

      await expect(fetchTickerData("JNKINDIA")).rejects.toThrow(ApiError);
      try {
        await fetchTickerData("JNKINDIA");
      } catch (e) {
        const err = e as ApiError;
        expect(err.detail).toBe("Rate limit exceeded. Please wait before retrying.");
        expect(err.statusCode).toBe(429);
        expect(err.retryAfter).toBe(5);
      }
    });

    it("extracts retry_after from Retry-After header when body lacks it", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "Retry-After": "60" }),
        json: () => Promise.resolve({ detail: "Service unavailable" }),
      });

      try {
        await fetchTickerData("JNKINDIA");
      } catch (e) {
        const err = e as ApiError;
        expect(err.retryAfter).toBe(60);
      }
    });

    it("throws descriptive Error on network failure (TypeError)", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(fetchTickerData("JNKINDIA")).rejects.toThrow(
        "Network error: Unable to reach the server. Please check your connection and try again."
      );
    });

    it("throws descriptive Error on timeout (AbortError)", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(fetchTickerData("JNKINDIA")).rejects.toThrow(
        'Request timed out while fetching data for ticker "JNKINDIA". Please try again.'
      );
    });

    it("handles non-JSON error response body gracefully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      try {
        await fetchTickerData("JNKINDIA");
      } catch (e) {
        const err = e as ApiError;
        expect(err.detail).toBe("Request failed with status 500");
        expect(err.statusCode).toBe(500);
      }
    });
  });

  describe("fetchAllTickers", () => {
    it("returns typed AllTickersResponse on success", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAllTickersResponse),
      });

      const result = await fetchAllTickers();
      expect(result).toEqual(mockAllTickersResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/screener/all");
    });

    it("throws ApiError on 503", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "Retry-After": "30" }),
        json: () =>
          Promise.resolve({
            detail: "NSE India data source is currently unavailable.",
            retry_after: 30,
          }),
      });

      await expect(fetchAllTickers()).rejects.toThrow(ApiError);
    });

    it("throws descriptive Error on network failure", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(fetchAllTickers()).rejects.toThrow(
        "Network error: Unable to reach the server. Please check your connection and try again."
      );
    });

    it("throws descriptive Error on timeout", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(fetchAllTickers()).rejects.toThrow(
        "Request timed out while fetching all tickers. Please try again."
      );
    });
  });
});
