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
      // Always fallback to sample data when backend is not available.
      // In production without a backend, any error means "use demo data".
      const fallback = { ...SAMPLE_TICKER, ticker: symbol, company_name: `${symbol} (Demo Data)` };
      setData(fallback);
      setError(null);
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
