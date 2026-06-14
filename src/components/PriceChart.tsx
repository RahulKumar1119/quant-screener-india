import { useEffect, useRef } from "react";
import { createChart, LineStyle } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import type { HistoricalData } from "../types/index";

interface PriceChartProps {
  historical: HistoricalData;
}

function getCSSColor(varName: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return "#ffffff";
  // Convert "R G B" triplet to hex or rgb()
  const parts = raw.split(" ").map(Number);
  if (parts.length === 3) {
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return raw;
}

export function PriceChart({ historical }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const bgColor = getCSSColor("--color-surface-elevated");
    const textColor = getCSSColor("--color-border");
    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(51, 65, 85, 0.5)" : "rgba(226, 232, 240, 0.8)";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { color: bgColor },
        textColor: isDark ? "#f3f4f6" : "#374151",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
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
  }, [historical]);

  return (
    <div className="w-full min-w-0 animate-fade-in">
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-gray-500 rounded-full" />
          Historical (30d)
        </span>
      </div>
      <div ref={containerRef} className="w-full min-w-0 rounded-xl overflow-hidden" />
    </div>
  );
}
