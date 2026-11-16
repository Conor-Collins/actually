import type { PeriodBudgetCalculation } from '@actual-app/core/server/period-budget/calculate';
import {
  listPeriodPayments,
  projectPeriodCharges,
} from '@actual-app/core/shared/period-budget';
import type {
  BudgetPeriod,
  ChargeOccurrence,
  ExpensePosting,
  PeriodOffset,
} from '@actual-app/core/shared/period-budget';
import type { DerivedCharge } from '@actual-app/core/shared/period-charges';
import type {
  PeriodBudgetRow,
  PeriodBudgetRows,
} from '@actual-app/core/types/models';

// What the tests of the period budget build their books from.

export const NO_ROWS: PeriodBudgetRows = {
  cadences: [],
  periods: [],
  offsets: [],
  scheduleLinks: [],
  chargeOverrides: [],
  accounts: [],
};

export function period(
  id: string,
  category: string,
  start: string,
  end: string,
  budget: number,
  carryover = 0,
): BudgetPeriod {
  return { id, category, start, end, budget, carryover };
}

export function stored(
  value: BudgetPeriod,
  fields: Partial<PeriodBudgetRow> = {},
): PeriodBudgetRow {
  return {
    id: value.id,
    category: value.category,
    start_date: value.start,
    end_date: value.end,
    budget: value.budget,
    carryover: value.carryover,
    carried_from: null,
    tombstone: false,
    ...fields,
  };
}

export function charge(
  scheduleId: string,
  category: string,
  dueDate: string,
  periodId: string | null,
  amount: number,
  fields: Partial<DerivedCharge> = {},
): DerivedCharge {
  return {
    id: `${scheduleId}:${dueDate}`,
    scheduleId,
    category,
    dueDate,
    periodId,
    amount,
    status: 'expected',
    paymentId: null,
    paymentDate: null,
    isNamedPayment: false,
    openAmount: 0,
    furtherPaymentIds: [],
    ...fields,
  };
}

export type BookInput = {
  asOf: string;
  periods: BudgetPeriod[];
  // Stored periods that the calculation leaves out
  setAside?: BudgetPeriod[];
  postings?: ExpensePosting[];
  offsets?: PeriodOffset[];
  occurrences?: ChargeOccurrence[];
  fields?: Partial<PeriodBudgetCalculation>;
};

// The calculation the server would return for these periods and payments,
// made with the shared functions the server uses.
export function calculate({
  asOf,
  periods,
  setAside = [],
  postings = [],
  offsets = [],
  occurrences = [],
  fields = {},
}: BookInput): PeriodBudgetCalculation {
  const categoriesWithPeriod = new Set(
    [...periods, ...setAside].map(entry => entry.category),
  );
  const monthStart = `${asOf.slice(0, 8)}01`;
  return {
    asOf,
    horizonEnd: '2027-12-31',
    projection: projectPeriodCharges({
      periods,
      postings,
      offsets,
      occurrences,
      asOf,
    }),
    payments: listPeriodPayments({ periods, postings, offsets, asOf })
      .filter(
        payment =>
          categoriesWithPeriod.has(payment.category) ||
          payment.date >= monthStart,
      )
      .map(payment => ({ ...payment, account: 'checking', payee: null })),
    plannedPeriodIds: [],
    charges: [],
    derivedOffsetIds: [],
    paidOutsideBudget: [],
    needsAttention: [],
    unresolved: [],
    cash: null,
    movements: [],
    ...fields,
  };
}
