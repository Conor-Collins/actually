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
