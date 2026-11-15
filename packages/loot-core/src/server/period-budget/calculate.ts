import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import type { AccountWithComputedBalance } from '#server/forecast/forecast-accounts';
import {
  buildFutureScheduleOccurrences,
  getFutureOccurrenceDates,
  normalizeSchedule,
} from '#server/forecast/forecast-schedules';
import type { ScheduleData } from '#server/forecast/forecast-schedules';
import { getScheduleDates } from '#server/schedules/occurrences';
import { parseDate, subDays } from '#shared/months';
import { projectPeriodCharges } from '#shared/period-budget';
import type {
  AccountSnapshot,
  CashMovement,
  PeriodChargesProjection,
} from '#shared/period-budget';
import {
  deriveCharges,
  placeCashMovements,
  planCash,
  unpaidChargeAmount,
} from '#shared/period-charges';
import type {
  CashPlan,
  ChargeSchedule,
  ChargeTransaction,
  DerivedCharge,
  PlannedCashMovement,
} from '#shared/period-charges';
import { toPeriodPostings } from '#shared/period-ledger';
import type {
  LedgerTransaction,
  UnresolvedExpense,
} from '#shared/period-ledger';
import {
  listOverridesWithoutCharge,
  loadPeriodBudgetInput,
} from '#shared/period-loader';
import type { SetAsideRow } from '#shared/period-loader';
import { isValidDay } from '#shared/period-store';
import { q } from '#shared/query';
import { extractScheduleConds, getNextDateAfter } from '#shared/schedules';
import type {
  PeriodBudgetRow,
  PeriodBudgetRows,
  TransactionEntity,
} from '#types/models';

export type ScheduledCashMovement = PlannedCashMovement & {
  scheduleId: string;
  isTransfer: boolean; // one leg of a transfer between two accounts
  isApproximate: boolean; // the schedule's amount is an estimate
  // An entered transaction that is dated after the as-of day, with its own
  // id; false for a movement the schedule is expected to make.
  isPosted: boolean;
};

export type PeriodBudgetCalculation = {
  asOf: string;
  horizonEnd: string;
  projection: PeriodChargesProjection;
  plannedPeriodIds: string[]; // periods that follow from a cadence and are not stored yet
  charges: DerivedCharge[];
  derivedOffsetIds: string[]; // payments counted in the period of their charge
  paidOutsideBudget: string[]; // charges paid by a transaction that is not budget spending
  needsAttention: SetAsideRow[];
  unresolved: UnresolvedExpense[];
  cash: CashPlan | null; // null when the amounts are too large to add up
  movements: ScheduledCashMovement[]; // by date, then id
};

type CalculateInput = {
  rows: PeriodBudgetRows;
  planned: readonly PeriodBudgetRow[];
  asOf: string; // a valid day
  horizonEnd: string; // a valid day that is not before `asOf`
};

type TransactionRow = LedgerTransaction & {
  schedule: string | null;
  transfer_id: string | null;
};

type ScheduleRow = Parameters<typeof normalizeSchedule>[0] & {
  completed: boolean;
};

// The due date before the first day asked for is looked for in windows of
// this many days, each ending where the one before it starts: about 120
// years together.
const EARLIER_DUE_DATE_WINDOWS = [8, 32, 128, 512, 2048, 8192, 32768];

type LinkedSchedule = {
  schedule: ScheduleData;
  isApproximate: boolean;
};

async function readTransactions(): Promise<TransactionRow[]> {
  const { data } = await aqlQuery(
    q('transactions')
      .options({ splits: 'all' })
      .select([
        'id',
        'account',
        'date',
        'amount',
        'category',
        'payee',
        'is_parent',
        'is_child',
        'parent_id',
        'schedule',
        'transfer_id',
        'starting_balance_flag',
      ]),
  );
  const rows: TransactionRow[] = data;
  return rows;
}

async function readSchedules(): Promise<ScheduleRow[]> {
  const { data } = await aqlQuery(
    q('schedules').filter({ tombstone: false }).select('*'),
  );
  const rows: ScheduleRow[] = data;
  return rows;
}

// A schedule Actual can forecast, or null. A rule that cannot be read (one
// that another program stored, for example) gives null as well.
function readSchedule(row: ScheduleRow): LinkedSchedule | null {
  try {
    const schedule = normalizeSchedule(row);
    if (schedule === null) {
      return null;
    }
    const amountOp: unknown = extractScheduleConds(schedule._conditions).amount
      ?.op;
    return {
      schedule,
      isApproximate: amountOp !== undefined && amountOp !== 'is',
    };
  } catch {
    return null;
  }
}

// The due dates of the schedule from `start` to `end`, the last one before
// `start` and the first one after `end`: a payment belongs to the nearer of
// two due dates, also when one of them is outside the days asked for. A
// schedule whose dates cannot be worked out has none.
function listDueDates(
  schedule: ScheduleData,
  start: string,
  end: string,
): string[] {
  const date = schedule._date;
  if (typeof date === 'string') {
    return [date];
  }
  try {
    const dates = getScheduleDates(date, { start, end });
    let windowEnd = subDays(start, 1);
    for (const days of EARLIER_DUE_DATE_WINDOWS) {
      const windowStart = subDays(windowEnd, days - 1);
      const earlier = getScheduleDates(date, {
        start: windowStart,
        end: windowEnd,
      });
      if (earlier.length > 0) {
        dates.unshift(earlier[earlier.length - 1]);
        break;
      }
      windowEnd = subDays(windowStart, 1);
    }
    const after = getNextDateAfter(
      { op: 'is', field: 'date', value: date },
      end,
    );
    if (after !== null && after > end) {
      dates.push(after);
    }
    return dates;
  } catch {
    return [];
  }
}

function hasUsableDates(schedule: ScheduleData, end: Date): boolean {
  try {
    getFutureOccurrenceDates(schedule, end);
    return true;
  } catch {
    return false;
  }
}

function byDateThenId(a: CashMovement, b: CashMovement): number {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

// Everything the period budget page shows, worked out for one as-of day:
// the periods with their spending and expected charges (plan B3 and B4) and
// the cash forecast of the selected accounts (plan B5 and S5).
export async function calculatePeriodBudget({
  rows,
  planned,
  asOf,
  horizonEnd,
}: CalculateInput): Promise<PeriodBudgetCalculation> {
  // Step 1: read Actual's own data.
  const liveAccounts = await db.getAccounts();
  const allAccounts = await db.all<Pick<db.DbAccount, 'id' | 'offbudget'>>(
    'SELECT id, offbudget FROM accounts',
  );
  const accountIds = new Set(allAccounts.map(account => account.id));
  const { data: categoryData } = await aqlQuery(
    q('categories').select(['id', 'is_income']),
  );
  const categories: Array<{ id: string; is_income: boolean }> = categoryData;
  const categoryIds = new Set(categories.map(category => category.id));
  // Actual lists a transfer payee only while its account exists.
  const { data: payeeData } = await aqlQuery(
    q('payees').select(['id', 'transfer_acct']),
  );
  const payees: Array<{ id: string; transfer_acct: string | null }> = payeeData;
  const transactions = (await readTransactions()).filter(transaction =>
    accountIds.has(transaction.account),
  );

  // Step 2: budget spending, and the periods that can be used.
  const { postings, unresolved } = toPeriodPostings({
    transactions,
    accounts: allAccounts,
    categories,
    payees,
  });
  const periodRows = [...rows.periods, ...planned];
  const first = loadPeriodBudgetInput({
    periods: periodRows,
    offsets: [],
    occurrences: [],
    postings,
    categoryIds,
    asOf,
  });

  // Step 3: the linked schedules. A schedule with an amount that is not below
  // zero has no charges: it is forecast like a schedule that is not linked.
  const linkedCategory = new Map<string, string>();
  for (const link of rows.scheduleLinks) {
    if (
      !link.tombstone &&
      link.category !== null &&
      categoryIds.has(link.category)
    ) {
      linkedCategory.set(link.id, link.category);
    }
  }
  const linked = new Map<string, LinkedSchedule>();
  const pending: Array<{
    schedule: ScheduleData;
    category: string;
    expectedFrom: string | null;
  }> = [];
  const others: ScheduleData[] = [];
  const isApproximateById = new Map<string, boolean>();
  for (const row of await readSchedules()) {
    const read = readSchedule(row);
    if (read === null || linked.has(read.schedule.id)) {
      continue;
    }
    const { schedule, isApproximate } = read;
    isApproximateById.set(schedule.id, isApproximate);
    const category = linkedCategory.get(schedule.id);
    if (category !== undefined && schedule._amount < 0) {
      linked.set(schedule.id, read);
      pending.push({
        schedule,
        category,
        expectedFrom:
          row.completed !== true && isValidDay(schedule.next_date)
            ? schedule.next_date
            : null,
      });
    } else if (row.completed !== true) {
      others.push(schedule);
    }
  }

  // Step 4: the days the charges are worked out for.
  let start = asOf;
  let end = horizonEnd;
  for (const period of first.periods) {
    if (period.start < start) {
      start = period.start;
    }
    const lastDay = subDays(period.end, 1);
    if (lastDay > end) {
      end = lastDay;
    }
  }
  for (const item of pending) {
    if (item.expectedFrom !== null && item.expectedFrom < start) {
      start = item.expectedFrom;
    }
  }
  const chargeSchedules: ChargeSchedule[] = pending.map(item => ({
    id: item.schedule.id,
    category: item.category,
    amount: Math.round(-item.schedule._amount),
    dueDates: listDueDates(item.schedule, start, end),
    expectedFrom: item.expectedFrom,
  }));

  // Step 5: charges, their payments and the offsets that follow from them.
  const chargeTransactions: ChargeTransaction[] = transactions.map(
    transaction => ({
      id: transaction.id,
      date: transaction.date,
      schedule: transaction.schedule,
      category: transaction.category ?? null,
      parentId:
        transaction.is_child === true ? (transaction.parent_id ?? null) : null,
    }),
  );
  const derived = deriveCharges({
    schedules: chargeSchedules,
    overrides: rows.chargeOverrides,
    transactions: chargeTransactions,
    periods: first.periods,
    offsets: rows.offsets,
    start,
    end,
    asOf,
  });

  // Step 6: the calculation.
  const loaded = loadPeriodBudgetInput({
    periods: periodRows,
    offsets: derived.offsets,
    occurrences: derived.occurrences,
    postings,
    categoryIds,
    asOf,
  });
  const projection = projectPeriodCharges({ ...loaded, asOf });

  // Step 7: what the user should look at. A charge after the horizon may get
  // its period later, so it is not reported.
  const chargeById = new Map<string, DerivedCharge>();
  for (const charge of derived.charges) {
    chargeById.set(charge.id, charge);
  }
  const needsAttention: SetAsideRow[] = [
    ...loaded.setAside,
    ...derived.setAside.filter(
      row =>
        row.reason !== 'charge-period-missing' ||
        (chargeById.get(row.id)?.dueDate ?? '') <= horizonEnd,
    ),
    ...listOverridesWithoutCharge({
      overrides: rows.chargeOverrides,
      occurrenceIds: new Set(derived.charges.map(charge => charge.id)),
      start,
      end,
    }),
  ];

  // A split payment is not budget spending itself, its parts are.
  const postingIds = new Set(loaded.postings.map(posting => posting.id));
  const parentsWithPostings = new Set<string>();
  for (const transaction of chargeTransactions) {
    if (transaction.parentId !== null && postingIds.has(transaction.id)) {
      parentsWithPostings.add(transaction.parentId);
    }
  }
  const paidOutsideBudget = loaded.paidOutsideBudget.filter(id => {
    const paymentId = chargeById.get(id)?.paymentId;
    return (
      paymentId === undefined ||
      paymentId === null ||
      !parentsWithPostings.has(paymentId)
    );
  });

  // Step 8: the cash forecast. Balances are those at the end of the as-of day.
  const excluded = new Set(
    rows.accounts
      .filter(row => !row.tombstone && row.excluded === true)
      .map(row => row.id),
  );
  const selectedAccountIds = liveAccounts
    .filter(
      account =>
        account.closed === 0 &&
        account.offbudget === 0 &&
        !excluded.has(account.id),
    )
    .map(account => account.id);
  const balanceById = new Map<string, number>();
  for (const transaction of transactions) {
    if (
      transaction.is_child === true ||
      !isValidDay(transaction.date) ||
      transaction.date > asOf
    ) {
      continue;
    }
    balanceById.set(
      transaction.account,
      (balanceById.get(transaction.account) ?? 0) + transaction.amount,
    );
  }
  const snapshots: AccountSnapshot[] = selectedAccountIds.map(id => ({
    id,
    balance: balanceById.get(id) ?? 0,
  }));

  // What is still expected of a charge is forecast as a schedule with one
  // date.
  const chargeMovements: ScheduleData[] = [];
  for (const charge of derived.charges) {
    const amount = unpaidChargeAmount(charge);
    const schedule = linked.get(charge.scheduleId)?.schedule;
    if (schedule === undefined || amount <= 0) {
      continue;
    }
    chargeMovements.push({
      ...schedule,
      _date: charge.dueDate,
      next_date: charge.dueDate,
      _amount: -amount,
    });
  }

  const horizonDate = parseDate(horizonEnd);
  const accountsById = new Map<string, AccountWithComputedBalance>(
    liveAccounts.map(account => [
      account.id,
      {
        id: account.id,
        name: account.name,
        closed: account.closed,
        offbudget: account.offbudget,
        balance_current: balanceById.get(account.id) ?? 0,
      },
    ]),
  );
  const ruleAccountsById = new Map(
    liveAccounts.map(account => [account.id, account]),
  );
  // What Actual needs to see that an occurrence is already posted.
  const posted: TransactionEntity[] = [];
  for (const transaction of transactions) {
    if (transaction.schedule !== null && transaction.schedule !== undefined) {
      posted.push({
        id: transaction.id,
        account: transaction.account,
        date: transaction.date,
        amount: transaction.amount,
        schedule: transaction.schedule,
      });
    }
  }
  const occurrences = [
    ...(await buildFutureScheduleOccurrences(
      others.filter(schedule => hasUsableDates(schedule, horizonDate)),
      horizonDate,
      accountsById,
      ruleAccountsById,
      posted,
    )),
    ...(await buildFutureScheduleOccurrences(
      chargeMovements,
      horizonDate,
      accountsById,
      ruleAccountsById,
      [],
    )),
  ];
  const detailById = new Map<
    string,
    {
      scheduleId: string;
      isTransfer: boolean;
      isApproximate: boolean;
      isPosted: boolean;
    }
  >();
  const movements: CashMovement[] = [];

  // An entered transaction dated after the as-of day is not in the balances.
  // It is a movement on its own day when it carries a schedule or pays a
  // charge, and so is the other leg when it is a transfer. The forecast above
  // leaves out what such a transaction posts, and what is still expected of
  // its charge does not hold the payment.
  const paidScheduleById = new Map<string, string>();
  for (const charge of derived.charges) {
    if (charge.paymentId !== null) {
      paidScheduleById.set(charge.paymentId, charge.scheduleId);
    }
  }
  // A part of a split leaves the account with the whole transaction.
  const parentIdById = new Map<string, string>();
  for (const transaction of transactions) {
    const parentId = transaction.parent_id;
    if (
      transaction.is_child === true &&
      parentId !== null &&
      parentId !== undefined
    ) {
      parentIdById.set(transaction.id, parentId);
    }
  }
  const enteredScheduleById = new Map<string, string>();
  for (const transaction of transactions) {
    const scheduleId =
      transaction.schedule ?? paidScheduleById.get(transaction.id);
    if (scheduleId !== undefined) {
      enteredScheduleById.set(
        parentIdById.get(transaction.id) ?? transaction.id,
        scheduleId,
      );
    }
  }
  const otherLegScheduleById = new Map<string, string>();
  for (const transaction of transactions) {
    const scheduleId = enteredScheduleById.get(
      parentIdById.get(transaction.id) ?? transaction.id,
    );
    const otherLeg = transaction.transfer_id;
    if (
      scheduleId !== undefined &&
      otherLeg !== null &&
      otherLeg !== undefined
    ) {
      otherLegScheduleById.set(
        parentIdById.get(otherLeg) ?? otherLeg,
        scheduleId,
      );
    }
  }
  for (const [id, scheduleId] of otherLegScheduleById) {
    if (!enteredScheduleById.has(id)) {
      enteredScheduleById.set(id, scheduleId);
    }
  }
  for (const transaction of transactions) {
    const scheduleId = enteredScheduleById.get(transaction.id);
    if (
      scheduleId === undefined ||
      transaction.is_child === true ||
      !isValidDay(transaction.date) ||
      transaction.date <= asOf
    ) {
      continue;
    }
    detailById.set(transaction.id, {
      scheduleId,
      isTransfer:
        transaction.transfer_id !== null &&
        transaction.transfer_id !== undefined,
      isApproximate: false,
      isPosted: true,
    });
    movements.push({
      id: transaction.id,
      account: transaction.account,
      date: transaction.date,
      amount: transaction.amount,
    });
  }
  for (const occurrence of occurrences) {
    const transaction = occurrence.transaction;
    detailById.set(transaction.id, {
      scheduleId: occurrence.scheduleId,
      isTransfer:
        transaction.transfer_id !== undefined &&
        transaction.transfer_id !== null,
      isApproximate: isApproximateById.get(occurrence.scheduleId) ?? false,
      isPosted: false,
    });
    movements.push({
      id: transaction.id,
      account: transaction.account,
      date: transaction.date,
      amount: transaction.amount,
    });
  }
  const placed = placeCashMovements({
    movements,
    selectedAccountIds,
    asOf,
    horizonEnd,
  });
  const cash = planCash({
    accounts: snapshots,
    selectedAccountIds,
    movements: placed,
    asOf,
    horizonEnd,
  });

  return {
    asOf,
    horizonEnd,
    projection,
    plannedPeriodIds: planned.map(row => row.id),
    charges: derived.charges,
    derivedOffsetIds: derived.derivedOffsetIds.filter(id => postingIds.has(id)),
    paidOutsideBudget,
    needsAttention,
    unresolved,
    cash,
    movements: [...placed].sort(byDateThenId).map(movement => ({
      ...movement,
      scheduleId: detailById.get(movement.id)?.scheduleId ?? '',
      isTransfer: detailById.get(movement.id)?.isTransfer ?? false,
      isApproximate: detailById.get(movement.id)?.isApproximate ?? false,
      isPosted: detailById.get(movement.id)?.isPosted ?? false,
    })),
  };
}
