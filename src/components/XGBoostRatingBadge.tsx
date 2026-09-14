import type { XGBoostOutput, AIRating } from "../types/index";

interface XGBoostRatingBadgeProps {
  xgboost: XGBoostOutput | null;
}

const stampStyles: Record<AIRating, string> = {
  "STRONG BUY": "border-leaf text-leaf",
  BUY: "border-accent text-accent",
  HOLD: "border-primary text-primary",
  SELL: "border-clay text-clay",
};

export function XGBoostRatingBadge({ xgboost }: XGBoostRatingBadgeProps) {
  if (!xgboost) {
    return (
      <div className="py-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyst rating</p>
        <p className="mt-1 text-sm text-fog">
          Rating unavailable for this ticker.
        </p>
      </div>
    );
  }

  const { rating, confidence } = xgboost;

  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyst rating</p>
        <p className="mt-1 text-xs tabular-nums text-fog">
          Confidence {(confidence * 100).toFixed(0)}%
        </p>
      </div>
      <span
        aria-label={`AI rating ${rating}`}
        className={`-rotate-2 rounded-[6px] border-2 bg-transparent px-3 py-1 text-sm font-bold tracking-wide ${stampStyles[rating]}`}
      >
        {rating}
      </span>
    </div>
  );
}
