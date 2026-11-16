import type { PeriodBudgetRow } from '@actual-app/core/types/models';

import { isDay } from './model';

type Candidate = {
  // The stored period that is changed, or null for a new one
  id: string | null;
  category: string;
  start: string;
  end: string; // the first day after the period
};

// The stored period of the category that has a day in common with the
// candidate. The server refuses such a write by the same rule; the page asks
// first, to say it in the user's language.
export function findOverlappingPeriod(
  periods: readonly PeriodBudgetRow[],
  candidate: Candidate,
): { start: string; end: string } | null {
  for (const row of periods) {
    if (
      row.id === candidate.id ||
      row.tombstone ||
      row.category !== candidate.category ||
      !isDay(row.start_date) ||
      !isDay(row.end_date) ||
      row.end_date <= row.start_date
    ) {
      continue;
    }
    if (row.start_date < candidate.end && candidate.start < row.end_date) {
      return { start: row.start_date, end: row.end_date };
    }
  }
  return null;
}
