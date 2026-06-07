import { useState } from "react";
import type { TickerSummary } from "../types/index";
import { formatIndianCurrency } from "../utils/indianFormat";

interface ScreenerResultsGridProps {
  results: TickerSummary[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type SortField =
  | "ticker"
  | "company_name"
  | "market_cap"
  | "pe_ratio"
  | "roe"
  | "ai_rating"
  | "tft_score";

type SortDirection = "asc" | "desc";

const RATING_ORDER: Record<string, number> = {
  "STRONG BUY": 4,
  BUY: 3,
  HOLD: 2,
  SELL: 1,
};

export function ScreenerResultsGrid({
  results,
  page,
  pageSize,
  totalPages,
  onPageChange,
}: ScreenerResultsGridProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortField) return 0;

    let aVal: string | number;
    let bVal: string | number;

    if (sortField === "ai_rating") {
      aVal = RATING_ORDER[a.ai_rating] ?? 0;
      bVal = RATING_ORDER[b.ai_rating] ?? 0;
    } else {
      aVal = a[sortField];
      bVal = b[sortField];
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const numA = Number(aVal);
    const numB = Number(bVal);
    return sortDirection === "asc" ? numA - numB : numB - numA;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400 ml-1">↕</span>;
    return (
      <span className="text-blue-500 ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No results. Run a query to see matching tickers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th
                onClick={() => handleSort("ticker")}
                className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                Ticker <SortIcon field="ticker" />
              </th>
              <th
                onClick={() => handleSort("company_name")}
                className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                Company <SortIcon field="company_name" />
              </th>
              <th
                onClick={() => handleSort("market_cap")}
                className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                Market Cap <SortIcon field="market_cap" />
              </th>
              <th
                onClick={() => handleSort("pe_ratio")}
                className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                PE <SortIcon field="pe_ratio" />
              </th>
              <th
                onClick={() => handleSort("roe")}
                className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                ROE <SortIcon field="roe" />
              </th>
              <th
                onClick={() => handleSort("ai_rating")}
                className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                AI Rating <SortIcon field="ai_rating" />
              </th>
              <th
                onClick={() => handleSort("tft_score")}
                className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
              >
                TFT Score <SortIcon field="tft_score" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedResults.map((ticker) => (
              <tr
                key={ticker.ticker}
                className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">
                  {ticker.ticker}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {ticker.company_name}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                  {formatIndianCurrency(ticker.market_cap)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {ticker.pe_ratio.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {ticker.roe.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <RatingBadge rating={ticker.ai_rating} />
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">
                  {ticker.tft_score.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: string }) {
  const colorMap: Record<string, string> = {
    "STRONG BUY":
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    BUY: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200",
    HOLD: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    SELL: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  };

  const colors =
    colorMap[rating] ??
    "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors}`}
    >
      {rating}
    </span>
  );
}
