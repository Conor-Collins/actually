import type {
  BudgetPeriod,
  ChargeOccurrence,
  ExpensePosting,
  PeriodOffset,
} from '@actual-app/core/shared/period-budget';
import type { DerivedCharge } from '@actual-app/core/shared/period-charges';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { calculate, charge, NO_ROWS, period, stored } from './fixtures';
import { buildPeriodGraph, graphHeight, isShownCharge } from './graph';
import { buildPeriodBudgetView, findRow } from './model';

const GROUPS: CategoryGroupEntity[] = [
  {
    id: 'usual',
    name: 'Usual expenses',
    categories: [{ id: 'food', name: 'Food', group: 'usual' }],
  },
];

const JUNE = period('food-june', 'food', '2017-06-01', '2017-07-01', 50000);
const JULY = period('food-july', 'food', '2017-07-01', '2017-08-01', 0);

type Book = {
  asOf: string;
  postings?: ExpensePosting[];
  offsets?: PeriodOffset[];
  charges?: DerivedCharge[];
  // What the calculation counts as outstanding, for the figures of the period
  occurrences?: ChargeOccurrence[];
  shown?: BudgetPeriod;
};

function posting(id: string, date: string, amount: number): ExpensePosting {
  return { id, category: 'food', date, amount };
}

function scheduled(id: string, date: string, amount: number): ChargeOccurrence {
  return { id, periodId: JUNE.id, date, amount, state: 'scheduled' };
}

// The graph of June, or of another period of Food, as the page builds it
function graphOf({
  asOf,
  postings = [],
  offsets = [],
  charges = [],
  occurrences = [],
  shown = JUNE,
}: Book) {
  const periods = [JUNE, JULY];
  const view = buildPeriodBudgetView({
    calculation: calculate({
      asOf,
      periods,
      postings,
      offsets,
      occurrences,
      fields: { charges },
    }),
    rows: {
      ...NO_ROWS,
      periods: periods.map(entry => stored(entry)),
      offsets: offsets.map(offset => ({
        id: offset.transactionId,
        period_id: offset.periodId,
        tombstone: false,
      })),
    },
    categoryGroups: GROUPS,
  });
  const periodView = findRow(view, 'food')?.periods.find(
    entry => entry.period.id === shown.id,
  );
  if (!periodView) {
    throw new Error(`No period ${shown.id}`);
  }
  return { periodView, graph: buildPeriodGraph(periodView, asOf) };
}

// The middle of the day that is `days` after the first of 32 days shown
function middle(days: number) {
  return (days + 0.5) / 32;
}

describe('buildPeriodGraph', () => {
  it('shows the days of the period when every payment is dated in it', () => {
    const { graph } = graphOf({
      asOf: '2017-06-15',
      postings: [posting('p1', '2017-06-05', -12000)],
    });

    expect(graph).toMatchObject({
      start: '2017-06-01',
      lastDay: '2017-06-30',
      periodFrom: 0,
      periodTo: 1,
      allowance: 50000,
      spent: 12000,
      expected: 12000,
      asOfPlace: 'shown',
      asOfX: 14.5 / 30,
      low: 0,
      high: 50000,
    });
    expect(graph.payments).toMatchObject([
      { payment: { id: 'p1' }, x: 4.5 / 30, level: 12000 },
    ]);
    expect(graph.charges).toEqual([]);
    expect(graph.runs).toMatchObject([
      { kind: 'spent', zone: 'inside', from: 0, to: 4.5 / 30, level: 0 },
      {
        kind: 'spent',
        zone: 'inside',
        from: 4.5 / 30,
        to: 14.5 / 30,
        level: 12000,
      },
    ]);
    expect(graph.rises).toMatchObject([
      { kind: 'spent', x: 4.5 / 30, from: 0, to: 12000 },
    ]);
  });

  it('has an early payment at its real date, left of the days of the period', () => {
    const { periodView, graph } = graphOf({
      asOf: '2017-06-15',
      postings: [
        posting('p-early', '2017-05-30', -3000),
        posting('p1', '2017-06-05', -12000),
        posting('refund', '2017-06-10', 2000),
      ],
      offsets: [{ transactionId: 'p-early', periodId: JUNE.id }],
    });

    // The 30th of May to the 30th of June: 32 days
    expect(graph).toMatchObject({
      start: '2017-05-30',
      lastDay: '2017-06-30',
      periodFrom: 2 / 32,
      periodTo: 1,
      spent: 13000,
      asOfPlace: 'shown',
      asOfX: middle(16),
    });
    expect(graph.spent).toBe(periodView.spent);
    expect(
      graph.payments.map(entry => [
        entry.payment.id,
        entry.payment.timing,
        entry.x,
        entry.level,
      ]),
    ).toEqual([
      ['p-early', 'early', middle(0), 3000],
      ['p1', 'inside', middle(6), 15000],
      // A refund takes the line down
      ['refund', 'inside', middle(11), 13000],
    ]);
    expect(graph.runs).toMatchObject([
      { kind: 'spent', zone: 'early', from: 0, to: middle(0), level: 0 },
      // From the payment to the first day of the period
      {
        kind: 'spent',
        zone: 'early',
        from: middle(0),
        to: 2 / 32,
        level: 3000,
      },
      {
        kind: 'spent',
        zone: 'inside',
        from: 2 / 32,
        to: middle(6),
        level: 3000,
      },
      {
        kind: 'spent',
        zone: 'inside',
        from: middle(6),
        to: middle(11),
        level: 15000,
      },
      {
        kind: 'spent',
        zone: 'inside',
        from: middle(11),
        to: middle(16),
        level: 13000,
      },
    ]);
    expect(graph.rises).toMatchObject([
      { kind: 'spent', x: middle(0), from: 0, to: 3000 },
      { kind: 'spent', x: middle(6), from: 3000, to: 15000 },
      { kind: 'spent', x: middle(11), from: 15000, to: 13000 },
    ]);
    // Each part and each step is named by its line and its payment
    expect(graph.runs.map(run => run.id)).toEqual([
      'spent::early',
      'spent:p-early:early',
      'spent:p-early:inside',
      'spent:p1:inside',
      'spent:refund:inside',
    ]);
    expect(graph.rises.map(rise => rise.id)).toEqual([
      'spent:p-early',
      'spent:p1',
      'spent:refund',
    ]);
  });

  it('joins an early payment to a period that has not begun', () => {
    const early = {
      asOf: '2017-05-31',
      postings: [posting('p-early', '2017-05-30', -3000)],
      offsets: [{ transactionId: 'p-early', periodId: JUNE.id }],
    };
    const { graph } = graphOf(early);

    // The 30th of May to the 30th of June: 32 days, the as-of day the second
    expect(graph).toMatchObject({
      start: '2017-05-30',
      periodFrom: 2 / 32,
      spent: 3000,
      asOfPlace: 'shown',
      asOfX: middle(1),
    });
    expect(graph.runs).toEqual([
      {
        id: 'spent::early',
        kind: 'spent',
        zone: 'early',
        from: 0,
        to: middle(0),
        level: 0,
      },
      // Past the as-of day, to the first day of the period
      {
        id: 'spent:p-early:early',
        kind: 'spent',
        zone: 'early',
        from: middle(0),
        to: 2 / 32,
        level: 3000,
      },
    ]);

    // And so with a charge that is still expected: its line begins at the
    // as-of day
    const withCharge = graphOf({
      ...early,
      charges: [charge('milk', 'food', '2017-06-12', JUNE.id, 5000)],
    }).graph;
    expect(withCharge.runs).toEqual([
      ...graph.runs,
      {
        id: 'expected::early',
        kind: 'expected',
        zone: 'early',
        from: middle(1),
        to: 2 / 32,
        level: 3000,
      },
      {
        id: 'expected::inside',
        kind: 'expected',
        zone: 'inside',
        from: 2 / 32,
        to: middle(13),
        level: 3000,
      },
      {
        id: 'expected:milk:2017-06-12:inside',
        kind: 'expected',
        zone: 'inside',
        from: middle(13),
        to: 1,
        level: 8000,
      },
    ]);
    expect(withCharge.rises).toEqual([
      { id: 'spent:p-early', kind: 'spent', x: middle(0), from: 0, to: 3000 },
      {
        id: 'expected:milk:2017-06-12',
        kind: 'expected',
        x: middle(13),
        from: 3000,
        to: 8000,
      },
    ]);
  });

  it('names the steps of two payments on one day apart', () => {
    const { graph } = graphOf({
      asOf: '2017-06-15',
      postings: [
        posting('a', '2017-06-05', -1000),
        posting('b', '2017-06-05', -2000),
      ],
    });

    expect(graph.rises.map(rise => rise.id)).toEqual(['spent:a', 'spent:b']);
    // No part between them: it has no length
    expect(graph.runs.map(run => run.id)).toEqual([
      'spent::inside',
      'spent:b:inside',
    ]);
  });

  it('has a late payment at its real date, right of the days of the period', () => {
    const { periodView, graph } = graphOf({
      asOf: '2017-07-10',
      postings: [
        posting('p1', '2017-06-05', -12000),
        posting('p-late', '2017-07-02', -4000),
      ],
      offsets: [{ transactionId: 'p-late', periodId: JUNE.id }],
    });

    // The 1st of June to the 2nd of July: 32 days
    expect(graph).toMatchObject({
      start: '2017-06-01',
      lastDay: '2017-07-02',
      periodFrom: 0,
      periodTo: 30 / 32,
      spent: 16000,
      asOfPlace: 'after',
      asOfX: null,
    });
    expect(graph.spent).toBe(periodView.spent);
    expect(
      graph.payments.map(entry => [
        entry.payment.id,
        entry.payment.timing,
        entry.x,
        entry.level,
      ]),
    ).toEqual([
      ['p1', 'inside', middle(4), 12000],
      ['p-late', 'late', middle(31), 16000],
    ]);
    expect(graph.runs).toMatchObject([
      { kind: 'spent', zone: 'inside', from: 0, to: middle(4), level: 0 },
      {
        kind: 'spent',
        zone: 'inside',
        from: middle(4),
        to: 30 / 32,
        level: 12000,
      },
      // From the last day of the period to the payment
      {
        kind: 'spent',
        zone: 'late',
        from: 30 / 32,
        to: middle(31),
        level: 12000,
      },
      // The line ends at the last day shown: the as-of day is after it
      { kind: 'spent', zone: 'late', from: middle(31), to: 1, level: 16000 },
    ]);
  });

  it('goes on from the as-of day with the charges that are still expected', () => {
    const { periodView, graph } = graphOf({
      asOf: '2017-06-15',
      postings: [
        posting('p-early', '2017-05-30', -3000),
        posting('p1', '2017-06-05', -12000),
      ],
      offsets: [{ transactionId: 'p-early', periodId: JUNE.id }],
      charges: [
        // Paid in full: not in the graph again
        charge('gym', 'food', '2017-06-05', JUNE.id, 12000, {
          status: 'paid',
          paymentId: 'p1',
        }),
        // Overdue: expected on the as-of day
        charge('milk', 'food', '2017-06-12', JUNE.id, 5000),
        charge('club', 'food', '2017-06-20', JUNE.id, 7000),
        // Paid in part
        charge('paper', 'food', '2017-06-25', JUNE.id, 4000, {
          status: 'paid',
          paymentId: 'p-early',
          openAmount: 1000,
        }),
        charge('skipped', 'food', '2017-06-27', JUNE.id, 9000, {
          status: 'skipped',
        }),
      ],
      occurrences: [
        scheduled('milk:2017-06-12', '2017-06-12', 5000),
        scheduled('club:2017-06-20', '2017-06-20', 7000),
        scheduled('paper:2017-06-25', '2017-06-25', 1000),
      ],
    });

    expect(graph.spent).toBe(15000);
    expect(graph.expected).toBe(28000);
    expect(graph.expected).toBe(
      periodView.spent + periodView.outstandingCharges,
    );
    expect(
      graph.charges.map(entry => [
        entry.charge.id,
        entry.x,
        entry.amount,
        entry.level,
      ]),
    ).toEqual([
      ['milk:2017-06-12', middle(16), 5000, 20000],
      ['club:2017-06-20', middle(21), 7000, 27000],
      ['paper:2017-06-25', middle(26), 1000, 28000],
    ]);
    expect(graph.runs.filter(run => run.kind === 'expected')).toMatchObject([
      {
        kind: 'expected',
        zone: 'inside',
        from: middle(16),
        to: middle(21),
        level: 20000,
      },
      {
        kind: 'expected',
        zone: 'inside',
        from: middle(21),
        to: middle(26),
        level: 27000,
      },
      {
        kind: 'expected',
        zone: 'inside',
        from: middle(26),
        to: 1,
        level: 28000,
      },
    ]);
    expect(graph.rises.filter(rise => rise.kind === 'expected')).toMatchObject([
      { kind: 'expected', x: middle(16), from: 15000, to: 20000 },
      { kind: 'expected', x: middle(21), from: 20000, to: 27000 },
      { kind: 'expected', x: middle(26), from: 27000, to: 28000 },
    ]);
    // The spent line ends where the expected one begins
    expect(graph.runs.filter(run => run.kind === 'spent').at(-1)).toMatchObject(
      {
        kind: 'spent',
        zone: 'inside',
        from: middle(6),
        to: middle(16),
        level: 15000,
      },
    );
  });

  it('has no spent line for a period that is shown before its first day', () => {
    const { graph } = graphOf({
      asOf: '2017-06-15',
      shown: JULY,
      charges: [charge('club', 'food', '2017-07-20', JULY.id, 7000)],
    });

    expect(graph).toMatchObject({
      start: '2017-07-01',
      lastDay: '2017-07-31',
      asOfPlace: 'before',
      asOfX: null,
      allowance: 0,
      spent: 0,
      expected: 7000,
      low: 0,
      high: 7000,
    });
    expect(graph.runs).toMatchObject([
      { kind: 'expected', zone: 'inside', from: 0, to: 19.5 / 31, level: 0 },
      {
        kind: 'expected',
        zone: 'inside',
        from: 19.5 / 31,
        to: 1,
        level: 7000,
      },
    ]);
    expect(graph.rises).toMatchObject([
      { kind: 'expected', x: 19.5 / 31, from: 0, to: 7000 },
    ]);
  });

  it('has the as-of day on the first and on the last day shown', () => {
    expect(graphOf({ asOf: '2017-06-01' }).graph).toMatchObject({
      asOfPlace: 'shown',
      asOfX: 0.5 / 30,
    });
    const { graph: onLastDay } = graphOf({ asOf: '2017-06-30' });
    expect(onLastDay.asOfPlace).toBe('shown');
    expect(onLastDay.asOfX).toBeCloseTo(29.5 / 30, 10);
    expect(graphOf({ asOf: '2017-05-31' }).graph).toMatchObject({
      asOfPlace: 'before',
      asOfX: null,
    });
    expect(graphOf({ asOf: '2017-07-01' }).graph).toMatchObject({
      asOfPlace: 'after',
      asOfX: null,
    });
  });

  it('expects an overdue charge at the end when the as-of day is after the days shown', () => {
    const { graph } = graphOf({
      asOf: '2017-07-10',
      charges: [charge('milk', 'food', '2017-06-12', JUNE.id, 5000)],
    });

    expect(graph.asOfPlace).toBe('after');
    expect(graph.charges).toMatchObject([{ x: 1, amount: 5000, level: 5000 }]);
    expect(graph.runs).toMatchObject([
      { kind: 'spent', zone: 'inside', from: 0, to: 1, level: 0 },
    ]);
    expect(graph.rises).toMatchObject([
      { kind: 'expected', x: 1, from: 0, to: 5000 },
    ]);
  });

  it('has room for what is refunded and for what is spent over the allowance', () => {
    const refunded = graphOf({
      asOf: '2017-06-15',
      postings: [posting('refund', '2017-06-03', 2000)],
    }).graph;

    expect(refunded).toMatchObject({ spent: -2000, low: -2000, high: 50000 });
    expect(graphHeight(refunded, 50000)).toBe(0);
    expect(graphHeight(refunded, -2000)).toBe(1);
    expect(graphHeight(refunded, 24000)).toBe(0.5);

    const over = graphOf({
      asOf: '2017-06-15',
      postings: [posting('feast', '2017-06-03', -80000)],
    }).graph;

    expect(over).toMatchObject({ low: 0, high: 80000 });
    expect(graphHeight(over, 50000)).toBe(0.375);
  });

  it('has a height when there is no amount at all', () => {
    const { graph } = graphOf({ asOf: '2017-07-15', shown: JULY });

    expect(graph).toMatchObject({ low: 0, high: 1 });
    expect(graphHeight(graph, 0)).toBe(1);
  });
});

describe('isShownCharge', () => {
  it('is a charge of which something is still expected', () => {
    const { periodView } = graphOf({
      asOf: '2017-06-15',
      charges: [
        charge('a', 'food', '2017-06-20', JUNE.id, 7000),
        charge('b', 'food', '2017-06-21', JUNE.id, 7000, {
          status: 'paid',
          openAmount: 1,
        }),
        charge('c', 'food', '2017-06-22', JUNE.id, 7000, { status: 'paid' }),
        charge('d', 'food', '2017-06-23', JUNE.id, 7000, {
          status: 'skipped',
          openAmount: 7000,
        }),
        charge('e', 'food', '2017-06-24', JUNE.id, 0),
      ],
    });

    expect(periodView.charges.map(isShownCharge)).toEqual([
      true,
      true,
      false,
      false,
      true,
    ]);
  });
});
