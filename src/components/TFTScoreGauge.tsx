import { useState, useEffect, useRef } from "react";
import type { TFTOutput, TrendOutlook } from "../types/index";

interface TFTScoreGaugeProps {
  tftScore: TFTOutput | null;
}

const trendColors: Record<TrendOutlook, string> = {
  Bullish: "text-leaf",
  Bearish: "text-clay",
  Neutral: "text-primary",
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function TFTScoreGauge({ tftScore }: TFTScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!tftScore) return;

    if (prefersReducedMotion()) {
      setAnimatedScore(tftScore.score);
      return;
    }

    const target = tftScore.score;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [tftScore]);

  if (!tftScore) {
    return (
      <div className="py-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Macro resilience</p>
        <p className="mt-1 text-sm text-fog">
          Model output unavailable, showing price history.
        </p>
      </div>
    );
  }

  const { score, trend_outlook } = tftScore;

  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Macro resilience</p>
        <p className="text-xs tabular-nums text-fog">
          Scale 0 to 100
        </p>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {animatedScore}
        </span>
        <span className={`text-sm font-semibold ${trendColors[trend_outlook]}`}>
          {trend_outlook}
        </span>
      </div>
      <div
        className="relative mt-3 h-[3px] rounded-full bg-gray-300 dark:bg-white/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={`Macro resilience ${score} of 100, ${trend_outlook}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, animatedScore))}%` }}
        />
        {[35, 65].map((tick) => (
          <span
            key={tick}
            aria-hidden="true"
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-gray-400 dark:bg-white/25"
            style={{ left: `${tick}%` }}
          />
        ))}
      </div>
    </div>
  );
}
