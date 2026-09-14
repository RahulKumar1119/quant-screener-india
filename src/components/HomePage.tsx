import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { SAMPLE_ALL_TICKERS, SAMPLE_TICKER } from "../mocks/sampleData";

gsap.registerPlugin(ScrollTrigger, TextPlugin, useGSAP);

const MARKET_INDICES = [
  { name: "NIFTY 50", value: "22,147.00", change: "+0.82%", positive: true },
  { name: "SENSEX", value: "72,831.94", change: "+0.76%", positive: true },
  { name: "NIFTY BANK", value: "47,562.30", change: "-0.21%", positive: false },
  { name: "NIFTY IT", value: "38,920.15", change: "+1.34%", positive: true },
  { name: "NIFTY PHARMA", value: "19,845.60", change: "+0.45%", positive: true },
  { name: "NIFTY AUTO", value: "24,380.50", change: "+0.92%", positive: true },
];

const FEATURES = [
  { icon: "📈", title: "AI Price Projections", description: "ML-powered price forecasts from real NSE OHLC data" },
  { icon: "🧠", title: "ML Stock Ratings", description: "XGBoost multi-class classifier: STRONG BUY → SELL" },
  { icon: "🌐", title: "Macro Resilience", description: "TFT model with RBI REPO + sector indices → score 0-100" },
  { icon: "✨", title: "AI Summaries", description: "Gemma 3 4B SEBI-style fundamental narrative generation" },
  { icon: "🔍", title: "Custom Screener", description: "Text queries across NSE: PE < 25 AND ROE > 15" },
  { icon: "🇮🇳", title: "Indian Native", description: "₹ Crores, NSE symbols, weekend-skipping date axes" },
];

const STATS = [
  { end: 2600, suffix: "+", label: "NSE Stocks" },
  { end: 4, suffix: "", label: "ML Models" },
  { end: 7, suffix: " Days", label: "Price Forecast" },
  { end: 100, suffix: "", label: "TFT Score Range" },
];

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 120;
  const h = 36;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        points={points}
        stroke={up ? "#2FA36B" : "#C2503A"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const trendingStocks = SAMPLE_ALL_TICKERS.tickers.slice(0, 8);
  const [heroQuery, setHeroQuery] = useState("");
  const verdict = SAMPLE_TICKER;
  const verdictChange =
    verdict.historical.close_prices.length >= 2
      ? ((verdict.historical.close_prices[verdict.historical.close_prices.length - 1] -
          verdict.historical.close_prices[0]) /
          Math.abs(verdict.historical.close_prices[0])) *
        100
      : null;

  useGSAP(
    () => {
      // STATS: Counter spin-up with scroll trigger
      gsap.utils.toArray<HTMLElement>(".counter-value").forEach((el) => {
        const target = parseInt(el.dataset.target || "0", 10);
        gsap.fromTo(
          el,
          { innerText: "0" },
          {
            innerText: target,
            duration: 2,
            ease: "power1.out",
            snap: { innerText: 1 },
            scrollTrigger: { trigger: el, start: "top 85%" },
          }
        );
      });

      gsap.from(".stat-card", {
        y: 60,
        opacity: 0,
        rotationX: 20,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ".stats-grid", start: "top 80%" },
      });

      // ═══════════════════════════════════════════
      // HORIZONTAL SCROLL PINNED SECTION (Showcase-style)
      // ═══════════════════════════════════════════
      const stockCards = gsap.utils.toArray<HTMLElement>(".hscroll-card");
      if (stockCards.length > 0) {
        const scrollSection = document.querySelector(".hscroll-section");
        const scrollContainer = document.querySelector(".hscroll-container");
        if (scrollSection && scrollContainer) {
          gsap.to(scrollContainer, {
            x: () => -(scrollContainer as HTMLElement).scrollWidth + window.innerWidth - 100,
            ease: "none",
            scrollTrigger: {
              trigger: scrollSection,
              start: "top top",
              end: () => `+=${(scrollContainer as HTMLElement).scrollWidth}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });

          // Cards scale up as they enter viewport
          stockCards.forEach((card) => {
            gsap.from(card, {
              scale: 0.8,
              opacity: 0.3,
              rotationY: -15,
              duration: 0.5,
              scrollTrigger: {
                trigger: card,
                containerAnimation: gsap.getById("hscroll") as gsap.core.Tween | undefined,
                start: "left 80%",
                end: "left 50%",
                scrub: true,
              },
            });
          });
        }
      }

      // ═══════════════════════════════════════════
      // FEATURES: Stagger from random with rotation
      // ═══════════════════════════════════════════
      gsap.from(".feature-card", {
        y: 100,
        opacity: 0,
        rotationY: gsap.utils.wrap([-30, 30, -20, 20, -10, 10]),
        duration: 0.9,
        stagger: { each: 0.12, from: "random" },
        ease: "power3.out",
        scrollTrigger: { trigger: ".features-grid", start: "top 75%" },
      });

      // Feature icons: elastic bounce
      gsap.from(".feat-icon", {
        scale: 0,
        rotation: gsap.utils.wrap([180, -180, 90, -90, 270, -270]),
        duration: 1,
        stagger: 0.1,
        ease: "elastic.out(1.2, 0.4)",
        scrollTrigger: { trigger: ".features-grid", start: "top 70%" },
      });

      // CTA entrance
      gsap.from(".cta-box", {
        y: 80,
        scale: 0.92,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".cta-section", start: "top 80%" },
      });
    },
    { scope: container }
  );

  return (
    <div ref={container} className="min-h-screen overflow-hidden">
      {/* ════════ HERO: opening-bell verdict ════════ */}
      <section className="border-b border-white/[0.08] bg-[#0B0D10]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <p className="text-sm text-[#9AA4B2]">
            Live NSE data with XGBoost ratings and TFT resilience
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-gray-100 md:text-5xl">
            See any NSE stock the way an analyst sees it at the opening bell.
          </h1>

          <form
            className="mt-8 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const symbol = heroQuery.trim().toUpperCase();
              if (symbol) navigate(`/${symbol}`);
            }}
          >
            <label htmlFor="hero-ticker-search" className="sr-only">
              Search an NSE ticker
            </label>
            <input
              id="hero-ticker-search"
              type="text"
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              placeholder="Type a ticker, for example RELIANCE"
              autoComplete="off"
              spellCheck={false}
              className="min-h-[48px] flex-1 rounded-[10px] border border-white/15 bg-white/[0.04] px-4 text-[15px] text-gray-100 placeholder:text-[#9AA4B2]/70 focus:border-[#C8A96A]/60 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[48px] shrink-0 rounded-[10px] border border-[#C8A96A]/50 px-5 text-[15px] font-semibold text-[#C8A96A] transition-colors hover:bg-[#C8A96A]/10"
            >
              Analyze
            </button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#9AA4B2]">Try</span>
            {["RELIANCE", "HDFCBANK", "JNKINDIA"].map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => navigate(`/${symbol}`)}
                className="rounded-md px-2 py-1 font-mono text-[13px] text-gray-300 underline decoration-white/20 underline-offset-4 hover:decoration-[#C8A96A]/70 hover:text-white"
              >
                {symbol}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/${verdict.ticker}`)}
            className="mt-8 flex w-full max-w-3xl items-center gap-5 rounded-[14px] border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/20"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-100">
                {verdict.ticker}
                <span className="ml-2 font-normal text-[#9AA4B2]">
                  {verdict.company_name}
                </span>
              </p>
              <p className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums text-gray-100">
                  {verdict.tft_score?.score}
                </span>
                <span className="text-sm font-semibold text-[#2FA36B]">
                  {verdict.tft_score?.trend_outlook}
                </span>
                {verdictChange !== null && (
                  <span className="text-xs tabular-nums text-[#9AA4B2]">
                    {verdictChange >= 0 ? "+" : ""}
                    {verdictChange.toFixed(1)}% over the last 30 trading days
                  </span>
                )}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="-rotate-2 shrink-0 rounded-[6px] border-2 border-[#2FA36B] px-3 py-1 text-sm font-bold tracking-wide text-[#2FA36B]"
            >
              {verdict.xgboost?.rating}
            </span>
            <span className="hidden sm:block">
              <Sparkline values={verdict.historical.close_prices} />
            </span>
          </button>
          <p className="mt-3 text-xs text-[#9AA4B2]">
            Sample verdict from cached data. Open it for the full breakdown.
          </p>
        </div>
      </section>

      {/* ════════ MARKET TAPE (static) ════════ */}
      <section aria-label="Market snapshot" className="border-b border-white/5 bg-black/60 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-10 gap-y-3 px-4">
          {MARKET_INDICES.map((idx) => (
            <div key={idx.name} className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-[#9AA4B2]">{idx.name}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-100">{idx.value}</span>
              <span className={`text-xs font-semibold tabular-nums ${idx.positive ? "text-[#2FA36B]" : "text-[#C2503A]"}`}>
                {idx.change}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ STATS COUNTERS ════════ */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat-card glass rounded-2xl p-6 text-center" style={{ transformStyle: "preserve-3d" }}>
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-br from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                <span className="counter-value" data-target={stat.end}>0</span>
                <span>{stat.suffix}</span>
              </div>
              <div className="text-sm text-gray-400 mt-2 font-semibold uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ HORIZONTAL SCROLL STOCKS (Pinned) ════════ */}
      <section className="hscroll-section relative">
        <div className="absolute top-8 left-8 z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-100">Trending Stocks</h2>
          <p className="text-gray-400 mt-1">Scroll horizontally →</p>
        </div>
        <div className="hscroll-container flex items-center gap-8 px-8 pt-24 pb-8 min-h-screen">
          {trendingStocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => navigate(`/${stock.ticker}`)}
              className="hscroll-card glass rounded-3xl p-8 min-w-[320px] md:min-w-[380px] text-left hover:shadow-2xl transition-shadow duration-300 group flex-shrink-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-gray-100 group-hover:text-indigo-400 transition-colors">
                  {stock.ticker}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${
                  stock.ai_rating === "STRONG BUY" ? "bg-emerald-900/50 text-emerald-300"
                    : stock.ai_rating === "BUY" ? "bg-green-900/50 text-green-300"
                    : stock.ai_rating === "HOLD" ? "bg-amber-900/50 text-amber-300"
                    : "bg-red-900/50 text-red-300"
                }`}>
                  {stock.ai_rating}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-6">{stock.company_name}</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">P/E Ratio</div>
                  <div className="text-xl font-bold text-gray-200 mt-1">{stock.pe_ratio}</div>
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">ROE %</div>
                  <div className="text-xl font-bold text-gray-200 mt-1">{stock.roe}%</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">TFT Resilience</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{stock.tft_score}/100</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-full"
                    style={{ width: `${stock.tft_score}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="py-24 bg-gradient-to-b from-black/50 to-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-100 mb-4">
              Four ML Models.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                One Platform.
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Real NSE data meets cutting-edge machine learning
            </p>
          </div>
          <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card glass rounded-3xl p-8 hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group cursor-default" style={{ transformStyle: "preserve-3d" }}>
                <div className="feat-icon text-5xl mb-5 inline-block group-hover:scale-125 transition-transform duration-500">{f.icon}</div>
                <h3 className="text-xl font-bold text-gray-100 mb-3 group-hover:text-indigo-400 transition-colors duration-300">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="cta-section max-w-7xl mx-auto px-4 py-20">
        <div className="cta-box relative glass rounded-[2rem] p-12 md:p-20 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-purple-500/5" />
          <div className="particle absolute -top-10 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-[80px]" />
          <div className="particle absolute -bottom-10 right-1/3 w-60 h-60 bg-violet-500/10 rounded-full blur-[80px]" />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-black text-gray-100 mb-5">
              Start Analyzing
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-lg mx-auto">
              Search any NSE ticker for AI-powered insights
            </p>
            <button
              onClick={() => navigate("/HDFCBANK")}
              className="group px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-3">
                Try HDFC Bank
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 font-medium">
            <span className="font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">Quant Screener India</span>
            {" "}— AI-powered NSE stock analytics
          </p>
        </div>
      </footer>
    </div>
  );
}
