import { useScreenerQuery } from "../hooks/useScreenerQuery";
import { QueryInputArea } from "./QueryInputArea";
import { HelperPanel } from "./HelperPanel";
import { ScreenerResultsGrid } from "./ScreenerResultsGrid";

function ScreenerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-[70%]">
          <div className="skeleton h-40 w-full" />
        </div>
        <div className="md:w-[30%]">
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  );
}

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
        <h1 className="text-2xl font-bold border-l-4 border-indigo-500 pl-3 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Custom Screener
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-3">
          Build queries to filter NSE tickers by financial metrics and AI scores.
        </p>
      </div>

      {loading ? (
        <ScreenerSkeleton />
      ) : (
        <div className="transition-opacity duration-200">
          {/* Query area + Helper panel layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Query input — 70% on desktop */}
            <div className="md:w-[70%] glass rounded-lg p-4">
              <QueryInputArea onSubmit={executeQuery} error={error} />
            </div>

            {/* Helper panel — 30% on desktop */}
            <div className="md:w-[30%] glass rounded-lg p-4 bg-indigo-500/5 dark:bg-indigo-400/5">
              <HelperPanel />
            </div>
          </div>

          {/* Results grid */}
          <div className="mt-6">
            <ScreenerResultsGrid
              results={results}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
