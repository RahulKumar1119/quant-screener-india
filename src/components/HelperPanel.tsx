const AVAILABLE_FIELDS = [
  "Market Cap",
  "PE",
  "ROE",
  "ROCE",
  "Dividend Yield",
  "AI_Rating",
  "AI_Confidence",
  "TFT_Score",
];

const OPERATORS = [">", "<", ">=", "<=", "=", "!=", "AND", "OR"];

const EXAMPLE_QUERIES = [
  'Market Cap > 50000 AND PE < 25',
  'ROE > 15 AND ROCE > 18 AND Dividend Yield > 2',
  'AI_Rating = "STRONG BUY" AND TFT_Score > 70',
];

export function HelperPanel() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Query Reference
      </h3>

      {/* Fields */}
      <div>
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
          Fields
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_FIELDS.map((field) => (
            <span
              key={field}
              className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div>
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
          Operators
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {OPERATORS.map((op) => (
            <span
              key={op}
              className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-mono"
            >
              {op}
            </span>
          ))}
        </div>
      </div>

      {/* Example Queries */}
      <div>
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
          Examples (click to copy)
        </h4>
        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((query) => (
            <button
              key={query}
              onClick={() => copyToClipboard(query)}
              className="block w-full text-left px-3 py-2 text-xs font-mono rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              title="Click to copy"
            >
              {query}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
