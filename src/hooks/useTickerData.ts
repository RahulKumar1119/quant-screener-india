import { useState, useEffect, useRef, useCallback } from "react";
import type { TickerResponse } from "../types/index";
import { fetchTickerData, ApiError } from "../api/client";
import { SAMPLE_TICKER } from "../mocks/sampleData";

interface UseTickerDataReturn {
  data: TickerResponse | null;
  loading: boolean;
  error: string | null;
  isPartial: boolean;
}

/**
 * Hook to fetch and cache ticker data from the API.
 * Falls back to sample data when the backend is unreachable (dev mode without backend).
 */
export function useTickerData(ticker: string): UseTickerDataReturn {
  const [data, setData] = useState<TickerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, TickerResponse>>(new Map());

  const fetchData = useCallback(async (symbol: string) => {
    if (!symbol) return;

    // Check cache first
    const cached = cacheRef.current.get(symbol);
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchTickerData(symbol);
      cacheRef.current.set(symbol, response);
      setData(response);
      setError(null);
    } catch (err: unknown) {
      // Fallback to sample data when backend is unreachable
      if (err instanceof Error && err.message.includes("Network error")) {
        const fallback = { ...SAMPLE_TICKER, ticker: symbol, company_name: `${symbol} (Demo Data)` };
        setData(fallback);
        setError(null);
        return;
      }

      setData(null);
      if (err instanceof ApiError) {
        switch (err.statusCode) {
          case 503:
            setError(
              err.retryAfter
                ? `Data source unavailable. Please retry in ${err.retryAfter}s.`
                : "Data source unavailable. Please retry later."
            );
            break;
          case 429:
            setError(
              err.retryAfter
                ? `Too many requests. Please wait ${err.retryAfter}s before retrying.`
                : "Too many requests. Please wait before retrying."
            );
            break;
          case 404:
            setError(`Ticker "${symbol}" not found.`);
            break;
          default:
            setError(err.detail || "An unexpected error occurred.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(ticker);
  }, [ticker, fetchData]);

  const isPartial =
    data !== null &&
    (data.xgboost === null ||
      data.lstm_projection === null ||
      data.tft_score === null);

  return { data, loading, error, isPartial };
}
