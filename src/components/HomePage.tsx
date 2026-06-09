import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { SAMPLE_ALL_TICKERS } from "../mocks/sampleData";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

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

const STATS = [
  { value: "500+", label: "NSE Stocks Tracked" },
  { value: "4", label: "ML Models" },
  { value: "< 5min", label: "Data Freshness" },
  { value: "7 Days", label: "Price Forecast" },
];

export function HomePage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const trendingStocks = SAMPLE_ALL_TICKERS.tickers.slice(0, 8);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ─── Hero: Split text letter-by-letter reveal ───
      gsap.set(".hero-line", { perspective: 400 });
      const heroTl = gsap.timeline();

      heroTl
        .from(".hero-line-1 .char", {
          opacity: 0,
          rotationX: -90,
          y: 30,
          duration: 0.8,
          stagger: 0.03,
          ease: "back.out(1.7)",
        })
        .from(
          ".hero-line-2 .char",
          {
            opacity: 0,
            scale: 0,
            rotation: gsap.utils.wrap([-15, 15]),
            duration: 0.6,
            stagger: 0.02,
            ease: "elastic.out(1, 0.5)",
          },
          "-=0.3"
        )
        .from(
          ".hero-line-3",
          { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" },
          "-=0.2"
        )
        .from(
          ".hero-subtitle",
          {
            opacity: 0,
            clipPath: "inset(0 100% 0 0)",
            duration: 1,
            ease: "power3.inOut",
          },
          "-=0.3"
        )
        .from(
          ".hero-btn",
          {
            opacity: 0,
            y: 20,
            scale: 0.8,
            duration: 0.5,
            stagger: 0.15,
            ease: "back.out(2)",
          },
          "-=0.4"
        );

      // ─── Floating orbs with random paths ───
      document.querySelectorAll(".float-orb").forEach((orb, i) => {
        gsap.to(orb, {
          x: `random(-40, 40)`,
          y: `random(-30, 30)`,
          scale: `random(0.8, 1.2)`,
          duration: gsap.utils.random(3, 6),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.5,
        });
      });

      // ─── Ticker bar: Marquee-style slide ───
      const tickerTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".ticker-section",
          start: "top 90%",
        },
      });
      tickerTl.from(".ticker-section", {
        scaleY: 0,
        transformOrigin: "top",
        duration: 0.4,
        ease: "power2.out",
      });
      tickerTl.from(
        ".ticker-item",
        {
          x: 100,
          opacity: 0,
          rotation: 5,
          duration: 0.5,
          stagger: 0.08,
          ease: "power3.out",
        },
        "-=0.2"
      );

      // ─── Stats counter animation ───
      document.querySelectorAll(".stat-value").forEach((el) => {
        gsap.from(el, {
          textContent: "0",
          duration: 2,
          ease: "power1.out",
          snap: { textContent: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        });
      });

      // Stats section reveal
      gsap.from(".stat-item", {
        y: 50,
        opacity: 0,
        scale: 0.5,
        duration: 0.7,
        stagger: 0.12,
        ease: "elastic.out(1, 0.75)",
        scrollTrigger: {
          trigger: ".stats-section",
          start: "top 80%",
        },
      });

      // ─── Trending stocks: 3D flip-in ───
      gsap.from(".stock-card", {
        rotationY: 90,
        opacity: 0,
        duration: 0.8,
        stagger: {
          each: 0.1,
          from: "random",
        },
        ease: "power3.out",
        transformOrigin: "center center",
        scrollTrigger: {
          trigger: ".stocks-section",
          start: "top 75%",
        },
      });

      // Stock card progress bars animate width
      gsap.from(".tft-bar-fill", {
        width: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".stocks-section",
          start: "top 70%",
        },
      });

      // ─── Features: Morphing grid with stagger ───
      gsap.from(".feature-card", {
        y: 80,
        opacity: 0,
        rotationX: 15,
        duration: 0.7,
        stagger: {
          amount: 0.6,
          grid: [2, 3],
          from: "center",
        },
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".features-section",
          start: "top 75%",
        },
      });

      // Feature icons bounce on scroll
      gsap.from(".feature-icon", {
        scale: 0,
        rotation: 360,
        duration: 0.8,
        stagger: 0.1,
        ease: "elastic.out(1, 0.4)",
        scrollTrigger: {
          trigger: ".features-section",
          start: "top 70%",
        },
      });

      // ─── CTA: Parallax + reveal ───
      gsap.from(".cta-card", {
        y: 100,
        opacity: 0,
        scale: 0.9,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 80%",
        },
      });

      // CTA button pulse
      gsap.to(".cta-btn", {
        boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)",
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // ─── Scroll-linked parallax on hero orbs ───
      gsap.to(".orb-parallax-1", {
        y: -150,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "50% top",
          scrub: 1,
        },
      });
      gsap.to(".orb-parallax-2", {
        y: -80,
        x: 50,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "50% top",
          scrub: 1.5,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Split text into individual characters for animation
  const splitChars = (text: string, className: string) => (
    <span className={`hero-line ${className} inline-block`}>
      {text.split("").map((char, i) => (
        <span key={i} className="char inline-block" style={{ whiteSpace: char === " " ? "pre" : undefined }}>
          {char}
        </span>
      ))}
    </span>
  );

  return (
    <div ref={containerRef} className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 lg:py-40">
        {/* Animated gradient orbs with parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="float-orb orb-parallax-1 absolute top-10 left-[15%] w-80 h-80 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-[80px]" />
          <div className="float-orb orb-parallax-2 absolute bottom-10 right-[15%] w-96 h-96 bg-violet-500/15 dark:bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="float-orb absolute top-1/3 right-[30%] w-48 h-48 bg-purple-500/10 rounded-full blur-[60px]" />
          <div className="float-orb absolute bottom-1/4 left-[35%] w-64 h-64 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[70px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              <span className="block mb-2">
                {splitChars("AI-Powered", "hero-line-1")}
              </span>
              <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                {splitChars("Stock Analytics", "hero-line-2")}
              </span>
              <span className="hero-line-3 block text-3xl md:text-4xl lg:text-5xl font-bold text-gray-500 dark:text-gray-400">
                for Indian Markets
              </span>
            </h1>
            <p className="hero-subtitle text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Real-time NSE data processed through XGBoost, LSTM, TFT, and Gemma AI.
              Ratings, projections, resilience scores — all from live market data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/RELIANCE")}
                className="hero-btn group px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-lg shadow-indigo-500/25"
              >
                <span className="flex items-center justify-center gap-2">
                  Explore Stocks
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => navigate("/screener")}
                className="hero-btn px-8 py-4 glass font-semibold rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50"
              >
                Custom Screener
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Market Indices Ticker Bar */}
      <section className="ticker-section border-y border-gray-200/50 dark:border-gray-700/30 bg-white/60 dark:bg-slate-800/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {MARKET_INDICES.map((index) => (
              <div key={index.name} className="ticker-item flex items-center gap-3 whitespace-nowrap min-w-fit">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {index.name}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {index.value}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    index.positive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {index.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat-item text-center">
              <div className="stat-value text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Stocks Grid */}
      <section className="stocks-section max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Trending Stocks
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">AI-rated NSE equities</p>
          </div>
          <button
            onClick={() => navigate("/screener")}
            className="hidden sm:flex items-center gap-1 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingStocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => navigate(`/${stock.ticker}`)}
              className="stock-card glass rounded-2xl p-5 text-left hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  {stock.ticker}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                    stock.ai_rating === "STRONG BUY"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : stock.ai_rating === "BUY"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : stock.ai_rating === "HOLD"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}
                >
                  {stock.ai_rating}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">
                {stock.company_name}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-gray-100/80 dark:bg-slate-700/40 rounded-lg px-2.5 py-2">
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">P/E</div>
                  <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{stock.pe_ratio}</div>
                </div>
                <div className="bg-gray-100/80 dark:bg-slate-700/40 rounded-lg px-2.5 py-2">
                  <div className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">ROE</div>
                  <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{stock.roe}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">TFT</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="tft-bar-fill h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    style={{ width: `${stock.tft_score}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tabular-nums min-w-[24px] text-right">
                  {stock.tft_score}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section py-20 bg-gradient-to-b from-gray-50/80 to-white dark:from-slate-800/20 dark:to-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Powered by{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                Four ML Models
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Cutting-edge machine learning applied to real NSE India market data
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="feature-card glass rounded-2xl p-7 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300 group cursor-default"
              >
                <div className="feature-icon text-4xl mb-4 inline-block group-hover:scale-125 transition-transform duration-500">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
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
      <section className="cta-section max-w-7xl mx-auto px-4 py-20">
        <div className="cta-card relative glass rounded-3xl p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-purple-500/5" />
          <div className="float-orb absolute -top-10 left-1/4 w-56 h-56 bg-indigo-500/10 rounded-full blur-[80px]" />
          <div className="float-orb absolute -bottom-10 right-1/4 w-56 h-56 bg-violet-500/10 rounded-full blur-[80px]" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Start Analyzing NSE Stocks
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto text-lg">
              Search any ticker for AI-powered ratings, price projections, and fundamental analysis
            </p>
            <button
              onClick={() => navigate("/HDFCBANK")}
              className="cta-btn group px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 hover:scale-105 shadow-xl shadow-indigo-500/30"
            >
              <span className="flex items-center justify-center gap-2">
                Try HDFC Bank Analysis
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className="font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">Quant Screener India</span>
            {" "}— AI-powered NSE stock analytics. Data sourced live from NSE India.
          </p>
        </div>
      </footer>
    </div>
  );
}
