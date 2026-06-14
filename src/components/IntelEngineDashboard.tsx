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
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Chart section - 70% on desktop */}
      <div className="w-full lg:w-[70%] min-w-0 glass rounded-lg p-4 shadow-inner">
        <PriceChart historical={historical} />
      </div>

      {/* ML Scoring panel - 30% on desktop */}
      <div className="w-full lg:w-[30%] flex flex-col gap-0">
        <div className="glass rounded-lg">
          <TFTScoreGauge tftScore={tftScore} />
        </div>
        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent my-2" />
        <div className="glass rounded-lg">
          <XGBoostRatingBadge xgboost={xgboost} />
        </div>
      </div>
    </div>
  );
}
