import { PieChart, Pie, Cell } from "recharts";
import type { TFTOutput, TrendOutlook } from "../types/index";

interface TFTScoreGaugeProps {
  tftScore: TFTOutput | null;
}

const trendColors: Record<TrendOutlook, string> = {
  Bullish: "text-green-600 dark:text-green-400",
  Bearish: "text-red-600 dark:text-red-400",
  Neutral: "text-amber-600 dark:text-amber-400",
};

export function TFTScoreGauge({ tftScore }: TFTScoreGaugeProps) {
  if (!tftScore) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          ML analysis unavailable
        </p>
      </div>
    );
  }

  const { score, trend_outlook } = tftScore;

  // Semi-circle gauge data: filled portion + remaining
  const gaugeData = [
    { name: "score", value: score },
    { name: "remaining", value: 100 - score },
  ];

  // Determine fill color based on score
  const getScoreColor = (s: number): string => {
    if (s >= 65) return "#16a34a"; // green-600
    if (s <= 35) return "#dc2626"; // red-600
    return "#d97706"; // amber-600
  };

  const fillColor = getScoreColor(score);

  // Theme-aware remaining color for gauge background
  const isDark = document.documentElement.classList.contains("dark");
  const remainingColor = isDark ? "#374151" : "#e5e7eb"; // gray-700 / gray-200

  return (
    <div className="flex flex-col items-center p-4">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
        TFT Macro Resilience
      </p>
      <div className="relative">
        <PieChart width={160} height={90}>
          <Pie
            data={gaugeData}
            cx={80}
            cy={80}
            startAngle={180}
            endAngle={0}
            innerRadius={50}
            outerRadius={70}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={fillColor} />
            <Cell fill={remainingColor} />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {score}
          </span>
        </div>
      </div>
      <p className={`text-sm font-semibold mt-1 ${trendColors[trend_outlook]}`}>
        {trend_outlook}
      </p>
    </div>
  );
}
