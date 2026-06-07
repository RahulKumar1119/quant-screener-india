import { useTheme } from "../hooks/useTheme";

/**
 * Toggle button that switches between light and dark themes.
 * Displays sun icon (☀️) when in dark mode (click to go light),
 * and moon icon (🌙) when in light mode (click to go dark).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-lg text-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
