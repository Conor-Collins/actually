import type { PeriodRef } from '#period-budget';

// The opened row: a category, and one of its periods when a bar was chosen.
export type Selection = {
  categoryId: string;
  period: PeriodRef | null;
};
