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
    if (sortField !== field) return <span className="text-fog ml-1">↕</span>;
    return (
      <span className="text-primary ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  if (results.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center">
        <p className="text-sm text-fog">
          No results. Run a query to see matching tickers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto glass rounded-lg min-w-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-custom">
            <tr>
              <th
                onClick={() => handleSort("ticker")}
                className="px-4 py-3 text-left font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                Ticker <SortIcon field="ticker" />
              </th>
              <th
                onClick={() => handleSort("company_name")}
                className="px-4 py-3 text-left font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                Company <SortIcon field="company_name" />
              </th>
              <th
                onClick={() => handleSort("market_cap")}
                className="px-4 py-3 text-right font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                Market Cap <SortIcon field="market_cap" />
              </th>
              <th
                onClick={() => handleSort("pe_ratio")}
                className="px-4 py-3 text-right font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                PE <SortIcon field="pe_ratio" />
              </th>
              <th
                onClick={() => handleSort("roe")}
                className="px-4 py-3 text-right font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                ROE <SortIcon field="roe" />
              </th>
              <th
                onClick={() => handleSort("ai_rating")}
                className="px-4 py-3 text-center font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                AI Rating <SortIcon field="ai_rating" />
              </th>
              <th
                onClick={() => handleSort("tft_score")}
                className="px-4 py-3 text-right font-medium text-fog cursor-pointer hover:text-primary select-none"
              >
                TFT Score <SortIcon field="tft_score" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-custom">
            {sortedResults.map((ticker) => (
              <tr
                key={ticker.ticker}
                className="hover:bg-primary/5 transition-colors duration-150"
              >
                <td className="px-4 py-3 font-medium text-primary">
                  {ticker.ticker}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {ticker.company_name}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                  {formatIndianCurrency(ticker.market_cap)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                  {ticker.pe_ratio.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                  {ticker.roe.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <RatingBadge rating={ticker.ai_rating} />
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium tabular-nums">
                  {ticker.tft_score.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-fog tabular-nums">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-md border border-custom text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:text-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-md border border-custom text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:text-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
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
    "STRONG BUY": "bg-leaf/10 text-leaf",
    BUY: "bg-accent/10 text-accent",
    HOLD: "bg-primary/10 text-primary",
    SELL: "bg-clay/10 text-clay",
  };

  const colors =
    colorMap[rating] ??
    "bg-gray-500/10 text-fog";

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors}`}
    >
      {rating}
    </span>
  );
}
