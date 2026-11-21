import { isCleanupEligibleSchedule } from '@actual-app/core/shared/schedules';
import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  getScheduleFilter,
  prefillFilteredSchedule,
  updateScheduleConditions,
} from './schedule-edit-utils';

it('prefills a yearly category schedule from the five filtered transactions', () => {
  const filter = getScheduleFilter(
    [
      { field: 'category', op: 'is', value: 'insurance' },
      { field: 'date', op: 'is', value: '2026', options: { year: true } },
    ],
    'and',
  );
  expect(filter).toEqual({ category: 'insurance', year: '2026' });
  if (!filter) {
    throw new Error('Expected a category filter');
  }
  const transactions: TransactionEntity[] = [
    -11966, -104060, -30690, -73700, 603,
  ].map((amount, index) => ({
    id: String(index),
    date: `2026-0${index + 2}-10`,
    amount,
    account: 'card',
    category: 'insurance',
    payee: index === 1 ? 'hearth-cover' : 'mutual-acme',
  }));
  const result = prefillFilteredSchedule({
    ...filter,
    name: 'Insurance',
    transactions: [...transactions].reverse(),
  });
  expect(result?.year).toBe('2026');
  expect(result?.schedule).toMatchObject({
    name: 'Insurance',
    _date: { start: '2026-02-10', frequency: 'yearly' },
    _account: 'card',
    _amount: -219813,
    _amountOp: 'isapprox',
  });
  expect(result?.schedule._conditions).toEqual(
    expect.arrayContaining([
      { field: 'category', op: 'is', value: 'insurance' },
      { field: 'payee', op: 'oneOf', value: ['mutual-acme', 'hearth-cover'] },
    ]),
  );
  expect(result?.transactions.map(transaction => transaction.id)).toEqual([
    '4',
    '3',
    '2',
    '1',
    '0',
  ]);
});

it('requires a single calendar year before deriving the allowance and links', () => {
  const row: TransactionEntity = {
    id: 'first',
    date: '2026-03-10',
    account: 'card',
    category: 'insurance',
    payee: 'mutual-acme',
    amount: -11966,
  };
  const later = {
    ...row,
    id: 'later',
    date: '2027-03-10',
    payee: 'hearth-cover',
  };
  const input = { category: 'insurance', name: 'Insurance' };
  expect(
    prefillFilteredSchedule({ ...input, transactions: [row, later] }),
  ).toBeNull();
  expect(
    prefillFilteredSchedule({
      ...input,
      year: '2026',
      transactions: [row, later],
    }),
  ).toBeNull();
  expect(
    prefillFilteredSchedule({ ...input, transactions: [row] }),
  ).toMatchObject({
    year: '2026',
    transactions: [row],
    schedule: {
      _amount: -11966,
      _conditions: expect.arrayContaining([
        { field: 'payee', op: 'oneOf', value: ['mutual-acme'] },
      ]),
    },
  });
});

it('edits category and multiple payees and clears optional conditions', () => {
  const fields = {
    name: 'Insurance',
    category: 'insurance',
    payees: ['first', 'second'],
    date: '2026-03-10',
    amount: -100,
    amountOp: 'isapprox',
    account: 'card',
    posts_transaction: false,
    custom_upcoming_length: null,
  } satisfies Parameters<typeof updateScheduleConditions>[1];
  const { conditions } = updateScheduleConditions({}, fields);
  expect(conditions).toEqual(
    expect.arrayContaining([
      { field: 'category', op: 'is', value: 'insurance' },
      { field: 'payee', op: 'oneOf', value: ['first', 'second'] },
    ]),
  );
  expect(isCleanupEligibleSchedule({ _conditions: conditions })).toBe(true);
  const cleared = updateScheduleConditions(
    { _conditions: conditions },
    {
      ...fields,
      category: '',
      payees: [],
      account: null,
    },
  );
  expect(cleared.conditions?.map(condition => condition.field)).toEqual([
    'date',
    'amount',
  ]);
  expect(isCleanupEligibleSchedule({ _conditions: cleared.conditions })).toBe(
    false,
  );
});
