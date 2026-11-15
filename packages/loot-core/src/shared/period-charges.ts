import type { PeriodChargeOverrideRow, PeriodOffsetRow } from '#types/models';

import { projectCashBalances } from './period-budget';
import type {
  AccountCashProjection,
  AccountSnapshot,
  BudgetPeriod,
  CashMovement,
} from './period-budget';
import type { LoaderOccurrence, SetAsideRow } from './period-loader';
import { isValidDay, isWholeNumber } from './period-store';

// A schedule the user linked to a category, with a negative amount.
export type ChargeSchedule = {
  id: string;
  category: string; // the linked category
  amount: number; // the expected charge: a whole number above zero
  // Due dates of the schedule: every one from the last before `start` to the
  // first after `end`, and any other one the user named a payment for.
  dueDates: readonly string[];
  // An unpaid charge that is due before this day is closed: Actual no longer
  // expects it. null: every unpaid charge is closed (a completed schedule).
  expectedFrom: string | null;
};

export type ChargeTransaction = {
  id: string;
  date: string;
  schedule: string | null; // the schedule id the transaction carries
  category: string | null;
  // Set on a part of a split transaction. The caller leaves out a part whose
  // split it does not pass.
  parentId: string | null;
};

export type DerivedChargeStatus = 'expected' | 'paid' | 'skipped' | 'closed';

export type DerivedCharge = {
  id: string; // <schedule id>:<due date>
  scheduleId: string;
  category: string;
  dueDate: string;
  periodId: string | null; // the category's period that contains the due date
  amount: number; // the expected amount, with the override applied
  status: DerivedChargeStatus;
  paymentId: string | null; // the transaction that settles the charge
  paymentDate: string | null;
  isNamedPayment: boolean; // the user named the payment
  openAmount: number; // "still expected" after a part payment, 0 when none
  furtherPaymentIds: string[]; // further payments that are nearest to this charge
};

type DeriveChargesInput = {
  schedules: readonly ChargeSchedule[];
  overrides: readonly PeriodChargeOverrideRow[];
  transactions: readonly ChargeTransaction[];
  periods: readonly BudgetPeriod[]; // the periods the loader kept
  offsets: readonly PeriodOffsetRow[]; // the stored (manual) offsets
  start: string; // charges due from this day
  end: string; // to this day, both included
  asOf: string;
};

export type DerivedCharges = {
  charges: DerivedCharge[]; // due from `start` to `end`, by due date, then id
  occurrences: LoaderOccurrence[]; // what the loader takes
  offsets: PeriodOffsetRow[]; // the stored rows, then the derived ones
  derivedOffsetIds: string[]; // transaction ids of the derived offsets
  // The transactions the user named as the payment of a charge, also of a
  // charge that is due outside `start` to `end`.
  namedPayments: Array<{ id: string; scheduleId: string }>;
  setAside: SetAsideRow[];
};

type Working = {
  charge: DerivedCharge;
  schedule: ChargeSchedule;
  namedId: string | null;
};

// Days since 1970-01-01 of a valid day.
function dayNumber(day: string): number {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const dayOfMonth = Number(day.slice(8, 10));
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear =
    Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) +
    dayOfMonth -
    1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function cleanDueDates(dueDates: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const day of dueDates) {
    if (isValidDay(day)) {
      unique.add(day);
    }
  }
  return [...unique].sort();
}

// The index of the due date a payment of this day belongs to, or -1.
// It is the nearest due date; of two equally near, the earlier. A payment
// before the first due date or after the last one belongs to it only when it
// is no further away than half the distance to that due date's neighbour.
// `dueDates` is in ascending order without repeats.
function nearestDueIndex(dueDates: readonly string[], day: string): number {
  const count = dueDates.length;
  if (count <= 1) {
    return count - 1;
  }
  // The first due date that is not before the day.
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (dueDates[middle] < day) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  const target = dayNumber(day);
  if (low === 0) {
    const first = dayNumber(dueDates[0]);
    return (first - target) * 2 <= dayNumber(dueDates[1]) - first ? 0 : -1;
  }
  if (low === count) {
    const last = dayNumber(dueDates[count - 1]);
    return (target - last) * 2 <= last - dayNumber(dueDates[count - 2])
      ? count - 1
      : -1;
  }
  const before = target - dayNumber(dueDates[low - 1]);
  const after = dayNumber(dueDates[low]) - target;
  return after < before ? low : low - 1;
}

function byDateThenId(
  a: { date: string; id: string },
  b: { date: string; id: string },
): number {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

function byDueDateThenId(a: Working, b: Working): number {
  if (a.charge.dueDate !== b.charge.dueDate) {
    return a.charge.dueDate < b.charge.dueDate ? -1 : 1;
  }
  if (a.charge.id !== b.charge.id) {
    return a.charge.id < b.charge.id ? -1 : 1;
  }
  return 0;
}

// The periods of one category by start, then id. `latestEnd[i]` is the latest
// end of the periods up to and including the one at `i`.
type CategoryPeriods = {
  periods: BudgetPeriod[];
  latestEnd: string[];
};

function indexPeriods(
  periods: readonly BudgetPeriod[],
): Map<string, CategoryPeriods> {
  const byCategory = new Map<string, CategoryPeriods>();
  for (const period of periods) {
    const found = byCategory.get(period.category);
    if (found === undefined) {
      byCategory.set(period.category, { periods: [period], latestEnd: [] });
    } else {
      found.periods.push(period);
    }
  }
  for (const entry of byCategory.values()) {
    entry.periods.sort((a, b) => {
      if (a.start !== b.start) {
        return a.start < b.start ? -1 : 1;
      }
      if (a.id !== b.id) {
        return a.id < b.id ? -1 : 1;
      }
      return 0;
    });
    let latest = '';
    for (const period of entry.periods) {
      if (period.end > latest) {
        latest = period.end;
      }
      entry.latestEnd.push(latest);
    }
  }
  return byCategory;
}

// The category's period that contains the day: of several, the one that
// starts first, then the one with the smaller id.
function findPeriodId(
  index: Map<string, CategoryPeriods>,
  category: string,
  day: string,
): string | null {
  const entry = index.get(category);
  if (entry === undefined) {
    return null;
  }
  // The first period that ends after the day, or one before it does.
  let low = 0;
  let high = entry.periods.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (entry.latestEnd[middle] > day) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  if (low === entry.periods.length || !(entry.periods[low].start <= day)) {
    return null;
  }
  return entry.periods[low].id;
}

// The charges of the linked schedules (plan B4) and the offsets that follow
// from their payments (plan B3). It never throws: input it cannot use is left
// out, and what the user should look at is listed in `setAside`.
export function deriveCharges({
  schedules,
  overrides,
  transactions,
  periods,
  offsets,
  start,
  end,
  asOf,
}: DeriveChargesInput): DerivedCharges {
  const setAside: SetAsideRow[] = [];

  // Transactions with a date that is not a valid day are left out.
  const transactionById = new Map<string, ChargeTransaction>();
  const childrenByParentId = new Map<string, ChargeTransaction[]>();
  const paymentsByScheduleId = new Map<string, ChargeTransaction[]>();
  for (const transaction of transactions) {
    if (!isValidDay(transaction.date) || transactionById.has(transaction.id)) {
      continue;
    }
    transactionById.set(transaction.id, transaction);
    if (transaction.parentId !== null && transaction.parentId !== '') {
      const children = childrenByParentId.get(transaction.parentId);
      if (children === undefined) {
        childrenByParentId.set(transaction.parentId, [transaction]);
      } else {
        children.push(transaction);
      }
    }
  }
  // A transaction is a payment of the schedule it carries. So is a part of a
  // split, unless the split carries the same schedule: then the split is the
  // payment.
  for (const transaction of transactionById.values()) {
    const scheduleId = transaction.schedule;
    if (scheduleId === null || scheduleId === '') {
      continue;
    }
    if (
      transaction.parentId !== null &&
      transaction.parentId !== '' &&
      transactionById.get(transaction.parentId)?.schedule === scheduleId
    ) {
      continue;
    }
    const payments = paymentsByScheduleId.get(scheduleId);
    if (payments === undefined) {
      paymentsByScheduleId.set(scheduleId, [transaction]);
    } else {
      payments.push(transaction);
    }
  }

  // Part A: one charge for every due date of every schedule.
  const periodIndex = indexPeriods(periods);
  const workingById = new Map<string, Working>();
  const workingBySchedule: Array<{
    schedule: ChargeSchedule;
    dueDates: string[];
  }> = [];
  const seenScheduleIds = new Set<string>();
  for (const schedule of schedules) {
    if (seenScheduleIds.has(schedule.id)) {
      continue;
    }
    seenScheduleIds.add(schedule.id);
    if (!isWholeNumber(schedule.amount) || schedule.amount <= 0) {
      continue;
    }
    const dueDates = cleanDueDates(schedule.dueDates);
    workingBySchedule.push({ schedule, dueDates });
    for (const dueDate of dueDates) {
      const id = `${schedule.id}:${dueDate}`;
      if (workingById.has(id)) {
        continue;
      }
      workingById.set(id, {
        schedule,
        namedId: null,
        charge: {
          id,
          scheduleId: schedule.id,
          category: schedule.category,
          dueDate,
          periodId: findPeriodId(periodIndex, schedule.category, dueDate),
          amount: schedule.amount,
          status: 'expected',
          paymentId: null,
          paymentDate: null,
          isNamedPayment: false,
          openAmount: 0,
          furtherPaymentIds: [],
        },
      });
    }
  }

  function isInRange(working: Working): boolean {
    return working.charge.dueDate >= start && working.charge.dueDate <= end;
  }

  function report(working: Working, detail: string): void {
    if (isInRange(working)) {
      setAside.push({
        table: 'period_charge_overrides',
        id: working.charge.id,
        reason: 'invalid-override',
        detail,
      });
    }
  }

  // Part B: overrides. A field that cannot be used is ignored and reported.
  const seenOverrideIds = new Set<string>();
  for (const row of overrides) {
    if (row.tombstone || seenOverrideIds.has(row.id)) {
      continue;
    }
    seenOverrideIds.add(row.id);
    const working = workingById.get(row.id);
    if (working === undefined) {
      continue;
    }
    if (row.amount !== null) {
      if (isWholeNumber(row.amount) && row.amount >= 0) {
        working.charge.amount = row.amount;
      } else {
        report(working, 'amount is not a whole number that is not negative');
      }
    }
    if (row.open_amount !== null) {
      if (isWholeNumber(row.open_amount) && row.open_amount >= 0) {
        working.charge.openAmount = row.open_amount;
      } else {
        report(
          working,
          'still expected amount is not a whole number that is not negative',
        );
      }
    }
    if (row.skipped === true) {
      working.charge.status = 'skipped';
      continue;
    }
    if (row.transaction_id !== null && row.transaction_id !== '') {
      working.namedId = row.transaction_id;
    }
  }

  const allWorking = [...workingById.values()].sort(byDueDateThenId);

  // Part C: payments the user named. The charge with the earlier due date
  // keeps a payment that two charges name.
  const takenBy = new Map<string, string>();
  const namedPayments: Array<{ id: string; scheduleId: string }> = [];
  for (const working of allWorking) {
    const namedId = working.namedId;
    if (namedId === null) {
      continue;
    }
    const transaction = transactionById.get(namedId);
    if (transaction === undefined) {
      report(working, `named transaction "${namedId}" is missing`);
      continue;
    }
    const other = takenBy.get(namedId);
    if (other !== undefined) {
      report(working, `transaction "${namedId}" already pays charge ${other}`);
      continue;
    }
    takenBy.set(namedId, working.charge.id);
    namedPayments.push({ id: namedId, scheduleId: working.schedule.id });
    working.charge.status = 'paid';
    working.charge.paymentId = transaction.id;
    working.charge.paymentDate = transaction.date;
    working.charge.isNamedPayment = true;
  }

  // Part D: the calculated match, schedule by schedule.
  for (const { schedule, dueDates } of workingBySchedule) {
    const payments = [...(paymentsByScheduleId.get(schedule.id) ?? [])].sort(
      byDateThenId,
    );
    for (const payment of payments) {
      if (takenBy.has(payment.id)) {
        continue;
      }
      const index = nearestDueIndex(dueDates, payment.date);
      if (index === -1) {
        continue;
      }
      const working = workingById.get(`${schedule.id}:${dueDates[index]}`);
      if (working === undefined) {
        continue;
      }
      if (working.charge.status === 'expected') {
        working.charge.status = 'paid';
        working.charge.paymentId = payment.id;
        working.charge.paymentDate = payment.date;
      } else {
        working.charge.furtherPaymentIds.push(payment.id);
      }
    }
  }

  // Part E: an unpaid charge that Actual no longer expects is closed.
  for (const working of allWorking) {
    const expectedFrom = working.schedule.expectedFrom;
    if (
      working.charge.status === 'expected' &&
      (expectedFrom === null || working.charge.dueDate < expectedFrom)
    ) {
      working.charge.status = 'closed';
    }
  }

  // Part F: derived offsets. A payment of a charge counts in the charge's
  // period when its category is the schedule's linked category. A stored
  // offset wins, and a payment dated inside the period needs none.
  const periodById = new Map<string, BudgetPeriod>();
  for (const period of periods) {
    if (!periodById.has(period.id)) {
      periodById.set(period.id, period);
    }
  }
  const manualIds = new Set<string>();
  for (const row of offsets) {
    if (!row.tombstone) {
      manualIds.add(row.id);
    }
  }
  const derivedById = new Map<string, string>();
  function addDerived(
    transaction: ChargeTransaction,
    category: string,
    period: BudgetPeriod,
  ): void {
    if (
      transaction.category !== category ||
      manualIds.has(transaction.id) ||
      derivedById.has(transaction.id) ||
      (transaction.date >= period.start && transaction.date < period.end)
    ) {
      return;
    }
    derivedById.set(transaction.id, period.id);
  }
  function paymentsOf(working: Working): ChargeTransaction[] {
    const ids =
      working.charge.paymentId === null
        ? working.charge.furtherPaymentIds
        : [working.charge.paymentId, ...working.charge.furtherPaymentIds];
    const found: ChargeTransaction[] = [];
    for (const id of ids) {
      const transaction = transactionById.get(id);
      if (transaction !== undefined) {
        found.push(transaction);
      }
    }
    return found;
  }
  // The payments themselves first, then the parts of split payments.
  for (const working of allWorking) {
    const periodId = working.charge.periodId;
    const period = periodId === null ? undefined : periodById.get(periodId);
    if (period === undefined) {
      continue;
    }
    for (const payment of paymentsOf(working)) {
      addDerived(payment, working.charge.category, period);
    }
  }
  for (const working of allWorking) {
    const periodId = working.charge.periodId;
    const period = periodId === null ? undefined : periodById.get(periodId);
    if (period === undefined) {
      continue;
    }
    for (const payment of paymentsOf(working)) {
      for (const child of childrenByParentId.get(payment.id) ?? []) {
        addDerived(child, working.charge.category, period);
      }
    }
  }
  const derivedOffsetIds = [...derivedById.keys()].sort();
  const derivedRows: PeriodOffsetRow[] = [];
  for (const id of derivedOffsetIds) {
    const periodId = derivedById.get(id);
    if (periodId !== undefined) {
      derivedRows.push({ id, period_id: periodId, tombstone: false });
    }
  }

  // Part G: what is returned for the range.
  const charges: DerivedCharge[] = [];
  const occurrences: LoaderOccurrence[] = [];
  for (const working of allWorking) {
    if (!isInRange(working)) {
      continue;
    }
    const charge = working.charge;
    charges.push(charge);
    if (charge.status === 'skipped' || charge.status === 'closed') {
      continue;
    }
    if (charge.periodId === null) {
      if (charge.status === 'expected') {
        setAside.push({
          table: 'charges',
          id: charge.id,
          reason: 'charge-period-missing',
          detail: `no period of category "${charge.category}" contains ${charge.dueDate}`,
        });
      }
      continue;
    }
    if (
      charge.status === 'expected' ||
      charge.paymentId === null ||
      charge.paymentDate === null
    ) {
      occurrences.push({
        id: charge.id,
        periodId: charge.periodId,
        date: charge.dueDate,
        amount: charge.amount,
        state: 'scheduled',
      });
      continue;
    }
    occurrences.push({
      id: charge.id,
      periodId: charge.periodId,
      date: charge.dueDate,
      amount: charge.amount,
      state: 'posted',
      transactionId: charge.paymentId,
      transactionDate: charge.paymentDate,
    });
    if (charge.openAmount > 0 && charge.paymentDate <= asOf) {
      occurrences.push({
        id: `${charge.id}:open`,
        periodId: charge.periodId,
        date: charge.dueDate,
        amount: charge.openAmount,
        state: 'scheduled',
      });
    }
  }

  return {
    charges,
    occurrences,
    offsets: [...offsets, ...derivedRows],
    derivedOffsetIds,
    namedPayments,
    setAside,
  };
}

// The due dates that have a payment: every payment belongs to its nearest due
// date, as in `deriveCharges`, whatever the day it is dated. Days that are not
// valid are left out.
export function settledDueDates(
  dueDates: readonly string[],
  paymentDays: readonly string[],
): string[] {
  const sorted = cleanDueDates(dueDates);
  const settled = new Set<string>();
  for (const day of paymentDays) {
    if (!isValidDay(day)) {
      continue;
    }
    const index = nearestDueIndex(sorted, day);
    if (index !== -1) {
      settled.add(sorted[index]);
    }
  }
  return [...settled].sort();
}

// What the cash forecast plans for a charge on its due date: the whole amount
// while it has no payment, afterwards the "still expected" part. The payment
// itself is in the balances, or it is a movement of its own when it is dated
// after the as-of day.
export function unpaidChargeAmount(charge: DerivedCharge): number {
  if (charge.status === 'expected') {
    return charge.amount;
  }
  return charge.status === 'paid' ? charge.openAmount : 0;
}

export type PlannedCashMovement = CashMovement & {
  dueDate: string; // the day it was due; `date` is the day it is planned on
};

type PlaceCashMovementsInput = {
  movements: readonly CashMovement[];
  selectedAccountIds: readonly string[];
  asOf: string;
  horizonEnd: string;
};

// The movements the cash forecast uses: those of the selected accounts that
// are due on or before the horizon. One that is overdue is planned on the
// as-of day.
export function placeCashMovements({
  movements,
  selectedAccountIds,
  asOf,
  horizonEnd,
}: PlaceCashMovementsInput): PlannedCashMovement[] {
  const selected = new Set(selectedAccountIds);
  const seenIds = new Set<string>();
  const placed: PlannedCashMovement[] = [];
  for (const movement of movements) {
    if (
      seenIds.has(movement.id) ||
      !selected.has(movement.account) ||
      !isValidDay(movement.date) ||
      movement.date > horizonEnd
    ) {
      continue;
    }
    seenIds.add(movement.id);
    placed.push({
      id: movement.id,
      account: movement.account,
      date: movement.date < asOf ? asOf : movement.date,
      amount: movement.amount,
      dueDate: movement.date,
    });
  }
  return placed;
}

export type AccountCashPlan = AccountCashProjection & {
  // The smallest transfer that keeps the account from falling short; 0 when
  // it does not fall short or its balance is not above zero now.
  transferNeeded: number;
};

export type CashPlan = {
  cashAvailable: number; // the sum of the selected balances
  inAccounts: number; // the selected balances above zero
  owed: number; // the selected balances below zero, as a positive number
  projectedCash: number;
  accounts: AccountCashPlan[];
};

type PlanCashInput = {
  accounts: readonly AccountSnapshot[];
  selectedAccountIds: readonly string[];
  movements: readonly CashMovement[];
  asOf: string;
  horizonEnd: string;
};

const LARGEST = Number.MAX_SAFE_INTEGER;

// The cash forecast of the selected accounts. A movement dated on or before
// the as-of day has not happened yet (the balances do not hold it), so it
// leaves or reaches its account on the as-of day. Returns null when the days
// are not usable or the amounts together are too large to calculate.
export function planCash({
  accounts,
  selectedAccountIds,
  movements,
  asOf,
  horizonEnd,
}: PlanCashInput): CashPlan | null {
  if (!isValidDay(asOf) || !isValidDay(horizonEnd) || horizonEnd < asOf) {
    return null;
  }

  const balanceById = new Map<string, number>();
  for (const account of accounts) {
    if (!balanceById.has(account.id)) {
      balanceById.set(account.id, account.balance);
    }
  }

  let total = 0;
  const selectedIds: string[] = [];
  const selected = new Set<string>();
  for (const id of selectedAccountIds) {
    const balance = balanceById.get(id);
    if (selected.has(id) || balance === undefined) {
      continue;
    }
    if (!isWholeNumber(balance)) {
      return null;
    }
    const size = Math.abs(balance);
    if (size > LARGEST - total) {
      return null;
    }
    total += size;
    selected.add(id);
    selectedIds.push(id);
  }

  const dueNowById = new Map<string, number>();
  const later: CashMovement[] = [];
  const seenMovementIds = new Set<string>();
  for (const movement of movements) {
    if (
      seenMovementIds.has(movement.id) ||
      !selected.has(movement.account) ||
      !isValidDay(movement.date) ||
      movement.date > horizonEnd
    ) {
      continue;
    }
    seenMovementIds.add(movement.id);
    if (!isWholeNumber(movement.amount)) {
      return null;
    }
    const size = Math.abs(movement.amount);
    if (size > LARGEST - total) {
      return null;
    }
    total += size;
    if (movement.date <= asOf) {
      dueNowById.set(
        movement.account,
        (dueNowById.get(movement.account) ?? 0) + movement.amount,
      );
    } else {
      later.push(movement);
    }
  }

  const closingNow: AccountSnapshot[] = [];
  for (const id of selectedIds) {
    closingNow.push({
      id,
      balance: (balanceById.get(id) ?? 0) + (dueNowById.get(id) ?? 0),
    });
  }
  const projection = projectCashBalances({
    accounts: closingNow,
    selectedAccountIds: selectedIds,
    movements: later,
    asOf,
    horizonEnd,
  });

  let cashAvailable = 0;
  let inAccounts = 0;
  let owed = 0;
  const plans: AccountCashPlan[] = [];
  for (const account of projection.accounts) {
    const balance = balanceById.get(account.accountId) ?? 0;
    cashAvailable += balance;
    if (balance > 0) {
      inAccounts += balance;
    } else {
      owed -= balance;
    }
    const isForecast = balance > 0;
    plans.push({
      accountId: account.accountId,
      currentBalance: balance,
      projectedEndingBalance: account.projectedEndingBalance,
      minimumDailyClosingBalance: account.minimumDailyClosingBalance,
      firstShortfallDate: isForecast ? account.firstShortfallDate : null,
      transferNeeded:
        isForecast && account.minimumDailyClosingBalance < 0
          ? -account.minimumDailyClosingBalance
          : 0,
    });
  }

  return {
    cashAvailable,
    inAccounts,
    owed,
    projectedCash: projection.projectedCash,
    accounts: plans,
  };
}
