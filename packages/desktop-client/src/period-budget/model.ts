import type {
  PeriodBudgetCalculation,
  PeriodBudgetPayment,
} from '@actual-app/core/server/period-budget/calculate';
import * as monthUtils from '@actual-app/core/shared/months';
import type { BudgetPeriod } from '@actual-app/core/shared/period-budget';
import type { DerivedCharge } from '@actual-app/core/shared/period-charges';
import type { SetAsideRow } from '@actual-app/core/shared/period-loader';
import { isValidDay } from '@actual-app/core/shared/period-store';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  PeriodBudgetRow,
  PeriodBudgetRows,
  PeriodCadenceRow,
  PeriodChargeOverrideRow,
} from '@actual-app/core/types/models';

// The days the timeline shows: from `start` up to, not including, `end`.
export type Axis = {
  start: string;
  end: string;
};

// Whether a text is a day of the calendar, by the rule of the server.
export function isDay(value: string | null): value is string {
  return isValidDay(value);
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

// The last day of a period, from the first day after it.
export function lastDayOf(end: string): string {
  return monthUtils.subDays(end, 1);
}

// The first day after a period, from its last day.
export function endAfter(lastDay: string): string {
  return monthUtils.addDays(lastDay, 1);
}

export function makeAxis(startMonth: string, months: number): Axis {
  return {
    start: `${startMonth}-01`,
    end: `${monthUtils.addMonths(startMonth, months)}-01`,
  };
}

// The calendar year of a month.
export function yearAxis(month: string): Axis {
  return makeAxis(`${month.slice(0, 4)}-01`, 12);
}

// An axis of `months` months that shows the month: the whole calendar year
// for 12 months, or else the month with one month before it.
export function axisAround(month: string, months: number): Axis {
  if (months >= 12) {
    return yearAxis(month);
  }
  return makeAxis(monthUtils.subMonths(month, 1), months);
}

export function axisMonthCount(axis: Axis): number {
  return monthUtils.differenceInCalendarMonths(axis.end, axis.start);
}

export function moveAxis(axis: Axis, months: number): Axis {
  return makeAxis(
    monthUtils.addMonths(monthOf(axis.start), months),
    axisMonthCount(axis),
  );
}

// Where a day is on the axis: 0 at its first day, 1 at the day after its
// last. A day outside the axis gives a number below 0 or above 1.
export function axisPosition(axis: Axis, day: string): number {
  const length = monthUtils.differenceInCalendarDays(axis.end, axis.start);
  return monthUtils.differenceInCalendarDays(day, axis.start) / length;
}

export function isOnAxis(axis: Axis, day: string): boolean {
  return axis.start <= day && day < axis.end;
}

// The part of the axis that a period covers, or null when none of it shows.
export function axisSpan(
  axis: Axis,
  period: { start: string; end: string },
): {
  from: number;
  to: number;
  startsBefore: boolean;
  endsAfter: boolean;
} | null {
  if (period.end <= axis.start || period.start >= axis.end) {
    return null;
  }
  return {
    from: Math.max(0, axisPosition(axis, period.start)),
    to: Math.min(1, axisPosition(axis, period.end)),
    startsBefore: period.start < axis.start,
    endsAfter: period.end > axis.end,
  };
}

export function axisMonths(axis: Axis): string[] {
  return monthUtils.range(monthOf(axis.start), monthOf(axis.end));
}

// The last day the calculation has to look at, so that the bars on the axis
// and the expected charges of every active period are complete: the end of
// the month a year after the as-of day, or later when the axis or an active
// period ends later, and never more than ten years ahead.
export function horizonEndFor({
  asOf,
  axis,
  rows,
}: {
  asOf: string;
  axis: Axis;
  rows: PeriodBudgetRows | undefined;
}): string {
  const longest = monthUtils.lastDayOfMonth(monthUtils.addMonths(asOf, 120));
  let horizonEnd = monthUtils.lastDayOfMonth(monthUtils.addMonths(asOf, 12));
  const axisLastDay = lastDayOf(axis.end);
  if (axisLastDay > horizonEnd) {
    horizonEnd = axisLastDay;
  }
  for (const row of rows?.periods ?? []) {
    if (
      !row.tombstone &&
      isDay(row.start_date) &&
      isDay(row.end_date) &&
      row.start_date <= asOf &&
      asOf < row.end_date
    ) {
      const lastDay = lastDayOf(row.end_date);
      if (lastDay > horizonEnd) {
        horizonEnd = lastDay;
      }
    }
  }
  return horizonEnd > longest ? longest : horizonEnd;
}

// A period that is one calendar month or one calendar year has a name.
export type PeriodSpan =
  | { kind: 'month'; month: string }
  | { kind: 'year'; year: string }
  | { kind: 'range'; start: string; lastDay: string };

export function periodSpan(period: { start: string; end: string }): PeriodSpan {
  if (period.start.endsWith('-01') && period.end.endsWith('-01')) {
    const months = monthUtils.differenceInCalendarMonths(
      period.end,
      period.start,
    );
    if (months === 1) {
      return { kind: 'month', month: monthOf(period.start) };
    }
    if (months === 12 && period.start.slice(5, 7) === '01') {
      return { kind: 'year', year: period.start.slice(0, 4) };
    }
  }
  return {
    kind: 'range',
    start: period.start,
    lastDay: lastDayOf(period.end),
  };
}

// How much of a period has passed on the as-of day, from 0 to 1.
export function periodProgress(
  period: { start: string; end: string },
  asOf: string,
): number {
  const length = monthUtils.differenceInCalendarDays(period.end, period.start);
  const passed = monthUtils.differenceInCalendarDays(asOf, period.start) + 1;
  return Math.min(1, Math.max(0, passed / length));
}

// How much of the allowance is spent, from 0 to 1. Spending without an
// allowance fills the bar.
export function spentFraction(allowance: number, spent: number): number {
  if (spent <= 0) {
    return 0;
  }
  if (allowance <= 0) {
    return 1;
  }
  return Math.min(1, spent / allowance);
}

export type PaymentTiming = 'early' | 'late' | 'inside';

export type PaymentView = PeriodBudgetPayment & {
  // Where its date is against the period it counts in; null without a period.
  timing: PaymentTiming | null;
  // Why it counts in a period that does not contain its date.
  offset: 'manual' | 'derived' | null;
};

export type ChargeView = DerivedCharge & {
  isOverdue: boolean; // expected, and its due date has passed
  override: PeriodChargeOverrideRow | null;
};

export type PeriodView = {
  period: BudgetPeriod;
  isPlanned: boolean; // follows from the cadence and is not stored yet
  isActive: boolean;
  allowance: number; // budget and carried balance together
  spent: number;
  remaining: number;
  overspending: number;
  outstandingCharges: number;
  expectedRemaining: number;
  carriedFrom: string | null; // the period the carried balance came from
  // What the carried balance would be when carried again now; null when the
  // period it came from is gone.
  carriedNow: number | null;
  previousId: string | null; // the category's period before this one
  previousRemaining: number | null;
  payments: PaymentView[]; // by date, then id
  charges: ChargeView[]; // by due date, then id
};

export type CategoryRowView = {
  category: CategoryEntity;
  cadence: PeriodCadenceRow | null;
  periods: PeriodView[]; // by start
  activePeriod: PeriodView | null;
  deletedPeriods: PeriodBudgetRow[]; // by start
  unassigned: PaymentView[]; // spending since the first period that is in none
  chargesWithoutPeriod: ChargeView[];
  linkedScheduleIds: string[];
};

export type GroupView = {
  group: CategoryGroupEntity;
  rows: CategoryRowView[];
};

export type Figures = {
  cash: number | null; // null when the cash plan could not be calculated
  inAccounts: number | null;
  owed: number | null;
  spentThisMonth: number;
  remainingInActivePeriods: number;
  activePeriodCount: number;
  overspending: number;
  overspentPeriodCount: number;
};

export type AttentionItem =
  | {
      kind: 'set-aside';
      key: string;
      row: SetAsideRow;
      category: string | null;
    }
  | {
      kind: 'charges-without-period';
      key: string;
      category: string;
      scheduleId: string;
      charges: ChargeView[];
    }
  | {
      kind: 'unassigned';
      key: string;
      category: string;
      payments: PaymentView[];
      total: number;
    }
  | { kind: 'unresolved'; key: string; count: number; total: number };

export type PeriodBudgetView = {
  asOf: string;
  figures: Figures;
  groups: GroupView[];
  attention: AttentionItem[];
  monthPayments: PaymentView[]; // dated in the month of the as-of day, latest first
};

type BuildInput = {
  calculation: PeriodBudgetCalculation;
  rows: PeriodBudgetRows;
  categoryGroups: readonly CategoryGroupEntity[];
};

function byDateThenId(
  a: { date: string; id: string },
  b: { date: string; id: string },
): number {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}

function pushTo<Key, Value>(map: Map<Key, Value[]>, key: Key, value: Value) {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

export function buildPeriodBudgetView({
  calculation,
  rows,
  categoryGroups,
}: BuildInput): PeriodBudgetView {
  const { asOf, projection } = calculation;
  const summary = projection.summary;

  const periodById = new Map<string, BudgetPeriod>();
  const firstStartByCategory = new Map<string, string>();
  function noteStart(category: string, start: string) {
    const first = firstStartByCategory.get(category);
    if (first === undefined || start < first) {
      firstStartByCategory.set(category, start);
    }
  }
  for (const { period } of projection.periods) {
    periodById.set(period.id, period);
    noteStart(period.category, period.start);
  }

  const storedById = new Map<string, PeriodBudgetRow>();
  const deletedByCategory = new Map<string, PeriodBudgetRow[]>();
  for (const row of rows.periods) {
    if (row.category === null || !isDay(row.start_date)) {
      continue;
    }
    if (row.tombstone) {
      if (isDay(row.end_date)) {
        pushTo(deletedByCategory, row.category, row);
      }
    } else {
      storedById.set(row.id, row);
      // Spending in the dates of a period that is set aside is unassigned too
      noteStart(row.category, row.start_date);
    }
  }

  const manualOffsets = new Map<string, string | null>();
  for (const offset of rows.offsets) {
    if (!offset.tombstone) {
      manualOffsets.set(offset.id, offset.period_id);
    }
  }
  const derivedOffsetIds = new Set(calculation.derivedOffsetIds);

  // Payments, by the period they count in
  const paymentsByPeriod = new Map<string, PaymentView[]>();
  const unassignedByCategory = new Map<string, PaymentView[]>();
  const monthPayments: PaymentView[] = [];
  const monthStart = `${monthOf(asOf)}-01`;
  for (const payment of calculation.payments) {
    const period =
      payment.periodId === null ? undefined : periodById.get(payment.periodId);
    let timing: PaymentTiming | null = null;
    let offset: PaymentView['offset'] = null;
    if (period) {
      if (payment.date < period.start) {
        timing = 'early';
      } else if (payment.date >= period.end) {
        timing = 'late';
      } else {
        timing = 'inside';
      }
      if (manualOffsets.get(payment.id) === period.id) {
        offset = 'manual';
      } else if (derivedOffsetIds.has(payment.id)) {
        offset = 'derived';
      }
    }
    const view: PaymentView = { ...payment, timing, offset };
    if (period) {
      pushTo(paymentsByPeriod, period.id, view);
    } else {
      const firstStart = firstStartByCategory.get(payment.category);
      if (firstStart !== undefined && payment.date >= firstStart) {
        pushTo(unassignedByCategory, payment.category, view);
      }
    }
    if (payment.date >= monthStart) {
      monthPayments.push(view);
    }
  }
  monthPayments.sort((a, b) => byDateThenId(b, a));

  // Charges, by the period that contains their due date
  const overrideById = new Map<string, PeriodChargeOverrideRow>();
  for (const override of rows.chargeOverrides) {
    if (!override.tombstone) {
      overrideById.set(override.id, override);
    }
  }
  const chargeById = new Map<string, ChargeView>();
  const chargesByPeriod = new Map<string, ChargeView[]>();
  for (const charge of calculation.charges) {
    const view: ChargeView = {
      ...charge,
      isOverdue: charge.status === 'expected' && charge.dueDate < asOf,
      override: overrideById.get(charge.id) ?? null,
    };
    chargeById.set(charge.id, view);
    if (charge.periodId !== null) {
      pushTo(chargesByPeriod, charge.periodId, view);
    }
  }

  // Periods
  const plannedIds = new Set(calculation.plannedPeriodIds);
  const summaryById = new Map(
    summary.periods.map(entry => [entry.period.id, entry]),
  );
  const periodsByCategory = new Map<string, PeriodView[]>();
  for (const entry of projection.periods) {
    const { period } = entry;
    const totals = summaryById.get(period.id);
    const stored = storedById.get(period.id);
    pushTo(periodsByCategory, period.category, {
      period,
      isPlanned: plannedIds.has(period.id),
      isActive: period.start <= asOf && asOf < period.end,
      allowance: period.budget + period.carryover,
      spent: totals?.netSpending ?? 0,
      remaining: entry.remaining,
      overspending: totals?.overspending ?? 0,
      outstandingCharges: entry.outstandingCharges,
      expectedRemaining: entry.expectedRemaining,
      carriedFrom: stored?.carried_from ?? null,
      carriedNow: null,
      previousId: null,
      previousRemaining: null,
      payments: (paymentsByPeriod.get(period.id) ?? []).sort(byDateThenId),
      charges: (chargesByPeriod.get(period.id) ?? []).sort((a, b) =>
        byDateThenId(
          { date: a.dueDate, id: a.id },
          { date: b.dueDate, id: b.id },
        ),
      ),
    });
  }
  const viewById = new Map<string, PeriodView>();
  for (const views of periodsByCategory.values()) {
    views.sort((a, b) =>
      byDateThenId(
        { date: a.period.start, id: a.period.id },
        { date: b.period.start, id: b.period.id },
      ),
    );
    for (const view of views) {
      viewById.set(view.period.id, view);
    }
  }
  for (const views of periodsByCategory.values()) {
    for (const view of views) {
      let previous: PeriodView | null = null;
      for (const other of views) {
        if (other !== view && other.period.end <= view.period.start) {
          previous = other;
        }
      }
      view.previousId = previous?.period.id ?? null;
      view.previousRemaining = previous?.remaining ?? null;
      if (view.carriedFrom !== null) {
        view.carriedNow = viewById.get(view.carriedFrom)?.remaining ?? null;
      }
    }
  }

  // What the user should look at
  const attention: AttentionItem[] = [];
  const chargesWithoutPeriod = new Map<string, ChargeView[]>();
  for (const row of calculation.needsAttention) {
    if (row.table === 'charges' && row.reason === 'charge-period-missing') {
      const charge = chargeById.get(row.id);
      if (charge) {
        pushTo(
          chargesWithoutPeriod,
          `${charge.category}/${charge.scheduleId}`,
          charge,
        );
        continue;
      }
    }
    attention.push({
      kind: 'set-aside',
      key: `${row.table}/${row.id}/${row.reason}`,
      row,
      category:
        row.table === 'period_budgets'
          ? (rows.periods.find(period => period.id === row.id)?.category ??
            null)
          : null,
    });
  }
  const chargesWithoutPeriodByCategory = new Map<string, ChargeView[]>();
  for (const [key, charges] of chargesWithoutPeriod) {
    const [first] = charges;
    attention.push({
      kind: 'charges-without-period',
      key: `charges/${key}`,
      category: first.category,
      scheduleId: first.scheduleId,
      charges,
    });
    for (const charge of charges) {
      pushTo(chargesWithoutPeriodByCategory, charge.category, charge);
    }
  }
  for (const [category, payments] of unassignedByCategory) {
    payments.sort(byDateThenId);
    let total = 0;
    for (const payment of payments) {
      total -= payment.amount;
    }
    attention.push({
      kind: 'unassigned',
      key: `unassigned/${category}`,
      category,
      payments,
      total,
    });
  }
  if (calculation.unresolved.length > 0) {
    let total = 0;
    for (const expense of calculation.unresolved) {
      total -= expense.amount;
    }
    attention.push({
      kind: 'unresolved',
      key: 'unresolved',
      count: calculation.unresolved.length,
      total,
    });
  }

  // Rows: the expense categories the budget shows, and every other one that
  // has something of the period budget
  const cadenceByCategory = new Map<string, PeriodCadenceRow>();
  for (const cadence of rows.cadences) {
    if (!cadence.tombstone) {
      cadenceByCategory.set(cadence.id, cadence);
    }
  }
  const linksByCategory = new Map<string, string[]>();
  for (const link of rows.scheduleLinks) {
    if (!link.tombstone && link.category !== null) {
      pushTo(linksByCategory, link.category, link.id);
    }
  }
  const groups: GroupView[] = [];
  for (const group of categoryGroups) {
    if (group.is_income) {
      continue;
    }
    const groupRows: CategoryRowView[] = [];
    for (const category of group.categories ?? []) {
      const periods = periodsByCategory.get(category.id) ?? [];
      const cadence = cadenceByCategory.get(category.id) ?? null;
      const linkedScheduleIds = linksByCategory.get(category.id) ?? [];
      const deletedPeriods = (deletedByCategory.get(category.id) ?? []).sort(
        (a, b) =>
          byDateThenId(
            { date: a.start_date ?? '', id: a.id },
            { date: b.start_date ?? '', id: b.id },
          ),
      );
      const isUsed =
        periods.length > 0 ||
        cadence !== null ||
        linkedScheduleIds.length > 0 ||
        deletedPeriods.length > 0;
      if ((group.hidden || category.hidden) && !isUsed) {
        continue;
      }
      groupRows.push({
        category,
        cadence,
        periods,
        activePeriod: periods.find(view => view.isActive) ?? null,
        deletedPeriods,
        unassigned: unassignedByCategory.get(category.id) ?? [],
        chargesWithoutPeriod:
          chargesWithoutPeriodByCategory.get(category.id) ?? [],
        linkedScheduleIds,
      });
    }
    if (groupRows.length > 0) {
      groups.push({ group, rows: groupRows });
    }
  }

  return {
    asOf,
    figures: {
      cash: calculation.cash?.cashAvailable ?? null,
      inAccounts: calculation.cash?.inAccounts ?? null,
      owed: calculation.cash?.owed ?? null,
      spentThisMonth: summary.monthlyActualSpending,
      remainingInActivePeriods: summary.combinedActiveRemaining,
      activePeriodCount: summary.activePeriods.length,
      overspending: summary.totalActiveOverspending,
      overspentPeriodCount: summary.overspentActivePeriods.length,
    },
    groups,
    attention,
    monthPayments,
  };
}

export function findRow(
  view: PeriodBudgetView,
  categoryId: string,
): CategoryRowView | null {
  for (const group of view.groups) {
    for (const row of group.rows) {
      if (row.category.id === categoryId) {
        return row;
      }
    }
  }
  return null;
}

// A period as the page remembers it while its row is open.
export type PeriodRef = {
  id: string;
  start: string;
};

// The period that is meant. A planned period gets another id when it is
// stored, so a period whose id is gone is looked for by its first day.
export function findPeriod(
  row: CategoryRowView,
  ref: PeriodRef,
): PeriodView | null {
  return (
    row.periods.find(view => view.period.id === ref.id) ??
    row.periods.find(view => view.period.start === ref.start) ??
    null
  );
}

// What of a charge is still expected to be paid.
export function outstandingOf(charge: DerivedCharge): number {
  if (charge.status === 'expected') {
    return charge.amount;
  }
  return charge.status === 'paid' ? charge.openAmount : 0;
}
