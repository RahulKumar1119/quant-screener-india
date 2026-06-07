import { useEffect, useRef } from "react";
import { createChart, LineStyle } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import type { HistoricalData, LSTMProjection } from "../types/index";

interface PriceChartProps {
  historical: HistoricalData;
  lstmProjection: LSTMProjection | null;
}

export function PriceChart({ historical, lstmProjection }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { color: isDark ? "#111827" : "#ffffff" },
        textColor: isDark ? "#f3f4f6" : "#374151",
      },
      grid: {
        vertLines: { color: isDark ? "#374151" : "#e5e7eb" },
        horzLines: { color: isDark ? "#374151" : "#e5e7eb" },
      },
      timeScale: {
        timeVisible: false,
        borderColor: isDark ? "#4b5563" : "#d1d5db",
      },
    });

    chartRef.current = chart;

    // Historical price series (solid gray line)
    const historicalSeries = chart.addLineSeries({
      color: "#6b7280",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
    });

    const historicalData = historical.dates.map((date, i) => ({
      time: date as string,
      value: historical.close_prices[i],
    }));
    historicalSeries.setData(historicalData);

    // LSTM Projection series (dashed Royal Blue line)
    if (lstmProjection && lstmProjection.dates.length > 0) {
      const projectionSeries = chart.addLineSeries({
        color: "#4169E1",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
      });

      // Connect projection to last historical point
      const lastHistoricalDate = historical.dates[historical.dates.length - 1];
      const lastHistoricalPrice =
        historical.close_prices[historical.close_prices.length - 1];

      const projectionData = [
        { time: lastHistoricalDate as string, value: lastHistoricalPrice },
        ...lstmProjection.dates.map((date, i) => ({
          time: date as string,
          value: lstmProjection.prices[i],
        })),
      ];
      projectionSeries.setData(projectionData);
    }

    chart.timeScale().fitContent();

    // Responsive via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [historical, lstmProjection]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-gray-500" />
          Historical (30d)
        </span>
        {lstmProjection && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-blue-600" />
            LSTM Projection (7d)
          </span>
        )}
      </div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
