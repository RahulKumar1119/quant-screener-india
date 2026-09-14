import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";

/**
 * Sticky navigation header with Logo, ThemeToggle, and auth controls.
 * Search lives in the landing hero only, so the header stays quiet.
 * Shows user email + Logout when authenticated, or Sign In / Sign Up links when not.
 */
export function NavigationHeader() {
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
      className={`sticky top-0 z-50 w-full bg-surface/85 backdrop-blur-lg border-b border-custom transition-all duration-200 ${
        scrolled ? "shadow-lg shadow-black/5 dark:shadow-black/40" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/" className="text-xl font-bold text-primary">
            QuantScreener
          </Link>
        </div>

        {/* Right side: auth controls + theme toggle */}
        <div className="flex items-center gap-3">
          {/* Auth controls */}
          {!isLoading && (
            <>
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-custom text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:text-primary transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    {user.username || user.email.split("@")[0]}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-clay transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/signin"
                    className="text-sm px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="text-sm px-3 py-1.5 rounded-lg border border-primary/50 text-primary hover:bg-primary/10 transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
