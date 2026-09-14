import { useEffect, useRef } from "react";
import { createChart, LineStyle } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import type { HistoricalData } from "../types/index";

interface PriceChartProps {
  historical: HistoricalData;
}

export function PriceChart({ historical }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const points = historical.dates.map((date, i) => ({
    time: date as string,
    value: historical.close_prices[i],
  }));
  const dataKey = `${historical.dates.length}:${historical.dates[0] ?? ""}:${historical.dates[historical.dates.length - 1] ?? ""}:${historical.close_prices[0] ?? ""}:${historical.close_prices[historical.close_prices.length - 1] ?? ""}`;

  const direction: "up" | "down" | "flat" =
    points.length >= 2
      ? points[points.length - 1].value > points[0].value
        ? "up"
        : points[points.length - 1].value < points[0].value
          ? "down"
          : "flat"
      : "flat";
  const lineColor =
    direction === "up" ? "#2FA36B" : direction === "down" ? "#C2503A" : "#9AA4B2";

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(154, 164, 178, 0.14)" : "rgba(91, 100, 114, 0.18)";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 260,
      layout: {
        background: { color: "transparent" },
        textColor: isDark ? "#9AA4B2" : "#5b6472",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: gridColor },
      },
      timeScale: {
        timeVisible: false,
        borderColor: isDark ? "#4b5563" : "#d1d5db",
      },
    });

    chartRef.current = chart;

    // Single trend line; color carries direction so no legend is needed
    const historicalSeries = chart.addLineSeries({
      color: lineColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
    });

    historicalSeries.setData(points);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  if (points.length === 0) {
    return (
      <p className="text-sm text-[#9AA4B2]">
        No price history for this period.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div ref={containerRef} className="w-full min-w-0 overflow-hidden" />
    </div>
  );
}
