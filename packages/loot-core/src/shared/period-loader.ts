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
  | 'invalid-override';

export type SetAsideRow = {
  table:
    | 'period_budgets'
    | 'period_offsets'
    | 'period_charge_overrides'
    | 'charges';
  id: string;
  reason: SetAsideReason;
  detail: string;
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
  periods: BudgetPeriod[];
  offsets: PeriodOffset[];
  occurrences: ChargeOccurrence[];
  paidOutsideBudget: string[]; // ids of charges paid by transactions that are not postings
  setAside: SetAsideRow[];
};

export function loadPeriodBudgetInput({
  periods,
  offsets,
  occurrences,
  postings,
  categoryIds,
  asOf,
}: LoadPeriodBudgetInput): LoadedPeriodBudgetInput {
  const setAside: SetAsideRow[] = [];

  // Part A: check each period row in input order; the first matching check decides.
  const candidates: BudgetPeriod[] = [];
  const seenPeriodIds = new Set<string>();
  for (const row of periods) {
    if (row.tombstone) {
      continue;
    }
    if (seenPeriodIds.has(row.id)) {
      setAside.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'duplicate-id',
        detail: 'another row has the same id',
      });
      continue;
    }
    seenPeriodIds.add(row.id);
    if (row.category === null || row.category === '') {
      setAside.push({
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
      setAside.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'start date is not a valid date',
      });
      continue;
    }
    if (!isValidDay(row.end_date)) {
      setAside.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'end date is not a valid date',
      });
      continue;
    }
    if (row.end_date <= row.start_date) {
      setAside.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'end date is not after start date',
      });
      continue;
    }
    if (!isWholeNumber(row.budget) || row.budget < 0) {
      setAside.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'budget is not a whole number that is not negative',
      });
      continue;
    }
    if (!isWholeNumber(row.carryover)) {
      setAside.push({
        table: 'period_budgets',
        id: row.id,
        reason: 'invalid-period',
        detail: 'carryover is not a whole number',
      });
      continue;
    }
    if (!isWholeNumber(row.budget + row.carryover)) {
      setAside.push({
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
      setAside.push({
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
  const resultPeriods = candidates.filter(period => keptIds.has(period.id));
  const periodById = new Map<string, BudgetPeriod>();
  for (const period of resultPeriods) {
    periodById.set(period.id, period);
  }

  // Part C: offsets.
  const postingById = new Map<string, ExpensePosting>();
  for (const posting of postings) {
    postingById.set(posting.id, posting);
  }
  const resultOffsets: PeriodOffset[] = [];
  const seenOffsetIds = new Set<string>();
  for (const row of offsets) {
    if (row.tombstone) {
      continue;
    }
    if (seenOffsetIds.has(row.id)) {
      setAside.push({
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
      setAside.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'offset-period-missing',
        detail: 'period "" is deleted, set aside or missing',
      });
      continue;
    }
    const period = periodById.get(periodId);
    if (period === undefined) {
      setAside.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'offset-period-missing',
        detail: `period "${periodId}" is deleted, set aside or missing`,
      });
      continue;
    }
    const posting = postingById.get(row.id);
    if (posting !== undefined && posting.category !== period.category) {
      setAside.push({
        table: 'period_offsets',
        id: row.id,
        reason: 'offset-category-mismatch',
        detail: `transaction category "${posting.category}" is not the period category "${period.category}"`,
      });
      continue;
    }
    resultOffsets.push({ transactionId: row.id, periodId });
  }

  // Part D: charges.
  const pass1: LoaderOccurrence[] = [];
  const seenChargeIds = new Set<string>();
  for (const occurrence of occurrences) {
    if (seenChargeIds.has(occurrence.id)) {
      setAside.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'duplicate charge id',
      });
      continue;
    }
    seenChargeIds.add(occurrence.id);
    if (!periodById.has(occurrence.periodId)) {
      setAside.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'charge-period-missing',
        detail: `period "${occurrence.periodId}" is deleted, set aside or missing`,
      });
      continue;
    }
    if (!isValidDay(occurrence.date)) {
      setAside.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'date is not a valid date',
      });
      continue;
    }
    if (!isWholeNumber(occurrence.amount) || occurrence.amount < 0) {
      setAside.push({
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
      setAside.push({
        table: 'charges',
        id: occurrence.id,
        reason: 'invalid-charge',
        detail: 'posted without a transaction',
      });
      continue;
    }
    pass1.push(occurrence);
  }

  // Pass 2: one payment settles at most one charge.
  const keeperByTransactionId = new Map<string, LoaderOccurrence>();
  for (const occurrence of pass1) {
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

  // Pass 3.
  const resultOccurrences: ChargeOccurrence[] = [];
  const paidOutsideBudget: string[] = [];
  for (const occurrence of pass1) {
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
    periods: resultPeriods,
    offsets: resultOffsets,
    occurrences: resultOccurrences,
    paidOutsideBudget,
    setAside,
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
