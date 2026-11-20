import type { PeriodChargeOverrideRow, PeriodOffsetRow } from '#types/models';

import { projectPeriodCharges } from './period-budget';
import type { BudgetPeriod, ExpensePosting } from './period-budget';
import {
  deriveCharges,
  paymentsBySchedule,
  placeCashMovements,
  planCash,
  settledDueDates,
  unpaidChargeAmount,
} from './period-charges';
import type { ChargeSchedule, ChargeTransaction } from './period-charges';
import { loadPeriodBudgetInput } from './period-loader';

const MONTH_STARTS = [
  '2027-01-01',
  '2027-02-01',
  '2027-03-01',
  '2027-04-01',
  '2027-05-01',
  '2027-06-01',
  '2027-07-01',
];

// Monthly periods of category `cat` from January to June 2027.
const PERIODS: BudgetPeriod[] = MONTH_STARTS.slice(0, 6).map((start, i) => ({
  id: `cat:${start}`,
  category: 'cat',
  start,
  end: MONTH_STARTS[i + 1],
  budget: 30000,
  carryover: 0,
}));

function schedule(extra: Partial<ChargeSchedule> = {}): ChargeSchedule {
  return {
    id: 's1',
    category: 'cat',
    amount: 10000,
    dueDates: MONTH_STARTS,
    expectedFrom: '2027-01-01',
    ...extra,
  };
}

function payment(
  id: string,
  date: string,
  extra: Partial<ChargeTransaction> = {},
): ChargeTransaction {
  return {
    id,
    date,
    schedule: 's1',
    category: 'cat',
    parentId: null,
    ...extra,
  };
}

function override(
  id: string,
  extra: Partial<PeriodChargeOverrideRow> = {},
): PeriodChargeOverrideRow {
  return {
    id,
    amount: null,
    skipped: false,
    transaction_id: null,
    open_amount: null,
    tombstone: false,
    ...extra,
  };
}

type Input = Parameters<typeof deriveCharges>[0];

function derive(extra: Partial<Input> = {}) {
  return deriveCharges({
    schedules: [schedule()],
    overrides: [],
    transactions: [],
    periods: PERIODS,
    offsets: [],
    start: '2027-01-01',
    end: '2027-06-30',
    asOf: '2027-06-30',
    ...extra,
  });
}

function chargeOf(result: ReturnType<typeof deriveCharges>, id: string) {
  const charge = result.charges.find(c => c.id === id);
  if (charge === undefined) {
    throw new Error(`no charge ${id}`);
  }
  return charge;
}

describe('deriveCharges: charges', () => {
  it('gives one charge for every due date in the range', () => {
    const result = derive({ start: '2027-02-01', end: '2027-04-30' });
    expect(result.charges).toEqual([
      {
        id: 's1:2027-02-01',
        scheduleId: 's1',
        category: 'cat',
        dueDate: '2027-02-01',
        periodId: 'cat:2027-02-01',
        amount: 10000,
        status: 'expected',
        paymentId: null,
        paymentDate: null,
        isNamedPayment: false,
        openAmount: 0,
        furtherPaymentIds: [],
      },
      {
        id: 's1:2027-03-01',
        scheduleId: 's1',
        category: 'cat',
        dueDate: '2027-03-01',
        periodId: 'cat:2027-03-01',
        amount: 10000,
        status: 'expected',
        paymentId: null,
        paymentDate: null,
        isNamedPayment: false,
        openAmount: 0,
        furtherPaymentIds: [],
      },
      {
        id: 's1:2027-04-01',
        scheduleId: 's1',
        category: 'cat',
        dueDate: '2027-04-01',
        periodId: 'cat:2027-04-01',
        amount: 10000,
        status: 'expected',
        paymentId: null,
        paymentDate: null,
        isNamedPayment: false,
        openAmount: 0,
        furtherPaymentIds: [],
      },
    ]);
    expect(result.occurrences).toEqual([
      {
        id: 's1:2027-02-01',
        periodId: 'cat:2027-02-01',
        date: '2027-02-01',
        amount: 10000,
        state: 'scheduled',
      },
      {
        id: 's1:2027-03-01',
        periodId: 'cat:2027-03-01',
        date: '2027-03-01',
        amount: 10000,
        state: 'scheduled',
      },
      {
        id: 's1:2027-04-01',
        periodId: 'cat:2027-04-01',
        date: '2027-04-01',
        amount: 10000,
        state: 'scheduled',
      },
    ]);
    expect(result.offsets).toEqual([]);
    expect(result.derivedOffsetIds).toEqual([]);
    expect(result.setAside).toEqual([]);
  });

  it('includes a charge due on the first and on the last day of the range', () => {
    const result = derive({ start: '2027-02-01', end: '2027-03-01' });
    expect(result.charges.map(c => c.id)).toEqual([
      's1:2027-02-01',
      's1:2027-03-01',
    ]);
  });

  it('lists a charge whose date no period contains and gives the loader nothing for it', () => {
    const result = derive({
      periods: [PERIODS[1]],
      start: '2027-02-01',
      end: '2027-03-31',
    });
    expect(result.charges.map(c => [c.id, c.periodId, c.status])).toEqual([
      ['s1:2027-02-01', 'cat:2027-02-01', 'expected'],
      ['s1:2027-03-01', null, 'expected'],
    ]);
    expect(result.occurrences.map(o => o.id)).toEqual(['s1:2027-02-01']);
    expect(result.setAside).toEqual([
      {
        table: 'charges',
        id: 's1:2027-03-01',
        reason: 'charge-period-missing',
        detail: 'no period of category "cat" contains 2027-03-01',
      },
    ]);
  });

  it('does not list a paid charge that no period contains', () => {
    const result = derive({
      periods: [PERIODS[1]],
      start: '2027-02-01',
      end: '2027-03-31',
      transactions: [payment('t1', '2027-03-01')],
    });
    expect(result.charges.map(c => [c.id, c.periodId, c.status])).toEqual([
      ['s1:2027-02-01', 'cat:2027-02-01', 'expected'],
      ['s1:2027-03-01', null, 'paid'],
    ]);
    expect(result.occurrences.map(o => o.id)).toEqual(['s1:2027-02-01']);
    expect(result.setAside).toEqual([]);
  });

  it('takes only a period of the linked category', () => {
    const result = derive({
      periods: [{ ...PERIODS[1], category: 'other' }],
      start: '2027-02-01',
      end: '2027-02-28',
    });
    expect(chargeOf(result, 's1:2027-02-01').periodId).toBe(null);
  });

  it('a period ends before its end date', () => {
    const result = derive({
      periods: [PERIODS[0]],
      start: '2027-01-01',
      end: '2027-02-01',
    });
    expect(result.charges.map(c => c.periodId)).toEqual([
      'cat:2027-01-01',
      null,
    ]);
  });

  it('of two periods that contain the due date, takes the one that starts first, then the smaller id', () => {
    const wide: BudgetPeriod = {
      id: 'cat:wide',
      category: 'cat',
      start: '2027-01-15',
      end: '2027-04-15',
      budget: 0,
      carryover: 0,
    };
    const twin: BudgetPeriod = { ...PERIODS[2], id: 'cat:2027-03-00' };
    const result = derive({ periods: [...PERIODS, twin, wide].reverse() });
    expect(result.charges.map(c => c.periodId)).toEqual([
      'cat:2027-01-01',
      'cat:wide',
      'cat:wide',
      'cat:wide',
      'cat:2027-05-01',
      'cat:2027-06-01',
    ]);
    const narrow = derive({ periods: [PERIODS[2], twin, PERIODS[3]] });
    expect(narrow.charges.map(c => c.periodId)).toEqual([
      null,
      null,
      'cat:2027-03-00',
      'cat:2027-04-01',
      null,
      null,
    ]);
  });

  it('finds no period in a gap between two periods or behind a longer earlier one', () => {
    const year: BudgetPeriod = {
      id: 'cat:year',
      category: 'cat',
      start: '2026-01-01',
      end: '2027-02-15',
      budget: 0,
      carryover: 0,
    };
    const result = derive({ periods: [year, PERIODS[0], PERIODS[3]] });
    expect(result.charges.map(c => c.periodId)).toEqual([
      'cat:year',
      'cat:year',
      null,
      'cat:2027-04-01',
      null,
      null,
    ]);
  });

  it('applies the amount of an override', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { amount: 12500 })],
    });
    expect(chargeOf(result, 's1:2027-03-01').amount).toBe(12500);
    expect(chargeOf(result, 's1:2027-04-01').amount).toBe(10000);
    expect(result.occurrences.find(o => o.id === 's1:2027-03-01')?.amount).toBe(
      12500,
    );
  });

  it('an override amount of 0 applies', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { amount: 0 })],
    });
    expect(chargeOf(result, 's1:2027-03-01').amount).toBe(0);
  });

  it('ignores a deleted override', () => {
    const result = derive({
      overrides: [
        override('s1:2027-03-01', {
          amount: 12500,
          skipped: true,
          tombstone: true,
        }),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01').amount).toBe(10000);
    expect(chargeOf(result, 's1:2027-03-01').status).toBe('expected');
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'ignores and reports an override amount of %s',
    amount => {
      const result = derive({
        overrides: [override('s1:2027-03-01', { amount })],
      });
      expect(chargeOf(result, 's1:2027-03-01').amount).toBe(10000);
      expect(result.setAside).toEqual([
        {
          table: 'period_charge_overrides',
          id: 's1:2027-03-01',
          reason: 'invalid-override',
          detail: 'amount is not a whole number that is not negative',
          problem: 'amount',
        },
      ]);
    },
  );

  it('reports nothing for a charge outside the range', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { amount: -1 })],
      start: '2027-04-01',
      end: '2027-06-30',
    });
    expect(result.setAside).toEqual([]);
  });

  it.each([0, -10000, 0.5])(
    'a schedule with an amount of %s gives no charges',
    amount => {
      const result = derive({ schedules: [schedule({ amount })] });
      expect(result.charges).toEqual([]);
      expect(result.occurrences).toEqual([]);
    },
  );

  it('closes an unpaid charge that is due before the day the schedule expects from', () => {
    const result = derive({
      schedules: [schedule({ expectedFrom: '2027-03-01' })],
      start: '2027-01-01',
      end: '2027-04-30',
    });
    expect(result.charges.map(c => c.status)).toEqual([
      'closed',
      'closed',
      'expected',
      'expected',
    ]);
    expect(result.occurrences.map(o => o.id)).toEqual([
      's1:2027-03-01',
      's1:2027-04-01',
    ]);
  });

  it('closes every unpaid charge of a completed schedule and keeps the paid ones', () => {
    const result = derive({
      schedules: [schedule({ expectedFrom: null })],
      transactions: [payment('t1', '2027-02-01')],
      start: '2027-01-01',
      end: '2027-03-31',
    });
    expect(result.charges.map(c => c.status)).toEqual([
      'closed',
      'paid',
      'closed',
    ]);
  });

  it('a closed charge without a period is not listed', () => {
    const result = derive({
      schedules: [schedule({ expectedFrom: null })],
      periods: [],
    });
    expect(result.setAside).toEqual([]);
  });

  it('uses the first of two schedules with one id', () => {
    const result = derive({
      schedules: [schedule(), schedule({ amount: 7 })],
      start: '2027-02-01',
      end: '2027-02-28',
    });
    expect(result.charges.map(c => c.amount)).toEqual([10000]);
  });

  it('leaves out due dates that are not days, and sorts and joins the rest', () => {
    const result = derive({
      schedules: [
        schedule({
          dueDates: [
            '2027-03-01',
            '2027-02-30',
            '2027-02-01',
            'soon',
            '2027-03-01',
          ],
        }),
      ],
    });
    expect(result.charges.map(c => c.id)).toEqual([
      's1:2027-02-01',
      's1:2027-03-01',
    ]);
  });

  it('keeps the charges of two schedules apart, by due date and then id', () => {
    const result = derive({
      schedules: [
        schedule({ id: 's2', dueDates: ['2027-02-01', '2027-02-15'] }),
        schedule({ id: 's1', dueDates: ['2027-02-01'] }),
      ],
      transactions: [payment('t1', '2027-02-01', { schedule: 's2' })],
    });
    expect(result.charges.map(c => [c.id, c.status])).toEqual([
      ['s1:2027-02-01', 'expected'],
      ['s2:2027-02-01', 'paid'],
      ['s2:2027-02-15', 'expected'],
    ]);
  });
});

describe('deriveCharges: matching', () => {
  it('paid early: the payment settles the nearest charge and counts in its period', () => {
    const result = derive({ transactions: [payment('t1', '2027-02-20')] });
    expect(chargeOf(result, 's1:2027-02-01').status).toBe('expected');
    expect(chargeOf(result, 's1:2027-03-01')).toEqual({
      id: 's1:2027-03-01',
      scheduleId: 's1',
      category: 'cat',
      dueDate: '2027-03-01',
      periodId: 'cat:2027-03-01',
      amount: 10000,
      status: 'paid',
      paymentId: 't1',
      paymentDate: '2027-02-20',
      isNamedPayment: false,
      openAmount: 0,
      furtherPaymentIds: [],
    });
    expect(result.occurrences.find(o => o.id === 's1:2027-03-01')).toEqual({
      id: 's1:2027-03-01',
      periodId: 'cat:2027-03-01',
      date: '2027-03-01',
      amount: 10000,
      state: 'posted',
      transactionId: 't1',
      transactionDate: '2027-02-20',
    });
    expect(result.offsets).toEqual([
      { id: 't1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
    expect(result.derivedOffsetIds).toEqual(['t1']);
  });

  it('paid late inside the period: the payment settles the charge and needs no offset', () => {
    const result = derive({ transactions: [payment('t1', '2027-03-10')] });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(result.offsets).toEqual([]);
  });

  it('paid late in the next period: the payment counts in the period of the charge', () => {
    const result = derive({
      schedules: [
        schedule({ dueDates: ['2027-02-25', '2027-03-25', '2027-04-25'] }),
      ],
      transactions: [payment('t1', '2027-04-03')],
    });
    expect(chargeOf(result, 's1:2027-03-25').paymentId).toBe('t1');
    expect(chargeOf(result, 's1:2027-04-25').status).toBe('expected');
    expect(result.offsets).toEqual([
      { id: 't1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('of two charges equally near, the earlier is settled', () => {
    const result = derive({
      schedules: [schedule({ dueDates: ['2027-03-01', '2027-03-31'] })],
      transactions: [payment('t1', '2027-03-16')],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(chargeOf(result, 's1:2027-03-31').paymentId).toBe(null);
  });

  it('one day past the middle belongs to the later charge', () => {
    const result = derive({
      schedules: [schedule({ dueDates: ['2027-03-01', '2027-03-31'] })],
      transactions: [payment('t1', '2027-03-17')],
    });
    expect(chargeOf(result, 's1:2027-03-31').paymentId).toBe('t1');
  });

  it('a different amount: the charge keeps its expected amount and the payment replaces it', () => {
    const result = derive({ transactions: [payment('t1', '2027-03-01')] });
    expect(chargeOf(result, 's1:2027-03-01').amount).toBe(10000);
    const postings: ExpensePosting[] = [
      { id: 't1', category: 'cat', date: '2027-03-01', amount: -12500 },
    ];
    const loaded = loadPeriodBudgetInput({
      periods: [
        {
          id: 'cat:2027-03-01',
          category: 'cat',
          start_date: '2027-03-01',
          end_date: '2027-04-01',
          budget: 30000,
          carryover: 0,
          carried_from: null,
          tombstone: false,
        },
      ],
      offsets: result.offsets,
      occurrences: result.occurrences.filter(
        o => o.periodId === 'cat:2027-03-01',
      ),
      postings,
      categoryIds: new Set(['cat']),
      asOf: '2027-03-31',
    });
    const projection = projectPeriodCharges({ ...loaded, asOf: '2027-03-31' });
    expect(projection.periods[0].remaining).toBe(17500);
    expect(projection.periods[0].outstandingCharges).toBe(0);
    expect(projection.periods[0].expectedRemaining).toBe(17500);
  });

  it('two payments for one charge: the first settles it, the second counts in its period', () => {
    const result = derive({
      transactions: [
        payment('late', '2027-03-03'),
        payment('early', '2027-02-27'),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      status: 'paid',
      paymentId: 'early',
      paymentDate: '2027-02-27',
      furtherPaymentIds: ['late'],
    });
    expect(chargeOf(result, 's1:2027-02-01').status).toBe('expected');
    expect(chargeOf(result, 's1:2027-04-01').status).toBe('expected');
    expect(result.offsets).toEqual([
      { id: 'early', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('two payments on one day: the one whose id sorts first settles the charge', () => {
    const result = derive({
      transactions: [payment('b', '2027-03-01'), payment('a', '2027-03-01')],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      paymentId: 'a',
      furtherPaymentIds: ['b'],
    });
  });

  it('a further payment outside the period counts in the period of the charge', () => {
    const result = derive({
      transactions: [
        payment('first', '2027-03-01'),
        payment('second', '2027-02-26'),
        payment('third', '2027-02-27'),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      paymentId: 'second',
      furtherPaymentIds: ['third', 'first'],
    });
    expect(result.offsets).toEqual([
      { id: 'second', period_id: 'cat:2027-03-01', tombstone: false },
      { id: 'third', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a part payment with "still expected": the rest stays expected as its own charge', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { open_amount: 4000 })],
      transactions: [payment('t1', '2027-03-02')],
      start: '2027-03-01',
      end: '2027-03-31',
      asOf: '2027-03-02',
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      status: 'paid',
      paymentId: 't1',
      openAmount: 4000,
    });
    expect(result.occurrences).toEqual([
      {
        id: 's1:2027-03-01',
        periodId: 'cat:2027-03-01',
        date: '2027-03-01',
        amount: 10000,
        state: 'posted',
        transactionId: 't1',
        transactionDate: '2027-03-02',
      },
      {
        id: 's1:2027-03-01:open',
        periodId: 'cat:2027-03-01',
        date: '2027-03-01',
        amount: 4000,
        state: 'scheduled',
      },
    ]);
  });

  it('"still expected" is not added while the payment is dated after the as-of day', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { open_amount: 4000 })],
      transactions: [payment('t1', '2027-03-02')],
      start: '2027-03-01',
      end: '2027-03-31',
      asOf: '2027-03-01',
    });
    expect(result.occurrences.map(o => o.id)).toEqual(['s1:2027-03-01']);
  });

  it('"still expected" on an unpaid charge adds nothing', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { open_amount: 4000 })],
      start: '2027-03-01',
      end: '2027-03-31',
    });
    expect(result.occurrences).toEqual([
      {
        id: 's1:2027-03-01',
        periodId: 'cat:2027-03-01',
        date: '2027-03-01',
        amount: 10000,
        state: 'scheduled',
      },
    ]);
  });

  it('ignores and reports a "still expected" amount that is not usable', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { open_amount: -4000 })],
      transactions: [payment('t1', '2027-03-02')],
      start: '2027-03-01',
      end: '2027-03-31',
    });
    expect(chargeOf(result, 's1:2027-03-01').openAmount).toBe(0);
    expect(result.occurrences.map(o => o.id)).toEqual(['s1:2027-03-01']);
    expect(result.setAside).toEqual([
      {
        table: 'period_charge_overrides',
        id: 's1:2027-03-01',
        reason: 'invalid-override',
        detail:
          'still expected amount is not a whole number that is not negative',
        problem: 'open-amount',
      },
    ]);
  });

  it('a skipped charge is not expected', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { skipped: true })],
      start: '2027-02-01',
      end: '2027-04-30',
    });
    expect(result.charges.map(c => c.status)).toEqual([
      'expected',
      'skipped',
      'expected',
    ]);
    expect(result.occurrences.map(o => o.id)).toEqual([
      's1:2027-02-01',
      's1:2027-04-01',
    ]);
  });

  it('a payment nearest to a skipped charge counts in its period and settles nothing', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { skipped: true })],
      transactions: [payment('t1', '2027-02-27')],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      status: 'skipped',
      paymentId: null,
      furtherPaymentIds: ['t1'],
    });
    expect(chargeOf(result, 's1:2027-02-01').status).toBe('expected');
    expect(result.offsets).toEqual([
      { id: 't1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a skipped charge ignores the payment it names', () => {
    const result = derive({
      overrides: [
        override('s1:2027-03-01', { skipped: true, transaction_id: 't1' }),
      ],
      transactions: [payment('t1', '2027-04-02')],
    });
    expect(chargeOf(result, 's1:2027-03-01').status).toBe('skipped');
    expect(chargeOf(result, 's1:2027-04-01').paymentId).toBe('t1');
  });

  it('a named match that differs from the calculated one wins', () => {
    const result = derive({
      overrides: [override('s1:2027-04-01', { transaction_id: 't1' })],
      transactions: [payment('t1', '2027-03-02')],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      status: 'expected',
      paymentId: null,
      furtherPaymentIds: [],
    });
    expect(chargeOf(result, 's1:2027-04-01')).toMatchObject({
      status: 'paid',
      paymentId: 't1',
      paymentDate: '2027-03-02',
      isNamedPayment: true,
    });
    expect(result.offsets).toEqual([
      { id: 't1', period_id: 'cat:2027-04-01', tombstone: false },
    ]);
  });

  it('a named payment needs no schedule id, and the calculated payment of that charge becomes a further one', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { transaction_id: 'cash' })],
      transactions: [
        payment('cash', '2027-03-05', { schedule: null }),
        payment('t1', '2027-03-01'),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      paymentId: 'cash',
      isNamedPayment: true,
      furtherPaymentIds: ['t1'],
    });
  });

  it('a named payment that does not exist is reported and the calculated match applies', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { transaction_id: 'gone' })],
      transactions: [payment('t1', '2027-03-01')],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      paymentId: 't1',
      isNamedPayment: false,
    });
    expect(result.setAside).toEqual([
      {
        table: 'period_charge_overrides',
        id: 's1:2027-03-01',
        reason: 'invalid-override',
        detail: 'named transaction "gone" is missing',
        problem: 'payment-missing',
      },
    ]);
  });

  it('two charges name one payment: the earlier charge keeps it and the other is reported', () => {
    const result = derive({
      overrides: [
        override('s1:2027-04-01', { transaction_id: 't1' }),
        override('s1:2027-03-01', { transaction_id: 't1' }),
      ],
      transactions: [payment('t1', '2027-05-20', { schedule: null })],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(chargeOf(result, 's1:2027-04-01')).toMatchObject({
      status: 'expected',
      paymentId: null,
    });
    expect(result.setAside).toEqual([
      {
        table: 'period_charge_overrides',
        id: 's1:2027-04-01',
        reason: 'invalid-override',
        detail: 'transaction "t1" already pays charge s1:2027-03-01',
        problem: 'payment-taken',
      },
    ]);
  });

  it('a payment after the as-of day is matched all the same', () => {
    const result = derive({
      transactions: [payment('t1', '2027-03-02')],
      asOf: '2027-02-25',
    });
    const charge = chargeOf(result, 's1:2027-03-01');
    expect(charge).toMatchObject({
      status: 'paid',
      paymentId: 't1',
      paymentDate: '2027-03-02',
    });
    expect(result.occurrences.find(o => o.id === 's1:2027-03-01')).toEqual({
      id: 's1:2027-03-01',
      periodId: 'cat:2027-03-01',
      date: '2027-03-01',
      amount: 10000,
      state: 'posted',
      transactionId: 't1',
      transactionDate: '2027-03-02',
    });
    // The cash forecast plans the payment itself, on its own day.
    expect(unpaidChargeAmount(charge)).toBe(0);
  });

  it('before the first due date: matched up to half the distance to the second', () => {
    // 2027-01-01 to 2027-02-01 is 31 days.
    const near = derive({ transactions: [payment('t1', '2026-12-17')] });
    expect(chargeOf(near, 's1:2027-01-01').paymentId).toBe('t1');
    const far = derive({ transactions: [payment('t1', '2026-12-16')] });
    expect(chargeOf(far, 's1:2027-01-01').paymentId).toBe(null);
    expect(far.offsets).toEqual([]);
  });

  it('before the first due date: exactly half the distance still matches', () => {
    // 2027-03-01 to 2027-03-31 is 30 days.
    const input = {
      schedules: [schedule({ dueDates: ['2027-03-01', '2027-03-31'] })],
    };
    const near = derive({
      ...input,
      transactions: [payment('t1', '2027-02-14')],
    });
    expect(chargeOf(near, 's1:2027-03-01').paymentId).toBe('t1');
    const far = derive({
      ...input,
      transactions: [payment('t1', '2027-02-13')],
    });
    expect(chargeOf(far, 's1:2027-03-01').paymentId).toBe(null);
  });

  it('after the last due date: matched up to half the distance to the one before', () => {
    // 2027-06-01 to 2027-07-01 is 30 days.
    const input = { start: '2027-01-01', end: '2027-12-31' };
    const near = derive({
      ...input,
      transactions: [payment('t1', '2027-07-16')],
    });
    expect(chargeOf(near, 's1:2027-07-01').paymentId).toBe('t1');
    const far = derive({
      ...input,
      transactions: [payment('t1', '2027-07-17')],
    });
    expect(chargeOf(far, 's1:2027-07-01').paymentId).toBe(null);
  });

  it('a schedule with one due date takes every payment that carries its id', () => {
    const result = derive({
      schedules: [schedule({ dueDates: ['2027-03-01'] })],
      transactions: [payment('t1', '2026-01-15')],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
  });

  it('a schedule without due dates gives nothing', () => {
    const result = derive({
      schedules: [schedule({ dueDates: [] })],
      transactions: [payment('t1', '2027-03-01')],
    });
    expect(result.charges).toEqual([]);
    expect(result.offsets).toEqual([]);
  });

  it('a payment of another schedule or without one is not matched', () => {
    const result = derive({
      transactions: [
        payment('t1', '2027-03-01', { schedule: 'other' }),
        payment('t2', '2027-03-01', { schedule: null }),
        payment('t3', '2027-03-01', { schedule: '' }),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01').status).toBe('expected');
  });

  it('a transaction with a date that is not a day is left out', () => {
    const result = derive({
      overrides: [override('s1:2027-04-01', { transaction_id: 't2' })],
      transactions: [
        payment('t1', '2027-02-30'),
        payment('t2', 'soon', { schedule: null }),
      ],
    });
    expect(result.charges.every(c => c.status === 'expected')).toBe(true);
    expect(result.setAside.map(row => row.detail)).toEqual([
      'named transaction "t2" is missing',
    ]);
  });

  it('uses the first of two transactions with one id', () => {
    const result = derive({
      transactions: [payment('t1', '2027-03-01'), payment('t1', '2027-05-01')],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(chargeOf(result, 's1:2027-05-01').paymentId).toBe(null);
  });

  it('a payment for a charge outside the range still counts in its period', () => {
    const result = derive({
      transactions: [payment('t1', '2027-01-30')],
      start: '2027-04-01',
      end: '2027-06-30',
    });
    expect(result.charges.map(c => c.id)).toEqual([
      's1:2027-04-01',
      's1:2027-05-01',
      's1:2027-06-01',
    ]);
    expect(result.offsets).toEqual([
      { id: 't1', period_id: 'cat:2027-02-01', tombstone: false },
    ]);
  });
});

describe('deriveCharges: derived offsets', () => {
  it('a stored offset wins over a derived one', () => {
    const stored: PeriodOffsetRow[] = [
      { id: 't1', period_id: 'cat:2027-05-01', tombstone: false },
    ];
    const result = derive({
      transactions: [payment('t1', '2027-02-20')],
      offsets: stored,
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(result.offsets).toEqual(stored);
    expect(result.derivedOffsetIds).toEqual([]);
  });

  it('a deleted stored offset does not win', () => {
    const stored: PeriodOffsetRow[] = [
      { id: 't1', period_id: 'cat:2027-05-01', tombstone: true },
    ];
    const result = derive({
      transactions: [payment('t1', '2027-02-20')],
      offsets: stored,
    });
    expect(result.offsets).toEqual([
      { id: 't1', period_id: 'cat:2027-05-01', tombstone: true },
      { id: 't1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
    expect(result.derivedOffsetIds).toEqual(['t1']);
  });

  it('keeps the stored offsets of other transactions in front of the derived ones', () => {
    const stored: PeriodOffsetRow[] = [
      { id: 'x', period_id: 'cat:2027-05-01', tombstone: false },
    ];
    const result = derive({
      transactions: [payment('t2', '2027-03-28'), payment('t1', '2027-02-20')],
      offsets: stored,
    });
    expect(result.offsets).toEqual([
      { id: 'x', period_id: 'cat:2027-05-01', tombstone: false },
      { id: 't1', period_id: 'cat:2027-03-01', tombstone: false },
      { id: 't2', period_id: 'cat:2027-04-01', tombstone: false },
    ]);
    expect(result.derivedOffsetIds).toEqual(['t1', 't2']);
  });

  it('a payment in another category settles the charge and gets no offset', () => {
    const result = derive({
      transactions: [payment('t1', '2027-02-20', { category: 'other' })],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(result.offsets).toEqual([]);
  });

  it('a payment without a category settles the charge and gets no offset', () => {
    const result = derive({
      transactions: [payment('t1', '2027-02-20', { category: null })],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('t1');
    expect(result.offsets).toEqual([]);
  });

  it('a payment of a charge without a period gets no offset', () => {
    const result = derive({
      periods: [PERIODS[1]],
      transactions: [payment('t1', '2027-02-20')],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      paymentId: 't1',
      periodId: null,
    });
    expect(result.offsets).toEqual([]);
    expect(result.occurrences.map(o => o.id)).toEqual(['s1:2027-02-01']);
  });

  it('a split payment settles the charge and its parts in the linked category count in the period', () => {
    const result = derive({
      transactions: [
        payment('parent', '2027-02-20', { category: null }),
        payment('part1', '2027-02-20', { parentId: 'parent' }),
        payment('part2', '2027-02-20', {
          parentId: 'parent',
          category: 'other',
        }),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      paymentId: 'parent',
      furtherPaymentIds: [],
    });
    expect(chargeOf(result, 's1:2027-02-01').status).toBe('expected');
    expect(result.offsets).toEqual([
      { id: 'part1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a named part of a split counts in the period of the charge that names it', () => {
    const result = derive({
      overrides: [override('s1:2027-05-01', { transaction_id: 'part1' })],
      transactions: [
        payment('parent', '2027-02-20', { category: null }),
        payment('part1', '2027-02-20', { parentId: 'parent' }),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01').paymentId).toBe('parent');
    expect(chargeOf(result, 's1:2027-05-01').paymentId).toBe('part1');
    expect(result.offsets).toEqual([
      { id: 'part1', period_id: 'cat:2027-05-01', tombstone: false },
    ]);
  });

  it('the parts of a split pay the schedules they carry, beside the schedule of the split', () => {
    const result = derive({
      schedules: [
        schedule(),
        schedule({ id: 's2', dueDates: ['2027-03-15'] }),
        schedule({ id: 's3', dueDates: ['2027-04-15'] }),
      ],
      transactions: [
        payment('parent', '2027-02-20', { category: null }),
        payment('part1', '2027-02-20', { parentId: 'parent', schedule: 's2' }),
        payment('part2', '2027-02-20', { parentId: 'parent', schedule: 's3' }),
        payment('part3', '2027-02-20', { parentId: 'parent', schedule: 's3' }),
        payment('part4', '2027-02-20', { parentId: 'parent' }),
      ],
    });
    expect(
      result.charges
        .filter(c => c.status === 'paid')
        .map(c => [c.id, c.paymentId, c.furtherPaymentIds]),
    ).toEqual([
      ['s1:2027-03-01', 'parent', []],
      ['s2:2027-03-15', 'part1', []],
      ['s3:2027-04-15', 'part2', ['part3']],
    ]);
    // Each part counts once, in the period of the charge it pays itself.
    expect(result.offsets).toEqual([
      { id: 'part1', period_id: 'cat:2027-03-01', tombstone: false },
      { id: 'part2', period_id: 'cat:2027-04-01', tombstone: false },
      { id: 'part3', period_id: 'cat:2027-04-01', tombstone: false },
      { id: 'part4', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a part that carries a schedule pays its charge when the split carries none', () => {
    const result = derive({
      transactions: [
        payment('parent', '2027-02-20', { category: null, schedule: null }),
        payment('part1', '2027-02-20', { parentId: 'parent' }),
        payment('part2', '2027-02-20', { parentId: 'parent', schedule: null }),
      ],
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      status: 'paid',
      paymentId: 'part1',
      furtherPaymentIds: [],
    });
    expect(result.offsets).toEqual([
      { id: 'part1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a part dated inside the period of the charge it pays stays there, whatever its split pays', () => {
    const result = derive({
      schedules: [
        schedule({ dueDates: ['2027-03-15'] }),
        schedule({ id: 's2', dueDates: ['2027-04-15'] }),
      ],
      transactions: [
        payment('parent', '2027-04-15', { category: null }),
        payment('part1', '2027-04-15', { parentId: 'parent' }),
        payment('part2', '2027-04-15', { parentId: 'parent', schedule: 's2' }),
      ],
    });
    expect(result.charges.map(c => [c.id, c.status, c.paymentId])).toEqual([
      ['s1:2027-03-15', 'paid', 'parent'],
      ['s2:2027-04-15', 'paid', 'part2'],
    ]);
    expect(result.offsets).toEqual([
      { id: 'part1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a part that pays a charge without a period does not follow the charge of its split', () => {
    const result = derive({
      schedules: [
        schedule({ dueDates: ['2027-03-15'] }),
        schedule({ id: 's2', dueDates: ['2027-08-15'] }),
      ],
      transactions: [
        payment('parent', '2027-04-15', { category: null }),
        payment('part1', '2027-04-15', { parentId: 'parent', schedule: 's2' }),
      ],
      end: '2027-08-31',
    });
    expect(result.charges.map(c => [c.id, c.paymentId, c.periodId])).toEqual([
      ['s1:2027-03-15', 'parent', 'cat:2027-03-01'],
      ['s2:2027-08-15', 'part1', null],
    ]);
    expect(result.offsets).toEqual([]);
  });

  it('a part that pays a charge of another category does not follow the charge of its split', () => {
    const result = derive({
      schedules: [
        schedule({ dueDates: ['2027-03-15'] }),
        schedule({ id: 's2', category: 'other', dueDates: ['2027-04-15'] }),
      ],
      transactions: [
        payment('parent', '2027-04-15', { category: null }),
        payment('part1', '2027-04-15', { parentId: 'parent', schedule: 's2' }),
      ],
    });
    expect(result.charges.map(c => [c.id, c.paymentId])).toEqual([
      ['s1:2027-03-15', 'parent'],
      ['s2:2027-04-15', 'part1'],
    ]);
    expect(result.offsets).toEqual([]);
  });

  it('a part that carries a schedule with charges, but is too early for all of them, does not follow the charge of its split', () => {
    const result = derive({
      schedules: [
        schedule({ dueDates: ['2027-03-15'] }),
        schedule({ id: 's2', dueDates: ['2027-05-15', '2027-06-15'] }),
      ],
      transactions: [
        payment('parent', '2027-04-15', { category: null }),
        payment('part1', '2027-04-15', { parentId: 'parent', schedule: 's2' }),
      ],
    });
    expect(result.charges.map(c => [c.id, c.status, c.paymentId])).toEqual([
      ['s1:2027-03-15', 'paid', 'parent'],
      ['s2:2027-05-15', 'expected', null],
      ['s2:2027-06-15', 'expected', null],
    ]);
    expect(result.offsets).toEqual([]);
  });

  it('a part named for a charge without a period does not follow the charge of its split', () => {
    const result = derive({
      schedules: [
        schedule({ dueDates: ['2027-03-15'] }),
        schedule({ id: 's2', dueDates: ['2027-08-15'] }),
      ],
      overrides: [override('s2:2027-08-15', { transaction_id: 'part1' })],
      transactions: [
        payment('parent', '2027-04-15', { category: null }),
        payment('part1', '2027-04-15', { parentId: 'parent' }),
      ],
      end: '2027-08-31',
    });
    expect(result.charges.map(c => [c.id, c.paymentId])).toEqual([
      ['s1:2027-03-15', 'parent'],
      ['s2:2027-08-15', 'part1'],
    ]);
    expect(result.offsets).toEqual([]);
  });

  it('a part that carries a schedule without charges follows the charge of its split', () => {
    const result = derive({
      schedules: [schedule({ dueDates: ['2027-03-15'] })],
      transactions: [
        payment('parent', '2027-04-15', { category: null }),
        payment('part1', '2027-04-15', {
          parentId: 'parent',
          schedule: 'not-linked',
        }),
      ],
    });
    expect(result.charges.map(c => [c.id, c.paymentId])).toEqual([
      ['s1:2027-03-15', 'parent'],
    ]);
    expect(result.offsets).toEqual([
      { id: 'part1', period_id: 'cat:2027-03-01', tombstone: false },
    ]);
  });

  it('a 20 December payment of a 1 January bill counts in the new year', () => {
    const years: BudgetPeriod[] = [
      {
        id: 'ins:2027-01-01',
        category: 'ins',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 120000,
        carryover: 0,
      },
      {
        id: 'ins:2028-01-01',
        category: 'ins',
        start: '2028-01-01',
        end: '2029-01-01',
        budget: 120000,
        carryover: 0,
      },
    ];
    const result = deriveCharges({
      schedules: [
        {
          id: 'premium',
          category: 'ins',
          amount: 120000,
          dueDates: ['2027-01-01', '2028-01-01', '2029-01-01'],
          expectedFrom: '2028-01-01',
        },
      ],
      overrides: [],
      transactions: [
        {
          id: 'paid',
          date: '2027-12-20',
          schedule: 'premium',
          category: 'ins',
          parentId: null,
        },
      ],
      periods: years,
      offsets: [],
      start: '2027-01-01',
      end: '2028-12-31',
      asOf: '2027-12-31',
    });
    expect(result.offsets).toEqual([
      { id: 'paid', period_id: 'ins:2028-01-01', tombstone: false },
    ]);
    const postings: ExpensePosting[] = [
      { id: 'paid', category: 'ins', date: '2027-12-20', amount: -120000 },
    ];
    const projection = projectPeriodCharges({
      periods: years,
      postings,
      offsets: result.offsets.map(row => ({
        transactionId: row.id,
        periodId: row.period_id ?? '',
      })),
      occurrences: [],
      asOf: '2027-12-31',
    });
    expect(projection.periods.map(p => p.remaining)).toEqual([120000, 0]);
  });
});

function rows(periods: readonly BudgetPeriod[]) {
  return periods.map(period => ({
    id: period.id,
    category: period.category,
    start_date: period.start,
    end_date: period.end,
    budget: period.budget,
    carryover: period.carryover,
    carried_from: null,
    tombstone: false,
  }));
}

describe('deriveCharges: with the loader and the calculation', () => {
  it('monthly actual spending is the same with and without the derived offsets', () => {
    const transactions = [
      payment('t1', '2027-02-20'),
      payment('t2', '2027-04-03'),
      payment('t3', '2027-04-28'),
    ];
    const postings: ExpensePosting[] = transactions.map(t => ({
      id: t.id,
      category: 'cat',
      date: t.date,
      amount: -10000,
    }));
    const result = derive({ transactions });
    expect(result.derivedOffsetIds).toEqual(['t1', 't3']);
    const base = {
      periods: rows(PERIODS),
      postings,
      categoryIds: new Set(['cat']),
      asOf: '2027-06-30',
    };
    const withOffsets = loadPeriodBudgetInput({
      ...base,
      offsets: result.offsets,
      occurrences: result.occurrences,
    });
    const without = loadPeriodBudgetInput({
      ...base,
      offsets: [],
      occurrences: result.occurrences,
    });
    expect(withOffsets.setAside).toEqual([]);
    const a = projectPeriodCharges({ ...withOffsets, asOf: '2027-06-30' });
    const b = projectPeriodCharges({ ...without, asOf: '2027-06-30' });
    expect(a.summary.monthlyActualSpending).toEqual(
      b.summary.monthlyActualSpending,
    );
    expect(a.summary.periods.map(p => p.remaining)).toEqual([
      30000, 30000, 20000, 20000, 20000, 30000,
    ]);
    expect(b.summary.periods.map(p => p.remaining)).toEqual([
      30000, 20000, 30000, 10000, 30000, 30000,
    ]);
    expect(a.periods.map(p => p.outstandingCharges)).toEqual([
      10000, 10000, 0, 0, 0, 10000,
    ]);
  });

  it('never fails and never changes monthly actual spending, for 500 random inputs', () => {
    let seed = 20261115;
    function random(n: number): number {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return Math.floor((seed / 2147483648) * n);
    }
    function day(): string {
      const month = 1 + random(8);
      const dayOfMonth = 1 + random(28);
      return `2027-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    }
    let derivedCount = 0;
    for (let round = 0; round < 500; round++) {
      const scheduleIds = ['s1', 's2'];
      const schedules: ChargeSchedule[] = scheduleIds.map((id, i) => ({
        id,
        category: i === 0 ? 'cat' : 'cat2',
        amount: 1 + random(20000),
        dueDates: MONTH_STARTS.filter(() => random(4) > 0).map(
          d => `${d.slice(0, 8)}${String(1 + random(28)).padStart(2, '0')}`,
        ),
        expectedFrom: random(5) === 0 ? null : day(),
      }));
      const periods: BudgetPeriod[] = [
        ...PERIODS.filter(() => random(5) > 0),
        ...PERIODS.filter(() => random(5) > 0).map(p => ({
          ...p,
          id: `cat2:${p.start}`,
          category: 'cat2',
        })),
      ];
      const transactions: ChargeTransaction[] = [];
      const count = random(12);
      for (let i = 0; i < count; i++) {
        const isChild = i > 0 && random(6) === 0;
        transactions.push({
          id: `t${i}`,
          date: day(),
          schedule: random(4) === 0 ? null : scheduleIds[random(2)],
          category: ['cat', 'cat2', null][random(3)],
          parentId: isChild ? `t${random(i)}` : null,
        });
      }
      const overrides: PeriodChargeOverrideRow[] = [];
      for (const s of schedules) {
        for (const dueDate of s.dueDates) {
          if (random(4) !== 0) {
            continue;
          }
          overrides.push({
            id: `${s.id}:${dueDate}`,
            amount: random(3) === 0 ? random(30000) : null,
            skipped: random(5) === 0,
            transaction_id: random(2) === 0 ? `t${random(14)}` : null,
            open_amount: random(3) === 0 ? random(5000) : null,
            tombstone: random(8) === 0,
          });
        }
      }
      const stored: PeriodOffsetRow[] = [];
      for (const t of transactions) {
        if (random(6) === 0 && periods.length > 0) {
          stored.push({
            id: t.id,
            period_id: periods[random(periods.length)].id,
            tombstone: random(4) === 0,
          });
        }
      }
      const asOf = day();
      const result = deriveCharges({
        schedules,
        overrides,
        transactions,
        periods,
        offsets: stored,
        start: '2027-01-01',
        end: '2027-12-31',
        asOf,
      });
      derivedCount += result.derivedOffsetIds.length;

      const liveStored = new Set(
        stored.filter(row => !row.tombstone).map(row => row.id),
      );
      expect(result.derivedOffsetIds.filter(id => liveStored.has(id))).toEqual(
        [],
      );
      expect(new Set(result.derivedOffsetIds).size).toBe(
        result.derivedOffsetIds.length,
      );
      const paymentIds = result.charges.flatMap(c =>
        c.paymentId === null
          ? c.furtherPaymentIds
          : [c.paymentId, ...c.furtherPaymentIds],
      );
      expect(new Set(paymentIds).size).toBe(paymentIds.length);

      const parentIds = new Set(
        transactions.map(t => t.parentId).filter(id => id !== null),
      );
      const postings: ExpensePosting[] = transactions
        .filter(t => t.category !== null && !parentIds.has(t.id))
        .map(t => ({
          id: t.id,
          category: t.category ?? '',
          date: t.date,
          amount: -(1 + random(20000)),
        }));
      const base = {
        periods: rows(periods),
        postings,
        categoryIds: new Set(['cat', 'cat2']),
        asOf,
      };
      const withOffsets = loadPeriodBudgetInput({
        ...base,
        offsets: result.offsets,
        occurrences: result.occurrences,
      });
      const without = loadPeriodBudgetInput({
        ...base,
        offsets: stored,
        occurrences: result.occurrences,
      });
      expect(
        withOffsets.setAside.filter(row =>
          result.derivedOffsetIds.includes(row.id),
        ),
      ).toEqual([]);
      const a = projectPeriodCharges({ ...withOffsets, asOf });
      const b = projectPeriodCharges({ ...without, asOf });
      expect(a.summary.monthlyActualSpending).toEqual(
        b.summary.monthlyActualSpending,
      );
      for (const charge of result.charges) {
        if (charge.periodId === null) {
          continue;
        }
        const projected = a.periods.find(p => p.period.id === charge.periodId);
        const isOutstanding =
          projected?.outstandingOccurrenceIds.includes(charge.id) ?? false;
        const expected =
          charge.status === 'expected' ||
          (charge.status === 'paid' &&
            charge.paymentDate !== null &&
            charge.paymentDate > asOf);
        expect(isOutstanding).toBe(expected);
        if (charge.status === 'expected') {
          expect(unpaidChargeAmount(charge)).toBe(charge.amount);
        }
      }
    }
    expect(derivedCount).toBeGreaterThan(50);
  });
});

describe('deriveCharges: many charges', () => {
  it('matches forty thousand payments to forty thousand charges without comparing each with each', () => {
    // A daily schedule for about 110 years, paid on every due date, with a
    // period for every 30 days.
    const dueDates: string[] = [];
    const transactions: ChargeTransaction[] = [];
    const periods: BudgetPeriod[] = [];
    const day = new Date(Date.UTC(1950, 0, 1));
    for (let i = 0; i < 40000; i++) {
      const date = day.toISOString().slice(0, 10);
      dueDates.push(date);
      transactions.push(payment(`t${i}`, date));
      if (i % 30 === 0) {
        periods.push({
          id: `cat:${date}`,
          category: 'cat',
          start: date,
          end: date,
          budget: 0,
          carryover: 0,
        });
        if (periods.length > 1) {
          periods[periods.length - 2].end = date;
        }
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }
    periods[periods.length - 1].end = '9999-12-31';
    const started = Date.now();
    const result = deriveCharges({
      schedules: [schedule({ dueDates, expectedFrom: dueDates[0] })],
      overrides: [],
      transactions,
      periods,
      offsets: [],
      start: dueDates[0],
      end: dueDates[dueDates.length - 1],
      asOf: dueDates[dueDates.length - 1],
    });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(result.charges.length).toBe(40000);
    expect(
      result.charges.every(
        (c, i) => c.status === 'paid' && c.paymentId === `t${i}`,
      ),
    ).toBe(true);
    expect(result.charges[29].periodId).toBe('cat:1950-01-01');
    expect(result.charges[30].periodId).toBe('cat:1950-01-31');
    expect(result.charges[39999].periodId).toBe(periods[periods.length - 1].id);
    expect(result.derivedOffsetIds).toEqual([]);
  });
});

describe('unpaidChargeAmount', () => {
  it('is the whole amount of an expected charge', () => {
    const result = derive();
    expect(unpaidChargeAmount(chargeOf(result, 's1:2027-03-01'))).toBe(10000);
  });

  it('is 0 for a skipped and for a closed charge, also with a "still expected" amount', () => {
    const result = derive({
      schedules: [schedule({ expectedFrom: '2027-03-01' })],
      overrides: [
        override('s1:2027-02-01', { open_amount: 4000 }),
        override('s1:2027-03-01', { skipped: true, open_amount: 4000 }),
      ],
    });
    expect(chargeOf(result, 's1:2027-02-01').status).toBe('closed');
    expect(unpaidChargeAmount(chargeOf(result, 's1:2027-02-01'))).toBe(0);
    expect(chargeOf(result, 's1:2027-03-01').status).toBe('skipped');
    expect(unpaidChargeAmount(chargeOf(result, 's1:2027-03-01'))).toBe(0);
  });

  it('is the "still expected" part of a charge with a payment, whatever the day of the payment', () => {
    const result = derive({
      overrides: [override('s1:2027-03-01', { open_amount: 4000 })],
      transactions: [payment('t1', '2027-03-02'), payment('t2', '2027-04-01')],
      asOf: '2027-03-01',
    });
    expect(unpaidChargeAmount(chargeOf(result, 's1:2027-03-01'))).toBe(4000);
    expect(unpaidChargeAmount(chargeOf(result, 's1:2027-04-01'))).toBe(0);
  });
});

describe('deriveCharges: named payments', () => {
  it('lists the payments the user named with their schedule, also of a charge outside the days asked for', () => {
    const result = derive({
      schedules: [
        schedule(),
        schedule({ id: 's2', dueDates: ['2027-03-10', '2027-09-10'] }),
      ],
      overrides: [
        override('s1:2027-02-01', { transaction_id: 'named-early' }),
        override('s1:2027-04-01', { transaction_id: 'named-april' }),
        override('s2:2027-09-10', { transaction_id: 'named-late' }),
        // Named by two charges: the one that is due earlier keeps it.
        override('s2:2027-03-10', { transaction_id: 'named-early' }),
        override('s1:2027-05-01', { transaction_id: 'gone' }),
        override('s1:2027-06-01', {
          transaction_id: 'named-skipped',
          skipped: true,
        }),
      ],
      transactions: [
        payment('named-early', '2027-02-03', { schedule: null }),
        payment('named-april', '2027-04-02', { schedule: null }),
        payment('named-late', '2027-04-03', { schedule: null }),
        payment('named-skipped', '2027-06-01', { schedule: null }),
        payment('matched', '2027-03-01'),
      ],
      start: '2027-03-01',
      end: '2027-04-30',
    });
    expect(result.namedPayments).toEqual([
      { id: 'named-early', scheduleId: 's1' },
      { id: 'named-april', scheduleId: 's1' },
      { id: 'named-late', scheduleId: 's2' },
    ]);
    expect(result.charges.map(charge => [charge.id, charge.paymentId])).toEqual(
      [
        ['s1:2027-03-01', 'matched'],
        ['s2:2027-03-10', null],
        ['s1:2027-04-01', 'named-april'],
      ],
    );
  });

  it('a payment named for a charge outside the days asked for is not matched to the charge it is nearest to', () => {
    const result = derive({
      schedules: [schedule({ dueDates: [...MONTH_STARTS, '2027-12-01'] })],
      overrides: [override('s1:2027-12-01', { transaction_id: 't1' })],
      transactions: [payment('t1', '2027-03-02')],
      start: '2027-01-01',
      end: '2027-06-30',
    });
    expect(chargeOf(result, 's1:2027-03-01')).toMatchObject({
      status: 'expected',
      paymentId: null,
    });
    expect(result.namedPayments).toEqual([{ id: 't1', scheduleId: 's1' }]);
  });
});

describe('paymentsBySchedule', () => {
  it('gives every transaction and part under the schedule it carries, but no part under the schedule of its split', () => {
    const found = paymentsBySchedule([
      payment('parent', '2027-02-20', { category: null }),
      payment('same', '2027-02-20', { parentId: 'parent' }),
      payment('other', '2027-02-20', { parentId: 'parent', schedule: 's2' }),
      payment('none', '2027-02-20', { parentId: 'parent', schedule: null }),
      payment('plain', '2027-03-02', { schedule: 's2' }),
      payment('empty', '2027-03-02', { schedule: '' }),
      payment('bad-day', '2027-02-30'),
      payment('plain', '2027-04-02'),
    ]);
    expect(
      [...found].map(([scheduleId, payments]) => [
        scheduleId,
        payments.map(p => [p.id, p.date]),
      ]),
    ).toEqual([
      ['s1', [['parent', '2027-02-20']]],
      [
        's2',
        [
          ['other', '2027-02-20'],
          ['plain', '2027-03-02'],
        ],
      ],
    ]);
  });

  it('a part is a payment when its split is not among the transactions', () => {
    const found = paymentsBySchedule([
      payment('part', '2027-02-20', { parentId: 'gone' }),
    ]);
    expect(
      [...found].map(([scheduleId, payments]) => [
        scheduleId,
        payments.map(p => p.id),
      ]),
    ).toEqual([['s1', ['part']]]);
  });
});

describe('settledDueDates', () => {
  it('gives the nearest due date of every payment once, in order', () => {
    expect(
      settledDueDates(
        ['2027-03-01', '2027-04-01', '2027-05-01', '2027-06-01'],
        ['2027-05-03', '2027-03-20', '2027-04-28', '2027-03-01'],
      ),
    ).toEqual(['2027-03-01', '2027-04-01', '2027-05-01']);
  });

  it('a payment as near to two due dates belongs to the earlier one', () => {
    expect(
      settledDueDates(['2027-03-01', '2027-03-11'], ['2027-03-06']),
    ).toEqual(['2027-03-01']);
  });

  it('a payment further from the first or the last due date than half the way to its neighbour belongs to none', () => {
    const dueDates = ['2027-03-01', '2027-03-11'];
    expect(settledDueDates(dueDates, ['2027-02-24', '2027-03-16'])).toEqual([
      '2027-03-01',
      '2027-03-11',
    ]);
    expect(settledDueDates(dueDates, ['2027-02-23', '2027-03-17'])).toEqual([]);
  });

  it('every payment belongs to a single due date, however far away', () => {
    expect(
      settledDueDates(['2027-04-28'], ['2020-01-01', '2031-12-31']),
    ).toEqual(['2027-04-28']);
    expect(settledDueDates(['2027-04-28'], [])).toEqual([]);
    expect(settledDueDates([], ['2027-04-28'])).toEqual([]);
  });

  it('takes the due dates in any order and leaves out days that are not valid', () => {
    expect(
      settledDueDates(
        ['2027-05-01', 'soon', '2027-03-01', '2027-05-01', '2027-02-30'],
        ['2027-04-29', '2027-02-31', ''],
      ),
    ).toEqual(['2027-05-01']);
  });
});

describe('placeCashMovements', () => {
  const input = {
    selectedAccountIds: ['checking', 'savings'],
    asOf: '2027-04-20',
    horizonEnd: '2027-05-31',
  };

  it('plans an overdue movement on the as-of day and keeps the day it was due', () => {
    expect(
      placeCashMovements({
        ...input,
        movements: [
          { id: 'm1', account: 'checking', date: '2027-04-05', amount: -900 },
        ],
      }),
    ).toEqual([
      {
        id: 'm1',
        account: 'checking',
        date: '2027-04-20',
        amount: -900,
        dueDate: '2027-04-05',
      },
    ]);
  });

  it('keeps the date of a movement due on the as-of day or later', () => {
    const placed = placeCashMovements({
      ...input,
      movements: [
        { id: 'm1', account: 'checking', date: '2027-04-20', amount: -1 },
        { id: 'm2', account: 'savings', date: '2027-05-31', amount: 2 },
      ],
    });
    expect(placed.map(m => [m.id, m.date, m.dueDate])).toEqual([
      ['m1', '2027-04-20', '2027-04-20'],
      ['m2', '2027-05-31', '2027-05-31'],
    ]);
  });

  it('leaves out movements after the horizon, in other accounts, with a date that is not a day, and repeated ids', () => {
    const placed = placeCashMovements({
      ...input,
      movements: [
        { id: 'm1', account: 'checking', date: '2027-06-01', amount: -1 },
        { id: 'm2', account: 'card', date: '2027-04-25', amount: -1 },
        { id: 'm3', account: 'checking', date: 'soon', amount: -1 },
        { id: 'm4', account: 'checking', date: '2027-04-25', amount: -1 },
        { id: 'm4', account: 'checking', date: '2027-04-26', amount: -2 },
      ],
    });
    expect(placed).toEqual([
      {
        id: 'm4',
        account: 'checking',
        date: '2027-04-25',
        amount: -1,
        dueDate: '2027-04-25',
      },
    ]);
  });
});

describe('planCash', () => {
  const accounts = [
    { id: 'checking', balance: 70000 },
    { id: 'savings', balance: 350000 },
  ];
  const input = {
    accounts,
    selectedAccountIds: ['checking', 'savings'],
    asOf: '2027-04-20',
    horizonEnd: '2027-05-31',
  };

  it('the example of the spec: 4,200 cash and a transfer of 200 needed', () => {
    expect(
      planCash({
        ...input,
        movements: [
          {
            id: 'tax',
            account: 'checking',
            date: '2027-04-28',
            amount: -90000,
          },
        ],
      }),
    ).toEqual({
      cashAvailable: 420000,
      inAccounts: 420000,
      owed: 0,
      projectedCash: 330000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 70000,
          projectedEndingBalance: -20000,
          minimumDailyClosingBalance: -20000,
          firstShortfallDate: '2027-04-28',
          transferNeeded: 20000,
        },
        {
          accountId: 'savings',
          currentBalance: 350000,
          projectedEndingBalance: 350000,
          minimumDailyClosingBalance: 350000,
          firstShortfallDate: null,
          transferNeeded: 0,
        },
      ],
    });
  });

  it('a transfer with two legs removes the shortfall and leaves cash unchanged', () => {
    const plan = planCash({
      ...input,
      movements: [
        { id: 'tax', account: 'checking', date: '2027-04-28', amount: -90000 },
        { id: 'move', account: 'savings', date: '2027-04-27', amount: -20000 },
        {
          id: 'move-transfer',
          account: 'checking',
          date: '2027-04-27',
          amount: 20000,
        },
      ],
    });
    expect(plan?.projectedCash).toBe(330000);
    expect(plan?.accounts.map(a => a.transferNeeded)).toEqual([0, 0]);
    expect(plan?.accounts.map(a => a.firstShortfallDate)).toEqual([null, null]);
  });

  it('a movement on the as-of day leaves the account on that day', () => {
    const plan = planCash({
      ...input,
      movements: [
        { id: 'tax', account: 'checking', date: '2027-04-20', amount: -90000 },
      ],
    });
    expect(plan?.cashAvailable).toBe(420000);
    expect(plan?.accounts[0]).toEqual({
      accountId: 'checking',
      currentBalance: 70000,
      projectedEndingBalance: -20000,
      minimumDailyClosingBalance: -20000,
      firstShortfallDate: '2027-04-20',
      transferNeeded: 20000,
    });
  });

  it('a movement before the as-of day counts on the as-of day too', () => {
    const plan = planCash({
      ...input,
      movements: [
        { id: 'tax', account: 'checking', date: '2027-04-01', amount: -90000 },
      ],
    });
    expect(plan?.accounts[0].firstShortfallDate).toBe('2027-04-20');
    expect(plan?.accounts[0].transferNeeded).toBe(20000);
  });

  it('later income does not hide the shortfall', () => {
    const plan = planCash({
      ...input,
      movements: [
        { id: 'tax', account: 'checking', date: '2027-04-28', amount: -90000 },
        { id: 'pay', account: 'checking', date: '2027-05-01', amount: 300000 },
      ],
    });
    expect(plan?.accounts[0]).toMatchObject({
      projectedEndingBalance: 280000,
      minimumDailyClosingBalance: -20000,
      firstShortfallDate: '2027-04-28',
      transferNeeded: 20000,
    });
  });

  it('splits cash into what is in accounts and what is owed, and forecasts no shortfall for an account that is not above zero', () => {
    const plan = planCash({
      ...input,
      accounts: [...accounts, { id: 'card', balance: -50000 }],
      selectedAccountIds: ['checking', 'savings', 'card'],
      movements: [
        { id: 'buy', account: 'card', date: '2027-04-25', amount: -1000 },
      ],
    });
    expect(plan).toMatchObject({
      cashAvailable: 370000,
      inAccounts: 420000,
      owed: 50000,
      projectedCash: 369000,
    });
    expect(plan?.accounts[2]).toEqual({
      accountId: 'card',
      currentBalance: -50000,
      projectedEndingBalance: -51000,
      minimumDailyClosingBalance: -51000,
      firstShortfallDate: null,
      transferNeeded: 0,
    });
  });

  it('leaves out movements after the horizon and in accounts that are not selected', () => {
    const plan = planCash({
      ...input,
      selectedAccountIds: ['checking'],
      movements: [
        { id: 'a', account: 'checking', date: '2027-06-01', amount: -90000 },
        { id: 'b', account: 'savings', date: '2027-04-25', amount: -90000 },
      ],
    });
    expect(plan).toEqual({
      cashAvailable: 70000,
      inAccounts: 70000,
      owed: 0,
      projectedCash: 70000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 70000,
          projectedEndingBalance: 70000,
          minimumDailyClosingBalance: 70000,
          firstShortfallDate: null,
          transferNeeded: 0,
        },
      ],
    });
  });

  it('ignores a selected account without a balance and a repeated selection', () => {
    const plan = planCash({
      ...input,
      selectedAccountIds: ['checking', 'gone', 'checking'],
      movements: [],
    });
    expect(plan?.accounts.map(a => a.accountId)).toEqual(['checking']);
  });

  it.each([
    ['an as-of day that is not a day', { asOf: 'today' }],
    ['a horizon that is not a day', { horizonEnd: '2027-02-30' }],
    ['a horizon before the as-of day', { horizonEnd: '2027-04-19' }],
  ])('returns null for %s', (_name, extra) => {
    expect(planCash({ ...input, movements: [], ...extra })).toBe(null);
  });

  it('a horizon on the as-of day is allowed', () => {
    const plan = planCash({
      ...input,
      horizonEnd: '2027-04-20',
      movements: [
        { id: 'tax', account: 'checking', date: '2027-04-20', amount: -90000 },
      ],
    });
    expect(plan?.accounts[0].projectedEndingBalance).toBe(-20000);
  });

  it('returns null when the amounts together are too large, and not for an account that is not selected', () => {
    const big = 2 ** 51 - 1;
    expect(
      planCash({
        ...input,
        accounts: [
          { id: 'checking', balance: big },
          { id: 'savings', balance: 1 },
        ],
        movements: [],
      }),
    ).toBe(null);
    expect(
      planCash({
        ...input,
        accounts: [{ id: 'checking', balance: 0.5 }],
        selectedAccountIds: ['checking'],
        movements: [],
      }),
    ).toBe(null);
    expect(
      planCash({
        ...input,
        movements: [
          { id: 'a', account: 'checking', date: '2027-04-25', amount: -big },
        ],
      }),
    ).toBe(null);
    expect(
      planCash({
        ...input,
        movements: [
          { id: 'a', account: 'checking', date: '2027-04-25', amount: 0.5 },
        ],
      }),
    ).toBe(null);
    expect(
      planCash({
        ...input,
        accounts: [
          { id: 'checking', balance: 70000 },
          { id: 'savings', balance: big },
        ],
        selectedAccountIds: ['checking'],
        movements: [],
      })?.cashAvailable,
    ).toBe(70000);
  });
});
