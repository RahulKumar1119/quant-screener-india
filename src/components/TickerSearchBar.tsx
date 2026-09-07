import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllTickers } from "../api/client";
import type { TickerSummary } from "../types/index";

/**
 * Search input with typeahead suggestions filtered from the full NSE list.
 * Filters suggestions as case-insensitive substring match on ticker symbol.
 * On selection, navigates to /:ticker route.
 * Premium: focus width expansion, accent ring, glass dropdown, fade transitions.
 */
export function TickerSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tickers, setTickers] = useState<TickerSummary[]>([]);
  const [suggestions, setSuggestions] = useState<TickerSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch ticker list on mount
  useEffect(() => {
    let cancelled = false;
    fetchAllTickers()
      .then((data) => {
        if (!cancelled) {
          setTickers(data.tickers);
        }
      })
      .catch(() => {
        // Silently handle fetch errors — search will just have no suggestions
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter suggestions when query changes
  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = tickers.filter((t) =>
      t.ticker.toLowerCase().includes(lowerQuery)
    );
    setSuggestions(filtered.slice(0, 10));
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [query, tickers]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectTicker = useCallback(
    (ticker: string) => {
      setQuery("");
      setIsOpen(false);
      navigate(`/${ticker}`);
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectTicker(suggestions[highlightedIndex].ticker);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md focus-within:max-w-lg transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-indigo-500/50 rounded-lg"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim().length > 0 && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder="Search ticker..."
        aria-label="Search ticker"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="ticker-suggestions"
        role="combobox"
        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-colors"
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          id="ticker-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full glass rounded-lg max-h-60 overflow-y-auto transition-[opacity,transform] duration-150 animate-fade-in"
        >
          {suggestions.map((item, index) => (
            <li
              key={item.ticker}
              role="option"
              aria-selected={index === highlightedIndex}
              onMouseDown={() => selectTicker(item.ticker)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-2 cursor-pointer text-sm transition-colors duration-100 ${
                index === highlightedIndex
                  ? "border-l-2 border-indigo-500 bg-gradient-to-r from-indigo-500/10 to-transparent text-gray-900 dark:text-gray-100"
                  : "border-l-2 border-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span className="font-medium">{item.ticker}</span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                {item.company_name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
