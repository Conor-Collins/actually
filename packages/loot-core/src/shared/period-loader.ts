import type {
  PeriodBudgetRow,
  PeriodChargeOverrideRow,
  PeriodOffsetRow,
} from '#types/models';

import type {
  BudgetPeriod,
  ChargeOccurrence,
  ExpensePosting,
  PeriodOffset,
} from './period-budget';
import { isValidDay, isWholeNumber } from './period-store';

export type SetAsideReason =
  | 'duplicate-id'
  | 'invalid-period'
  | 'overlap'
  | 'offset-period-missing'
  | 'offset-category-mismatch'
  | 'charge-period-missing'
  | 'invalid-charge'
  | 'override-without-charge'
  | 'invalid-override'
  | 'invalid-transaction'
  | 'amounts-too-large';

// Which field of a charge override cannot be used
export type OverrideProblem =
  | 'amount'
  | 'open-amount'
  | 'payment-missing' // the transaction it names does not exist
  | 'payment-taken'; // the transaction it names pays an earlier charge

export type SetAsideRow = {
  table:
    | 'period_budgets'
    | 'period_offsets'
    | 'period_charge_overrides'
    | 'charges'
    | 'transactions';
  id: string;
  reason: SetAsideReason;
  detail: string;
  // With `invalid-override`, when one field of the override is ignored
  problem?: OverrideProblem;
};

export type LoaderOccurrence = ChargeOccurrence & { transactionDate?: string };

type LoadPeriodBudgetInput = {
  periods: readonly PeriodBudgetRow[];
  offsets: readonly PeriodOffsetRow[];
  occurrences: readonly LoaderOccurrence[];
  postings: readonly ExpensePosting[];
  categoryIds: ReadonlySet<string>; // ids of categories that exist
  asOf: string;
};

export type LoadedPeriodBudgetInput = {
  postings: ExpensePosting[]; // give the calculation these, not the input list
  periods: BudgetPeriod[];
  offsets: PeriodOffset[];
  occurrences: ChargeOccurrence[];
  paidOutsideBudget: string[]; // ids of charges paid by transactions that are not postings
  setAside: SetAsideRow[];
};

const LARGEST = Number.MAX_SAFE_INTEGER;

const TOO_LARGE = 'the amounts together are too large to calculate';

type SizedRow = {
  table: 'transactions' | 'period_budgets' | 'charges';
  id: string;
  size: number;
};

function bySizeThenId(a: SizedRow, b: SizedRow): number {
  if (a.size !== b.size) {
    return a.size < b.size ? -1 : 1;
  }
  if (a.table !== b.table) {
    return a.table < b.table ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

export function loadPeriodBudgetInput({
  periods,
  offsets,
  occurrences,
  postings,
  categoryIds,
  asOf,
}: LoadPeriodBudgetInput): LoadedPeriodBudgetInput {
  const asideTransactions: SetAsideRow[] = [];
  const asidePeriods: SetAsideRow[] = [];
  const asideOffsets: SetAsideRow[] = [];
  const asideCharges: SetAsideRow[] = [];
  const asideAmounts: SetAsideRow[] = [];

  // Transactions: the calculation refuses a repeated id, an invalid date and
  // an amount that is not a whole number.
  const validPostings: ExpensePosting[] = [];
  const seenPostingIds = new Set<string>();
  for (const posting of postings) {
    if (seenPostingIds.has(posting.id)) {
      asideTransactions.push({
        table: 'transactions',
        id: posting.id,
        reason: 'duplicate-id',
        detail: 'another row has the same id',
      });
      continue;
    }
    seenPostingIds.add(posting.id);
    if (!isValidDay(posting.date)) {
      asideTransactions.push({
        table: 'transactions',
        id: posting.id,
        reason: 'invalid-transaction',
        detail: 'date is not a valid date',
      });
      continue;
    }
    if (!isWholeNumber(posting.amount)) {
      asideTransactions.push({
        table: 'transactions',
        id: posting.id,
        reason: 'invalid-transaction',
        detail: 'amount is not a whole number',
      });
      continue;
    }
    validPostings.push(posting);
  }

  // Part A: check each period row in input order; the first matching check decides.
  const candidates: BudgetPeriod[] = [];
  const seenPeriodIds = new Set<string>();
  for (const row of periods) {
    if (row.tombstone) {
      continue;
    }
    if (seenPeriodIds.has(row.id)) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'duplicate-id',
        detail: 'another row has the same id',
      });
      continue;
    }
    seenPeriodIds.add(row.id);
    if (row.category === null || row.category === '') {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'category is missing',
      });
      continue;
    }
    if (!categoryIds.has(row.category)) {
      continue;
    }
    if (!isValidDay(row.start_date)) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'start date is not a valid date',
      });
      continue;
    }
    if (!isValidDay(row.end_date)) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'end date is not a valid date',
      });
      continue;
    }
    if (row.end_date <= row.start_date) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'end date is not after start date',
      });
      continue;
    }
    if (!isWholeNumber(row.budget) || row.budget < 0) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'budget is not a whole number that is not negative',
      });
      continue;
    }
    if (!isWholeNumber(row.carryover)) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'carryover is not a whole number',
      });
      continue;
    }
    if (!isWholeNumber(row.budget + row.carryover)) {
      asidePeriods.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'budget plus carryover is too large',
      });
      continue;
    }
    candidates.push({
      id: row.id,
      category: row.category,
      start: row.start_date,
      end: row.end_date,
      budget: row.budget,
      carryover: row.carryover,
    });
  }

  // Part B: overlaps.
  const sorted = [...candidates].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start < b.start ? -1 : 1;
    }
    if (a.id !== b.id) {
      return a.id < b.id ? -1 : 1;
    }
    return 0;
  });
  const keptIds = new Set<string>();
  const kept: BudgetPeriod[] = [];
  for (const candidate of sorted) {
    const overlapping = kept.find(
      other =>
        other.category === candidate.category &&
        other.start < candidate.end &&
        candidate.start < other.end,
    );
    if (overlapping !== undefined) {
      asidePeriods.push({
        table: 'period_budgets',
        id: candidate.id,
        reason: 'overlap',
        detail: `overlaps period ${overlapping.id}`,
      });
      continue;
    }
    keptIds.add(candidate.id);
    kept.push(candidate);
  }

  // Part C: charges, each on its own.
  const pass1: LoaderOccurrence[] = [];
  const seenChargeIds = new Set<string>();
  for (const occurrence of occurrences) {
    if (seenChargeIds.has(occurrence.id)) {
      asideCharges.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'duplicate charge id',
      });
      continue;
    }
    seenChargeIds.add(occurrence.id);
    if (!keptIds.has(occurrence.periodId)) {
      asideCharges.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'charge-period-missing',
        detail: `period "${occurrence.periodId}" is deleted, set aside or missing`,
      });
      continue;
    }
    if (!isValidDay(occurrence.date)) {
      asideCharges.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'date is not a valid date',
      });
      continue;
    }
    if (!isWholeNumber(occurrence.amount) || occurrence.amount < 0) {
      asideCharges.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'amount is not a whole number that is not negative',
      });
      continue;
    }
    if (
      occurrence.state === 'posted' &&
      (occurrence.transactionId === undefined ||
        occurrence.transactionId === '')
    ) {
      asideCharges.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'posted without a transaction',
      });
      continue;
    }
    pass1.push(occurrence);
  }

  // Part D: amounts. The calculation adds amounts up and refuses a sum that is
  // not a whole number it can hold. No sum it makes is larger than the sizes of
  // all amounts together, so the amounts are taken smallest first and one that
  // no longer fits is set aside.
  const sized: SizedRow[] = [];
  for (const posting of validPostings) {
    sized.push({
      table: 'transactions',
      id: posting.id,
      size: Math.abs(posting.amount),
    });
  }
  for (const period of kept) {
    const carried = Math.abs(period.carryover);
    sized.push({
      table: 'period_budgets',
      id: period.id,
      size:
        carried > LARGEST - period.budget ? Infinity : period.budget + carried,
    });
  }
  for (const occurrence of pass1) {
    sized.push({
      table: 'charges',
      id: occurrence.id,
      size: occurrence.amount,
    });
  }
  sized.sort(bySizeThenId);
  const tooLarge = {
    transactions: new Set<string>(),
    period_budgets: new Set<string>(),
    charges: new Set<string>(),
  };
  let total = 0;
  for (const row of sized) {
    if (row.size > LARGEST - total) {
      tooLarge[row.table].add(row.id);
      asideAmounts.push({
        table: row.table,
        id: row.id,
        reason: 'amounts-too-large',
        detail: TOO_LARGE,
      });
      continue;
    }
    total += row.size;
  }

  const resultPostings = validPostings.filter(
    posting => !tooLarge.transactions.has(posting.id),
  );
  const postingById = new Map<string, ExpensePosting>();
  for (const posting of resultPostings) {
    postingById.set(posting.id, posting);
  }
  const resultPeriods = candidates.filter(
    period => keptIds.has(period.id) && !tooLarge.period_budgets.has(period.id),
  );
  const periodById = new Map<string, BudgetPeriod>();
  for (const period of resultPeriods) {
    periodById.set(period.id, period);
  }
  const charges: LoaderOccurrence[] = [];
  for (const occurrence of pass1) {
    if (tooLarge.charges.has(occurrence.id)) {
      continue;
    }
    if (!periodById.has(occurrence.periodId)) {
      asideCharges.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'charge-period-missing',
        detail: `period "${occurrence.periodId}" is deleted, set aside or missing`,
      });
      continue;
    }
    charges.push(occurrence);
  }

  // Part E: offsets.
  const resultOffsets: PeriodOffset[] = [];
  const seenOffsetIds = new Set<string>();
  for (const row of offsets) {
    if (row.tombstone) {
      continue;
    }
    if (seenOffsetIds.has(row.id)) {
      asideOffsets.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'duplicate-id',
        detail: 'another row has the same id',
      });
      continue;
    }
    seenOffsetIds.add(row.id);
    const periodId = row.period_id;
    if (periodId === null) {
      asideOffsets.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'offset-period-missing',
        detail: 'period "" is deleted, set aside or missing',
      });
      continue;
    }
    const period = periodById.get(periodId);
    if (period === undefined) {
      asideOffsets.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'offset-period-missing',
        detail: `period "${periodId}" is deleted, set aside or missing`,
      });
      continue;
    }
    const posting = postingById.get(row.id);
    if (posting !== undefined && posting.category !== period.category) {
      asideOffsets.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'offset-category-mismatch',
        detail: `transaction category "${posting.category}" is not the period category "${period.category}"`,
      });
      continue;
    }
    resultOffsets.push({ transactionId: row.id, periodId });
  }

  // Part F: one payment settles at most one charge.
  const keeperByTransactionId = new Map<string, LoaderOccurrence>();
  for (const occurrence of charges) {
    if (occurrence.state !== 'posted') {
      continue;
    }
    const transactionId = occurrence.transactionId;
    if (transactionId === undefined || transactionId === '') {
      continue;
    }
    const current = keeperByTransactionId.get(transactionId);
    if (
      current === undefined ||
      occurrence.date < current.date ||
      (occurrence.date === current.date && occurrence.id < current.id)
    ) {
      keeperByTransactionId.set(transactionId, occurrence);
    }
  }

  // Part G: the charges the calculation gets.
  const resultOccurrences: ChargeOccurrence[] = [];
  const paidOutsideBudget: string[] = [];
  for (const occurrence of charges) {
    if (occurrence.state === 'scheduled') {
      resultOccurrences.push({
        id: occurrence.id,
        periodId: occurrence.periodId,
        date: occurrence.date,
        amount: occurrence.amount,
        state: 'scheduled',
      });
      continue;
    }
    const transactionId = occurrence.transactionId;
    const keeper =
      transactionId === undefined
        ? undefined
        : keeperByTransactionId.get(transactionId);
    const isKeeper = keeper !== undefined && keeper.id === occurrence.id;
    if (!isKeeper) {
      resultOccurrences.push({
        id: occurrence.id,
        periodId: occurrence.periodId,
        date: occurrence.date,
        amount: occurrence.amount,
        state: 'scheduled',
      });
      continue;
    }
    if (transactionId !== undefined && postingById.has(transactionId)) {
      resultOccurrences.push({
        id: occurrence.id,
        periodId: occurrence.periodId,
        date: occurrence.date,
        amount: occurrence.amount,
        state: 'posted',
        transactionId,
      });
      continue;
    }
    if (
      typeof occurrence.transactionDate === 'string' &&
      occurrence.transactionDate > asOf
    ) {
      resultOccurrences.push({
        id: occurrence.id,
        periodId: occurrence.periodId,
        date: occurrence.date,
        amount: occurrence.amount,
        state: 'scheduled',
      });
      continue;
    }
    paidOutsideBudget.push(occurrence.id);
  }

  return {
    postings: resultPostings,
    periods: resultPeriods,
    offsets: resultOffsets,
    occurrences: resultOccurrences,
    paidOutsideBudget,
    setAside: [
      ...asideTransactions,
      ...asidePeriods,
      ...asideOffsets,
      ...asideCharges,
      ...asideAmounts,
    ],
  };
}

type ListOverridesWithoutChargeInput = {
  overrides: readonly PeriodChargeOverrideRow[];
  occurrenceIds: ReadonlySet<string>;
  start: string;
  end: string;
};

export function listOverridesWithoutCharge({
  overrides,
  occurrenceIds,
  start,
  end,
}: ListOverridesWithoutChargeInput): SetAsideRow[] {
  const setAside: SetAsideRow[] = [];
  for (const row of overrides) {
    if (row.tombstone) {
      continue;
    }
    const index = row.id.lastIndexOf(':');
    if (index <= 0) {
      setAside.push({
        table: 'period_charge_overrides',
        id: row.id,
        reason: 'invalid-override',
        detail: 'id is not "<schedule id>:<due date>"',
      });
      continue;
    }
    const dueDate = row.id.slice(index + 1);
    if (!isValidDay(dueDate)) {
      setAside.push({
        table: 'period_charge_overrides',
        id: row.id,
        reason: 'invalid-override',
        detail: 'id is not "<schedule id>:<due date>"',
      });
      continue;
    }
    if (dueDate < start || dueDate > end) {
      continue;
    }
    if (!occurrenceIds.has(row.id)) {
      setAside.push({
        table: 'period_charge_overrides',
        id: row.id,
        reason: 'override-without-charge',
        detail: `no charge is due on ${dueDate}`,
      });
    }
  }
  return setAside;
}
