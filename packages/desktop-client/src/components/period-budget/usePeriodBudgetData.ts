import { useTranslation } from 'react-i18next';

import type {
  PeriodBudgetRows,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { usePayees } from '#hooks/usePayees';
import {
  buildPeriodBudgetView,
  horizonEndFor,
  periodBudgetQueries,
} from '#period-budget';
import type {
  Axis,
  PeriodBudgetView,
  SuggestedCategories,
} from '#period-budget';

export type PeriodBudgetData = {
  // Null until the first calculation has arrived
  view: PeriodBudgetView | null;
  rows: PeriodBudgetRows | null;
  schedules: ScheduleEntity[];
  suggestedCategories: SuggestedCategories;
  error: Error | null;
  categoryName: (id: string) => string;
  payeeName: (id: string | null) => string;
  accountName: (id: string) => string;
  scheduleName: (id: string) => string;
};

type UsePeriodBudgetDataProps = {
  asOf: string;
  axis: Axis;
};

// Everything the page shows for an as-of day, with the names it needs.
export function usePeriodBudgetData({
  asOf,
  axis,
}: UsePeriodBudgetDataProps): PeriodBudgetData {
  const { t } = useTranslation();
  const rowsQuery = useQuery(periodBudgetQueries.rows());
  const rows = rowsQuery.data ?? null;
  const horizonEnd = horizonEndFor({ asOf, axis, rows: rowsQuery.data });
  const calculationQuery = useQuery({
    ...periodBudgetQueries.calculation({ asOf, horizonEnd }),
    // The stored periods decide how far the calculation looks
    enabled: rows !== null,
  });
  const schedulesQuery = useQuery(periodBudgetQueries.schedules());
  const suggestedQuery = useQuery(periodBudgetQueries.suggestedCategories());
  const { data: categories } = useCategories();
  const { data: payees = [] } = usePayees();
  const { data: accounts = [] } = useAccounts();
  const schedules = schedulesQuery.data ?? [];

  const calculation = calculationQuery.data;
  const view =
    calculation && rows && categories
      ? buildPeriodBudgetView({
          calculation,
          rows,
          categoryGroups: categories.grouped,
        })
      : null;

  function categoryName(id: string) {
    const category = categories?.list.find(entry => entry.id === id);
    return category?.name ?? t('Deleted category');
  }

  function accountName(id: string) {
    const account = accounts.find(entry => entry.id === id);
    return account?.name ?? t('Deleted account');
  }

  function payeeName(id: string | null) {
    const payee = payees.find(entry => entry.id === id);
    if (!payee) {
      return t('No payee');
    }
    if (payee.transfer_acct) {
      return t('Transfer: {{account}}', {
        account: accountName(payee.transfer_acct),
      });
    }
    return payee.name;
  }

  function scheduleName(id: string) {
    const schedule = schedules.find(entry => entry.id === id);
    if (!schedule) {
      return t('Deleted schedule');
    }
    if (schedule.name) {
      return schedule.name;
    }
    return schedule._payee ? payeeName(schedule._payee) : t('Unnamed schedule');
  }

  return {
    view,
    rows,
    schedules,
    suggestedCategories: suggestedQuery.data ?? {},
    error: rowsQuery.error ?? calculationQuery.error ?? null,
    categoryName,
    payeeName,
    accountName,
    scheduleName,
  };
}
