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
    <div className="rounded-lg border border-custom bg-surface p-4 space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Query reference
      </h3>

      {/* Fields */}
      <div>
        <h4 className="text-xs font-medium text-fog mb-2">
          Fields
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_FIELDS.map((field) => (
            <span
              key={field}
              className="inline-block px-2 py-0.5 text-xs rounded border border-custom text-gray-700 dark:text-gray-300 font-mono"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div>
        <h4 className="text-xs font-medium text-fog mb-2">
          Operators
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {OPERATORS.map((op) => (
            <span
              key={op}
              className="inline-block px-2 py-0.5 text-xs rounded border border-custom text-gray-700 dark:text-gray-300 font-mono"
            >
              {op}
            </span>
          ))}
        </div>
      </div>

      {/* Example Queries */}
      <div>
        <h4 className="text-xs font-medium text-fog mb-2">
          Examples (click to copy)
        </h4>
        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((query) => (
            <button
              key={query}
              onClick={() => copyToClipboard(query)}
              className="block w-full text-left px-3 py-2 text-xs font-mono rounded border border-custom text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
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
