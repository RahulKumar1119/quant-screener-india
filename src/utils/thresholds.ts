// src/utils/thresholds.ts

import type { AIRating } from "../types/index";

export interface ThresholdRule {
  field: string;
  favorable: (value: number) => boolean;
}

const thresholdRules: ThresholdRule[] = [
  { field: "pe_ratio", favorable: (v) => v < 25 },
  { field: "roe", favorable: (v) => v > 15 },
  { field: "roce", favorable: (v) => v > 15 },
  { field: "dividend_yield", favorable: (v) => v > 1.5 },
];

/**
 * Returns a badge color based on whether the field value meets
 * the favorable threshold. Unknown fields return "neutral".
 */
export function getBadgeColor(
  field: string,
  value: number
): "green" | "red" | "neutral" {
  const rule = thresholdRules.find((r) => r.field === field);
  if (!rule) return "neutral";
  return rule.favorable(value) ? "green" : "red";
}

/**
 * Color mapping for XGBoost AI rating badges.
 */
export const ratingColorMap: Record<AIRating, string> = {
  "STRONG BUY": "bg-emerald-600 text-white",
  "BUY": "bg-green-500 text-white",
  "HOLD": "bg-amber-500 text-white",
  "SELL": "bg-red-600 text-white",
};
