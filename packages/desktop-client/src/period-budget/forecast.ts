import type {
  PeriodBudgetCalculation,
  ScheduledCashMovement,
} from '@actual-app/core/server/period-budget/calculate';
import * as monthUtils from '@actual-app/core/shared/months';
import { planCash } from '@actual-app/core/shared/period-charges';
import type { AccountCashPlan } from '@actual-app/core/shared/period-charges';

export type CashMovementKind = 'payment' | 'income' | 'transfer';

export type CashMovementView = ScheduledCashMovement & {
  kind: CashMovementKind;
  // Due before the as-of day and not made yet: planned on the as-of day
  isOverdue: boolean;
};

// The closing balance of a day; it holds until the next point.
export type BalancePoint = {
  date: string;
  balance: number;
};

// Days in a row on which the closing balance is below zero.
export type ShortfallSpan = {
  start: string;
  lastDay: string;
};

export type AccountForecast = AccountCashPlan & {
  // Shortfalls are forecast for an account with a balance above zero now
  isForecast: boolean;
  payments: CashMovementView[]; // by date, then id
  income: CashMovementView[];
  transfers: CashMovementView[];
  // The as-of day, then every later day up to the horizon with a movement
  points: BalancePoint[];
  shortfalls: ShortfallSpan[]; // none when shortfalls are not forecast
};

export type CashForecast = {
  asOf: string;
  horizonEnd: string;
  cashAvailable: number;
  inAccounts: number;
  owed: number;
  projectedCash: number; // the balances together at the end of the horizon
  accounts: AccountForecast[]; // in the order of the calculation
};

// The accounts with a balance above zero on the as-of day, or the others.
export type AccountGroup = {
  kind: 'in-accounts' | 'owed';
  // The group's part of the cash on the as-of day; what is owed as a
  // positive number
  total: number;
  accounts: AccountForecast[];
};

type BuildInput = {
  calculation: PeriodBudgetCalculation;
  // The last day of the forecast; the calculation's own last day when that
  // is earlier
  horizonEnd: string;
};

function kindOf(movement: ScheduledCashMovement): CashMovementKind {
  if (movement.isTransfer) {
    return 'transfer';
  }
  return movement.amount > 0 ? 'income' : 'payment';
}

// The cash forecast of the selected accounts up to a day, from the balances
// and the scheduled movements of a calculation, by the rule the server uses.
// Null when the calculation has no cash plan.
export function buildCashForecast({
  calculation,
  horizonEnd,
}: BuildInput): CashForecast | null {
  const { asOf, cash, movements } = calculation;
  if (cash === null) {
    return null;
  }
  const end =
    horizonEnd > calculation.horizonEnd ? calculation.horizonEnd : horizonEnd;
  const plan = planCash({
    accounts: cash.accounts.map(account => ({
      id: account.accountId,
      balance: account.currentBalance,
    })),
    selectedAccountIds: cash.accounts.map(account => account.accountId),
    movements,
    asOf,
    horizonEnd: end,
  });
  if (plan === null) {
    return null;
  }

  const accounts = plan.accounts.map((account): AccountForecast => {
    const own = movements
      .filter(
        movement =>
          movement.account === account.accountId && movement.date <= end,
      )
      .map((movement): CashMovementView => ({
        ...movement,
        kind: kindOf(movement),
        isOverdue: movement.dueDate < asOf,
      }));

    const points: BalancePoint[] = [
      { date: asOf, balance: account.currentBalance },
    ];
    for (const movement of own) {
      const last = points[points.length - 1];
      if (movement.date <= last.date) {
        last.balance += movement.amount;
      } else {
        points.push({
          date: movement.date,
          balance: last.balance + movement.amount,
        });
      }
    }

    const isForecast = account.currentBalance > 0;
    const shortfalls: ShortfallSpan[] = [];
    if (isForecast) {
      let start: string | null = null;
      for (const point of points) {
        if (point.balance < 0 && start === null) {
          start = point.date;
        } else if (point.balance >= 0 && start !== null) {
          shortfalls.push({
            start,
            lastDay: monthUtils.subDays(point.date, 1),
          });
          start = null;
        }
      }
      if (start !== null) {
        shortfalls.push({ start, lastDay: end });
      }
    }

    return {
      ...account,
      isForecast,
      payments: own.filter(movement => movement.kind === 'payment'),
      income: own.filter(movement => movement.kind === 'income'),
      transfers: own.filter(movement => movement.kind === 'transfer'),
      points,
      shortfalls,
    };
  });

  return {
    asOf,
    horizonEnd: end,
    cashAvailable: plan.cashAvailable,
    inAccounts: plan.inAccounts,
    owed: plan.owed,
    projectedCash: plan.projectedCash,
    accounts,
  };
}

// The accounts of a forecast as its totals count them: those with a balance
// above zero, then those without. A group without accounts is left out.
export function accountGroups(forecast: CashForecast): AccountGroup[] {
  const groups: AccountGroup[] = [
    {
      kind: 'in-accounts',
      total: forecast.inAccounts,
      accounts: forecast.accounts.filter(account => account.isForecast),
    },
    {
      kind: 'owed',
      total: forecast.owed,
      accounts: forecast.accounts.filter(account => !account.isForecast),
    },
  ];
  return groups.filter(group => group.accounts.length > 0);
}
