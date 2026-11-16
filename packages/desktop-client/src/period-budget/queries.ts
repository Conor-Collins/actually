import { send } from '@actual-app/core/platform/client/connection';
import type { PeriodBudgetCalculation } from '@actual-app/core/server/period-budget/calculate';
import {
  listNameablePayments,
  paymentByIdQuery,
} from '@actual-app/core/shared/period-payment-queries';
import { q } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import type {
  PeriodBudgetRows,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

import { aqlQuery } from '#queries/aqlQuery';

// A change in one of these tables can change what the period budget shows.
const PERIOD_BUDGET_SOURCE_TABLES = [
  'period_cadences',
  'period_budgets',
  'period_offsets',
  'period_schedule_links',
  'period_charge_overrides',
  'period_accounts',
  'transactions',
  'schedules',
  'schedules_next_date',
  'rules',
  'accounts',
  'categories',
  'category_mapping',
  'payees',
  'payee_mapping',
];

export function isPeriodBudgetChange(tables: readonly string[]): boolean {
  return tables.some(table => PERIOD_BUDGET_SOURCE_TABLES.includes(table));
}

type CalculationRange = {
  asOf: string;
  horizonEnd: string;
};

type PaymentRange = {
  start: string;
  end: string; // the last day
  keepId: string | null;
};

// The category Actual's rules give a schedule's transactions, by schedule id.
export type SuggestedCategories = Record<string, string | null>;

export const periodBudgetQueries = {
  all: () => ['period-budget'],
  rows: () =>
    queryOptions<PeriodBudgetRows>({
      queryKey: [...periodBudgetQueries.all(), 'rows'],
      queryFn: () => send('period-budget/get-rows'),
      // Manually invalidated when a source table changes
      staleTime: Infinity,
    }),
  calculation: ({ asOf, horizonEnd }: CalculationRange) =>
    queryOptions<PeriodBudgetCalculation>({
      queryKey: [...periodBudgetQueries.all(), 'calculation', asOf, horizonEnd],
      queryFn: async () => {
        const result = await send('period-budget/calculate', {
          asOf,
          horizonEnd,
        });
        if ('error' in result) {
          throw new Error(result.error);
        }
        return result;
      },
      // Keep the figures on screen while another day is calculated
      placeholderData: previous => previous,
      staleTime: Infinity,
    }),
  schedules: () =>
    queryOptions<ScheduleEntity[]>({
      queryKey: [...periodBudgetQueries.all(), 'schedules'],
      queryFn: async () => {
        const { data }: { data: ScheduleEntity[] } = await aqlQuery(
          q('schedules').filter({ tombstone: false }).select('*'),
        );
        return data;
      },
      staleTime: Infinity,
    }),
  // What can be named as the payment of a charge on these days. The
  // transaction `keepId` is listed first whatever it is, so that a payment
  // that is named already stays in the list.
  nameablePayments: ({ start, end, keepId }: PaymentRange) =>
    queryOptions<TransactionEntity[]>({
      queryKey: [
        ...periodBudgetQueries.all(),
        'nameable-payments',
        start,
        end,
        keepId,
      ],
      queryFn: async () => {
        const data = await listNameablePayments<TransactionEntity>(aqlQuery, {
          start,
          end,
        });
        if (keepId === null || data.some(entry => entry.id === keepId)) {
          return data;
        }
        const { data: kept }: { data: TransactionEntity[] } = await aqlQuery(
          paymentByIdQuery(keepId),
        );
        return [...kept, ...data];
      },
      staleTime: Infinity,
    }),
  suggestedCategories: () =>
    queryOptions<SuggestedCategories>({
      queryKey: [...periodBudgetQueries.all(), 'suggested-categories'],
      queryFn: async () => {
        const { data }: { data: ScheduleEntity[] } = await aqlQuery(
          q('schedules').filter({ tombstone: false }).select('*'),
        );
        const suggested: SuggestedCategories = {};
        for (const schedule of data) {
          const transaction = await send('rules-run', {
            transaction: {
              id: `period-budget/${schedule.id}`,
              account: schedule._account,
              payee: schedule._payee,
              amount: getScheduledAmount(schedule._amount),
              date: schedule.next_date,
              schedule: schedule.id,
            },
          });
          suggested[schedule.id] = transaction?.category ?? null;
        }
        return suggested;
      },
      staleTime: Infinity,
    }),
};
