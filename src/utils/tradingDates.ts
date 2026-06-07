// src/utils/tradingDates.ts

/**
 * Generates an array of trading dates (skipping Saturday=6, Sunday=0)
 * starting from a given date.
 *
 * @param startDate - The date to begin generating from
 * @param count - Number of weekday trading dates to generate
 * @returns Array of date strings in YYYY-MM-DD format (weekdays only)
 */
export function generateTradingDates(
  startDate: Date,
  count: number
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (dates.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      // Use local time formatting to stay consistent with getDay() which uses local time
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const date = String(current.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${date}`);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Returns true if a date string (YYYY-MM-DD) falls on a weekday (Mon-Fri).
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if the date is Monday through Friday, false for Saturday/Sunday
 */
export function isWeekday(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day !== 0 && day !== 6;
}
