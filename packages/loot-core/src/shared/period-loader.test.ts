import type {
  PeriodBudgetRow,
  PeriodChargeOverrideRow,
  PeriodOffsetRow,
} from '#types/models';

import { projectPeriodCharges, summarizePeriodBudgets } from './period-budget';
import type { BudgetPeriod, ExpensePosting } from './period-budget';
import {
  listOverridesWithoutCharge,
  loadPeriodBudgetInput,
} from './period-loader';
import type { LoaderOccurrence, SetAsideRow } from './period-loader';

function period(
  id: string,
  start: string | null,
  end: string | null,
  extra: Partial<PeriodBudgetRow> = {},
): PeriodBudgetRow {
  return {
    id,
    category: 'cat1',
    start_date: start,
    end_date: end,
    budget: 1000,
    carryover: 0,
    carried_from: null,
    tombstone: false,
    ...extra,
  };
}

function kept(
  id: string,
  start: string,
  end: string,
  extra: Partial<BudgetPeriod> = {},
): BudgetPeriod {
  return {
    id,
    category: 'cat1',
    start,
    end,
    budget: 1000,
    carryover: 0,
    ...extra,
  };
}

function offset(
  id: string,
  period_id: string | null,
  tombstone = false,
): PeriodOffsetRow {
  return { id, period_id, tombstone };
}

function posting(
  id: string,
  date: string,
  amount = -100,
  category = 'cat1',
): ExpensePosting {
  return { id, category, date, amount };
}

function charge(
  id: string,
  periodId: string,
  date: string,
  extra: Partial<LoaderOccurrence> = {},
): LoaderOccurrence {
  return { id, periodId, date, amount: 500, state: 'scheduled', ...extra };
}

function override(id: string, tombstone = false): PeriodChargeOverrideRow {
  return {
    id,
    amount: null,
    skipped: true,
    transaction_id: null,
    open_amount: null,
    tombstone,
  };
}

function load(
  input: Partial<Parameters<typeof loadPeriodBudgetInput>[0]> = {},
) {
  return loadPeriodBudgetInput({
    periods: [],
    offsets: [],
    occurrences: [],
    postings: [],
    categoryIds: new Set(['cat1', 'cat2']),
    asOf: '2027-06-15',
    ...input,
  });
}

function aside(
  table: SetAsideRow['table'],
  id: string,
  reason: SetAsideRow['reason'],
  detail: string,
): SetAsideRow {
  return { table, id, reason, detail };
}

const A = period('A', '2027-01-01', '2027-02-01');
const B = period('B', '2027-01-15', '2027-02-15');
const KEPT_A = kept('A', '2027-01-01', '2027-02-01');

describe('loadPeriodBudgetInput: periods', () => {
  it('returns empty lists for no rows', () => {
    expect(load()).toEqual({
      periods: [],
      offsets: [],
      occurrences: [],
      paidOutsideBudget: [],
      setAside: [],
    });
  });

  it('turns a valid row into a budget period', () => {
    const result = load({
      periods: [
        period('A', '2027-01-01', '2027-02-01', {
          budget: 60000,
          carryover: -80,
          carried_from: 'Z',
        }),
      ],
    });
    expect(result.periods).toEqual([
      {
        id: 'A',
        category: 'cat1',
        start: '2027-01-01',
        end: '2027-02-01',
        budget: 60000,
        carryover: -80,
      },
    ]);
    expect(result.setAside).toEqual([]);
  });

  it('skips a deleted period', () => {
    const result = load({
      periods: [period('A', '2027-01-01', '2027-02-01', { tombstone: true })],
    });
    expect(result.periods).toEqual([]);
    expect(result.setAside).toEqual([]);
  });

  it('sets aside a second row with the same id', () => {
    const result = load({
      periods: [A, period('A', '2027-03-01', '2027-04-01')],
    });
    expect(result.periods).toEqual([KEPT_A]);
    expect(result.setAside).toEqual([
      aside(
        'period_budgets',
        'A',
        'duplicate-id',
        'another row has the same id',
      ),
    ]);
  });

  it('sets aside a period without a category', () => {
    const first = load({
      periods: [period('A', '2027-01-01', '2027-02-01', { category: null })],
    });
    expect(first.periods).toEqual([]);
    expect(first.setAside).toEqual([
      aside('period_budgets', 'A', 'invalid-period', 'category is missing'),
    ]);
    const second = load({
      periods: [period('A', '2027-01-01', '2027-02-01', { category: '' })],
    });
    expect(second.periods).toEqual([]);
    expect(second.setAside).toEqual([
      aside('period_budgets', 'A', 'invalid-period', 'category is missing'),
    ]);
  });

  it('hides the periods of a category that does not exist', () => {
    const result = load({
      periods: [period('A', '2027-01-01', '2027-02-01', { category: 'gone' })],
    });
    expect(result.periods).toEqual([]);
    expect(result.setAside).toEqual([]);
  });

  it('sets aside a period with an invalid start date', () => {
    const first = load({ periods: [period('A', null, '2027-02-01')] });
    expect(first.periods).toEqual([]);
    expect(first.setAside).toEqual([
      aside(
        'period_budgets',
        'A',
        'invalid-period',
        'start date is not a valid date',
      ),
    ]);
    const second = load({ periods: [period('A', '2027-02-30', '2027-03-01')] });
    expect(second.periods).toEqual([]);
    expect(second.setAside).toEqual([
      aside(
        'period_budgets',
        'A',
        'invalid-period',
        'start date is not a valid date',
      ),
    ]);
  });

  it('sets aside a period with an invalid end date', () => {
    const result = load({ periods: [period('A', '2027-01-01', null)] });
    expect(result.setAside).toEqual([
      aside(
        'period_budgets',
        'A',
        'invalid-period',
        'end date is not a valid date',
      ),
    ]);
    expect(result.periods).toEqual([]);
  });

  it('sets aside a period that does not end after its start', () => {
    const result = load({ periods: [period('A', '2027-02-01', '2027-02-01')] });
    expect(result.setAside).toEqual([
      aside(
        'period_budgets',
        'A',
        'invalid-period',
        'end date is not after start date',
      ),
    ]);
    expect(result.periods).toEqual([]);
  });

  it('sets aside a period with an invalid budget', () => {
    const budgets: Array<number | null> = [null, -5, 1.5];
    for (const budget of budgets) {
      const result = load({
        periods: [period('A', '2027-01-01', '2027-02-01', { budget })],
      });
      expect(result.setAside).toEqual([
        aside(
          'period_budgets',
          'A',
          'invalid-period',
          'budget is not a whole number that is not negative',
        ),
      ]);
      expect(result.periods).toEqual([]);
    }
  });

  it('sets aside a period with an invalid carryover', () => {
    const carryovers: Array<number | null> = [null, 0.5];
    for (const carryover of carryovers) {
      const result = load({
        periods: [period('A', '2027-01-01', '2027-02-01', { carryover })],
      });
      expect(result.setAside).toEqual([
        aside(
          'period_budgets',
          'A',
          'invalid-period',
          'carryover is not a whole number',
        ),
      ]);
      expect(result.periods).toEqual([]);
    }
  });

  it('keeps the earlier of two overlapping periods', () => {
    const result = load({ periods: [A, B] });
    expect(result.periods).toEqual([KEPT_A]);
    expect(result.setAside).toEqual([
      aside('period_budgets', 'B', 'overlap', 'overlaps period A'),
    ]);
  });

  it('keeps the same period whatever the input order', () => {
    const result = load({ periods: [B, A] });
    expect(result.periods).toEqual([KEPT_A]);
    expect(result.setAside).toEqual([
      aside('period_budgets', 'B', 'overlap', 'overlaps period A'),
    ]);
  });

  it('keeps the smaller id when two periods start on the same day', () => {
    const result = load({
      periods: [
        period('b', '2027-01-01', '2027-02-01'),
        period('a', '2027-01-01', '2027-03-01'),
      ],
    });
    expect(result.periods).toEqual([kept('a', '2027-01-01', '2027-03-01')]);
    expect(result.setAside).toEqual([
      aside('period_budgets', 'b', 'overlap', 'overlaps period a'),
    ]);
  });

  it('does not count a set-aside period as an overlap', () => {
    const result = load({
      periods: [
        period('A', '2027-01-01', '2027-01-10'),
        period('B', '2027-01-05', '2027-01-15'),
        period('C', '2027-01-12', '2027-01-20'),
      ],
    });
    expect(result.periods.map(p => p.id)).toEqual(['A', 'C']);
    expect(result.setAside).toEqual([
      aside('period_budgets', 'B', 'overlap', 'overlaps period A'),
    ]);
  });

  it('keeps overlapping periods of different categories', () => {
    const result = load({
      periods: [
        A,
        period('B', '2027-01-15', '2027-02-15', { category: 'cat2' }),
      ],
    });
    expect(result.periods.map(p => p.id)).toEqual(['A', 'B']);
    expect(result.setAside).toEqual([]);
  });

  it('keeps periods in input order', () => {
    const result = load({
      periods: [
        period('M', '2027-03-01', '2027-04-01'),
        period('J', '2027-01-01', '2027-02-01'),
        period('F', '2027-02-01', '2027-03-01'),
      ],
    });
    expect(result.periods.map(p => p.id)).toEqual(['M', 'J', 'F']);
    expect(result.setAside).toEqual([]);
  });

  it('leaves spending in a set-aside period unassigned', () => {
    const postings = [posting('p1', '2027-02-10')];
    const result = load({ periods: [A, B], postings });
    expect(
      summarizePeriodBudgets({
        periods: result.periods,
        postings,
        offsets: result.offsets,
        asOf: '2027-02-12',
      }).unassignedPostingIds,
    ).toEqual(['p1']);
  });
});

describe('loadPeriodBudgetInput: offsets', () => {
  it('keeps a valid offset', () => {
    const result = load({
      periods: [A],
      offsets: [offset('t1', 'A')],
      postings: [posting('t1', '2027-02-10')],
    });
    expect(result.offsets).toEqual([{ transactionId: 't1', periodId: 'A' }]);
    expect(result.setAside).toEqual([]);
  });

  it('skips a deleted offset', () => {
    const result = load({ periods: [A], offsets: [offset('t1', 'A', true)] });
    expect(result.offsets).toEqual([]);
    expect(result.setAside).toEqual([]);
  });

  it('sets aside an offset without a period id', () => {
    const result = load({ periods: [A], offsets: [offset('t1', null)] });
    expect(result.offsets).toEqual([]);
    expect(result.setAside).toEqual([
      aside(
        'period_offsets',
        't1',
        'offset-period-missing',
        'period "" is deleted, set aside or missing',
      ),
    ]);
  });

  it('sets aside an offset to a deleted period', () => {
    const result = load({
      periods: [period('A', '2027-01-01', '2027-02-01', { tombstone: true })],
      offsets: [offset('t1', 'A')],
    });
    expect(result.offsets).toEqual([]);
    expect(result.setAside).toEqual([
      aside(
        'period_offsets',
        't1',
        'offset-period-missing',
        'period "A" is deleted, set aside or missing',
      ),
    ]);
  });

  it('sets aside an offset to a set-aside period and counts the payment by its date', () => {
    const postings = [posting('t1', '2027-01-20')];
    const result = load({
      periods: [A, B],
      offsets: [offset('t1', 'B')],
      postings,
    });
    expect(result.offsets).toEqual([]);
    expect(result.setAside).toEqual([
      aside('period_budgets', 'B', 'overlap', 'overlaps period A'),
      aside(
        'period_offsets',
        't1',
        'offset-period-missing',
        'period "B" is deleted, set aside or missing',
      ),
    ]);
    const summary = summarizePeriodBudgets({
      periods: result.periods,
      postings,
      offsets: result.offsets,
      asOf: '2027-01-25',
    });
    expect(summary.unassignedPostingIds).toEqual([]);
    expect(summary.periods[0].netSpending).toEqual(100);
  });

  it('sets aside an offset to a period of another category', () => {
    const result = load({
      periods: [A],
      offsets: [offset('t1', 'A')],
      postings: [posting('t1', '2027-02-10', -100, 'cat2')],
    });
    expect(result.offsets).toEqual([]);
    expect(result.setAside).toEqual([
      aside(
        'period_offsets',
        't1',
        'offset-category-mismatch',
        'transaction category "cat2" is not the period category "cat1"',
      ),
    ]);
  });

  it('keeps an offset whose transaction is not a posting', () => {
    const result = load({ periods: [A], offsets: [offset('t9', 'A')] });
    expect(result.offsets).toEqual([{ transactionId: 't9', periodId: 'A' }]);
    expect(result.setAside).toEqual([]);
  });

  it('sets aside a second offset with the same id', () => {
    const result = load({
      periods: [A],
      offsets: [offset('t1', 'A'), offset('t1', 'A')],
    });
    expect(result.offsets).toEqual([{ transactionId: 't1', periodId: 'A' }]);
    expect(result.setAside).toEqual([
      aside(
        'period_offsets',
        't1',
        'duplicate-id',
        'another row has the same id',
      ),
    ]);
  });
});

describe('loadPeriodBudgetInput: charges', () => {
  it('keeps a scheduled charge', () => {
    const result = load({
      periods: [A],
      occurrences: [charge('c1', 'A', '2027-01-05')],
    });
    expect(result.occurrences).toEqual([
      {
        id: 'c1',
        periodId: 'A',
        date: '2027-01-05',
        amount: 500,
        state: 'scheduled',
      },
    ]);
    expect(result.setAside).toEqual([]);
    expect(result.paidOutsideBudget).toEqual([]);
  });

  it('sets aside a second charge with the same id', () => {
    const result = load({
      periods: [A],
      occurrences: [
        charge('c1', 'A', '2027-01-05'),
        charge('c1', 'A', '2027-01-06'),
      ],
    });
    expect(result.occurrences.map(o => o.date)).toEqual(['2027-01-05']);
    expect(result.setAside).toEqual([
      aside('charges', 'c1', 'invalid-charge', 'duplicate charge id'),
    ]);
  });

  it('sets aside a charge whose period is missing', () => {
    const result = load({
      periods: [A],
      occurrences: [charge('c1', 'x', '2027-01-05')],
    });
    expect(result.occurrences).toEqual([]);
    expect(result.setAside).toEqual([
      aside(
        'charges',
        'c1',
        'charge-period-missing',
        'period "x" is deleted, set aside or missing',
      ),
    ]);
  });

  it('sets aside a charge whose period was set aside', () => {
    const result = load({
      periods: [A, B],
      occurrences: [charge('c1', 'B', '2027-02-05')],
    });
    expect(result.occurrences).toEqual([]);
    expect(result.setAside).toEqual([
      aside('period_budgets', 'B', 'overlap', 'overlaps period A'),
      aside(
        'charges',
        'c1',
        'charge-period-missing',
        'period "B" is deleted, set aside or missing',
      ),
    ]);
  });

  it('sets aside a charge with an invalid date', () => {
    const result = load({
      periods: [A],
      occurrences: [charge('c1', 'A', '2027-01-32')],
    });
    expect(result.occurrences).toEqual([]);
    expect(result.setAside).toEqual([
      aside('charges', 'c1', 'invalid-charge', 'date is not a valid date'),
    ]);
  });

  it('sets aside a charge with an invalid amount', () => {
    for (const amount of [-1, 1.5]) {
      const result = load({
        periods: [A],
        occurrences: [charge('c1', 'A', '2027-01-05', { amount })],
      });
      expect(result.occurrences).toEqual([]);
      expect(result.setAside).toEqual([
        aside(
          'charges',
          'c1',
          'invalid-charge',
          'amount is not a whole number that is not negative',
        ),
      ]);
    }
  });

  it('sets aside a posted charge without a transaction', () => {
    for (const extra of [
      { state: 'posted' },
      { state: 'posted', transactionId: '' },
    ] as const) {
      const result = load({
        periods: [A],
        occurrences: [charge('c1', 'A', '2027-01-05', extra)],
      });
      expect(result.occurrences).toEqual([]);
      expect(result.setAside).toEqual([
        aside(
          'charges',
          'c1',
          'invalid-charge',
          'posted without a transaction',
        ),
      ]);
    }
  });

  it('keeps a posted charge whose transaction is a posting', () => {
    const result = load({
      periods: [A],
      postings: [posting('t1', '2027-01-06')],
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't1',
          transactionDate: '2027-01-06',
        }),
      ],
    });
    expect(result.occurrences).toEqual([
      {
        id: 'c1',
        periodId: 'A',
        date: '2027-01-05',
        amount: 500,
        state: 'posted',
        transactionId: 't1',
      },
    ]);
    expect(result.paidOutsideBudget).toEqual([]);
    expect(Object.keys(result.occurrences[0]).sort()).toEqual([
      'amount',
      'date',
      'id',
      'periodId',
      'state',
      'transactionId',
    ]);
  });

  it('counts a charge as paid when its payment is in another category', () => {
    const postings = [posting('t1', '2027-01-06', -100, 'cat2')];
    const result = load({
      periods: [A],
      postings,
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't1',
          transactionDate: '2027-01-06',
        }),
      ],
    });
    expect(result.setAside).toEqual([]);
    expect(result.occurrences.map(o => `${o.id}:${o.state}`)).toEqual([
      'c1:posted',
    ]);
    const projection = projectPeriodCharges({
      periods: result.periods,
      postings,
      offsets: result.offsets,
      occurrences: result.occurrences,
      asOf: '2027-06-15',
    });
    expect(projection.periods.map(p => p.outstandingOccurrenceIds)).toEqual([
      [],
    ]);
    expect(projection.summary.periods.map(p => p.netSpending)).toEqual([0]);
    expect(projection.summary.unassignedPostingIds).toEqual(['t1']);
  });

  it('lets one payment settle only the charge with the earlier due date', () => {
    const result = load({
      periods: [A],
      postings: [posting('t1', '2027-01-06')],
      occurrences: [
        charge('c2', 'A', '2027-01-20', {
          state: 'posted',
          transactionId: 't1',
        }),
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't1',
        }),
      ],
    });
    expect(result.occurrences).toEqual([
      {
        id: 'c2',
        periodId: 'A',
        date: '2027-01-20',
        amount: 500,
        state: 'scheduled',
      },
      {
        id: 'c1',
        periodId: 'A',
        date: '2027-01-05',
        amount: 500,
        state: 'posted',
        transactionId: 't1',
      },
    ]);
    expect(result.setAside).toEqual([]);
    expect(Object.keys(result.occurrences[0]).sort()).toEqual([
      'amount',
      'date',
      'id',
      'periodId',
      'state',
    ]);
  });

  it('uses the smaller id when two charges of one payment are due on the same day', () => {
    const result = load({
      periods: [A],
      postings: [posting('t1', '2027-01-06')],
      occurrences: [
        charge('cb', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't1',
        }),
        charge('ca', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't1',
        }),
      ],
    });
    expect(result.occurrences.map(o => `${o.id}:${o.state}`)).toEqual([
      'cb:scheduled',
      'ca:posted',
    ]);
  });

  it('counts a charge as paid when its transaction is not a posting', () => {
    const result = load({
      periods: [A],
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't9',
        }),
      ],
    });
    expect(result.occurrences).toEqual([]);
    expect(result.paidOutsideBudget).toEqual(['c1']);
    expect(result.setAside).toEqual([]);
  });

  it('keeps such a charge expected while its payment is after the as-of date', () => {
    const result = load({
      periods: [A],
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't9',
          transactionDate: '2027-06-20',
        }),
      ],
    });
    expect(result.occurrences).toEqual([
      {
        id: 'c1',
        periodId: 'A',
        date: '2027-01-05',
        amount: 500,
        state: 'scheduled',
      },
    ]);
    expect(result.paidOutsideBudget).toEqual([]);
  });

  it('counts such a charge as paid when its payment is on the as-of date', () => {
    const result = load({
      periods: [A],
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't9',
          transactionDate: '2027-06-15',
        }),
      ],
    });
    expect(result.occurrences).toEqual([]);
    expect(result.paidOutsideBudget).toEqual(['c1']);
  });

  it('handles a shared payment that is not a posting', () => {
    const result = load({
      periods: [A],
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't9',
        }),
        charge('c2', 'A', '2027-01-20', {
          state: 'posted',
          transactionId: 't9',
        }),
      ],
    });
    expect(result.occurrences).toEqual([
      {
        id: 'c2',
        periodId: 'A',
        date: '2027-01-20',
        amount: 500,
        state: 'scheduled',
      },
    ]);
    expect(result.paidOutsideBudget).toEqual(['c1']);
  });

  it('returns input the calculation accepts for a messy set of rows', () => {
    const postings = [
      posting('t1', '2027-01-06'),
      posting('t2', '2027-01-20', -100, 'cat2'),
      posting('t3', '2027-02-10'),
    ];
    const result = load({
      periods: [
        A,
        B,
        period('C', '2027-03-01', '2027-02-01'),
        period('D', '2027-02-01', '2027-03-01', { budget: null }),
        period('A', '2027-05-01', '2027-06-01'),
        period('E', '2027-02-01', '2027-03-01'),
      ],
      offsets: [
        offset('t1', 'E'),
        offset('t2', 'A'),
        offset('t3', 'B'),
        offset('t4', null),
      ],
      occurrences: [
        charge('c1', 'A', '2027-01-05', {
          state: 'posted',
          transactionId: 't1',
        }),
        charge('c2', 'A', '2027-01-20', {
          state: 'posted',
          transactionId: 't1',
        }),
        charge('c3', 'B', '2027-02-05'),
        charge('c4', 'E', '2027-02-05', {
          state: 'posted',
          transactionId: 't9',
        }),
        charge('c5', 'E', 'bad'),
        charge('c1', 'E', '2027-02-06'),
        charge('c6', 'E', '2027-02-07', { state: 'posted' }),
      ],
      postings,
      asOf: '2027-02-12',
    });
    expect(result.periods.map(p => p.id)).toEqual(['A', 'E']);
    expect(result.offsets).toEqual([{ transactionId: 't1', periodId: 'E' }]);
    expect(result.occurrences.map(o => `${o.id}:${o.state}`)).toEqual([
      'c1:posted',
      'c2:scheduled',
    ]);
    expect(result.paidOutsideBudget).toEqual(['c4']);
    expect(result.setAside.map(s => `${s.table}/${s.id}/${s.reason}`)).toEqual([
      'period_budgets/C/invalid-period',
      'period_budgets/D/invalid-period',
      'period_budgets/A/duplicate-id',
      'period_budgets/B/overlap',
      'period_offsets/t2/offset-category-mismatch',
      'period_offsets/t3/offset-period-missing',
      'period_offsets/t4/offset-period-missing',
      'charges/c3/charge-period-missing',
      'charges/c5/invalid-charge',
      'charges/c1/invalid-charge',
      'charges/c6/invalid-charge',
    ]);
    const projection = projectPeriodCharges({
      periods: result.periods,
      postings,
      offsets: result.offsets,
      occurrences: result.occurrences,
      asOf: '2027-02-12',
    });
    expect(projection.periods.map(p => p.outstandingOccurrenceIds)).toEqual([
      ['c2'],
      [],
    ]);
    expect(projection.summary.unassignedPostingIds).toEqual(['t2']);
  });

  it('does not change its input', () => {
    const periods = [A, B];
    const offsets = [offset('t1', 'B')];
    const occurrences = [
      charge('c1', 'A', '2027-01-05', { state: 'posted', transactionId: 't9' }),
    ];
    const before = JSON.stringify({ periods, offsets, occurrences });
    load({ periods, offsets, occurrences });
    expect(JSON.stringify({ periods, offsets, occurrences })).toEqual(before);
  });
});

describe('listOverridesWithoutCharge', () => {
  function list(ids: string[], occurrenceIds: string[]) {
    return listOverridesWithoutCharge({
      overrides: ids.map(id => override(id)),
      occurrenceIds: new Set(occurrenceIds),
      start: '2027-01-01',
      end: '2027-12-31',
    });
  }

  it('lists nothing when the charge still exists', () => {
    expect(list(['s1:2027-03-01'], ['s1:2027-03-01'])).toEqual([]);
  });

  it('lists an override whose charge is gone', () => {
    expect(list(['s1:2027-03-01'], ['s1:2027-03-05'])).toEqual([
      aside(
        'period_charge_overrides',
        's1:2027-03-01',
        'override-without-charge',
        'no charge is due on 2027-03-01',
      ),
    ]);
  });

  it('ignores overrides outside the range and deleted ones', () => {
    expect(list(['s1:2026-12-31', 's1:2028-01-01'], [])).toEqual([]);
    expect(
      listOverridesWithoutCharge({
        overrides: [override('s1:2027-03-01', true)],
        occurrenceIds: new Set(),
        start: '2027-01-01',
        end: '2027-12-31',
      }),
    ).toEqual([]);
  });

  it('includes the first and the last day of the range', () => {
    expect(list(['s1:2027-01-01', 's1:2027-12-31'], []).map(s => s.id)).toEqual(
      ['s1:2027-01-01', 's1:2027-12-31'],
    );
  });

  it('lists an override whose id has no due date', () => {
    expect(list(['nocolon', 's1:notadate', ':2027-03-01'], [])).toEqual([
      aside(
        'period_charge_overrides',
        'nocolon',
        'invalid-override',
        'id is not "<schedule id>:<due date>"',
      ),
      aside(
        'period_charge_overrides',
        's1:notadate',
        'invalid-override',
        'id is not "<schedule id>:<due date>"',
      ),
      aside(
        'period_charge_overrides',
        ':2027-03-01',
        'invalid-override',
        'id is not "<schedule id>:<due date>"',
      ),
    ]);
  });
});
