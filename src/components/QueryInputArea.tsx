import { useState } from "react";
import type { QueryParseError } from "../types/index";

interface QueryInputAreaProps {
  onSubmit: (query: string) => void;
  error: QueryParseError | null;
}

export function QueryInputArea({ onSubmit, error }: QueryInputAreaProps) {
  const [queryText, setQueryText] = useState("");

  const handleSubmit = () => {
    onSubmit(queryText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor="query-input"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Query
      </label>
      <textarea
        id="query-input"
        rows={4}
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='e.g. Market Cap > 10000 AND PE < 30 AND ROE > 15'
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 text-sm font-mono placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
      />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-700 dark:text-red-300 font-mono">
            {error.message}
          </p>
          {error.position > 0 && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              <span className="font-mono">
                {"─".repeat(error.position)}^
              </span>{" "}
              (position {error.position})
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        Run Query
      </button>
    </div>
  );
}
