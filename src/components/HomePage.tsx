import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SAMPLE_ALL_TICKERS } from "../mocks/sampleData";

gsap.registerPlugin(ScrollTrigger);

const MARKET_INDICES = [
  { name: "NIFTY 50", value: "22,147.00", change: "+0.82%", positive: true },
  { name: "SENSEX", value: "72,831.94", change: "+0.76%", positive: true },
  { name: "NIFTY BANK", value: "47,562.30", change: "-0.21%", positive: false },
  { name: "NIFTY IT", value: "38,920.15", change: "+1.34%", positive: true },
  { name: "NIFTY PHARMA", value: "19,845.60", change: "+0.45%", positive: true },
  { name: "NIFTY AUTO", value: "24,380.50", change: "+0.92%", positive: true },
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
  const heroRef = useRef<HTMLDivElement>(null);
  const tickerBarRef = useRef<HTMLDivElement>(null);
  const stocksRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const trendingStocks = SAMPLE_ALL_TICKERS.tickers.slice(0, 8);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation — text and buttons fly in
      const heroTl = gsap.timeline();
      heroTl
        .from(".hero-title", {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
        })
        .from(
          ".hero-subtitle",
          { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" },
          "-=0.5"
        )
        .from(
          ".hero-buttons",
          { y: 30, opacity: 0, duration: 0.6, ease: "power2.out" },
          "-=0.4"
        );

      // Floating background orbs
      gsap.to(".orb-1", {
        y: -20,
        x: 10,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".orb-2", {
        y: 15,
        x: -15,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Ticker bar scroll animation
      gsap.from(".ticker-item", {
        x: -30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: tickerBarRef.current,
          start: "top 90%",
        },
      });

      // Trending stocks — staggered reveal on scroll
      gsap.from(".stock-card", {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: stocksRef.current,
          start: "top 80%",
        },
      });

      // Features — staggered scale-in
      gsap.from(".feature-card", {
        scale: 0.9,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 75%",
        },
      });

      // CTA — slide up
      gsap.from(".cta-section", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ctaRef.current,
          start: "top 85%",
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section ref={heroRef} className="relative py-20 md:py-32">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb-1 absolute top-20 left-1/4 w-72 h-72 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="orb-2 absolute bottom-20 right-1/4 w-96 h-96 bg-violet-500/15 dark:bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/5 to-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="hero-title text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                Stock Analytics
              </span>
              <br />
              <span className="text-gray-500 dark:text-gray-400 text-3xl md:text-4xl lg:text-5xl font-bold">
                for Indian Markets
              </span>
            </h1>
            <p className="hero-subtitle text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Real-time NSE data processed through XGBoost, LSTM, TFT, and Gemma AI. 
              Get ratings, projections, resilience scores — all from live market data.
            </p>
            <div className="hero-buttons flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/RELIANCE")}
                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-lg shadow-indigo-500/25"
              >
                <span className="flex items-center justify-center gap-2">
                  Explore Stocks
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => navigate("/screener")}
                className="px-8 py-4 glass font-semibold rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              >
                Custom Screener
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Market Indices Ticker Bar */}
      <section ref={tickerBarRef} className="border-y border-gray-200/50 dark:border-gray-700/30 bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {MARKET_INDICES.map((index) => (
              <div key={index.name} className="ticker-item flex items-center gap-3 whitespace-nowrap min-w-fit">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {index.name}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {index.value}
                </span>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    index.positive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
      <section ref={stocksRef} className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Trending Stocks
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">AI-rated NSE equities with real-time analytics</p>
          </div>
          <button
            onClick={() => navigate("/screener")}
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingStocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => navigate(`/${stock.ticker}`)}
              className="stock-card glass rounded-xl p-5 text-left hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {stock.ticker}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    stock.ai_rating === "STRONG BUY"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : stock.ai_rating === "BUY"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : stock.ai_rating === "HOLD"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {stock.ai_rating}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">
                {stock.company_name}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg px-2 py-1.5">
                  <span className="text-gray-500 dark:text-gray-400">PE</span>
                  <span className="float-right font-semibold text-gray-800 dark:text-gray-200">{stock.pe_ratio}</span>
                </div>
                <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg px-2 py-1.5">
                  <span className="text-gray-500 dark:text-gray-400">ROE</span>
                  <span className="float-right font-semibold text-gray-800 dark:text-gray-200">{stock.roe}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">TFT Score</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stock.tft_score}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 min-w-[24px] text-right">
                  {stock.tft_score}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} className="py-20 bg-gradient-to-b from-gray-50/80 to-white dark:from-slate-800/30 dark:to-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Powered by <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">Four ML Models</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Real NSE data processed through cutting-edge machine learning for comprehensive stock analysis
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="feature-card glass rounded-xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="max-w-7xl mx-auto px-4 py-16">
        <div className="cta-section relative glass rounded-3xl p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5" />
          <div className="absolute top-0 left-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Start Analyzing NSE Stocks
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto text-lg">
              Search any NSE ticker for AI-powered ratings, price projections, and fundamental analysis
            </p>
            <button
              onClick={() => navigate("/HDFCBANK")}
              className="group px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 hover:scale-105 shadow-xl shadow-indigo-500/25"
            >
              <span className="flex items-center justify-center gap-2">
                Try HDFC Bank Analysis
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 dark:border-gray-700/30 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Quant Screener India</span> — AI-powered NSE stock analytics. 
            Data sourced live from NSE India.
          </p>
        </div>
      </footer>
    </div>
  );
}
