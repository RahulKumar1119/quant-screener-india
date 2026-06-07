import type {
  HistoricalData,
  LSTMProjection,
  TFTOutput,
  XGBoostOutput,
} from "../types/index";
import { PriceChart } from "./PriceChart";
import { TFTScoreGauge } from "./TFTScoreGauge";
import { XGBoostRatingBadge } from "./XGBoostRatingBadge";

interface IntelEngineDashboardProps {
  historical: HistoricalData;
  lstmProjection: LSTMProjection | null;
  tftScore: TFTOutput | null;
  xgboost: XGBoostOutput | null;
}

export function IntelEngineDashboard({
  historical,
  lstmProjection,
  tftScore,
  xgboost,
}: IntelEngineDashboardProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Chart section - 70% on desktop */}
      <div className="w-full lg:w-[70%] min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <PriceChart historical={historical} lstmProjection={lstmProjection} />
      </div>

      {/* ML Scoring panel - 30% on desktop */}
      <div className="w-full lg:w-[30%] flex flex-col gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <TFTScoreGauge tftScore={tftScore} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <XGBoostRatingBadge xgboost={xgboost} />
        </div>
      </div>
    </div>
  );
}
