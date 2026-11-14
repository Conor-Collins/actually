import type { IntegerAmount } from './util';

export type BudgetPeriod = {
  id: string;
  category: string;
  start: string;
  end: string;
  budget: IntegerAmount;
  carryover: IntegerAmount;
};

type CreateBudgetPeriodInput = {
  id: string;
  category: string;
  start: string;
  end: string;
  budget: IntegerAmount;
  carryover?: IntegerAmount;
};

type CopyBudgetPeriodOptions = {
  id: string;
  start: string;
  end: string;
  carryover?: IntegerAmount;
};

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    return false;
  }
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = month === 2 && isLeapYear(year) ? 29 : daysInMonth[month - 1];
  return day >= 1 && day <= maxDay;
}

function validateDates(id: string, start: string, end: string): void {
  if (!isValidDateString(start)) {
    throw new Error(
      `period ${id}: start "${start}" is not a valid YYYY-MM-DD date`,
    );
  }
  if (!isValidDateString(end)) {
    throw new Error(
      `period ${id}: end "${end}" is not a valid YYYY-MM-DD date`,
    );
  }
  if (end <= start) {
    throw new Error(
      `period ${id}: end "${end}" must be after start "${start}"`,
    );
  }
}

function assertSafeInteger(value: IntegerAmount, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer, got ${value}`);
  }
}

export function createBudgetPeriod({
  id,
  category,
  start,
  end,
  budget,
  carryover = 0,
}: CreateBudgetPeriodInput): BudgetPeriod {
  if (id === '') {
    throw new Error('createBudgetPeriod: id must not be empty');
  }
  if (category === '') {
    throw new Error(`period ${id}: category must not be empty`);
  }
  validateDates(id, start, end);
  assertSafeInteger(budget, `period ${id}: budget`);
  if (budget < 0) {
    throw new Error(`period ${id}: budget must be nonnegative, got ${budget}`);
  }
  assertSafeInteger(carryover, `period ${id}: carryover`);
  return { id, category, start, end, budget, carryover };
}

export function copyBudgetPeriod(
  source: BudgetPeriod,
  { id, start, end, carryover = 0 }: CopyBudgetPeriodOptions,
): BudgetPeriod {
  if (id === '') {
    throw new Error('copyBudgetPeriod: id must not be empty');
  }
  if (id === source.id) {
    throw new Error(`copyBudgetPeriod: id "${id}" must differ from source id`);
  }
  validateDates(id, start, end);
  assertSafeInteger(carryover, `period ${id}: carryover`);
  return {
    id,
    category: source.category,
    start,
    end,
    budget: source.budget,
    carryover,
  };
}

export type ExpensePosting = {
  id: string;
  category: string;
  date: string;
  amount: IntegerAmount;
};

export type PeriodOffset = {
  transactionId: string;
  periodId: string;
};

export type PeriodBudgetSummary = {
  period: BudgetPeriod;
  netSpending: IntegerAmount;
  remaining: IntegerAmount;
  overspending: IntegerAmount;
};

export type PeriodBudgetsSummary = {
  periods: PeriodBudgetSummary[];
  activePeriods: PeriodBudgetSummary[];
  combinedActiveRemaining: IntegerAmount;
  overspentActivePeriods: PeriodBudgetSummary[];
  totalActiveOverspending: IntegerAmount;
  monthlyActualSpending: IntegerAmount;
  unassignedPostingIds: string[];
};

type SummarizePeriodBudgetsInput = {
  periods: readonly BudgetPeriod[];
  postings: readonly ExpensePosting[];
  offsets: readonly PeriodOffset[];
  asOf: string;
};

function assertValidDate(id: string, date: string): void {
  if (!isValidDateString(date)) {
    throw new Error(
      `posting ${id}: date "${date}" is not a valid YYYY-MM-DD date`,
    );
  }
}

function validateSummarizeInput({
  periods,
  postings,
  offsets,
  asOf,
}: SummarizePeriodBudgetsInput): void {
  if (!isValidDateString(asOf)) {
    throw new Error(`asOf "${asOf}" is not a valid YYYY-MM-DD date`);
  }
  validateBudgetPeriods(periods);
  const seenPostingIds = new Set<string>();
  for (const posting of postings) {
    if (seenPostingIds.has(posting.id)) {
      throw new Error(`duplicate posting id "${posting.id}"`);
    }
    seenPostingIds.add(posting.id);
    assertValidDate(posting.id, posting.date);
    assertSafeInteger(posting.amount, `posting ${posting.id}: amount`);
  }
  const periodById = new Map<string, BudgetPeriod>();
  for (const period of periods) {
    periodById.set(period.id, period);
  }
  const seenTransactionIds = new Set<string>();
  for (const offset of offsets) {
    if (seenTransactionIds.has(offset.transactionId)) {
      throw new Error(`two offsets for transaction "${offset.transactionId}"`);
    }
    seenTransactionIds.add(offset.transactionId);
    const period = periodById.get(offset.periodId);
    if (period === undefined) {
      throw new Error(
        `offset for transaction "${offset.transactionId}" names unknown period "${offset.periodId}"`,
      );
    }
    const posting = postings.find(p => p.id === offset.transactionId);
    if (posting !== undefined && posting.category !== period.category) {
      throw new Error(
        `offset for transaction "${offset.transactionId}" crosses categories: posting is in "${posting.category}", period "${period.id}" is in "${period.category}"`,
      );
    }
  }
}

export function summarizePeriodBudgets({
  periods,
  postings,
  offsets,
  asOf,
}: SummarizePeriodBudgetsInput): PeriodBudgetsSummary {
  validateSummarizeInput({ periods, postings, offsets, asOf });

  const offsetByTransactionId = new Map<string, PeriodOffset>();
  for (const offset of offsets) {
    offsetByTransactionId.set(offset.transactionId, offset);
  }
  const periodById = new Map<string, BudgetPeriod>();
  for (const period of periods) {
    periodById.set(period.id, period);
  }

  const attributedSums = new Map<string, IntegerAmount>();
  for (const period of periods) {
    attributedSums.set(period.id, 0);
  }
  const unassignedPostingIds: string[] = [];
  let monthlySum = 0;
  const monthStart = `${asOf.slice(0, 8)}01`;

  for (const posting of postings) {
    if (posting.date > asOf) {
      continue;
    }
    if (posting.date >= monthStart && posting.date <= asOf) {
      monthlySum += posting.amount;
      assertSafeInteger(
        monthlySum,
        `posting ${posting.id}: monthly actual spending sum`,
      );
    }
    const offset = offsetByTransactionId.get(posting.id);
    let period: BudgetPeriod | undefined;
    if (offset !== undefined) {
      period = periodById.get(offset.periodId);
    } else {
      for (const candidate of periods) {
        if (
          candidate.category === posting.category &&
          candidate.start <= posting.date &&
          posting.date < candidate.end
        ) {
          period = candidate;
          break;
        }
      }
    }
    if (period === undefined) {
      unassignedPostingIds.push(posting.id);
    } else {
      const total = (attributedSums.get(period.id) ?? 0) + posting.amount;
      assertSafeInteger(
        total,
        `posting ${posting.id}: attributed sum for period "${period.id}"`,
      );
      attributedSums.set(period.id, total);
    }
  }

  const periodSummaries: PeriodBudgetSummary[] = [];
  for (const period of periods) {
    const attributedSum = attributedSums.get(period.id) ?? 0;
    const netSpending = attributedSum === 0 ? 0 : -attributedSum;
    const allowance = period.budget + period.carryover;
    assertSafeInteger(allowance, `period ${period.id}: budget + carryover`);
    const rawRemaining = allowance - netSpending;
    assertSafeInteger(rawRemaining, `period ${period.id}: remaining`);
    const remaining = rawRemaining === 0 ? 0 : rawRemaining;
    const overspending = Math.max(0, -remaining);
    periodSummaries.push({ period, netSpending, remaining, overspending });
  }

  const activePeriods = periodSummaries.filter(
    summary => summary.period.start <= asOf && asOf < summary.period.end,
  );
  let combinedActiveRemaining = 0;
  for (const summary of activePeriods) {
    combinedActiveRemaining += summary.remaining;
    assertSafeInteger(
      combinedActiveRemaining,
      `period ${summary.period.id}: combined active remaining`,
    );
  }
  combinedActiveRemaining =
    combinedActiveRemaining === 0 ? 0 : combinedActiveRemaining;
  const overspentActivePeriods = activePeriods.filter(
    summary => summary.overspending > 0,
  );
  let totalActiveOverspending = 0;
  for (const summary of overspentActivePeriods) {
    totalActiveOverspending += summary.overspending;
    assertSafeInteger(
      totalActiveOverspending,
      `period ${summary.period.id}: total active overspending`,
    );
  }

  return {
    periods: periodSummaries,
    activePeriods,
    combinedActiveRemaining,
    overspentActivePeriods,
    totalActiveOverspending,
    monthlyActualSpending: monthlySum === 0 ? 0 : -monthlySum,
    unassignedPostingIds,
  };
}

export type ChargeOccurrence = {
  id: string;
  periodId: string;
  date: string;
  amount: IntegerAmount; // expected charge, nonnegative
  state: 'scheduled' | 'posted';
  transactionId?: string; // required when state is 'posted'
};

export type PeriodChargeProjection = {
  period: BudgetPeriod;
  remaining: IntegerAmount; // same value as in the summary
  outstandingCharges: IntegerAmount; // sum of outstanding occurrence amounts
  expectedRemaining: IntegerAmount; // remaining - outstandingCharges
  outstandingOccurrenceIds: string[]; // in input order
};

export type PeriodChargesProjection = {
  summary: PeriodBudgetsSummary; // exactly what summarizePeriodBudgets returns
  periods: PeriodChargeProjection[]; // every input period, in input order
};

type ProjectPeriodChargesInput = {
  periods: readonly BudgetPeriod[];
  postings: readonly ExpensePosting[];
  offsets: readonly PeriodOffset[];
  occurrences: readonly ChargeOccurrence[];
  asOf: string;
};

type ValidatedOccurrence = {
  occurrence: ChargeOccurrence;
  outstanding: boolean;
};

function validateOccurrences(
  occurrences: readonly ChargeOccurrence[],
  periodIds: ReadonlySet<string>,
  postingById: ReadonlyMap<string, ExpensePosting>,
  asOf: string,
): ValidatedOccurrence[] {
  const seenOccurrenceIds = new Set<string>();
  const postedTransactionById = new Map<string, string>();
  const validated: ValidatedOccurrence[] = [];
  for (const occurrence of occurrences) {
    if (seenOccurrenceIds.has(occurrence.id)) {
      throw new Error(`duplicate occurrence id "${occurrence.id}"`);
    }
    seenOccurrenceIds.add(occurrence.id);
    if (!periodIds.has(occurrence.periodId)) {
      throw new Error(
        `occurrence ${occurrence.id}: period "${occurrence.periodId}" does not exist`,
      );
    }
    if (!isValidDateString(occurrence.date)) {
      throw new Error(
        `occurrence ${occurrence.id}: date "${occurrence.date}" is not a valid YYYY-MM-DD date`,
      );
    }
    assertSafeInteger(occurrence.amount, `occurrence ${occurrence.id}: amount`);
    if (occurrence.amount < 0) {
      throw new Error(
        `occurrence ${occurrence.id}: amount must be nonnegative, got ${occurrence.amount}`,
      );
    }
    let outstanding = false;
    if (occurrence.state === 'posted') {
      const transactionId = occurrence.transactionId;
      if (transactionId === undefined || transactionId === '') {
        throw new Error(
          `occurrence ${occurrence.id}: posted without a transaction id`,
        );
      }
      const earlierId = postedTransactionById.get(transactionId);
      if (earlierId !== undefined) {
        throw new Error(
          `transaction "${transactionId}" is linked to occurrences "${earlierId}" and "${occurrence.id}"`,
        );
      }
      const posting = postingById.get(transactionId);
      if (posting === undefined) {
        throw new Error(
          `occurrence ${occurrence.id}: linked transaction "${transactionId}" is not among the postings`,
        );
      }
      postedTransactionById.set(transactionId, occurrence.id);
      outstanding = posting.date > asOf;
    } else {
      outstanding = true;
    }
    validated.push({ occurrence, outstanding });
  }
  return validated;
}

export function projectPeriodCharges({
  periods,
  postings,
  offsets,
  occurrences,
  asOf,
}: ProjectPeriodChargesInput): PeriodChargesProjection {
  const summary = summarizePeriodBudgets({ periods, postings, offsets, asOf });

  const periodIds = new Set<string>();
  for (const period of periods) {
    periodIds.add(period.id);
  }
  const postingById = new Map<string, ExpensePosting>();
  for (const posting of postings) {
    postingById.set(posting.id, posting);
  }

  const validated = validateOccurrences(
    occurrences,
    periodIds,
    postingById,
    asOf,
  );

  const periodsProjection: PeriodChargeProjection[] = [];
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const periodSummary = summary.periods[i];
    let outstandingCharges = 0;
    const outstandingOccurrenceIds: string[] = [];
    for (const { occurrence, outstanding } of validated) {
      if (!outstanding || occurrence.periodId !== period.id) {
        continue;
      }
      outstandingCharges += occurrence.amount;
      assertSafeInteger(
        outstandingCharges,
        `occurrence ${occurrence.id}: outstanding charges for period "${period.id}"`,
      );
      outstandingOccurrenceIds.push(occurrence.id);
    }
    const expectedRemaining = periodSummary.remaining - outstandingCharges;
    assertSafeInteger(
      expectedRemaining,
      `period ${period.id}: expected remaining`,
    );
    periodsProjection.push({
      period,
      remaining: periodSummary.remaining,
      outstandingCharges,
      expectedRemaining,
      outstandingOccurrenceIds,
    });
  }

  return { summary, periods: periodsProjection };
}

export function validateBudgetPeriods(periods: readonly BudgetPeriod[]): void {
  const seen = new Set<string>();
  for (const period of periods) {
    if (seen.has(period.id)) {
      throw new Error(`duplicate period id "${period.id}"`);
    }
    seen.add(period.id);
  }
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i];
      const b = periods[j];
      if (a.category === b.category && a.start < b.end && b.start < a.end) {
        throw new Error(
          `periods "${a.id}" and "${b.id}" overlap in category "${a.category}"`,
        );
      }
    }
  }
}
