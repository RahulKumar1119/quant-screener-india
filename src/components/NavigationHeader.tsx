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
      className={`sticky top-0 z-50 w-full bg-gradient-to-r from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-shadow duration-200 ${
        scrolled ? "shadow-xl backdrop-blur-xl" : ""
      }`}
    >
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--color-accent))] to-transparent" />

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
                  <span className="hidden sm:inline text-sm text-gray-300 truncate max-w-[160px]">
                    {user.email}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
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
            className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
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
