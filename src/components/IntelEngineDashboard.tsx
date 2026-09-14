import type {
  HistoricalData,
  TFTOutput,
  XGBoostOutput,
} from "../types/index";
import { PriceChart } from "./PriceChart";
import { TFTScoreGauge } from "./TFTScoreGauge";
import { XGBoostRatingBadge } from "./XGBoostRatingBadge";

interface IntelEngineDashboardProps {
  historical: HistoricalData;
  tftScore: TFTOutput | null;
  xgboost: XGBoostOutput | null;
}

export function IntelEngineDashboard({
  historical,
  tftScore,
  xgboost,
}: IntelEngineDashboardProps) {
  const first = historical.close_prices[0];
  const last = historical.close_prices[historical.close_prices.length - 1];
  const changePct =
    historical.close_prices.length >= 2 && first
      ? ((last - first) / Math.abs(first)) * 100
      : null;
  const changeLabel =
    changePct === null
      ? "30-day change unavailable"
      : `30-day change ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%, trading days only`;

  return (
    <section
      aria-label="Price history with model assessment"
      className="animate-fade-in overflow-hidden rounded-[14px] border border-custom bg-surface-elevated"
    >
      <div className="grid gap-6 p-5 pb-4 md:grid-cols-[1fr_auto] md:items-start">
        <TFTScoreGauge tftScore={tftScore} />
        <XGBoostRatingBadge xgboost={xgboost} />
      </div>

      <div className="border-t border-custom px-3 pt-3">
        <PriceChart historical={historical} />
      </div>

      <p className="border-t border-custom px-5 py-3 text-xs tabular-nums text-fog">
        {changeLabel}
      </p>
    </section>
  );
}
