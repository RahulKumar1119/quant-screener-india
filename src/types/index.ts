// src/types/index.ts

// AI Rating literal union type
export type AIRating = "STRONG BUY" | "BUY" | "HOLD" | "SELL";

// Trend outlook literal union type
export type TrendOutlook = "Bullish" | "Bearish" | "Neutral";

// Ticker profile with key financial ratios
export interface TickerProfile {
  market_cap: number;
  pe_ratio: number;
  roe: number;
  roce: number;
  dividend_yield: number;
}

// XGBoost model output
export interface XGBoostOutput {
  rating: AIRating;
  confidence: number;
}

// LSTM 7-day price projection
export interface LSTMProjection {
  dates: string[];
  prices: number[];
}

// TFT Macro Resilience Score output
export interface TFTOutput {
  score: number;
  trend_outlook: TrendOutlook;
}

// Quarterly financial data
export interface QuarterlyFinancial {
  quarter: string;
  revenue: number;
  expenses: number;
  operating_profit: number;
  net_profit: number;
  margin_pct: number;
}

// Historical price data
export interface HistoricalData {
  dates: string[];
  close_prices: number[];
}

// Full ticker response with nullable ML fields for graceful degradation
export interface TickerResponse {
  ticker: string;
  company_name: string;
  profile: TickerProfile;
  xgboost: XGBoostOutput | null;
  lstm_projection: LSTMProjection | null;
  tft_score: TFTOutput | null;
  gemma_summary: string;
  historical: HistoricalData;
  quarterly_financials: QuarterlyFinancial[];
}

// Summary data for a single ticker in the all-tickers list
export interface TickerSummary {
  ticker: string;
  company_name: string;
  market_cap: number;
  pe_ratio: number;
  roe: number;
  roce: number;
  dividend_yield: number;
  ai_rating: AIRating;
  ai_confidence: number;
  tft_score: number;
  tft_trend: TrendOutlook;
}

// Response from /api/screener/all
export interface AllTickersResponse {
  tickers: TickerSummary[];
}

// Error response with optional retry_after
export interface ErrorResponse {
  detail: string;
  retry_after?: number;
}

// Query parser types
export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "=" | "!=";
export type LogicalOperator = "AND" | "OR";

export interface QueryCondition {
  field: string;
  operator: ComparisonOperator;
  value: number | string;
}

export interface ParsedQuery {
  conditions: QueryCondition[];
  logicalOperators: LogicalOperator[];
}

export interface QueryParseError {
  message: string;
  position: number;
}

export type QueryParseResult =
  | { success: true; parsed: ParsedQuery }
  | { success: false; error: QueryParseError };

// Theme types
export type Theme = "dark" | "light";
