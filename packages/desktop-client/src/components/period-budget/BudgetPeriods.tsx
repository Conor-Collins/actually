import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import * as months from '@actual-app/core/shared/months';
import { cadenceEnd, isValidDay } from '@actual-app/core/shared/period-store';

import { yearAxis } from '#period-budget';
import type { CategoryRowView, PeriodView } from '#period-budget';

import { usePeriodBudgetDataForDates } from './usePeriodBudgetData';
import type { PeriodBudgetData } from './usePeriodBudgetData';

export type BudgetPeriod = {
  row: CategoryRowView;
  view: PeriodView;
  cadenceMonths: number | null;
};

type BudgetPeriodMonth = {
  asOf: string;
  data: PeriodBudgetData;
  periods: ReadonlyMap<string, BudgetPeriod>;
};

const BudgetPeriodsContext = createContext<
  ReadonlyMap<string, BudgetPeriodMonth>
>(new Map());

function getBudgetPeriods(data: PeriodBudgetData, month: string, asOf: string) {
  const periods = new Map<string, BudgetPeriod>();
  const firstDay = months.firstDayOfMonth(month);
  for (const { rows } of data.view?.groups ?? []) {
    for (const row of rows) {
      if (row.category.is_income) {
        continue;
      }
      for (const view of row.periods) {
        const { period } = view;
        const anchor = row.cadence?.anchor_date;
        const anchorDay = isValidDay(anchor)
          ? months.getDay(anchor)
          : months.getDay(period.start);
        if (
          period.start > asOf ||
          period.end <= firstDay ||
          period.end <= cadenceEnd(period.start, 1, anchorDay)
        ) {
          continue;
        }
        const duration = months.differenceInCalendarMonths(
          period.end,
          period.start,
        );
        periods.set(row.category.id, {
          row,
          view,
          cadenceMonths:
            period.end === cadenceEnd(period.start, duration, anchorDay)
              ? duration
              : null,
        });
      }
    }
  }
  return periods;
}

export function BudgetPeriodsProvider({
  visibleMonths,
  children,
}: {
  visibleMonths: string[];
  children: ReactNode;
}) {
  const today = months.currentDay();
  const cashMonth = cashMonthFor(visibleMonths);
  const dates = visibleMonths.map(month => ({
    asOf: month === today.slice(0, 7) ? today : months.lastDayOfMonth(month),
    axis: yearAxis(month),
    periodsOnly: month !== cashMonth,
  }));
  const results = usePeriodBudgetDataForDates(dates);
  const byMonth = new Map<string, BudgetPeriodMonth>();
  results.forEach((data, index) => {
    const date = dates[index];
    if (date && data.view?.asOf === date.asOf) {
      const month = date.asOf.slice(0, 7);
      byMonth.set(month, {
        asOf: date.asOf,
        data,
        periods: getBudgetPeriods(data, month, date.asOf),
      });
    }
  });
  return (
    <BudgetPeriodsContext.Provider value={byMonth}>
      {children}
    </BudgetPeriodsContext.Provider>
  );
}

export function cashMonthFor(visibleMonths: string[]) {
  const current = months.currentMonth();
  return visibleMonths.includes(current) ? current : visibleMonths[0];
}

export function useBudgetPeriodMonths() {
  return useContext(BudgetPeriodsContext);
}

export function useBudgetPeriodMonth(month: string) {
  return useBudgetPeriodMonths().get(month);
}

export function periodBudgetLink(
  asOf: string,
  category?: string,
  period?: PeriodView['period'],
) {
  const params = new URLSearchParams({ asOf });
  if (category !== undefined) {
    params.set('category', category);
  }
  if (period) {
    params.set('period', period.id);
    params.set('start', period.start);
  }
  return '/period-budget?' + params.toString();
}
