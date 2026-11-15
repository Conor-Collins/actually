import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { createSchedule as createScheduleBase } from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';
import type { RecurConfig, RuleConditionEntity } from '#types/models';

import { app } from './app';
import type { PeriodBudgetCalculation } from './calculate';

const handlers = app.handlers;

const createSchedule = createScheduleBase as (args: {
  conditions: RuleConditionEntity[];
}) => Promise<string>;

async function calculate(
  asOf = '2027-04-20',
  horizonEnd = '2027-05-31',
): Promise<PeriodBudgetCalculation> {
  const result = await handlers['period-budget/calculate']({
    asOf,
    horizonEnd,
  });
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result;
}

async function period(
  category: string,
  start: string,
  end: string,
  budget: number,
) {
  expect(
    await handlers['period-budget/create-period']({
      category,
      start,
      end,
      budget,
    }),
  ).toEqual({ id: `${category}:${start}` });
}

async function spend(
  id: string,
  date: string,
  amount: number,
  category: string | null,
  extra: Record<string, unknown> = {},
) {
  await db.insertTransaction({
    id,
    account: 'checking',
    date,
    amount,
    category,
    ...extra,
  });
}

// A schedule of the checking account.
async function schedule(
  amount: number,
  date: string | RecurConfig,
  extra: RuleConditionEntity[] = [],
): Promise<string> {
  return createSchedule({
    conditions: [
      { op: 'is', field: 'account', value: 'checking' },
      { op: 'is', field: 'amount', value: amount },
      { op: 'is', field: 'date', value: date },
      ...extra,
    ] satisfies RuleConditionEntity[],
  });
}

function remainingOf(result: PeriodBudgetCalculation, periodId: string) {
  const found = result.projection.periods.find(p => p.period.id === periodId);
  if (found === undefined) {
    throw new Error(`no period ${periodId}`);
  }
  return {
    remaining: found.remaining,
    expectedRemaining: found.expectedRemaining,
  };
}

function accountOf(result: PeriodBudgetCalculation, accountId: string) {
  const found = result.cash?.accounts.find(a => a.accountId === accountId);
  if (found === undefined) {
    throw new Error(`no account ${accountId}`);
  }
  return found;
}

// The worked example of spec section 8, in cents. Returns the id of the
// schedule of the tax payment.
async function storeExample(): Promise<string> {
  await period('rent', '2027-04-01', '2027-05-01', 150000);
  await period('groceries', '2027-04-01', '2027-05-01', 60000);
  await period('fun', '2027-04-01', '2027-05-01', 20000);
  await period('insurance', '2027-01-01', '2028-01-01', 120000);
  await period('taxes', '2027-04-01', '2027-07-01', 90000);
  await spend('open-checking', '2027-01-01', 413000, null, {
    starting_balance_flag: true,
  });
  await db.insertTransaction({
    id: 'open-savings',
    account: 'savings',
    date: '2027-01-01',
    amount: 350000,
    starting_balance_flag: true,
  });
  await spend('insurance-paid', '2027-03-15', -120000, 'insurance');
  await spend('rent-paid', '2027-04-01', -150000, 'rent');
  await spend('food-1', '2027-04-05', -40000, 'groceries');
  await spend('food-2', '2027-04-12', -28000, 'groceries');
  await spend('cinema', '2027-04-10', -5000, 'fun');
  const taxSchedule = await schedule(-90000, {
    start: '2027-04-28',
    frequency: 'yearly',
  });
  expect(
    await handlers['period-budget/link-schedule']({
      scheduleId: taxSchedule,
      category: 'taxes',
    }),
  ).toEqual({ id: taxSchedule });
  return taxSchedule;
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
  await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
  for (const id of ['rent', 'groceries', 'fun', 'insurance', 'taxes']) {
    await db.insertCategory({ id, name: id, cat_group: 'group1' });
  }
  await db.insertAccount({ id: 'checking', name: 'Checking' });
  await db.insertAccount({ id: 'savings', name: 'Savings' });
});

describe('period-budget/calculate: the worked example of the spec', () => {
  it('gives the figures of spec section 8', async () => {
    const taxSchedule = await storeExample();
    const result = await calculate();
    const summary = result.projection.summary;
    expect(summary.monthlyActualSpending).toBe(223000);
    expect(summary.combinedActiveRemaining).toBe(97000);
    expect(summary.totalActiveOverspending).toBe(8000);
    expect(remainingOf(result, 'rent:2027-04-01').remaining).toBe(0);
    expect(remainingOf(result, 'groceries:2027-04-01').remaining).toBe(-8000);
    expect(remainingOf(result, 'fun:2027-04-01').remaining).toBe(15000);
    expect(remainingOf(result, 'insurance:2027-01-01').remaining).toBe(0);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 0,
    });
    expect(result.cash).toEqual({
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
    expect(result.charges).toEqual([
      {
        id: `${taxSchedule}:2027-04-28`,
        scheduleId: taxSchedule,
        category: 'taxes',
        dueDate: '2027-04-28',
        periodId: 'taxes:2027-04-01',
        amount: 90000,
        status: 'expected',
        paymentId: null,
        paymentDate: null,
        isNamedPayment: false,
        openAmount: 0,
        furtherPaymentIds: [],
      },
    ]);
    expect(result.movements).toEqual([
      {
        id: `forecast-${taxSchedule}-2027-04-28`,
        account: 'checking',
        date: '2027-04-28',
        amount: -90000,
        dueDate: '2027-04-28',
        scheduleId: taxSchedule,
        isTransfer: false,
        isApproximate: false,
      },
    ]);
    expect(result.derivedOffsetIds).toEqual([]);
    expect(result.paidOutsideBudget).toEqual([]);
    expect(result.needsAttention).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(result.plannedPeriodIds).toEqual([]);
    expect(result.asOf).toBe('2027-04-20');
    expect(result.horizonEnd).toBe('2027-05-31');
  });

  it('the March insurance payment stays in its year and is not April spending', async () => {
    await storeExample();
    for (const asOf of ['2027-04-20', '2027-08-15', '2027-12-31']) {
      const result = await calculate(asOf, asOf);
      expect(remainingOf(result, 'insurance:2027-01-01').remaining).toBe(0);
    }
    expect(
      (await calculate('2027-08-15', '2027-08-15')).projection.summary
        .monthlyActualSpending,
    ).toBe(0);
    expect(
      (await calculate('2027-03-31', '2027-03-31')).projection.summary
        .monthlyActualSpending,
    ).toBe(120000);
  });

  it('a transfer from savings covers the shortfall without new spending or cash', async () => {
    await storeExample();
    const toChecking = await db.insertPayee({
      id: 'to-checking',
      name: 'Checking',
      transfer_acct: 'checking',
    });
    const before = await calculate();
    const transfer = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'savings' },
        { op: 'is', field: 'payee', value: toChecking },
        { op: 'is', field: 'amount', value: -20000 },
        { op: 'is', field: 'date', value: '2027-04-27' },
      ] satisfies RuleConditionEntity[],
    });
    const result = await calculate();
    expect(
      result.movements.filter(movement => movement.scheduleId === transfer),
    ).toEqual([
      {
        id: `forecast-${transfer}-2027-04-27`,
        account: 'savings',
        date: '2027-04-27',
        amount: -20000,
        dueDate: '2027-04-27',
        scheduleId: transfer,
        isTransfer: true,
        isApproximate: false,
      },
      {
        id: `forecast-${transfer}-2027-04-27-transfer`,
        account: 'checking',
        date: '2027-04-27',
        amount: 20000,
        dueDate: '2027-04-27',
        scheduleId: transfer,
        isTransfer: true,
        isApproximate: false,
      },
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      minimumDailyClosingBalance: 0,
      firstShortfallDate: null,
      transferNeeded: 0,
    });
    expect(accountOf(result, 'savings').projectedEndingBalance).toBe(330000);
    expect(result.cash?.projectedCash).toBe(before.cash?.projectedCash);
    expect(result.cash?.cashAvailable).toBe(420000);
    expect(result.projection).toEqual(before.projection);
  });

  it('later income does not hide the shortfall', async () => {
    await storeExample();
    await schedule(300000, '2027-05-03');
    const result = await calculate();
    expect(accountOf(result, 'checking')).toMatchObject({
      projectedEndingBalance: 280000,
      minimumDailyClosingBalance: -20000,
      firstShortfallDate: '2027-04-28',
      transferNeeded: 20000,
    });
  });
});

describe('period-budget/calculate: charges and payments', () => {
  it('a posted payment settles the charge once and is not forecast again', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-paid', '2027-04-27', -91000, 'taxes', {
      schedule: taxSchedule,
    });
    const result = await calculate('2027-04-27');
    expect(result.charges.map(c => [c.status, c.paymentId])).toEqual([
      ['paid', 'tax-paid'],
    ]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: -1000,
      expectedRemaining: -1000,
    });
    expect(result.movements).toEqual([]);
    expect(accountOf(result, 'checking').currentBalance).toBe(-21000);
    expect(result.paidOutsideBudget).toEqual([]);
  });

  it('a payment after the as-of day leaves the charge expected on that day', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-paid', '2027-04-27', -91000, 'taxes', {
      schedule: taxSchedule,
    });
    const result = await calculate('2027-04-20');
    expect(result.charges.map(c => [c.status, c.paymentId])).toEqual([
      ['paid', 'tax-paid'],
    ]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 0,
    });
    expect(result.movements.map(m => [m.date, m.amount])).toEqual([
      ['2027-04-28', -90000],
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 70000,
      transferNeeded: 20000,
    });
  });

  it('an early payment counts in the period of its charge and stays in its own month', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-paid', '2027-03-20', -90000, 'taxes', {
      schedule: taxSchedule,
    });
    const march = await calculate('2027-03-31', '2027-03-31');
    expect(march.projection.summary.monthlyActualSpending).toBe(210000);
    const april = await calculate();
    expect(april.derivedOffsetIds).toEqual(['tax-paid']);
    expect(april.projection.summary.monthlyActualSpending).toBe(223000);
    expect(remainingOf(april, 'taxes:2027-04-01')).toEqual({
      remaining: 0,
      expectedRemaining: 0,
    });
    expect(april.movements).toEqual([]);
    expect(april.needsAttention).toEqual([]);
  });

  it('a stored offset wins over the derived one', async () => {
    const taxSchedule = await storeExample();
    await period('taxes', '2027-01-01', '2027-04-01', 90000);
    await spend('tax-paid', '2027-04-27', -90000, 'taxes', {
      schedule: taxSchedule,
    });
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'tax-paid',
        periodId: 'taxes:2027-01-01',
      }),
    ).toEqual({ id: 'tax-paid' });
    const result = await calculate('2027-04-30');
    expect(result.derivedOffsetIds).toEqual([]);
    expect(remainingOf(result, 'taxes:2027-01-01').remaining).toBe(0);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 90000,
    });
    expect(result.projection.summary.monthlyActualSpending).toBe(313000);
  });

  it('applies the overrides of a charge', async () => {
    const taxSchedule = await storeExample();
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      amount: 95000,
    });
    let result = await calculate();
    expect(result.charges[0].amount).toBe(95000);
    expect(remainingOf(result, 'taxes:2027-04-01').expectedRemaining).toBe(
      -5000,
    );
    expect(result.movements.map(m => m.amount)).toEqual([-95000]);
    expect(accountOf(result, 'checking').transferNeeded).toBe(25000);

    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      skipped: true,
    });
    result = await calculate();
    expect(result.charges[0].status).toBe('skipped');
    expect(remainingOf(result, 'taxes:2027-04-01').expectedRemaining).toBe(
      90000,
    );
    expect(result.movements).toEqual([]);
    expect(accountOf(result, 'checking').transferNeeded).toBe(0);
  });

  it('a part payment leaves the "still expected" amount in the period and in the forecast', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-part', '2027-04-18', -50000, 'taxes', {
      schedule: taxSchedule,
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      openAmount: 40000,
    });
    const result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'paid',
      paymentId: 'tax-part',
      openAmount: 40000,
    });
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 40000,
      expectedRemaining: 0,
    });
    expect(result.movements.map(m => [m.date, m.amount])).toEqual([
      ['2027-04-28', -40000],
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 20000,
      transferNeeded: 20000,
    });
  });

  it('a payment the user named settles the charge', async () => {
    const taxSchedule = await storeExample();
    await spend('by-hand', '2027-04-19', -90000, 'taxes');
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      transactionId: 'by-hand',
    });
    const result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'paid',
      paymentId: 'by-hand',
      isNamedPayment: true,
    });
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 0,
      expectedRemaining: 0,
    });
    expect(result.movements).toEqual([]);
  });

  it('an overdue charge leaves the account on the as-of day', async () => {
    const taxSchedule = await storeExample();
    const result = await calculate('2027-05-05', '2027-05-31');
    expect(result.charges[0].status).toBe('expected');
    expect(result.movements).toEqual([
      {
        id: `forecast-${taxSchedule}-2027-04-28`,
        account: 'checking',
        date: '2027-05-05',
        amount: -90000,
        dueDate: '2027-04-28',
        scheduleId: taxSchedule,
        isTransfer: false,
        isApproximate: false,
      },
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 70000,
      projectedEndingBalance: -20000,
      firstShortfallDate: '2027-05-05',
      transferNeeded: 20000,
    });
    expect(remainingOf(result, 'taxes:2027-04-01').expectedRemaining).toBe(0);
  });

  it('a split payment settles the charge and its part counts as spending', async () => {
    const taxSchedule = await storeExample();
    await spend('split', '2027-04-19', -100000, null, {
      schedule: taxSchedule,
      is_parent: true,
    });
    await spend('split-tax', '2027-04-19', -90000, 'taxes', {
      is_child: true,
      parent_id: 'split',
    });
    await spend('split-fun', '2027-04-19', -10000, 'fun', {
      is_child: true,
      parent_id: 'split',
    });
    const result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'paid',
      paymentId: 'split',
    });
    expect(result.paidOutsideBudget).toEqual([]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 0,
      expectedRemaining: 0,
    });
    expect(remainingOf(result, 'fun:2027-04-01').remaining).toBe(5000);
    expect(accountOf(result, 'checking').currentBalance).toBe(-30000);
    expect(result.movements).toEqual([]);
  });

  it('lists a charge paid from an account that is not in the budget', async () => {
    const taxSchedule = await storeExample();
    await db.insertAccount({ id: 'loan', name: 'Loan', offbudget: 1 });
    await db.insertTransaction({
      id: 'tax-paid',
      account: 'loan',
      date: '2027-04-19',
      amount: -90000,
      schedule: taxSchedule,
    });
    const result = await calculate();
    expect(result.paidOutsideBudget).toEqual([`${taxSchedule}:2027-04-28`]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 90000,
    });
    expect(result.movements).toEqual([]);
  });

  it('an early payment from an account that is not in the budget is listed once', async () => {
    const taxSchedule = await storeExample();
    await db.insertAccount({ id: 'loan', name: 'Loan', offbudget: 1 });
    await db.insertTransaction({
      id: 'tax-paid',
      account: 'loan',
      date: '2027-03-20',
      amount: -90000,
      category: 'taxes',
      schedule: taxSchedule,
    });
    const result = await calculate();
    expect(result.paidOutsideBudget).toEqual([`${taxSchedule}:2027-04-28`]);
    expect(result.derivedOffsetIds).toEqual([]);
    expect(result.needsAttention).toEqual([]);
  });

  it('a charge that is overdue from before every period is still expected', async () => {
    await period('taxes', '2027-04-01', '2027-07-01', 90000);
    await spend('open', '2027-01-01', 5000, null, {
      starting_balance_flag: true,
    });
    const monthly = await schedule(-1000, {
      start: '2027-03-10',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    const result = await calculate();
    expect(
      result.charges.slice(0, 3).map(c => [c.dueDate, c.status, c.periodId]),
    ).toEqual([
      ['2027-03-10', 'expected', null],
      ['2027-04-10', 'expected', 'taxes:2027-04-01'],
      ['2027-05-10', 'expected', 'taxes:2027-04-01'],
    ]);
    expect(result.needsAttention).toEqual([
      {
        table: 'charges',
        id: `${monthly}:2027-03-10`,
        reason: 'charge-period-missing',
        detail: 'no period of category "taxes" contains 2027-03-10',
      },
    ]);
    expect(result.movements.map(m => [m.date, m.dueDate, m.amount])).toEqual([
      ['2027-04-20', '2027-03-10', -1000],
      ['2027-04-20', '2027-04-10', -1000],
      ['2027-05-10', '2027-05-10', -1000],
    ]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 87000,
    });
  });

  it('a payment nearer to the next due date is not taken for the last charge of the range', async () => {
    await period('taxes', '2027-01-01', '2027-03-01', 90000);
    const monthly = await schedule(-1000, {
      start: '2027-01-05',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    await spend('january', '2027-01-05', -1000, 'taxes', { schedule: monthly });
    // 15 days after 5 February and 13 days before 5 March.
    await spend('for-march', '2027-02-20', -1000, 'taxes', {
      schedule: monthly,
    });
    const result = await calculate('2027-02-25', '2027-02-28');
    expect(result.charges.map(c => [c.dueDate, c.status, c.paymentId])).toEqual(
      [
        ['2027-01-05', 'paid', 'january'],
        ['2027-02-05', 'expected', null],
      ],
    );
  });

  it('a schedule without an account counts in its period and is not forecast', async () => {
    await storeExample();
    const noAccount = await createSchedule({
      conditions: [
        { op: 'is', field: 'amount', value: -700 },
        { op: 'is', field: 'date', value: '2027-05-03' },
      ],
    });
    const linkedNoAccount = await createSchedule({
      conditions: [
        { op: 'is', field: 'amount', value: -300 },
        { op: 'is', field: 'date', value: '2027-04-25' },
      ],
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: linkedNoAccount,
      category: 'fun',
    });
    const result = await calculate();
    expect(
      result.charges
        .filter(c => c.scheduleId === linkedNoAccount)
        .map(c => [c.dueDate, c.status]),
    ).toEqual([['2027-04-25', 'expected']]);
    expect(remainingOf(result, 'fun:2027-04-01')).toEqual({
      remaining: 15000,
      expectedRemaining: 14700,
    });
    expect(
      result.movements.filter(
        m => m.scheduleId === noAccount || m.scheduleId === linkedNoAccount,
      ),
    ).toEqual([]);
    expect(result.cash?.projectedCash).toBe(330000);
  });

  it('a schedule whose dates cannot be worked out is left out', async () => {
    const taxSchedule = await storeExample();
    // 3 April 2027 is a Saturday.
    const weekend: RecurConfig = {
      start: '2027-04-03',
      frequency: 'monthly',
      skipWeekend: true,
      weekendSolveMode: 'after',
    };
    const brokenLinked = await schedule(-700, weekend);
    await handlers['period-budget/link-schedule']({
      scheduleId: brokenLinked,
      category: 'fun',
    });
    const brokenOther = await schedule(-300, weekend);
    let result = await calculate();
    expect(
      result.charges
        .filter(c => c.scheduleId === brokenLinked)
        .map(c => c.dueDate)
        .slice(0, 2),
    ).toEqual(['2027-04-05', '2027-05-03']);
    expect(
      result.movements
        .filter(m => m.scheduleId === brokenOther)
        .map(m => m.dueDate),
    ).toEqual(['2027-04-05', '2027-05-03']);

    // The same schedules as another program could have stored them.
    const rules = db.runQuery<{ id: string; conditions: string }>(
      'SELECT r.id, r.conditions FROM rules r JOIN schedules s ON s.rule = r.id WHERE s.id IN (?, ?)',
      [brokenLinked, brokenOther],
      true,
    );
    expect(rules.length).toBe(2);
    for (const rule of rules) {
      const conditions = rule.conditions.replace(
        ',"weekendSolveMode":"after"',
        '',
      );
      expect(conditions).not.toBe(rule.conditions);
      db.runQuery('UPDATE rules SET conditions = ? WHERE id = ?', [
        conditions,
        rule.id,
      ]);
    }
    // 3 July 2027 is a Saturday too.
    result = await calculate('2027-04-20', '2027-07-31');
    expect(result.charges.map(c => c.scheduleId)).toEqual([taxSchedule]);
    expect(result.movements.map(m => m.scheduleId)).toEqual([taxSchedule]);
  });

  it('a payment as near to the due date before the first period is not taken for the first charge', async () => {
    await period('taxes', '2027-03-01', '2027-06-01', 90000);
    const monthly = await schedule(-1000, {
      start: '2027-01-05',
      frequency: 'monthly',
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = 20270305, base_next_date = 20270305 WHERE schedule_id = ?',
      [monthly],
    );
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    // 14 days after 5 February and 14 days before 5 March: the earlier wins.
    await spend('for-february', '2027-02-19', -1000, 'taxes', {
      schedule: monthly,
    });
    const result = await calculate('2027-03-02', '2027-03-31');
    expect(
      result.charges.slice(0, 2).map(c => [c.dueDate, c.status, c.paymentId]),
    ).toEqual([
      ['2027-03-05', 'expected', null],
      ['2027-04-05', 'expected', null],
    ]);
    expect(result.derivedOffsetIds).toEqual([]);
  });

  it('a due date moved to the Friday before the schedule starts is a charge', async () => {
    await storeExample();
    // 3 April 2027 is a Saturday.
    const moved = await schedule(-700, {
      start: '2027-04-03',
      frequency: 'monthly',
      skipWeekend: true,
      weekendSolveMode: 'before',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: moved,
      category: 'fun',
    });
    const result = await calculate();
    expect(
      result.charges
        .filter(c => c.scheduleId === moved)
        .map(c => c.dueDate)
        .slice(0, 2),
    ).toEqual(['2027-04-02', '2027-05-03']);
  });

  it('a link to a category that is deleted gives no charges', async () => {
    const taxSchedule = await storeExample();
    await db.deleteCategory({ id: 'taxes' });
    const result = await calculate();
    expect(result.charges).toEqual([]);
    expect(
      result.needsAttention.filter(row => row.table === 'charges'),
    ).toEqual([]);
    expect(result.movements.map(m => [m.scheduleId, m.amount])).toEqual([
      [taxSchedule, -90000],
    ]);
  });

  it('rows that point to an account that does not exist or is deleted do not stop the calculation', async () => {
    await storeExample();
    await db.insertTransaction({
      id: 'ghost-1',
      account: 'ghost',
      date: '2027-04-02',
      amount: -777,
      category: 'fun',
    });
    // A transfer to an account that was deleted is spending like any other.
    await db.insertAccount({ id: 'gone', name: 'Gone' });
    const toGone = await db.insertPayee({
      id: 'to-gone',
      name: 'Gone',
      transfer_acct: 'gone',
    });
    await spend('to-gone-1', '2027-04-03', -300, 'fun', { payee: toGone });
    expect(remainingOf(await calculate(), 'fun:2027-04-01').remaining).toBe(
      15000,
    );
    await db.delete_('accounts', 'gone');
    const result = await calculate();
    expect(remainingOf(result, 'fun:2027-04-01').remaining).toBe(14700);
    expect(result.cash?.cashAvailable).toBe(419700);
  });

  it('a completed schedule that is not linked is not forecast', async () => {
    const taxSchedule = await storeExample();
    const done = await schedule(-2500, {
      start: '2027-05-02',
      frequency: 'monthly',
    });
    await db.updateWithSchema('schedules', { id: done, completed: true });
    const result = await calculate();
    expect(result.movements.map(m => m.scheduleId)).toEqual([taxSchedule]);
  });

  it('lists an expected charge that no period contains', async () => {
    const taxSchedule = await storeExample();
    await handlers['period-budget/delete-period']({ id: 'taxes:2027-04-01' });
    const result = await calculate();
    expect(result.needsAttention).toEqual([
      {
        table: 'charges',
        id: `${taxSchedule}:2027-04-28`,
        reason: 'charge-period-missing',
        detail: 'no period of category "taxes" contains 2027-04-28',
      },
    ]);
    expect(result.movements.map(m => m.amount)).toEqual([-90000]);
  });

  it('lists an override of a day on which no charge is due', async () => {
    const taxSchedule = await storeExample();
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-29',
      amount: 1,
    });
    const result = await calculate();
    expect(result.needsAttention).toEqual([
      {
        table: 'period_charge_overrides',
        id: `${taxSchedule}:2027-04-29`,
        reason: 'override-without-charge',
        detail: 'no charge is due on 2027-04-29',
      },
    ]);
  });

  it('a schedule that is not linked, or linked no longer, has no charges but is forecast', async () => {
    const taxSchedule = await storeExample();
    await handlers['period-budget/unlink-schedule']({
      scheduleId: taxSchedule,
    });
    const result = await calculate();
    expect(result.charges).toEqual([]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 90000,
    });
    expect(result.movements.map(m => [m.date, m.amount])).toEqual([
      ['2027-04-28', -90000],
    ]);
    expect(accountOf(result, 'checking').transferNeeded).toBe(20000);
  });

  it('a completed schedule expects nothing more and keeps its payments', async () => {
    const taxSchedule = await storeExample();
    const monthly = await schedule(-1000, {
      start: '2027-02-10',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    await spend('fee-april', '2027-04-09', -1000, 'taxes', {
      schedule: monthly,
    });
    await db.updateWithSchema('schedules', { id: monthly, completed: true });
    const result = await calculate();
    expect(
      result.charges
        .filter(c => c.scheduleId === monthly)
        .map(c => [c.dueDate, c.status]),
    ).toEqual([
      ['2027-02-10', 'closed'],
      ['2027-03-10', 'closed'],
      ['2027-04-10', 'paid'],
      ['2027-05-10', 'closed'],
      ['2027-06-10', 'closed'],
      ['2027-07-10', 'closed'],
      ['2027-08-10', 'closed'],
      ['2027-09-10', 'closed'],
      ['2027-10-10', 'closed'],
      ['2027-11-10', 'closed'],
      ['2027-12-10', 'closed'],
    ]);
    expect(result.movements.map(m => m.scheduleId)).toEqual([taxSchedule]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 89000,
      expectedRemaining: -1000,
    });
  });

  it('works out a schedule that started long ago from the year before the first period', async () => {
    await storeExample();
    const daily = await schedule(-100, {
      start: '2012-01-01',
      frequency: 'daily',
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = 20270421, base_next_date = 20270421 WHERE schedule_id = ?',
      [daily],
    );
    await handlers['period-budget/link-schedule']({
      scheduleId: daily,
      category: 'fun',
    });
    await spend('daily-19', '2027-04-19', -100, 'fun', { schedule: daily });
    const started = Date.now();
    const result = await calculate('2027-04-20', '2027-04-30');
    expect(Date.now() - started).toBeLessThan(5000);
    const charges = result.charges.filter(c => c.scheduleId === daily);
    expect(charges[0].dueDate).toBe('2027-01-01');
    expect(
      charges.filter(c => c.status === 'paid').map(c => c.dueDate),
    ).toEqual(['2027-04-19']);
    expect(
      charges.filter(c => c.status === 'expected').map(c => c.dueDate)[0],
    ).toBe('2027-04-21');
    expect(remainingOf(result, 'fun:2027-04-01')).toEqual({
      remaining: 14900,
      expectedRemaining: 13900,
    });
  });

  it('a deleted schedule has no charges and is not forecast', async () => {
    const taxSchedule = await storeExample();
    await db.delete_('schedules', taxSchedule);
    const result = await calculate();
    expect(result.charges).toEqual([]);
    expect(result.movements).toEqual([]);
  });

  it('a linked schedule of income has no charges and is forecast', async () => {
    await storeExample();
    const refund = await schedule(5000, '2027-05-02');
    await handlers['period-budget/link-schedule']({
      scheduleId: refund,
      category: 'taxes',
    });
    const result = await calculate();
    expect(result.charges.map(c => c.scheduleId)).not.toContain(refund);
    expect(
      result.movements
        .filter(m => m.scheduleId === refund)
        .map(m => [m.date, m.amount]),
    ).toEqual([['2027-05-02', 5000]]);
  });
});

describe('period-budget/calculate: cash movements', () => {
  it('forecasts every date of a schedule inside the horizon and none after it', async () => {
    await storeExample();
    const rentSchedule = await schedule(-150000, {
      start: '2027-05-01',
      frequency: 'monthly',
    });
    const result = await calculate('2027-04-20', '2027-06-30');
    expect(
      result.movements
        .filter(m => m.scheduleId === rentSchedule)
        .map(m => [m.date, m.amount]),
    ).toEqual([
      ['2027-05-01', -150000],
      ['2027-06-01', -150000],
    ]);
  });

  it('does not repeat an occurrence that is already posted', async () => {
    await storeExample();
    const pay = await schedule(300000, {
      start: '2027-04-19',
      frequency: 'monthly',
    });
    await spend('pay-april', '2027-04-19', 300000, null, { schedule: pay });
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === pay)
        .map(m => [m.date, m.amount]),
    ).toEqual([['2027-05-19', 300000]]);
    expect(accountOf(result, 'checking').currentBalance).toBe(370000);
  });

  it('plans an overdue occurrence of a schedule that is not linked on the as-of day', async () => {
    await storeExample();
    const fee = await schedule(-2500, {
      start: '2027-04-10',
      frequency: 'monthly',
    });
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === fee)
        .map(m => [m.date, m.dueDate, m.amount]),
    ).toEqual([
      ['2027-04-20', '2027-04-10', -2500],
      ['2027-05-10', '2027-05-10', -2500],
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 70000,
      projectedEndingBalance: -25000,
      minimumDailyClosingBalance: -25000,
    });
  });

  it('marks the movements of a schedule with an estimated amount', async () => {
    await storeExample();
    const power = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'checking' },
        { op: 'isapprox', field: 'amount', value: -8000 },
        { op: 'is', field: 'date', value: '2027-05-04' },
      ] satisfies RuleConditionEntity[],
    });
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === power)
        .map(m => [m.amount, m.isApproximate]),
    ).toEqual([[-8000, true]]);
  });

  it('leaves out an excluded, a closed and an off-budget account', async () => {
    await storeExample();
    await db.insertAccount({ id: 'old', name: 'Old', closed: 1 });
    await db.insertAccount({ id: 'loan', name: 'Loan', offbudget: 1 });
    await db.insertTransaction({
      id: 'old-1',
      account: 'old',
      date: '2027-01-01',
      amount: 999,
    });
    await db.insertTransaction({
      id: 'loan-1',
      account: 'loan',
      date: '2027-01-01',
      amount: -500000,
    });
    let result = await calculate();
    expect(result.cash?.accounts.map(a => a.accountId)).toEqual([
      'checking',
      'savings',
    ]);
    expect(result.cash?.cashAvailable).toBe(420000);

    await handlers['period-budget/exclude-account']({ accountId: 'savings' });
    result = await calculate();
    expect(result.cash?.accounts.map(a => a.accountId)).toEqual(['checking']);
    expect(result.cash?.cashAvailable).toBe(70000);

    await handlers['period-budget/include-account']({ accountId: 'savings' });
    result = await calculate();
    expect(result.cash?.cashAvailable).toBe(420000);
  });

  it('only one leg of a transfer to an account that is not selected is forecast', async () => {
    await storeExample();
    await db.insertAccount({ id: 'loan', name: 'Loan', offbudget: 1 });
    const toLoan = await db.insertPayee({
      id: 'to-loan',
      name: 'Loan',
      transfer_acct: 'loan',
    });
    const repay = await schedule(-30000, '2027-05-02', [
      { op: 'is', field: 'payee', value: toLoan },
    ]);
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === repay)
        .map(m => [m.account, m.amount, m.isTransfer]),
    ).toEqual([['checking', -30000, true]]);
  });

  it('splits cash into what is in accounts and what is owed', async () => {
    await storeExample();
    await db.insertAccount({ id: 'card', name: 'Card' });
    await db.insertTransaction({
      id: 'card-1',
      account: 'card',
      date: '2027-04-02',
      amount: -30000,
      category: 'fun',
    });
    const result = await calculate();
    expect(result.cash).toMatchObject({
      cashAvailable: 390000,
      inAccounts: 420000,
      owed: 30000,
    });
    expect(accountOf(result, 'card')).toMatchObject({
      firstShortfallDate: null,
      transferNeeded: 0,
    });
  });

  it('uses the balances of the as-of day', async () => {
    await storeExample();
    await spend('later', '2027-04-21', -1234, 'fun');
    expect(accountOf(await calculate(), 'checking').currentBalance).toBe(70000);
    expect(
      accountOf(await calculate('2027-04-21'), 'checking').currentBalance,
    ).toBe(68766);
  });
});

describe('period-budget/calculate: planned periods', () => {
  it('includes the periods that follow from a cadence up to the horizon', async () => {
    const taxSchedule = await storeExample();
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'taxes',
        anchorDate: '2027-04-01',
        months: 3,
      }),
    ).toEqual({ id: 'taxes' });
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      skipped: true,
    });
    const monthly = await schedule(-1000, {
      start: '2027-07-10',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    const result = await calculate('2027-04-20', '2027-07-31');
    expect(result.plannedPeriodIds).toEqual(['taxes:2027-07-01']);
    expect(
      result.charges
        .filter(c => c.scheduleId === monthly)
        .map(c => [c.dueDate, c.periodId]),
    ).toEqual([
      ['2027-07-10', 'taxes:2027-07-01'],
      ['2027-08-10', 'taxes:2027-07-01'],
      ['2027-09-10', 'taxes:2027-07-01'],
      // The insurance year runs to December. The periods of taxes are only
      // planned up to the horizon, so nothing is reported for these.
      ['2027-10-10', null],
      ['2027-11-10', null],
      ['2027-12-10', null],
    ]);
    expect(remainingOf(result, 'taxes:2027-07-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 87000,
    });
    expect(result.needsAttention).toEqual([]);
    expect((await handlers['period-budget/get-rows']()).periods.length).toBe(5);
  });
});

describe('period-budget/calculate: input', () => {
  it('refuses days that cannot be used and says why', async () => {
    expect(
      await handlers['period-budget/calculate']({
        asOf: '2027-02-30',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({ error: 'as-of date "2027-02-30" is not a valid date' });
    expect(
      await handlers['period-budget/calculate']({
        asOf: '2027-04-20',
        horizonEnd: 'later',
      }),
    ).toEqual({ error: 'horizon end "later" is not a valid date' });
    expect(
      await handlers['period-budget/calculate']({
        asOf: '2027-04-20',
        horizonEnd: '2027-04-19',
      }),
    ).toEqual({
      error: 'horizon end 2027-04-19 must not be before as-of date 2027-04-20',
    });
  });

  it('works on an empty file', async () => {
    const result = await calculate();
    expect(result.projection.periods).toEqual([]);
    expect(result.charges).toEqual([]);
    expect(result.movements).toEqual([]);
    expect(result.cash).toEqual({
      cashAvailable: 0,
      inAccounts: 0,
      owed: 0,
      projectedCash: 0,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 0,
          projectedEndingBalance: 0,
          minimumDailyClosingBalance: 0,
          firstShortfallDate: null,
          transferNeeded: 0,
        },
        {
          accountId: 'savings',
          currentBalance: 0,
          projectedEndingBalance: 0,
          minimumDailyClosingBalance: 0,
          firstShortfallDate: null,
          transferNeeded: 0,
        },
      ],
    });
  });

  it('a horizon that ends on the as-of day is allowed', async () => {
    await storeExample();
    const result = await calculate('2027-04-28', '2027-04-28');
    expect(result.movements.map(m => m.date)).toEqual(['2027-04-28']);
    expect(accountOf(result, 'checking').transferNeeded).toBe(20000);
  });
});
