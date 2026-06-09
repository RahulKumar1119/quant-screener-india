import { useParams } from "react-router-dom";
import { useTickerData } from "../hooks/useTickerData";
import { ProfileCardGrid } from "./ProfileCardGrid";
import { IntelEngineDashboard } from "./IntelEngineDashboard";
import { FinancialTable } from "./FinancialTable";
import { GemmaSummaryCard } from "./GemmaSummaryCard";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-24 rounded-lg"
          />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="skeleton h-96 rounded-lg" />
      {/* Table skeleton */}
      <div className="skeleton h-48 rounded-lg" />
      {/* Summary skeleton */}
      <div className="skeleton h-24 rounded-lg" />
    </div>
  );
}

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
}

function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const is503 = error.includes("unavailable");
  const is404 = error.includes("not found");

  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <svg
          className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Ticker not found
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`glass rounded-lg p-4 flex items-center justify-between ${
        is503
          ? "bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800"
          : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
      }`}
    >
      <p
        className={`text-sm ${
          is503
            ? "text-orange-800 dark:text-orange-200"
            : "text-red-800 dark:text-red-200"
        }`}
      >
        {error}
      </p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

export function AnalyticsPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const activeTicker = ticker || "JNKINDIA";
  const { data, loading, error, isPartial } = useTickerData(activeTicker);

  const handleRetry = () => {
    // Force refetch by reloading the page (cache won't have it since there was an error)
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ErrorBanner error={error} onRetry={handleRetry} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 transition-opacity duration-300">
      {/* Partial response banner */}
      {isPartial && (
        <div className="glass rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Some ML-powered analyses are temporarily unavailable. Showing
            available data.
          </p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.company_name}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data.ticker}
        </p>
      </div>

      {/* Profile Cards */}
      <ProfileCardGrid profile={data.profile} />

      {/* Intel Engine Dashboard: Chart + ML Scoring */}
      <IntelEngineDashboard
        historical={data.historical}
        lstmProjection={data.lstm_projection}
        tftScore={data.tft_score}
        xgboost={data.xgboost}
      />

      {/* Financial Table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Quarterly Financials
        </h2>
        <FinancialTable financials={data.quarterly_financials} />
      </div>

      {/* Gemma Summary */}
      <GemmaSummaryCard summary={data.gemma_summary} />
    </div>
  );
}
