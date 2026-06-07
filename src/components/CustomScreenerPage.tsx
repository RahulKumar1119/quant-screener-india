import { useScreenerQuery } from "../hooks/useScreenerQuery";
import { QueryInputArea } from "./QueryInputArea";
import { HelperPanel } from "./HelperPanel";
import { ScreenerResultsGrid } from "./ScreenerResultsGrid";

export function CustomScreenerPage() {
  const {
    results,
    error,
    loading,
    page,
    pageSize,
    totalPages,
    setPage,
    executeQuery,
  } = useScreenerQuery();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Custom Screener
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Build queries to filter Nifty 500 tickers by financial metrics and AI scores.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Loading ticker data…
        </div>
      ) : (
        <>
          {/* Query area + Helper panel layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Query input — 70% on desktop */}
            <div className="md:w-[70%]">
              <QueryInputArea onSubmit={executeQuery} error={error} />
            </div>

            {/* Helper panel — 30% on desktop */}
            <div className="md:w-[30%]">
              <HelperPanel />
            </div>
          </div>

          {/* Results grid */}
          <ScreenerResultsGrid
            results={results}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
