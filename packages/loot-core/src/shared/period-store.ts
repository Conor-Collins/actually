import type { PeriodBudgetRow, PeriodCadenceRow } from '#types/models';

function daysInMonth(year: number, month: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1];
}

// True for a real calendar day written as YYYY-MM-DD.
export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
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
  return day >= 1 && day <= daysInMonth(year, month);
}

export function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function newPeriodId(
  category: string,
  start: string,
  existingIds: ReadonlySet<string>,
): string {
  const base = `${category}:${start}`;
  if (!existingIds.has(base)) {
    return base;
  }
  let n = 2;
  while (existingIds.has(`${base}:${n}`)) {
    n++;
  }
  return `${base}:${n}`;
}

export function cadenceEnd(
  start: string,
  months: number,
  anchorDay: number,
): string {
  const year = Number(start.slice(0, 4));
  const month = Number(start.slice(5, 7));
  const day = Number(start.slice(8, 10));
  const total = year * 12 + (month - 1) + months;
  const endYear = Math.floor(total / 12);
  const endMonth = (total % 12) + 1;
  const wantedDay =
    day === Math.min(anchorDay, daysInMonth(year, month)) ? anchorDay : day;
  const endDay = Math.min(wantedDay, daysInMonth(endYear, endMonth));
  return `${String(endYear).padStart(4, '0')}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
}

type PlanPeriodsInput = {
  cadence: PeriodCadenceRow;
  periods: readonly PeriodBudgetRow[]; // stored rows of all categories, live and deleted
  until: string; // YYYY-MM-DD; plan every period that starts on or before this day
};

export function planPeriods({
  cadence,
  periods,
  until,
}: PlanPeriodsInput): PeriodBudgetRow[] {
  if (
    cadence.tombstone ||
    cadence.active !== true ||
    !isValidDay(cadence.anchor_date) ||
    !isWholeNumber(cadence.months) ||
    cadence.months < 1 ||
    !isValidDay(until)
  ) {
    return [];
  }
  const category = cadence.id;
  const anchorDay = Number(cadence.anchor_date.slice(8, 10));

  const rowById = new Map<string, PeriodBudgetRow>();
  for (const row of periods) {
    rowById.set(row.id, row);
  }

  let latestEnd: string | null = null;
  let latestId = '';
  let latestBudget: number | null = null;
  for (const row of periods) {
    if (
      row.category !== category ||
      row.tombstone ||
      !isValidDay(row.start_date) ||
      !isValidDay(row.end_date) ||
      !(row.end_date > row.start_date)
    ) {
      continue;
    }
    if (
      latestEnd === null ||
      row.end_date > latestEnd ||
      (row.end_date === latestEnd && row.id > latestId)
    ) {
      latestEnd = row.end_date;
      latestId = row.id;
      latestBudget = row.budget;
    }
  }
  if (latestEnd === null) {
    return [];
  }

  const budget =
    isWholeNumber(latestBudget) && latestBudget >= 0 ? latestBudget : 0;

  let start = latestEnd;
  const planned: PeriodBudgetRow[] = [];
  // Every step moves `start` to a later day, so this ends. A day past the
  // year 9999 is not a valid day, and a period cannot start or end on one.
  while (isValidDay(start) && start <= until) {
    // The id of this start date: the first one that no live period has.
    const baseId = `${category}:${start}`;
    let id = baseId;
    let existing = rowById.get(id);
    for (let n = 2; existing !== undefined && !existing.tombstone; n++) {
      id = `${baseId}:${n}`;
      existing = rowById.get(id);
    }
    if (existing !== undefined) {
      // A deleted period stays deleted and its dates count as taken.
      start =
        isValidDay(existing.end_date) && existing.end_date > start
          ? existing.end_date
          : cadenceEnd(start, cadence.months, anchorDay);
      continue;
    }
    const end = cadenceEnd(start, cadence.months, anchorDay);
    if (!isValidDay(end)) {
      break;
    }
    planned.push({
      id,
      category,
      start_date: start,
      end_date: end,
      budget,
      carryover: 0,
      carried_from: null,
      tombstone: false,
    });
    start = end;
  }
  return planned;
}

export type PeriodCandidate = {
  id: string;
  category: string;
  start_date: string;
  end_date: string;
  budget: number;
  carryover: number;
};

type CheckPeriodWriteInput = {
  candidate: PeriodCandidate;
  periods: readonly PeriodBudgetRow[];
};

export function checkPeriodWrite({
  candidate,
  periods,
}: CheckPeriodWriteInput): string | null {
  if (!isValidDay(candidate.start_date)) {
    return `start date "${String(candidate.start_date)}" is not a valid date`;
  }
  if (!isValidDay(candidate.end_date)) {
    return `end date "${String(candidate.end_date)}" is not a valid date`;
  }
  if (candidate.end_date <= candidate.start_date) {
    return `end date ${candidate.end_date} must be after start date ${candidate.start_date}`;
  }
  if (!isWholeNumber(candidate.budget) || candidate.budget < 0) {
    return 'budget must be a whole number that is not negative';
  }
  if (!isWholeNumber(candidate.carryover)) {
    return 'carryover must be a whole number';
  }
  if (!isWholeNumber(candidate.budget + candidate.carryover)) {
    return 'budget plus carryover is too large';
  }
  for (const row of periods) {
    if (
      row.id === candidate.id ||
      row.tombstone ||
      row.category !== candidate.category ||
      !isValidDay(row.start_date) ||
      !isValidDay(row.end_date) ||
      !(row.end_date > row.start_date)
    ) {
      continue;
    }
    if (
      row.start_date < candidate.end_date &&
      candidate.start_date < row.end_date
    ) {
      return `overlaps period ${row.id} (${row.start_date} to ${row.end_date})`;
    }
  }
  return null;
}
