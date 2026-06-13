import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TickerSearchBar } from "./TickerSearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";

/**
 * Sticky navigation header with Logo, TickerSearchBar, ThemeToggle, and auth controls.
 * Responsive: search bar collapses to a search icon on mobile (<768px).
 * Premium: gradient background, gradient bottom border, scroll-aware elevation.
 * Shows user email + Logout when authenticated, or Sign In / Sign Up links when not.
 */
export function NavigationHeader() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-black/80 backdrop-blur-lg border-b border-white/5 transition-all duration-200 ${
        scrolled ? "shadow-lg shadow-indigo-500/5" : ""
      }`}
    >
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            QuantScreener
          </Link>
        </div>

        {/* Desktop search bar — hidden on mobile */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <TickerSearchBar />
        </div>

        {/* Right side: auth controls + mobile search icon + theme toggle */}
        <div className="flex items-center gap-3">
          {/* Auth controls */}
          {!isLoading && (
            <>
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20 transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    {user.username || user.email.split("@")[0]}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/signin"
                    className="text-sm px-3 py-1.5 rounded-lg text-gray-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile search icon — visible only on mobile */}
          <button
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Toggle search"
            className="md:hidden p-2 rounded-lg hover:bg-white/5 hover:scale-105 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          <ThemeToggle />
        </div>
      </div>

      {/* Mobile expanded search bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3">
          <TickerSearchBar />
        </div>
      )}
    </header>
  );
}
