interface GemmaSummaryCardProps {
  summary: string;
}

export function GemmaSummaryCard({ summary }: GemmaSummaryCardProps) {
  const hasContent = summary.trim().length > 0;

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-violet-500 p-[2px] rounded-xl">
      <div className="rounded-xl bg-[rgb(var(--color-surface-elevated))] p-5 relative overflow-hidden">
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent bg-[length:200%_100%] animate-shimmer pointer-events-none" />

        <div className="flex items-center gap-2 mb-3 relative">
          <svg
            className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-[rotate-slow_8s_linear_infinite]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            AI-Generated Analysis
          </h3>
        </div>
        {hasContent ? (
          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 relative">
            {summary.split(" ").map((word, i) => (
              <span
                key={i}
                className="inline-block animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {word}&nbsp;
              </span>
            ))}
          </p>
        ) : (
          <div className="skeleton h-16 w-full" />
        )}
      </div>
    </div>
  );
}
