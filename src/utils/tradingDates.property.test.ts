import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateTradingDates } from "./tradingDates";

/**
 * Property 5: Trading date axis excludes weekends
 *
 * For any start date and any positive count, every date string in the array
 * returned by `generateTradingDates` must correspond to a weekday (Monday
 * through Friday); no Saturday or Sunday shall ever appear.
 *
 * **Validates: Requirements 4.4, 11.4**
 */

/**
 * Custom arbitrary that generates Date objects at midnight local time
 * (matching how the function is used in production with date-only strings).
 * This avoids UTC/local timezone mismatches from fc.date() which generates
 * arbitrary UTC timestamps.
 */
const localMidnightDate = fc
  .integer({ min: 2000, max: 2099 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        // Using day max 28 to avoid invalid dates in short months
        return new Date(year, month - 1, day);
      })
    )
  );

describe("Property 5: Trading date axis excludes weekends", () => {
  it("every date returned by generateTradingDates is a weekday and array length equals count", () => {
    fc.assert(
      fc.property(
        localMidnightDate,
        fc.integer({ min: 1, max: 50 }),
        (startDate, count) => {
          const dates = generateTradingDates(startDate, count);

          // Assert that array length equals the requested count
          expect(dates).toHaveLength(count);

          // Assert every date is a weekday (not Saturday=6, not Sunday=0)
          for (const dateStr of dates) {
            const day = new Date(dateStr).getDay();
            expect(day).not.toBe(0); // Not Sunday
            expect(day).not.toBe(6); // Not Saturday
          }
        }
      ),
      { numRuns: 150 }
    );
  });
});
