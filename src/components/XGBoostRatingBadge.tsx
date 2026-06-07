import type { XGBoostOutput } from "../types/index";
import { ratingColorMap } from "../utils/thresholds";

interface XGBoostRatingBadgeProps {
  xgboost: XGBoostOutput | null;
}

export function XGBoostRatingBadge({ xgboost }: XGBoostRatingBadgeProps) {
  if (!xgboost) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Rating unavailable
        </p>
      </div>
    );
  }

  const { rating, confidence } = xgboost;
  const colorClass = ratingColorMap[rating];

  return (
    <div className="flex flex-col items-center p-4 gap-2">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
        XGBoost AI Rating
      </p>
      <span
        className={`inline-block px-4 py-2 text-sm font-bold rounded-lg ${colorClass}`}
      >
        {rating}
      </span>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Confidence: {(confidence * 100).toFixed(0)}%
      </p>
    </div>
  );
}
