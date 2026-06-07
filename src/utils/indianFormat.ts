// src/utils/indianFormat.ts

/**
 * Formats a number using the Indian numbering system.
 * Values ≥ 1 Crore → display as "₹X.XX Cr"
 * Values ≥ 1 Lakh → display as "₹X.XX L"
 * Values < 1 Lakh → display as "₹X,XX,XXX" (Indian comma grouping)
 */
export function formatIndianCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_00_00_000) {
    // Crores (1,00,00,000)
    const crores = absValue / 1_00_00_000;
    return `${sign}₹${crores.toFixed(2)} Cr`;
  }

  if (absValue >= 1_00_000) {
    // Lakhs (1,00,000)
    const lakhs = absValue / 1_00_000;
    return `${sign}₹${lakhs.toFixed(2)} L`;
  }

  // Below 1 Lakh: Indian comma grouping (1,23,456)
  return `${sign}₹${indianCommaGrouping(absValue)}`;
}

/**
 * Applies Indian comma grouping: rightmost 3 digits, then groups of 2.
 * Example: 1234567 → "12,34,567"
 */
export function indianCommaGrouping(value: number): string {
  const str = Math.round(value).toString();
  if (str.length <= 3) return str;

  const lastThree = str.slice(-3);
  const remaining = str.slice(0, -3);
  const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${lastThree}`;
}

/**
 * Formats a percentage value.
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
