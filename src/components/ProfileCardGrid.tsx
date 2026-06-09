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
  green: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900 dark:to-emerald-900 dark:text-green-200 shadow-sm shadow-green-500/20",
  red: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900 dark:to-rose-900 dark:text-red-200 shadow-sm shadow-red-500/20",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const topBorderColors: Record<"green" | "red" | "neutral", string> = {
  green: "border-t-green-500",
  red: "border-t-red-500",
  neutral: "border-t-slate-300 dark:border-t-slate-600",
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
      {metrics.map((metric, index) => {
        const color = getBadgeColor(metric.field, metric.rawValue);
        return (
          <div
            key={metric.field}
            className={`glass rounded-lg border-t-2 ${topBorderColors[color]} p-4 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 animate-fade-in`}
            style={{ animationDelay: `${index * 60}ms` }}
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
