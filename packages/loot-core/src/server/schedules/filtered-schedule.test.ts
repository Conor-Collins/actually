import MockDate from 'mockdate';

import { aqlQuery } from '#server/aql';
import { getBudget, setBudget } from '#server/budget/actions';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import { app as periodBudgetApp } from '#server/period-budget/app';
import {
  loadRules,
  runRules,
  updateRule,
} from '#server/transactions/transaction-rules';
import { clearUndo, undo } from '#server/undo';
import { q } from '#shared/query';
import {
  computeSchedulePreviewTransactions,
  isCleanupEligibleSchedule,
} from '#shared/schedules';
import type { RuleConditionEntity, TransactionEntity } from '#types/models';

import { app, getRuleForSchedule } from './app';

const schedules = app.handlers;
const periods = periodBudgetApp.handlers;
const conditions: RuleConditionEntity[] = [
  { field: 'category', op: 'is', value: 'insurance' },
  { field: 'payee', op: 'oneOf', value: ['mutual-acme', 'hearth-cover'] },
  { field: 'account', op: 'is', value: 'card' },
  { field: 'amount', op: 'isapprox', value: -219813 },
  {
    field: 'date',
    op: 'isapprox',
    value: { start: '2026-03-10', frequency: 'yearly' },
  },
];

function requestConversion(name: string, scheduleConditions = conditions) {
  return runMutator(() =>
    schedules['schedule/create-from-filter']({
      schedule: { name },
      conditions: scheduleConditions,
      year: '2026',
    }),
  );
}

async function convert(name = 'Insurance', scheduleConditions = conditions) {
  const result = await requestConversion(name, scheduleConditions);
  if (result.conflict) {
    throw new Error('Expected conversion to succeed');
  }
  return result.id;
}

beforeEach(async () => {
  MockDate.set('2026-03-10T12:00:00Z');
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
  app.startServices();
  await db.insertCategoryGroup({ id: 'bills', name: 'Bills' });
  await db.insertCategory({
    id: 'insurance',
    name: 'Insurance',
    cat_group: 'bills',
  });
  await db.insertCategory({ id: 'other', name: 'Other', cat_group: 'bills' });
  await db.insertAccount({ id: 'card', name: 'Card' });
  await db.insertPayee({ id: 'hearth-cover', name: 'Hearth Home Cover' });
  await db.insertPayee({ id: 'mutual-acme', name: 'Acme Mutual' });
  clearUndo();
});

afterEach(async () => {
  await app.stopServices();
  MockDate.reset();
});

it('matches either payee in the same category and posts a categorized transaction', async () => {
  const id = await convert();
  const transaction = {
    account: 'card',
    category: 'insurance',
    amount: -219813,
    date: '2026-03-10',
  };
  for (const payee of ['mutual-acme', 'hearth-cover']) {
    expect((await runRules({ ...transaction, payee })).schedule).toBe(id);
  }
  expect(
    (await runRules({ ...transaction, category: 'other', payee: 'hearth-cover' }))
      .schedule,
  ).toBeFalsy();
  expect(
    (await runRules({ ...transaction, payee: 'elsewhere' })).schedule,
  ).toBeFalsy();

  await runMutator(() => schedules['schedule/post-transaction']({ id }));
  const { data } = await aqlQuery(
    q('transactions').filter({ schedule: id }).select('*'),
  );
  expect(data).toEqual([
    expect.objectContaining({ ...transaction, payee: null }),
  ]);
});

it('creates a linked calendar-year period and reuses it on the next conversion', async () => {
  const first = await convert();
  const second = await convert('Insurance summary');
  const rows = await periods['period-budget/get-rows']();
  expect(rows.periods).toEqual([
    expect.objectContaining({
      category: 'insurance',
      start_date: '2026-01-01',
      end_date: '2027-01-01',
      budget: 219813,
    }),
  ]);
  expect(rows.scheduleLinks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: first, category: 'insurance' }),
      expect.objectContaining({ id: second, category: 'insurance' }),
    ]),
  );
});

it('plans next year without a missing-period warning and undoes the conversion in one step', async () => {
  const id = await convert();
  const result = await periods['period-budget/calculate']({
    asOf: '2026-11-20',
    horizonEnd: '2027-11-20',
  });
  if ('error' in result) throw new Error(result.error);
  expect(
    result.needsAttention.filter(row => row.reason === 'charge-period-missing'),
  ).toEqual([]);
  expect(result.charges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ dueDate: '2027-03-10' }),
    ]),
  );
  expect(result.plannedPeriodIds).toHaveLength(1);

  await runMutator(undo);
  const rows = await periods['period-budget/get-rows']();
  expect(rows.periods.filter(row => !row.tombstone)).toEqual([]);
  expect(rows.cadences.filter(row => !row.tombstone)).toEqual([]);
  expect(rows.scheduleLinks.filter(row => !row.tombstone)).toEqual([]);
  const { data } = await aqlQuery(q('schedules').filter({ id }).select('id'));
  expect(data).toEqual([]);
});

it.each([true, false])(
  'reopens cleanup with a category condition: %s',
  async withCategory => {
    const id = await runMutator(() =>
      schedules['schedule/create']({
        schedule: { name: 'Insurance' },
        conditions: conditions.filter(condition =>
          withCategory
            ? condition.field !== 'payee'
            : condition.field !== 'category',
        ),
      }),
    );
    const transaction = {
      account: 'card',
      date: '2026-03-10',
      amount: -100,
      payee: 'mutual-acme',
      category: 'insurance',
    };
    for (const [transactionId, overrides] of [
      ['match', {}],
      ['other-year', { date: '2025-03-10' }],
      ['starting', { starting_balance_flag: true }],
      [
        'other-condition',
        withCategory ? { category: 'other' } : { payee: null },
      ],
    ] as const) {
      await db.insertTransaction({
        ...transaction,
        ...overrides,
        id: transactionId,
      });
    }
    const plan = await schedules['schedule/preview-cleanup']({
      id,
      year: '2026',
    });
    expect(plan.links.map(row => row.id)).toEqual(['match']);
    expect(plan.category).toBe(withCategory ? 'insurance' : null);
    expect(plan.amounts).toEqual([]);
    expect(plan.moves).toEqual([]);
  },
);

it('excludes replacement schedules with a transaction or a period link', async () => {
  const id = await convert();
  const candidates = await Promise.all(
    ['Linked transaction', 'Linked period', 'Unused'].map(name =>
      runMutator(() =>
        schedules['schedule/create']({
          schedule: { name },
          conditions: [
            { field: 'payee', op: 'is', value: 'mutual-acme' },
            { field: 'date', op: 'is', value: '2026-03-10' },
          ],
        }),
      ),
    ),
  );
  await db.insertTransaction({
    account: 'card',
    date: '2026-03-10',
    amount: -100,
    schedule: candidates[0],
  });
  await runMutator(() =>
    periods['period-budget/link-schedule']({
      scheduleId: candidates[1],
      category: 'insurance',
    }),
  );
  const plan = await schedules['schedule/preview-cleanup']({
    id,
    year: '2026',
  });
  expect(plan.replacements.map(row => row.id)).toEqual([candidates[2]]);
});

it.each([
  { actions: ['amounts'] },
  { actions: ['replacements'] },
  { actions: ['links'] },
  { actions: ['moves'] },
  { actions: ['amounts', 'replacements', 'links', 'moves'] },
] satisfies { actions: ('amounts' | 'replacements' | 'links' | 'moves')[] }[])(
  'applies only the selected cleanup actions and undoes them together ($actions)',
  async ({ actions }) => {
    const id = await convert();
    const oldId = await runMutator(() =>
      schedules['schedule/create']({
        schedule: { name: 'Acme Mutual' },
        conditions: [
          { field: 'payee', op: 'is', value: 'mutual-acme' },
          { field: 'date', op: 'is', value: '2026-03-20' },
        ],
      }),
    );
    const excludedId = await runMutator(() =>
      schedules['schedule/create']({
        schedule: { name: 'Acme Mutual outside Insurance' },
        conditions: [
          { field: 'payee', op: 'is', value: 'mutual-acme' },
          { field: 'category', op: 'isNot', value: 'insurance' },
          { field: 'date', op: 'is', value: '2026-03-20' },
        ],
      }),
    );
    const transaction = {
      amount: -11966,
      date: '2026-03-10',
      account: 'card',
      payee: 'mutual-acme',
    };
    await db.insertTransaction({
      ...transaction,
      id: 'matched',
      category: 'insurance',
    });
    await db.insertTransaction({
      ...transaction,
      id: 'misfiled',
      category: 'other',
    });
    const month = { month: '2026-03', category: 'insurance' };
    await setBudget({ ...month, amount: 9000 });
    clearUndo();

    const request = { id, year: '2026', transactionIds: ['matched'] };
    const plan = await schedules['schedule/preview-cleanup'](request);
    expect(plan.amounts).toEqual([{ month: month.month, amount: 9000 }]);
    expect(plan.replacements).toEqual([
      { id: oldId, name: 'Acme Mutual', payee: 'mutual-acme' },
    ]);
    expect(plan.links.map(row => row.id)).toEqual(['matched']);
    expect(plan.moves.map(row => row.id)).toEqual(['misfiled']);

    async function readTransaction(id: string): Promise<TransactionEntity> {
      const { data } = await aqlQuery(
        q('transactions').filter({ id }).select('*'),
      );
      return data[0];
    }
    async function scheduleExists(id: string) {
      const { data } = await aqlQuery(
        q('schedules').filter({ id }).select('id'),
      );
      return data.length === 1;
    }

    expect(getBudget(month)).toBe(9000);
    expect(await scheduleExists(oldId)).toBe(true);
    expect((await readTransaction('misfiled')).category).toBe('other');
    expect((await readTransaction('matched')).schedule).toBeFalsy();

    await setBudget({ ...month, amount: 9100 });
    expect(
      await runMutator(() =>
        schedules['schedule/apply-cleanup']({
          request,
          plan,
          actions: ['amounts'],
        }),
      ),
    ).toEqual({ changed: true });
    expect(getBudget(month)).toBe(9100);
    await setBudget({ ...month, amount: 9000 });

    await runMutator(() =>
      schedules['schedule/apply-cleanup']({
        request,
        plan,
        actions,
      }),
    );
    expect(getBudget(month)).toBe(actions.includes('amounts') ? 0 : 9000);
    expect(await scheduleExists(oldId)).toBe(!actions.includes('replacements'));
    expect(await scheduleExists(excludedId)).toBe(true);
    expect((await readTransaction('misfiled')).category).toBe(
      actions.includes('moves') ? 'insurance' : 'other',
    );
    expect((await readTransaction('matched')).schedule ?? null).toBe(
      actions.includes('links') ? id : null,
    );

    await runMutator(undo);
    expect(getBudget(month)).toBe(9000);
    expect(await scheduleExists(oldId)).toBe(true);
    expect((await readTransaction('misfiled')).category).toBe('other');
    expect((await readTransaction('matched')).schedule).toBeFalsy();
  },
);

it('leaves the allowance and schedules untouched if writing the period link fails', async () => {
  await runMutator(() =>
    periods['period-budget/create-period']({
      category: 'insurance',
      start: '2026-01-01',
      end: '2027-01-01',
      budget: 75000,
    }),
  );
  const insert = db.insertWithSchema;
  const spy = vi
    .spyOn(db, 'insertWithSchema')
    .mockImplementation((table, data) => {
      if (table === 'period_schedule_links') {
        throw new Error('Link write failed');
      }
      return insert(table, data);
    });
  try {
    await expect(convert()).rejects.toThrow('Link write failed');
  } finally {
    spy.mockRestore();
  }
  const rows = await periods['period-budget/get-rows']();
  expect(rows.periods[0].budget).toBe(75000);
  expect(rows.scheduleLinks).toEqual([]);
  expect((await aqlQuery(q('schedules').select('*'))).data).toEqual([]);
  await expect(convert()).resolves.toBeTruthy();
});

it('links only the selected transfer leg and preserves both legs on undo', async () => {
  const id = await convert();
  const otherId = await runMutator(() =>
    schedules['schedule/create']({
      schedule: { name: 'Existing incoming schedule' },
      conditions: [{ field: 'date', op: 'is', value: '2026-03-10' }],
    }),
  );
  await db.insertAccount({ id: 'savings', name: 'Savings', offbudget: 1 });
  const toSavings = await db.insertPayee({
    name: '',
    transfer_acct: 'savings',
  });
  const toCard = await db.insertPayee({ name: '', transfer_acct: 'card' });
  await db.insertTransaction({
    id: 'outgoing',
    account: 'card',
    payee: toSavings,
    date: '2026-03-10',
    amount: -10000,
    category: 'insurance',
    transfer_id: 'incoming',
  });
  await db.insertTransaction({
    id: 'incoming',
    account: 'savings',
    payee: toCard,
    date: '2026-03-10',
    amount: 10000,
    schedule: otherId,
    transfer_id: 'outgoing',
  });

  const request = { id, year: '2026', transactionIds: ['outgoing'] };
  const plan = await schedules['schedule/preview-cleanup'](request);
  expect(plan.links.map(row => row.id)).toEqual(['outgoing']);
  const read = () => aqlQuery(q('transactions').orderBy('id').select('*'));

  clearUndo();
  await runMutator(() =>
    schedules['schedule/apply-cleanup']({
      request,
      plan,
      actions: ['links'],
    }),
  );
  expect((await read()).data).toEqual([
    expect.objectContaining({ id: 'incoming', schedule: otherId }),
    expect.objectContaining({ id: 'outgoing', schedule: id }),
  ]);

  await runMutator(undo);
  expect((await read()).data).toEqual([
    expect.objectContaining({ id: 'incoming', schedule: otherId }),
    expect.objectContaining({ id: 'outgoing', schedule: null }),
  ]);
});

it('previews and posts a categorized transaction after adding the first payee', async () => {
  const id = await convert(
    'One insurer',
    conditions.filter(condition => condition.field !== 'payee'),
  );
  await runMutator(() =>
    schedules['schedule/update']({
      schedule: { id },
      conditions: conditions.map(condition =>
        condition.field === 'payee'
          ? { ...condition, value: ['mutual-acme'] }
          : condition,
      ),
      replaceOptionalConditions: true,
    }),
  );
  const { data: scheduleRows } = await aqlQuery(
    q('schedules').filter({ id }).select('*'),
  );
  expect(
    computeSchedulePreviewTransactions(
      scheduleRows,
      new Map([[id, 'due']]),
      '7',
    ),
  ).toEqual([
    expect.objectContaining({ payee: 'mutual-acme', category: 'insurance' }),
  ]);
  await runMutator(() => schedules['schedule/post-transaction']({ id }));
  expect(
    (await aqlQuery(q('transactions').filter({ schedule: id }).select('*')))
      .data,
  ).toEqual([
    expect.objectContaining({ payee: 'mutual-acme', category: 'insurance' }),
  ]);
});

it('leaves the category unset for a legacy single-payee custom rule', async () => {
  const id = await runMutator(() =>
    schedules['schedule/create']({
      schedule: { name: 'Existing insurer' },
      conditions: conditions.map(condition =>
        condition.field === 'payee'
          ? { ...condition, op: 'is', value: 'mutual-acme' }
          : condition,
      ),
    }),
  );
  const rule = await getRuleForSchedule(id);
  await updateRule({
    id: rule.id,
    actions: [
      { op: 'link-schedule', value: id },
      { op: 'set', field: 'notes', value: 'Custom note' },
    ],
  });
  await runMutator(() => schedules['schedule/post-transaction']({ id }));
  expect(
    (await aqlQuery(q('transactions').filter({ schedule: id }).select('*')))
      .data,
  ).toEqual([
    expect.objectContaining({
      payee: 'mutual-acme',
      category: null,
      notes: 'Custom note',
    }),
  ]);
});

it.each([
  { start: '2025-01-01', end: '2028-01-01' },
  { start: '2026-01-01', end: '2028-01-01' },
  { start: '2025-01-01', end: '2027-01-01' },
])(
  'preserves the allowance of an overlapping period ($start to $end)',
  async ({ start, end }) => {
    await runMutator(() =>
      periods['period-budget/create-period']({
        category: 'insurance',
        start,
        end,
        budget: 600000,
      }),
    );

    await runMutator(() =>
      periods['period-budget/set-cadence']({
        category: 'insurance',
        anchorDate: start,
        months: 36,
      }),
    );
    const before = await periods['period-budget/get-rows']();
    const result = await requestConversion('Insurance');
    const after = await periods['period-budget/get-rows']();
    expect(after.periods).toEqual(before.periods);
    expect(after.cadences).toEqual(before.cadences);
    expect(after.scheduleLinks).toEqual([]);
    expect((await aqlQuery(q('schedules').select('id'))).data).toEqual([]);
    expect(result).toEqual({ conflict: { start, end } });
  },
);

const emptyCategory = {
  field: 'category',
  op: 'is',
  value: '',
} satisfies RuleConditionEntity;
const insuranceCategory = { ...emptyCategory, value: 'insurance' };
const emptyPayeeList = {
  field: 'payee',
  op: 'oneOf',
  value: [],
} satisfies RuleConditionEntity;

it.each([
  {
    name: 'empty category alone',
    filters: [emptyCategory],
    error: 'Schedule has an empty category condition',
  },
  {
    name: 'empty category with payees',
    filters: [emptyCategory, { ...emptyPayeeList, value: ['mutual-acme'] }],
    error: 'Schedule has an empty category condition',
  },
  {
    name: 'whitespace category',
    filters: [{ ...emptyCategory, value: '  ' }],
    error: 'Schedule has an empty category condition',
  },
  {
    name: 'empty payee list without category',
    filters: [emptyPayeeList],
    error: 'Schedule has neither a category nor a payee list',
  },
  {
    name: 'category with empty single payee',
    filters: [insuranceCategory, { field: 'payee', op: 'is', value: '' }],
  },
  {
    name: 'category with empty payee list',
    filters: [insuranceCategory, emptyPayeeList],
  },
  {
    name: 'category with empty account',
    filters: [insuranceCategory, { field: 'account', op: 'is', value: '' }],
  },
] satisfies { name: string; filters: RuleConditionEntity[]; error?: string }[])(
  'keeps unrelated transactions unlinked in cleanup with $name',
  async ({ name, filters, error }) => {
    const id = await runMutator(() =>
      schedules['schedule/create']({
        schedule: { name },
        conditions: [
          ...conditions.filter(
            condition =>
              condition.field === 'date' || condition.field === 'amount',
          ),
          ...filters,
        ],
      }),
    );
    const unrelated = {
      id: 'unrelated',
      account: 'card',
      category: 'insurance',
      payee: 'mutual-acme',
      date: '2026-03-10',
      amount: -100,
    } satisfies TransactionEntity;
    await db.insertTransaction(unrelated);

    const request = { id, year: '2026' };
    const {
      data: [schedule],
    } = await aqlQuery(q('schedules').filter({ id }).select('*'));
    if (error) {
      await expect(
        schedules['schedule/preview-cleanup'](request),
      ).rejects.toThrow(error);
      expect(isCleanupEligibleSchedule(schedule)).toBe(false);
      await expect(
        runMutator(() =>
          schedules['schedule/apply-cleanup']({
            request,
            plan: {
              category: null,
              amounts: [],
              replacements: [],
              links: [unrelated],
              moves: [],
            },
            actions: ['links'],
          }),
        ),
      ).rejects.toThrow(error);
    } else {
      expect(isCleanupEligibleSchedule(schedule)).toBe(true);
      const plan = await schedules['schedule/preview-cleanup'](request);
      expect(plan.links).toEqual([]);
      expect(
        await runMutator(() =>
          schedules['schedule/apply-cleanup']({
            request,
            plan,
            actions: ['links'],
          }),
        ),
      ).toEqual({ changed: false });

      if (filters.some(condition => condition.field === 'payee')) {
        const explicitRequest = { ...request, transactionIds: [unrelated.id] };
        const explicit =
          await schedules['schedule/preview-cleanup'](explicitRequest);
        expect(explicit.links).toEqual([]);
      }
    }
    const { data } = await aqlQuery(
      q('transactions').filter({ id: unrelated.id }).select('schedule'),
    );
    expect(data).toEqual([{ id: unrelated.id, schedule: null }]);
  },
);
