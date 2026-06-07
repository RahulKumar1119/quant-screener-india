import type { TickerProfile } from "../types/index";
import { formatIndianCurrency, formatPercentage } from "../utils/indianFormat";
import { getBadgeColor } from "../utils/thresholds";

interface ProfileCardGridProps {
  profile: TickerProfile;
}

interface MetricCard {
  label: string;
  field: string;
  value: string;
  rawValue: number;
}

const badgeClasses: Record<"green" | "red" | "neutral", string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export function ProfileCardGrid({ profile }: ProfileCardGridProps) {
  const metrics: MetricCard[] = [
    {
      label: "Market Cap",
      field: "market_cap",
      value: formatIndianCurrency(profile.market_cap),
      rawValue: profile.market_cap,
    },
    {
      label: "P/E Ratio",
      field: "pe_ratio",
      value: profile.pe_ratio.toFixed(1),
      rawValue: profile.pe_ratio,
    },
    {
      label: "ROE",
      field: "roe",
      value: formatPercentage(profile.roe),
      rawValue: profile.roe,
    },
    {
      label: "ROCE",
      field: "roce",
      value: formatPercentage(profile.roce),
      rawValue: profile.roce,
    },
    {
      label: "Dividend Yield",
      field: "dividend_yield",
      value: formatPercentage(profile.dividend_yield),
      rawValue: profile.dividend_yield,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => {
        const color = getBadgeColor(metric.field, metric.rawValue);
        return (
          <div
            key={metric.field}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {metric.label}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {metric.value}
            </p>
            <span
              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badgeClasses[color]}`}
            >
              {color === "green"
                ? "Favorable"
                : color === "red"
                  ? "Unfavorable"
                  : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
