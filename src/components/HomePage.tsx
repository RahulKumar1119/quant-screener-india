import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { TickerSearchBar } from "./TickerSearchBar";
import { useMarketIndices } from "../hooks/useMarketIndices";

gsap.registerPlugin(ScrollTrigger, TextPlugin, useGSAP);

const MODELS = [
  {
    n: "01",
    name: "XGBoost rating",
    question: "Is this stock worth buying?",
    reads: "Revenue growth, operating and net margins, PE, ROE, 7 and 30-day momentum through a SageMaker endpoint, with a local heuristic fallback",
    writes: "STRONG BUY, BUY, HOLD or SELL, each with a confidence score",
  },
  {
    n: "02",
    name: "TFT resilience",
    question: "Can it withstand the market mood?",
    reads: "RBI repo rate, sector indices, 90-day momentum, volatility and trend consistency",
    writes: "A score from 0 to 100 with a Bullish, Neutral or Bearish outlook",
  },
  {
    n: "03",
    name: "Gemma narrative",
    question: "What does this mean in plain words?",
    reads: "Latest quarter revenue and margin, current price and the XGBoost rating through Bedrock",
    writes: "A three to four sentence SEBI-style summary written for retail investors",
  },
  {
    n: "04",
    name: "Custom screener",
    question: "Which stocks pass my rules?",
    reads: "PE, ROE, ROCE, dividend yield and model scores across about 2,600 NSE listings",
    writes: "A filtered list from queries such as PE < 25 AND ROE > 15",
  },
];

const STATS = [
  { end: 2600, suffix: "+", label: "NSE Stocks" },
  { end: 4, suffix: "", label: "ML Models" },
  { end: 7, suffix: " Days", label: "Price Forecast" },
  { end: 100, suffix: "", label: "TFT Score Range" },
];

export function HomePage() {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const { indices: marketIndices, asOf: marketAsOf, live: marketLive } =
    useMarketIndices();

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

      // Single calm reveal for the model ledger rows
      gsap.from(".model-row", {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: ".model-row", start: "top 85%" },
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

          <div className="mt-8 max-w-xl">
            <TickerSearchBar size="hero" />
          </div>
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
        </div>
      </section>

      {/* ════════ MARKET TAPE (live, refreshed daily) ════════ */}
      <section aria-label="Market snapshot" className="border-b border-white/5 bg-black/60 py-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-3 flex items-baseline gap-3">
            <p className="text-xs text-[#9AA4B2]">
              {marketAsOf ? `As of ${marketAsOf}` : "Latest available levels"}
            </p>
            <p
              className={`text-xs font-medium ${marketLive ? "text-[#2FA36B]" : "text-[#C8A96A]"}`}
              role="status"
            >
              {marketLive ? "Live" : "Showing last available data"}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {marketIndices.map((idx) => (
              <div key={idx.name} className="flex items-baseline gap-3">
                <span className="text-xs font-medium text-[#9AA4B2]">{idx.name}</span>
                <span className="text-sm font-semibold tabular-nums text-gray-100">
                  {idx.value.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums ${idx.change_pct >= 0 ? "text-[#2FA36B]" : "text-[#C2503A]"}`}
                >
                  {idx.change_pct >= 0 ? "+" : ""}
                  {idx.change_pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
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

      {/* ════════ MODELS: how a ticker becomes a verdict ════════ */}
      <section className="border-t border-white/5 bg-[#0B0D10]">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <h2 className="max-w-xl text-3xl font-bold leading-tight text-gray-100 md:text-4xl">
            How a ticker becomes a verdict.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#9AA4B2]">
            Everything starts from one live record per ticker: the latest quote,
            30 days of closes and quarterly financials. Four stages read that
            record in order, each answering one question. Figures use Indian
            numbering throughout, with trading-day axes that skip weekends.
          </p>
          <ol className="mt-10 border-t border-white/10">
            {MODELS.map((m) => (
              <li
                key={m.n}
                className="model-row grid gap-2 border-b border-white/10 py-6 md:grid-cols-[56px_240px_1fr] md:gap-6"
              >
                <span className="text-sm tabular-nums text-[#C8A96A]">{m.n}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">{m.name}</h3>
                  <p className="mt-1 text-sm text-[#9AA4B2]">{m.question}</p>
                </div>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p className="text-gray-300">
                    <span className="text-[#9AA4B2]">Reads </span>
                    {m.reads}.
                  </p>
                  <p className="text-gray-300">
                    <span className="text-[#9AA4B2]">Writes </span>
                    {m.writes}.
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-relaxed text-[#9AA4B2]">
            When a model is unreachable, the page shows the remaining data and
            says so instead of failing. Ratings carry confidence scores so a
            verdict can always be weighed, never just taken.
          </p>
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
