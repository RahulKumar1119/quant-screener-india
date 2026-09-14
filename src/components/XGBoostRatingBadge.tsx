import type { XGBoostOutput, AIRating } from "../types/index";

interface XGBoostRatingBadgeProps {
  xgboost: XGBoostOutput | null;
}

const stampStyles: Record<AIRating, string> = {
  "STRONG BUY": "border-[#2FA36B] text-[#2FA36B]",
  BUY: "border-[#7FB894] text-[#7FB894]",
  HOLD: "border-[#C8A96A] text-[#C8A96A]",
  SELL: "border-[#C2503A] text-[#C2503A]",
};

export function XGBoostRatingBadge({ xgboost }: XGBoostRatingBadgeProps) {
  if (!xgboost) {
    return (
      <div className="py-1">
        <p className="text-sm font-medium text-gray-300">Analyst rating</p>
        <p className="mt-1 text-sm text-[#9AA4B2]">
          Rating unavailable for this ticker.
        </p>
      </div>
    );
  }

  const { rating, confidence } = xgboost;

  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-gray-300">Analyst rating</p>
        <p className="mt-1 text-xs tabular-nums text-[#9AA4B2]">
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
