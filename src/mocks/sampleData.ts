import type { TickerResponse, AllTickersResponse } from "../types/index";

export const SAMPLE_TICKER: TickerResponse = {
  ticker: "JNKINDIA",
  company_name: "JNK India Limited",
  profile: {
    market_cap: 458700000000,
    pe_ratio: 22.4,
    roe: 18.7,
    roce: 21.3,
    dividend_yield: 1.2,
  },
  xgboost: {
    rating: "STRONG BUY",
    confidence: 0.87,
  },
  tft_score: {
    score: 72,
    trend_outlook: "Bullish",
  },
  gemma_summary:
    "JNK India demonstrates strong quarterly revenue growth of 12% with improving operating margins. The company maintains healthy ROE at 18.7% and ROCE at 21.3%, indicating efficient capital deployment. Current valuations at PE 22.4x appear reasonable given the growth trajectory and sector tailwinds from infrastructure spending.",
  historical: {
    dates: [
      "2024-12-18", "2024-12-19", "2024-12-20", "2024-12-23", "2024-12-24",
      "2024-12-26", "2024-12-27", "2024-12-30", "2024-12-31", "2025-01-02",
      "2025-01-03", "2025-01-06", "2025-01-07", "2025-01-08", "2025-01-09",
      "2025-01-10", "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16",
      "2025-01-17",
    ],
    close_prices: [
      230.0, 232.5, 231.8, 233.2, 234.0, 232.1, 235.5, 237.0, 236.2, 238.5,
      240.1, 239.0, 241.3, 240.8, 242.5, 243.0, 241.5, 244.0, 243.2, 245.0,
      244.5,
    ],
  },
  quarterly_financials: [
    { quarter: "Q4 FY24", revenue: 10500000000, expenses: 8200000000, operating_profit: 2300000000, net_profit: 1600000000, margin_pct: 15.2 },
    { quarter: "Q1 FY25", revenue: 11200000000, expenses: 8700000000, operating_profit: 2500000000, net_profit: 1750000000, margin_pct: 15.6 },
    { quarter: "Q2 FY25", revenue: 11800000000, expenses: 9100000000, operating_profit: 2700000000, net_profit: 1850000000, margin_pct: 15.7 },
    { quarter: "Q3 FY25", revenue: 12500000000, expenses: 9800000000, operating_profit: 2700000000, net_profit: 1900000000, margin_pct: 15.2 },
  ],
};

export const SAMPLE_ALL_TICKERS: AllTickersResponse = {
  tickers: [
    { ticker: "RELIANCE", company_name: "Reliance Industries", market_cap: 1920000000000, pe_ratio: 28.5, roe: 12.4, roce: 14.2, dividend_yield: 0.4, ai_rating: "BUY", ai_confidence: 0.78, tft_score: 68, tft_trend: "Bullish" },
    { ticker: "TCS", company_name: "Tata Consultancy Services", market_cap: 1550000000000, pe_ratio: 32.1, roe: 45.2, roce: 52.3, dividend_yield: 1.3, ai_rating: "HOLD", ai_confidence: 0.65, tft_score: 55, tft_trend: "Neutral" },
    { ticker: "INFY", company_name: "Infosys Limited", market_cap: 720000000000, pe_ratio: 27.8, roe: 31.5, roce: 38.2, dividend_yield: 2.1, ai_rating: "BUY", ai_confidence: 0.72, tft_score: 62, tft_trend: "Bullish" },
    { ticker: "HDFCBANK", company_name: "HDFC Bank Limited", market_cap: 1280000000000, pe_ratio: 19.2, roe: 16.8, roce: 18.5, dividend_yield: 1.1, ai_rating: "STRONG BUY", ai_confidence: 0.91, tft_score: 78, tft_trend: "Bullish" },
    { ticker: "ICICIBANK", company_name: "ICICI Bank Limited", market_cap: 890000000000, pe_ratio: 21.5, roe: 17.3, roce: 19.1, dividend_yield: 0.8, ai_rating: "BUY", ai_confidence: 0.82, tft_score: 71, tft_trend: "Bullish" },
    { ticker: "JNKINDIA", company_name: "JNK India Limited", market_cap: 458700000000, pe_ratio: 22.4, roe: 18.7, roce: 21.3, dividend_yield: 1.2, ai_rating: "STRONG BUY", ai_confidence: 0.87, tft_score: 72, tft_trend: "Bullish" },
    { ticker: "TATAMOTORS", company_name: "Tata Motors Limited", market_cap: 320000000000, pe_ratio: 8.5, roe: 22.1, roce: 15.8, dividend_yield: 0.3, ai_rating: "BUY", ai_confidence: 0.74, tft_score: 58, tft_trend: "Neutral" },
    { ticker: "WIPRO", company_name: "Wipro Limited", market_cap: 280000000000, pe_ratio: 24.3, roe: 15.8, roce: 19.2, dividend_yield: 1.8, ai_rating: "HOLD", ai_confidence: 0.61, tft_score: 48, tft_trend: "Neutral" },
    { ticker: "SBIN", company_name: "State Bank of India", market_cap: 720000000000, pe_ratio: 11.2, roe: 18.9, roce: 16.5, dividend_yield: 1.6, ai_rating: "STRONG BUY", ai_confidence: 0.89, tft_score: 75, tft_trend: "Bullish" },
    { ticker: "ZEEL", company_name: "Zee Entertainment", market_cap: 12000000000, pe_ratio: 45.2, roe: 4.2, roce: 5.1, dividend_yield: 0.1, ai_rating: "SELL", ai_confidence: 0.83, tft_score: 22, tft_trend: "Bearish" },
  ],
};
