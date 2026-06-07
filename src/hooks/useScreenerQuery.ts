import { useState, useEffect, useCallback, useMemo } from "react";
import type { TickerSummary, QueryParseError } from "../types/index";
import { fetchAllTickers } from "../api/client";
import { parseQuery, evaluateQuery } from "../utils/queryParser";
import { SAMPLE_ALL_TICKERS } from "../mocks/sampleData";

interface UseScreenerQueryReturn {
  results: TickerSummary[];
  error: QueryParseError | null;
  loading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  executeQuery: (queryText: string) => void;
}

export function useScreenerQuery(pageSize = 20): UseScreenerQueryReturn {
  const [allTickers, setAllTickers] = useState<TickerSummary[]>([]);
  const [filteredResults, setFilteredResults] = useState<TickerSummary[]>([]);
  const [error, setError] = useState<QueryParseError | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch all tickers once on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchAllTickers();
        if (!cancelled) {
          setAllTickers(response.tickers);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          // Fallback to sample data when backend is unreachable
          setAllTickers(SAMPLE_ALL_TICKERS.tickers);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const executeQuery = useCallback(
    (queryText: string) => {
      const trimmed = queryText.trim();
      if (trimmed.length === 0) {
        setFilteredResults([]);
        setError(null);
        setPage(1);
        return;
      }

      const parseResult = parseQuery(trimmed);

      if (!parseResult.success) {
        setError(parseResult.error);
        setFilteredResults([]);
        setPage(1);
        return;
      }

      setError(null);
      const filtered = allTickers.filter((ticker) =>
        evaluateQuery(parseResult.parsed, ticker)
      );
      setFilteredResults(filtered);
      setPage(1);
    },
    [allTickers]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredResults.length / pageSize)),
    [filteredResults.length, pageSize]
  );

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, page, pageSize]);

  return {
    results: paginatedResults,
    error,
    loading,
    page,
    pageSize,
    totalPages,
    setPage,
    executeQuery,
  };
}
