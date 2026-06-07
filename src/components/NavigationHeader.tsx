import { useState } from "react";
import { TickerSearchBar } from "./TickerSearchBar";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Sticky navigation header with Logo, TickerSearchBar, and ThemeToggle.
 * Responsive: search bar collapses to a search icon on mobile (<768px).
 */
export function NavigationHeader() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            QuantScreener
          </span>
        </div>

        {/* Desktop search bar — hidden on mobile */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <TickerSearchBar />
        </div>

        {/* Right side: mobile search icon + theme toggle */}
        <div className="flex items-center gap-2">
          {/* Mobile search icon — visible only on mobile */}
          <button
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Toggle search"
            className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
