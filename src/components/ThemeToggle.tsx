import { useTheme } from "../hooks/useTheme";

/**
 * Toggle button that switches between light and dark themes.
 * Displays sun icon (☀️) when in dark mode (click to go light),
 * and moon icon (🌙) when in light mode (click to go dark).
 * Premium: hover scale, active press, background glow.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-lg text-xl hover:bg-primary/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
