import { useNavigate } from "react-router-dom";
import { SAMPLE_ALL_TICKERS } from "../mocks/sampleData";

const MARKET_INDICES = [
  { name: "NIFTY 50", value: "22,147.00", change: "+0.82%", positive: true },
  { name: "SENSEX", value: "72,831.94", change: "+0.76%", positive: true },
  { name: "NIFTY BANK", value: "47,562.30", change: "-0.21%", positive: false },
  { name: "NIFTY IT", value: "38,920.15", change: "+1.34%", positive: true },
  { name: "NIFTY PHARMA", value: "19,845.60", change: "+0.45%", positive: true },
];

const FEATURES = [
  {
    icon: "📈",
    title: "AI Price Projections",
    description: "LSTM-powered 7-day price forecasts trained on real NSE historical data",
  },
  {
    icon: "🧠",
    title: "ML Stock Ratings",
    description: "XGBoost classifier rates stocks STRONG BUY to SELL from quarterly financials",
  },
  {
    icon: "🌐",
    title: "Macro Resilience Score",
    description: "TFT model scores 0-100 using RBI REPO rates and sector indices",
  },
  {
    icon: "✨",
    title: "AI Narrative Summary",
    description: "Gemma 3 4B generates SEBI-style fundamental analysis summaries",
  },
  {
    icon: "🔍",
    title: "Custom Screener",
    description: "Query Nifty 500 with text-based filters combining financials and AI ratings",
  },
  {
    icon: "🇮🇳",
    title: "Indian Market Native",
    description: "₹ Crores formatting, NSE symbols, weekend-skipping charts, live NSE data",
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const trendingStocks = SAMPLE_ALL_TICKERS.tickers.slice(0, 8);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-violet-600/10 dark:from-indigo-600/5 dark:to-violet-600/5" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent mb-6">
              AI-Powered Stock Analytics for Indian Markets
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Real-time NSE data meets four ML models. Get AI ratings, price projections, 
              macro resilience scores, and narrative summaries — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/RELIANCE")}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-indigo-500/25"
              >
                Explore Stocks
              </button>
              <button
                onClick={() => navigate("/screener")}
                className="px-8 py-3 glass font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-200 text-gray-800 dark:text-gray-200"
              >
                Custom Screener
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Market Indices Ticker Bar */}
      <section className="border-y border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide">
            {MARKET_INDICES.map((index) => (
              <div key={index.name} className="flex items-center gap-3 whitespace-nowrap min-w-fit">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {index.name}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {index.value}
                </span>
                <span
                  className={`text-sm font-medium ${
                    index.positive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {index.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Stocks Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Trending Stocks
          </h2>
          <button
            onClick={() => navigate("/screener")}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingStocks.map((stock, i) => (
            <button
              key={stock.ticker}
              onClick={() => navigate(`/${stock.ticker}`)}
              className="glass rounded-xl p-4 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {stock.ticker}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    stock.ai_rating === "STRONG BUY"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : stock.ai_rating === "BUY"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : stock.ai_rating === "HOLD"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {stock.ai_rating}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">
                {stock.company_name}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  PE: {stock.pe_ratio}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  ROE: {stock.roe}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    style={{ width: `${stock.tft_score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stock.tft_score}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50/50 dark:bg-slate-800/20 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Powered by Four ML Models
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Real NSE data processed through XGBoost, LSTM, TFT, and Gemma AI models for comprehensive stock analysis
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="glass rounded-xl p-6 hover:-translate-y-0.5 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="glass rounded-2xl p-8 md:p-12 text-center bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Start Analyzing NSE Stocks
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Search any NSE ticker to get AI-powered ratings, price projections, and fundamental analysis
          </p>
          <button
            onClick={() => navigate("/HDFCBANK")}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-indigo-500/25"
          >
            Try HDFC Bank Analysis →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700/50 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quant Screener India — AI-powered NSE stock analytics platform. 
            Data sourced live from NSE India via jugaad-data.
          </p>
        </div>
      </footer>
    </div>
  );
}
