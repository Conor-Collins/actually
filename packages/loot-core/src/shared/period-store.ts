function daysInMonth(year: number, month: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
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

export function cadenceEnd(start: string, months: number, anchorDay: number): string {
  const year = Number(start.slice(0, 4));
  const month = Number(start.slice(5, 7));
  const day = Number(start.slice(8, 10));
  const total = year * 12 + (month - 1) + months;
  const endYear = Math.floor(total / 12);
  const endMonth = (total % 12) + 1;
  const wantedDay = day === Math.min(anchorDay, daysInMonth(year, month)) ? anchorDay : day;
  const endDay = Math.min(wantedDay, daysInMonth(endYear, endMonth));
  return `${String(endYear).padStart(4, '0')}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
}
