import type { PeriodBudgetCalculation } from '@actual-app/core/server/period-budget/calculate';
import type {
  ExpensePosting,
  PeriodOffset,
} from '@actual-app/core/shared/period-budget';
import type {
  CategoryGroupEntity,
  PeriodBudgetRows,
} from '@actual-app/core/types/models';

import { calculate, charge, NO_ROWS, period, stored } from './fixtures';
import {
  axisAround,
  axisMonths,
  axisPosition,
  axisSpan,
  buildPeriodBudgetView,
  endAfter,
  findPeriod,
  findRow,
  horizonEndFor,
  isOnAxis,
  lastDayOf,
  makeAxis,
  moveAxis,
  outstandingOf,
  periodProgress,
  periodSpan,
  spentFraction,
  yearAxis,
} from './model';

const GROUPS: CategoryGroupEntity[] = [
  {
    id: 'usual',
    name: 'Usual expenses',
    categories: [
      { id: 'food', name: 'Food', group: 'usual' },
      { id: 'tax', name: 'Tax', group: 'usual' },
      { id: 'old', name: 'Old', group: 'usual', hidden: true },
      { id: 'kept', name: 'Kept', group: 'usual', hidden: true },
    ],
  },
  {
    id: 'income',
    name: 'Income',
    is_income: true,
    categories: [
      { id: 'salary', name: 'Salary', group: 'income', is_income: true },
    ],
  },
  {
    id: 'hidden',
    name: 'Hidden group',
    hidden: true,
    categories: [{ id: 'attic', name: 'Attic', group: 'hidden' }],
  },
];

const FOOD_APRIL = period(
  'food:2026-04-01',
  'food',
  '2026-04-01',
  '2026-05-01',
  30000,
);
const FOOD_MAY = period(
  'food:2026-05-01',
  'food',
  '2026-05-01',
  '2026-06-01',
  30000,
  -8000,
);
const FOOD_JUNE = period(
  'food:2026-06-01',
  'food',
  '2026-06-01',
  '2026-07-01',
  30000,
);
const TAX_2026 = period(
  'tax:2026-01-01',
  'tax',
  '2026-01-01',
  '2027-01-01',
  120000,
);
const KEPT_MAY = period(
  'kept:2026-05-01',
  'kept',
  '2026-05-01',
  '2026-06-01',
  1000,
);

describe('the time axis', () => {
  it('is the calendar year of the month', () => {
    expect(yearAxis('2026-05')).toEqual({
      start: '2026-01-01',
      end: '2027-01-01',
    });
    expect(axisAround('2026-05', 12)).toEqual(yearAxis('2026-05'));
  });

  it('zoomed in, shows the month with one month before it', () => {
    expect(axisAround('2026-05', 3)).toEqual({
      start: '2026-04-01',
      end: '2026-07-01',
    });
    expect(axisAround('2026-01', 6)).toEqual({
      start: '2025-12-01',
      end: '2026-06-01',
    });
  });

  it('moves by months and keeps its length', () => {
    expect(moveAxis(yearAxis('2026-05'), 3)).toEqual({
      start: '2026-04-01',
      end: '2027-04-01',
    });
    expect(moveAxis(makeAxis('2026-01', 3), -1)).toEqual({
      start: '2025-12-01',
      end: '2026-03-01',
    });
  });

  it('lists its months', () => {
    expect(axisMonths(makeAxis('2025-11', 3))).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
    expect(axisMonths(yearAxis('2026-05'))).toHaveLength(12);
  });

  it('places a day by its real date', () => {
    const axis = makeAxis('2026-01', 12);
    expect(axisPosition(axis, '2026-01-01')).toBe(0);
    expect(axisPosition(axis, '2027-01-01')).toBe(1);
    expect(axisPosition(axis, '2026-01-02')).toBeCloseTo(1 / 365, 10);
    expect(axisPosition(axis, '2025-12-31')).toBeLessThan(0);
    expect(axisPosition(axis, '2027-01-02')).toBeGreaterThan(1);
    expect(isOnAxis(axis, '2026-01-01')).toBe(true);
    expect(isOnAxis(axis, '2026-12-31')).toBe(true);
    expect(isOnAxis(axis, '2027-01-01')).toBe(false);
    expect(isOnAxis(axis, '2025-12-31')).toBe(false);
  });

  it('gives a period the part of the axis it covers', () => {
    const axis = makeAxis('2026-01', 12);
    expect(axisSpan(axis, { start: '2026-01-01', end: '2027-01-01' })).toEqual({
      from: 0,
      to: 1,
      startsBefore: false,
      endsAfter: false,
    });
    const cut = axisSpan(axis, { start: '2025-07-01', end: '2026-07-01' });
    expect(cut?.from).toBe(0);
    expect(cut?.to).toBeCloseTo(181 / 365, 10);
    expect(cut?.startsBefore).toBe(true);
    expect(cut?.endsAfter).toBe(false);
    expect(axisSpan(axis, { start: '2026-12-01', end: '2027-03-01' })).toEqual({
      from: 334 / 365,
      to: 1,
      startsBefore: false,
      endsAfter: true,
    });
    expect(axisSpan(axis, { start: '2025-01-01', end: '2026-01-01' })).toBe(
      null,
    );
    expect(axisSpan(axis, { start: '2027-01-01', end: '2027-02-01' })).toBe(
      null,
    );
  });
});

describe('horizonEndFor', () => {
  const axis = yearAxis('2026-05');

  it('is the end of the month a year after the as-of day', () => {
    expect(horizonEndFor({ asOf: '2026-05-15', axis, rows: NO_ROWS })).toBe(
      '2027-05-31',
    );
    expect(horizonEndFor({ asOf: '2026-05-15', axis, rows: undefined })).toBe(
      '2027-05-31',
    );
  });

  it('reaches the end of an axis that ends later', () => {
    expect(
      horizonEndFor({
        asOf: '2026-05-15',
        axis: yearAxis('2028-03'),
        rows: NO_ROWS,
      }),
    ).toBe('2028-12-31');
  });

  it('reaches the end of an active period, not of other periods', () => {
    const long = stored(
      period('tax:2026-01-01', 'tax', '2026-01-01', '2030-01-01', 1),
    );
    const later = stored(
      period('tax:2031-01-01', 'tax', '2031-01-01', '2032-01-01', 1),
    );
    expect(
      horizonEndFor({
        asOf: '2026-05-15',
        axis,
        rows: { ...NO_ROWS, periods: [long, later] },
      }),
    ).toBe('2029-12-31');
    expect(
      horizonEndFor({
        asOf: '2026-05-15',
        axis,
        rows: { ...NO_ROWS, periods: [{ ...long, tombstone: true }, later] },
      }),
    ).toBe('2027-05-31');
  });

  it('is never more than ten years ahead', () => {
    const endless = stored(
      period('tax:2026-01-01', 'tax', '2026-01-01', '9999-01-01', 1),
    );
    expect(
      horizonEndFor({
        asOf: '2026-05-15',
        axis,
        rows: { ...NO_ROWS, periods: [endless] },
      }),
    ).toBe('2036-05-31');
  });

  it('leaves out rows with unusable dates', () => {
    const broken = stored(FOOD_MAY, { end_date: null });
    const text = stored(FOOD_MAY, { end_date: 'later' });
    expect(
      horizonEndFor({
        asOf: '2026-05-15',
        axis,
        rows: { ...NO_ROWS, periods: [broken, text] },
      }),
    ).toBe('2027-05-31');
  });
});

describe('period helpers', () => {
  it('converts between the last day and the day after it', () => {
    expect(lastDayOf('2026-03-01')).toBe('2026-02-28');
    expect(endAfter('2026-02-28')).toBe('2026-03-01');
    expect(endAfter('2026-12-31')).toBe('2027-01-01');
  });

  it('names a calendar month and a calendar year', () => {
    expect(periodSpan({ start: '2026-04-01', end: '2026-05-01' })).toEqual({
      kind: 'month',
      month: '2026-04',
    });
    expect(periodSpan({ start: '2026-01-01', end: '2027-01-01' })).toEqual({
      kind: 'year',
      year: '2026',
    });
    expect(periodSpan({ start: '2026-04-01', end: '2027-04-01' })).toEqual({
      kind: 'range',
      start: '2026-04-01',
      lastDay: '2027-03-31',
    });
    expect(periodSpan({ start: '2026-04-15', end: '2026-05-15' })).toEqual({
      kind: 'range',
      start: '2026-04-15',
      lastDay: '2026-05-14',
    });
    expect(periodSpan({ start: '2026-04-01', end: '2026-07-01' }).kind).toBe(
      'range',
    );
    expect(periodSpan({ start: '2026-04-01', end: '2026-05-15' })).toEqual({
      kind: 'range',
      start: '2026-04-01',
      lastDay: '2026-05-14',
    });
  });

  it('tells how far through a period the as-of day is', () => {
    const april = { start: '2026-04-01', end: '2026-05-01' };
    expect(periodProgress(april, '2026-04-01')).toBeCloseTo(1 / 30, 10);
    expect(periodProgress(april, '2026-04-15')).toBe(0.5);
    expect(periodProgress(april, '2026-04-30')).toBe(1);
    expect(periodProgress(april, '2026-06-01')).toBe(1);
    expect(periodProgress(april, '2026-03-01')).toBe(0);
  });

  it('tells how much of the allowance is spent', () => {
    expect(spentFraction(1000, 250)).toBe(0.25);
    expect(spentFraction(1000, 1500)).toBe(1);
    expect(spentFraction(1000, 0)).toBe(0);
    expect(spentFraction(1000, -200)).toBe(0);
    expect(spentFraction(0, 1)).toBe(1);
    expect(spentFraction(-500, 1)).toBe(1);
    expect(spentFraction(0, 0)).toBe(0);
  });
});

describe('buildPeriodBudgetView', () => {
  const postings: ExpensePosting[] = [
    { id: 'march', category: 'food', date: '2026-03-20', amount: -500 },
    { id: 'april-1', category: 'food', date: '2026-04-03', amount: -20000 },
    { id: 'april-2', category: 'food', date: '2026-04-20', amount: -18000 },
    { id: 'may-1', category: 'food', date: '2026-05-02', amount: -7000 },
    { id: 'may-refund', category: 'food', date: '2026-05-04', amount: 1000 },
    { id: 'late', category: 'food', date: '2026-05-05', amount: -2500 },
    { id: 'tax-early', category: 'tax', date: '2025-12-20', amount: -40000 },
    { id: 'attic', category: 'attic', date: '2026-05-06', amount: -300 },
    { id: 'future', category: 'food', date: '2026-05-20', amount: -100 },
  ];
  const offsets: PeriodOffset[] = [
    { transactionId: 'late', periodId: FOOD_APRIL.id },
    { transactionId: 'tax-early', periodId: TAX_2026.id },
  ];
  const book = {
    asOf: '2026-05-10',
    periods: [FOOD_MAY, FOOD_APRIL, FOOD_JUNE, TAX_2026, KEPT_MAY],
    postings,
    offsets,
  };
  const rows: PeriodBudgetRows = {
    ...NO_ROWS,
    cadences: [
      {
        id: 'food',
        anchor_date: '2026-04-01',
        months: 1,
        active: true,
        tombstone: false,
      },
      {
        id: 'tax',
        anchor_date: '2026-01-01',
        months: 12,
        active: true,
        tombstone: true,
      },
    ],
    periods: [
      stored(FOOD_APRIL),
      stored(FOOD_MAY, { carried_from: FOOD_APRIL.id }),
      stored(TAX_2026),
      stored(KEPT_MAY),
      stored(
        period('food:2026-02-01', 'food', '2026-02-01', '2026-03-01', 100),
        { tombstone: true },
      ),
    ],
    offsets: [
      { id: 'late', period_id: FOOD_APRIL.id, tombstone: false },
      { id: 'may-1', period_id: FOOD_APRIL.id, tombstone: true },
      // To a period that is gone: the payment counts where its date is
      { id: 'may-refund', period_id: 'food:gone', tombstone: false },
      // Removed by the user; a charge of the schedule moved the payment since
      { id: 'tax-early', period_id: TAX_2026.id, tombstone: true },
    ],
    scheduleLinks: [
      { id: 'tax-bill', category: 'tax', tombstone: false },
      { id: 'gone', category: 'tax', tombstone: true },
    ],
  };

  function build(fields: Partial<PeriodBudgetCalculation> = {}) {
    return buildPeriodBudgetView({
      calculation: calculate({
        ...book,
        fields: {
          plannedPeriodIds: [FOOD_JUNE.id],
          derivedOffsetIds: ['tax-early'],
          ...fields,
        },
      }),
      rows,
      categoryGroups: GROUPS,
    });
  }

  it('lists the expense categories by group, and hidden ones only when they have something', () => {
    const view = build();

    expect(
      view.groups.map(group => [
        group.group.id,
        group.rows.map(row => row.category.id),
      ]),
    ).toEqual([['usual', ['food', 'tax', 'kept']]]);
  });

  it('gives each period its figures', () => {
    const food = findRow(build(), 'food');

    expect(food?.periods.map(view => view.period.id)).toEqual([
      FOOD_APRIL.id,
      FOOD_MAY.id,
      FOOD_JUNE.id,
    ]);
    expect(food?.activePeriod?.period.id).toBe(FOOD_MAY.id);

    const [april, may, june] = food?.periods ?? [];
    expect(april).toMatchObject({
      isPlanned: false,
      isActive: false,
      allowance: 30000,
      spent: 40500,
      remaining: -10500,
      overspending: 10500,
      carriedFrom: null,
      carriedNow: null,
      previousId: null,
      previousRemaining: null,
    });
    expect(may).toMatchObject({
      isPlanned: false,
      isActive: true,
      allowance: 22000,
      spent: 6000,
      remaining: 16000,
      overspending: 0,
      carriedFrom: FOOD_APRIL.id,
      carriedNow: -10500,
      previousId: FOOD_APRIL.id,
      previousRemaining: -10500,
    });
    expect(june).toMatchObject({
      isPlanned: true,
      isActive: false,
      spent: 0,
      remaining: 30000,
      previousId: FOOD_MAY.id,
      previousRemaining: 16000,
    });
  });

  it('gives each period its payments, with early and late in words and the kind of offset', () => {
    const view = build();
    const [april, may] = findRow(view, 'food')?.periods ?? [];

    expect(
      april.payments.map(payment => [
        payment.id,
        payment.timing,
        payment.offset,
      ]),
    ).toEqual([
      ['april-1', 'inside', null],
      ['april-2', 'inside', null],
      ['late', 'late', 'manual'],
    ]);
    expect(
      may.payments.map(payment => [payment.id, payment.timing, payment.offset]),
    ).toEqual([
      ['may-1', 'inside', null],
      ['may-refund', 'inside', null],
    ]);
    expect(findRow(view, 'tax')?.periods[0].payments).toMatchObject([
      { id: 'tax-early', timing: 'early', offset: 'derived' },
    ]);
  });

  it('lists the payments of a period by date, whatever order they come in', () => {
    const view = buildPeriodBudgetView({
      calculation: calculate({ ...book, postings: [...postings].reverse() }),
      rows,
      categoryGroups: GROUPS,
    });

    expect(
      findRow(view, 'food')?.periods[0].payments.map(payment => payment.id),
    ).toEqual(['april-1', 'april-2', 'late']);
  });

  it('counts the first day of a period in it and the day after its last day out of it', () => {
    const view = buildPeriodBudgetView({
      calculation: calculate({
        asOf: '2026-06-01',
        periods: [FOOD_MAY, FOOD_JUNE],
        postings: [
          { id: 'first-day', category: 'food', date: '2026-05-01', amount: -1 },
          { id: 'day-after', category: 'food', date: '2026-06-01', amount: -2 },
        ],
        offsets: [{ transactionId: 'day-after', periodId: FOOD_MAY.id }],
      }),
      rows: NO_ROWS,
      categoryGroups: GROUPS,
    });
    const food = findRow(view, 'food');
    const [may, june] = food?.periods ?? [];

    expect(may.payments.map(payment => [payment.id, payment.timing])).toEqual([
      ['first-day', 'inside'],
      ['day-after', 'late'],
    ]);
    // The as-of day is the day after May's last day and June's first day
    expect(may.isActive).toBe(false);
    expect(june.isActive).toBe(true);
    expect(food?.activePeriod?.period.id).toBe(FOOD_JUNE.id);
  });

  it('a payment after the as-of day is not shown', () => {
    const view = build();

    expect(
      view.groups
        .flatMap(group => group.rows)
        .flatMap(row => row.periods)
        .flatMap(entry => entry.payments)
        .some(payment => payment.id === 'future'),
    ).toBe(false);
    expect(view.monthPayments.some(payment => payment.id === 'future')).toBe(
      false,
    );
  });

  it('flags spending since the first period that is in no period', () => {
    const view = buildPeriodBudgetView({
      calculation: calculate({
        ...book,
        periods: [FOOD_APRIL, TAX_2026],
      }),
      rows,
      categoryGroups: GROUPS,
    });

    // 'march' is before the first period; 'late' is offset to April
    expect(
      findRow(view, 'food')?.unassigned.map(payment => payment.id),
    ).toEqual(['may-1', 'may-refund']);
    expect(view.attention).toContainEqual(
      expect.objectContaining({
        kind: 'unassigned',
        category: 'food',
        total: 6000,
      }),
    );
    expect(
      view.attention.filter(item => item.kind === 'unassigned'),
    ).toHaveLength(1);
  });

  it('spending in the dates of a period that was set aside is unassigned too', () => {
    const view = buildPeriodBudgetView({
      calculation: calculate({
        ...book,
        periods: [FOOD_MAY, TAX_2026],
        postings: [
          ...postings,
          { id: 'april-0', category: 'food', date: '2026-04-01', amount: -1 },
        ],
        offsets: [],
      }),
      // April is stored, and the calculation left it out
      rows,
      categoryGroups: GROUPS,
    });

    // From its first day on; 'march' is before it
    expect(
      findRow(view, 'food')?.unassigned.map(payment => payment.id),
    ).toEqual(['april-0', 'april-1', 'april-2']);
  });

  it('lists the payments of the month, latest first, also without a period', () => {
    expect(build().monthPayments.map(payment => payment.id)).toEqual([
      'attic',
      'late',
      'may-refund',
      'may-1',
    ]);
  });

  it('gives the charges of a period, marks overdue ones and attaches the stored change', () => {
    const paid = charge('tax-bill', 'tax', '2026-01-01', TAX_2026.id, 40000, {
      status: 'paid',
      paymentId: 'tax-early',
      paymentDate: '2025-12-20',
    });
    const overdue = charge('tax-bill', 'tax', '2026-05-01', TAX_2026.id, 40000);
    const today = charge('tax-bill', 'tax', '2026-05-10', TAX_2026.id, 100);
    const next = charge('tax-bill', 'tax', '2026-09-01', TAX_2026.id, 35000);
    const view = buildPeriodBudgetView({
      calculation: calculate({
        ...book,
        fields: { charges: [next, paid, today, overdue] },
      }),
      rows: {
        ...rows,
        chargeOverrides: [
          {
            id: next.id,
            amount: 35000,
            skipped: false,
            transaction_id: null,
            open_amount: null,
            tombstone: false,
          },
          {
            id: overdue.id,
            amount: 1,
            skipped: false,
            transaction_id: null,
            open_amount: null,
            tombstone: true,
          },
        ],
      },
      categoryGroups: GROUPS,
    });

    expect(
      findRow(view, 'tax')?.periods[0].charges.map(entry => [
        entry.dueDate,
        entry.status,
        entry.isOverdue,
        entry.override?.amount ?? null,
      ]),
    ).toEqual([
      ['2026-01-01', 'paid', false, null],
      ['2026-05-01', 'expected', true, null],
      ['2026-05-10', 'expected', false, null],
      ['2026-09-01', 'expected', false, 35000],
    ]);
  });

  it('groups charges without a period by schedule under what needs attention', () => {
    const first = charge('rent', 'food', '2026-08-01', null, 900);
    const second = charge('rent', 'food', '2026-09-01', null, 900);
    const other = charge('gym', 'food', '2026-08-15', null, 50);
    const view = build({
      charges: [first, second, other],
      needsAttention: [
        {
          table: 'charges',
          id: first.id,
          reason: 'charge-period-missing',
          detail: '',
        },
        {
          table: 'charges',
          id: second.id,
          reason: 'charge-period-missing',
          detail: '',
        },
        {
          table: 'charges',
          id: other.id,
          reason: 'charge-period-missing',
          detail: '',
        },
      ],
    });

    expect(
      view.attention
        .filter(item => item.kind === 'charges-without-period')
        .map(item => [
          item.category,
          item.scheduleId,
          item.charges.map(entry => entry.dueDate),
        ]),
    ).toEqual([
      ['food', 'rent', ['2026-08-01', '2026-09-01']],
      ['food', 'gym', ['2026-08-15']],
    ]);
    expect(
      findRow(view, 'food')?.chargesWithoutPeriod.map(entry => entry.id),
    ).toEqual([first.id, second.id, other.id]);
  });

  it('lists rows that were set aside with the category of a period row', () => {
    const view = build({
      needsAttention: [
        {
          table: 'period_budgets',
          id: KEPT_MAY.id,
          reason: 'overlap',
          detail: 'overlaps period x',
        },
        {
          table: 'period_offsets',
          id: 'late',
          reason: 'offset-period-missing',
          detail: '',
        },
        {
          table: 'period_charge_overrides',
          id: 'tax-bill:2026-02-30',
          reason: 'override-without-charge',
          detail: '',
        },
      ],
    });

    expect(
      view.attention.map(item =>
        item.kind === 'set-aside'
          ? [item.row.table, item.row.reason, item.category]
          : item.kind,
      ),
    ).toEqual([
      ['period_budgets', 'overlap', 'kept'],
      ['period_offsets', 'offset-period-missing', null],
      ['period_charge_overrides', 'override-without-charge', null],
    ]);
  });

  it('counts expenses without a usable category', () => {
    const view = build({
      unresolved: [
        {
          id: 'a',
          account: 'checking',
          date: '2026-05-01',
          amount: -1200,
          reason: 'uncategorized',
        },
        {
          id: 'b',
          account: 'checking',
          date: '2026-05-02',
          amount: -300,
          reason: 'unknown-category',
        },
      ],
    });

    expect(view.attention).toEqual([
      { kind: 'unresolved', key: 'unresolved', count: 2, total: 1500 },
    ]);
  });

  it('gives the header figures', () => {
    const view = build({
      cash: {
        cashAvailable: 90000,
        inAccounts: 120000,
        owed: 30000,
        projectedCash: 1,
        accounts: [],
      },
    });

    expect(view.figures).toEqual({
      cash: 90000,
      inAccounts: 120000,
      owed: 30000,
      // may-1, may-refund, late and attic
      spentThisMonth: 8800,
      // May food 16000, tax 80000, kept 1000
      remainingInActivePeriods: 97000,
      activePeriodCount: 3,
      overspending: 0,
      overspentPeriodCount: 0,
    });
    expect(build().figures).toMatchObject({
      cash: null,
      inAccounts: null,
      owed: null,
    });
  });

  it('adds up the overspending of the active periods only', () => {
    const view = buildPeriodBudgetView({
      calculation: calculate({ ...book, asOf: '2026-04-25' }),
      rows,
      categoryGroups: GROUPS,
    });

    // April is 8000 over on that day; the late payment is dated after it
    expect(view.figures).toMatchObject({
      overspending: 8000,
      overspentPeriodCount: 1,
    });
  });

  it('gives the linked schedules, the cadence and the deleted periods of a category', () => {
    const view = build();

    expect(findRow(view, 'tax')).toMatchObject({
      cadence: null,
      linkedScheduleIds: ['tax-bill'],
      deletedPeriods: [],
    });
    expect(findRow(view, 'food')).toMatchObject({
      cadence: { id: 'food', months: 1 },
      linkedScheduleIds: [],
      deletedPeriods: [{ id: 'food:2026-02-01' }],
    });
    expect(findRow(view, 'attic')).toBe(null);
  });

  it('finds an opened period by its id, and by its first day when the id is gone', () => {
    const food = findRow(build(), 'food');
    if (!food) {
      throw new Error('The food row is missing');
    }

    // The id decides when it is there, also against another first day
    expect(
      findPeriod(food, { id: FOOD_MAY.id, start: FOOD_APRIL.start })?.period,
    ).toEqual(FOOD_MAY);
    // A planned period that was stored has another id and the same first day
    expect(
      findPeriod(food, { id: 'stored-under-another-id', start: '2026-06-01' })
        ?.period,
    ).toEqual(FOOD_JUNE);
    expect(
      findPeriod(food, { id: 'stored-under-another-id', start: '2026-07-01' }),
    ).toBe(null);
  });
});

describe('outstandingOf', () => {
  it('is the amount of an expected charge', () => {
    expect(
      outstandingOf(
        charge('tax-bill', 'tax', '2026-06-15', TAX_2026.id, 30000),
      ),
    ).toBe(30000);
  });

  it('is what a part payment left open of a paid charge', () => {
    expect(
      outstandingOf(
        charge('tax-bill', 'tax', '2026-03-15', TAX_2026.id, 30000, {
          status: 'paid',
          openAmount: 12000,
        }),
      ),
    ).toBe(12000);
    expect(
      outstandingOf(
        charge('tax-bill', 'tax', '2026-03-15', TAX_2026.id, 30000, {
          status: 'paid',
        }),
      ),
    ).toBe(0);
  });

  it('is nothing for a charge that is skipped or no longer expected', () => {
    for (const status of ['skipped', 'closed'] as const) {
      expect(
        outstandingOf(
          charge('tax-bill', 'tax', '2026-03-15', TAX_2026.id, 30000, {
            status,
            openAmount: 12000,
          }),
        ),
      ).toBe(0);
    }
  });
});
