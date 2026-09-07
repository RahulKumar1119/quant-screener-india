import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { SAMPLE_ALL_TICKERS } from "../mocks/sampleData";

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

export function HomePage() {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const trendingStocks = SAMPLE_ALL_TICKERS.tickers.slice(0, 8);

  useGSAP(
    () => {
      // ═══════════════════════════════════════════
      // HERO: Cinematic entrance with 3D perspective
      // ═══════════════════════════════════════════
      const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });

      // Perspective wrapper
      gsap.set(".hero-content", { perspective: 800 });

      heroTl
        // Title lines fly in from 3D space
        .from(".hero-word", {
          z: -200,
          rotationX: 40,
          opacity: 0,
          duration: 1.2,
          stagger: { each: 0.08, from: "start" },
        })
        // Subtitle scrambles in (text replace effect)
        .fromTo(
          ".hero-subtitle",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.4"
        )
        // Buttons spring in
        .from(".hero-btn", {
          scale: 0,
          opacity: 0,
          duration: 0.6,
          stagger: 0.2,
          ease: "elastic.out(1, 0.5)",
        }, "-=0.3")
        // Decorative line draws in
        .from(".hero-line-decoration", {
          scaleX: 0,
          duration: 0.8,
          ease: "power2.inOut",
        }, "-=0.5");

      // Floating particles
      gsap.utils.toArray<HTMLElement>(".particle").forEach((p, i) => {
        gsap.to(p, {
          y: `random(-50, 50)`,
          x: `random(-30, 30)`,
          rotation: `random(-15, 15)`,
          duration: gsap.utils.random(3, 7),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.3,
        });
      });

      // ═══════════════════════════════════════════
      // TICKER BAR: Infinite marquee effect
      // ═══════════════════════════════════════════
      const tickerInner = document.querySelector(".ticker-inner");
      if (tickerInner) {
        gsap.to(".ticker-inner", {
          xPercent: -50,
          duration: 25,
          ease: "none",
          repeat: -1,
        });
      }

      // ═══════════════════════════════════════════
      // STATS: Counter spin-up with scroll trigger
      // ═══════════════════════════════════════════
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

      // ═══════════════════════════════════════════
      // CTA: Parallax + magnetic effect
      // ═══════════════════════════════════════════
      gsap.from(".cta-box", {
        y: 80,
        scale: 0.92,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".cta-section", start: "top 80%" },
      });

      // Pulsing CTA button
      gsap.to(".cta-pulse", {
        boxShadow: "0 0 40px 8px rgba(99, 102, 241, 0.35)",
        scale: 1.02,
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // ═══════════════════════════════════════════
      // SCROLL-LINKED PARALLAX (Hero background)
      // ═══════════════════════════════════════════
      gsap.to(".parallax-fast", {
        y: -200,
        scrollTrigger: { trigger: container.current, start: "top top", end: "40% top", scrub: 0.5 },
      });
      gsap.to(".parallax-slow", {
        y: -80,
        scrollTrigger: { trigger: container.current, start: "top top", end: "40% top", scrub: 1.5 },
      });
    },
    { scope: container }
  );

  return (
    <div ref={container} className="min-h-screen overflow-hidden">
      {/* ════════ HERO ════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center py-20">
        {/* Parallax background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="particle parallax-fast absolute top-[10%] left-[10%] w-4 h-4 rounded-full bg-indigo-500/30" />
          <div className="particle parallax-fast absolute top-[20%] right-[20%] w-3 h-3 rounded-full bg-violet-500/30" />
          <div className="particle parallax-slow absolute top-[40%] left-[25%] w-2 h-2 rounded-full bg-purple-500/40" />
          <div className="particle parallax-slow absolute top-[30%] right-[35%] w-5 h-5 rounded-full bg-indigo-400/20" />
          <div className="particle absolute top-[60%] left-[60%] w-3 h-3 rounded-full bg-cyan-500/25" />
          <div className="particle absolute top-[15%] left-[70%] w-2 h-2 rounded-full bg-pink-500/25" />
          <div className="particle absolute top-[50%] right-[10%] w-4 h-4 rounded-full bg-emerald-500/20" />
          <div className="particle absolute top-[70%] left-[15%] w-3 h-3 rounded-full bg-amber-500/20" />
          {/* Large gradient orbs */}
          <div className="parallax-fast absolute top-0 left-[15%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px]" />
          <div className="parallax-slow absolute bottom-0 right-[10%] w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>

        <div className="hero-content relative max-w-6xl mx-auto px-4 text-center" style={{ transformStyle: "preserve-3d" }}>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] mb-8 tracking-tight">
            <span className="hero-word inline-block text-white">AI-Powered</span>{" "}
            <span className="hero-word inline-block bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">Stock</span>{" "}
            <span className="hero-word inline-block bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">Analytics</span>
            <br />
            <span className="hero-word inline-block text-3xl md:text-5xl lg:text-6xl font-bold text-gray-400 mt-2">
              for Indian Markets
            </span>
          </h1>

          {/* Decorative animated line */}
          <div className="hero-line-decoration h-1 w-32 mx-auto bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-full mb-8" />

          <p className="hero-subtitle text-lg md:text-xl lg:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Real-time NSE data × XGBoost × TFT × Gemma AI — 
            ratings, resilience scores, and summaries from live market feeds.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button
              onClick={() => navigate("/RELIANCE")}
              className="hero-btn group relative px-10 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-2xl shadow-indigo-500/30"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                Explore Stocks
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <button
              onClick={() => navigate("/screener")}
              className="hero-btn px-10 py-5 glass font-bold text-lg rounded-2xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 text-gray-200"
            >
              Custom Screener
            </button>
          </div>
        </div>
      </section>

      {/* ════════ INFINITE TICKER BAR ════════ */}
      <section className="border-y border-white/5 bg-black/60 backdrop-blur-lg py-4 overflow-hidden">
        <div className="ticker-inner flex gap-12 whitespace-nowrap w-max">
          {/* Duplicate for seamless loop */}
          {[...MARKET_INDICES, ...MARKET_INDICES].map((idx, i) => (
            <div key={`${idx.name}-${i}`} className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{idx.name}</span>
              <span className="text-sm font-black text-gray-100 tabular-nums">{idx.value}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${idx.positive ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
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
              className="cta-pulse group px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105"
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
