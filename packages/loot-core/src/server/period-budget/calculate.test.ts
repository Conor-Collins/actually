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
        isPosted: false,
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
        isPosted: false,
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
        isPosted: false,
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

  it('a payment after the as-of day leaves the charge expected on that day and is planned on its own day', async () => {
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
    expect(result.movements).toEqual([
      {
        id: 'tax-paid',
        account: 'checking',
        date: '2027-04-27',
        amount: -91000,
        dueDate: '2027-04-27',
        scheduleId: taxSchedule,
        isTransfer: false,
        isApproximate: false,
        isPosted: true,
      },
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 70000,
      projectedEndingBalance: -21000,
      firstShortfallDate: '2027-04-27',
      transferNeeded: 21000,
    });
  });

  it('a part payment after the as-of day is planned beside what is still expected', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-part', '2027-04-25', -50000, 'taxes', {
      schedule: taxSchedule,
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      openAmount: 40000,
    });
    const result = await calculate();
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.isPosted]),
    ).toEqual([
      ['tax-part', '2027-04-25', -50000, true],
      [`forecast-${taxSchedule}-2027-04-28`, '2027-04-28', -40000, false],
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 70000,
      projectedEndingBalance: -20000,
    });
  });

  it('a part payment on the due date leaves what is still expected in the plan', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-part', '2027-04-28', -50000, 'taxes', {
      schedule: taxSchedule,
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      openAmount: 40000,
    });
    const result = await calculate('2027-04-28');
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.isPosted]),
    ).toEqual([
      [`forecast-${taxSchedule}-2027-04-28`, '2027-04-28', -40000, false],
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 20000,
      projectedEndingBalance: -20000,
    });
  });

  it('a named payment after the as-of day is planned once, without a schedule of its own', async () => {
    const taxSchedule = await storeExample();
    await spend('by-hand', '2027-04-25', -90000, 'taxes');
    await spend('no-schedule', '2027-04-26', -700, 'fun');
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      transactionId: 'by-hand',
    });
    const result = await calculate();
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.scheduleId]),
    ).toEqual([['by-hand', '2027-04-25', -90000, taxSchedule]]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(-20000);
  });

  it('a named payment after the as-of day that is a transfer is planned with both legs', async () => {
    const taxSchedule = await storeExample();
    await db.insertTransaction({
      id: 'from-savings',
      account: 'savings',
      date: '2027-04-25',
      amount: -90000,
      category: 'taxes',
      transfer_id: 'to-checking',
    });
    await spend('to-checking', '2027-04-25', 90000, null, {
      transfer_id: 'from-savings',
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      transactionId: 'from-savings',
    });
    const result = await calculate();
    expect(
      result.movements.map(m => [
        m.id,
        m.account,
        m.amount,
        m.scheduleId,
        m.isTransfer,
        m.isPosted,
      ]),
    ).toEqual([
      ['from-savings', 'savings', -90000, taxSchedule, true, true],
      ['to-checking', 'checking', 90000, taxSchedule, true, true],
    ]);
    expect(result.cash?.projectedCash).toBe(420000);
  });

  it('a named part of a split after the as-of day is planned with the whole transaction', async () => {
    const taxSchedule = await storeExample();
    await spend('split', '2027-04-25', -100000, null, { is_parent: true });
    await spend('split-tax', '2027-04-25', -90000, 'taxes', {
      is_child: true,
      parent_id: 'split',
    });
    await spend('split-fun', '2027-04-25', -10000, 'fun', {
      is_child: true,
      parent_id: 'split',
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      transactionId: 'split-tax',
    });
    const result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'paid',
      paymentId: 'split-tax',
    });
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.scheduleId]),
    ).toEqual([['split', '2027-04-25', -100000, taxSchedule]]);
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

  it('a part that pays a charge itself counts in the period of that charge, not of the charge its split pays', async () => {
    await period('taxes', '2027-03-01', '2027-04-01', 10000);
    await period('taxes', '2027-04-01', '2027-05-01', 10000);
    const march = await schedule(-1000, '2027-03-15');
    const april = await schedule(-2000, '2027-04-15');
    for (const scheduleId of [march, april]) {
      await handlers['period-budget/link-schedule']({
        scheduleId,
        category: 'taxes',
      });
    }
    await spend('split', '2027-04-15', -3000, null, {
      is_parent: true,
      schedule: march,
    });
    await spend('march-part', '2027-04-15', -1000, 'taxes', {
      is_child: true,
      parent_id: 'split',
    });
    await spend('april-part', '2027-04-15', -2000, 'taxes', {
      is_child: true,
      parent_id: 'split',
      schedule: april,
    });
    const result = await calculate('2027-04-20', '2027-04-30');
    expect(result.charges.map(c => [c.status, c.paymentId])).toEqual([
      ['paid', 'split'],
      ['paid', 'april-part'],
    ]);
    expect(result.derivedOffsetIds).toEqual(['march-part']);
    expect(remainingOf(result, 'taxes:2027-03-01').remaining).toBe(9000);
    expect(remainingOf(result, 'taxes:2027-04-01').remaining).toBe(8000);
    expect(result.projection.summary.monthlyActualSpending).toBe(3000);
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
        isPosted: false,
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

  it('a split payment with every part in another category is not listed as paid outside the budget', async () => {
    const taxSchedule = await storeExample();
    await spend('split', '2027-04-19', -90000, null, {
      schedule: taxSchedule,
      is_parent: true,
    });
    await spend('split-fun', '2027-04-19', -10000, 'fun', {
      is_child: true,
      parent_id: 'split',
    });
    await spend('split-food', '2027-04-19', -80000, 'groceries', {
      is_child: true,
      parent_id: 'split',
    });
    const result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'paid',
      paymentId: 'split',
    });
    expect(result.paidOutsideBudget).toEqual([]);
    expect(result.derivedOffsetIds).toEqual([]);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 90000,
    });
    expect(remainingOf(result, 'fun:2027-04-01').remaining).toBe(5000);
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

  it('a schedule whose rule cannot be read is left out and the others are worked out', async () => {
    const taxSchedule = await storeExample();
    const brokenLinked = await schedule(-700, '2027-05-02');
    await handlers['period-budget/link-schedule']({
      scheduleId: brokenLinked,
      category: 'fun',
    });
    const brokenOther = await schedule(-300, '2027-05-03');
    let result = await calculate();
    expect(result.charges.map(c => c.scheduleId)).toEqual([
      taxSchedule,
      brokenLinked,
    ]);
    expect(result.movements.map(m => m.scheduleId)).toEqual([
      taxSchedule,
      brokenLinked,
      brokenOther,
    ]);

    // The same schedules as another program could have stored them.
    db.runQuery(
      "UPDATE rules SET conditions = '[null]' WHERE id IN (SELECT rule FROM schedules WHERE id IN (?, ?))",
      [brokenLinked, brokenOther],
    );
    result = await calculate();
    expect(result.charges.map(c => c.scheduleId)).toEqual([taxSchedule]);
    expect(result.movements.map(m => m.scheduleId)).toEqual([taxSchedule]);
    expect(accountOf(result, 'checking').transferNeeded).toBe(20000);
  });

  it('a payment between two due dates far apart belongs to the same charge on every as-of day', async () => {
    await period('fun', '2027-01-01', '2028-01-01', 20000);
    const rare = await schedule(-5000, {
      start: '2025-01-01',
      frequency: 'yearly',
      interval: 2,
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = 20270101, base_next_date = 20270101 WHERE schedule_id = ?',
      [rare],
    );
    await handlers['period-budget/link-schedule']({
      scheduleId: rare,
      category: 'fun',
    });
    // As far from 1 January 2025 as from 1 January 2027: the earlier one.
    await spend('rare-paid', '2026-01-01', -5000, 'fun', { schedule: rare });
    const early = await calculate('2025-01-01', '2027-12-31');
    expect(early.charges.map(c => [c.dueDate, c.status, c.paymentId])).toEqual([
      ['2025-01-01', 'paid', 'rare-paid'],
      ['2027-01-01', 'expected', null],
    ]);
    const late = await calculate('2027-01-01', '2027-12-31');
    expect(late.charges.map(c => [c.dueDate, c.status, c.paymentId])).toEqual([
      ['2027-01-01', 'expected', null],
    ]);
    expect(remainingOf(late, 'fun:2027-01-01')).toEqual(
      remainingOf(early, 'fun:2027-01-01'),
    );
  });

  it('a payment nearer to the due date before the first period is not taken for the first charge, half a year apart', async () => {
    await period('fun', '2027-07-01', '2028-01-01', 20000);
    const halfYearly = await schedule(-5000, {
      start: '2027-01-01',
      frequency: 'monthly',
      interval: 6,
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = 20270701, base_next_date = 20270701 WHERE schedule_id = ?',
      [halfYearly],
    );
    await handlers['period-budget/link-schedule']({
      scheduleId: halfYearly,
      category: 'fun',
    });
    // 90 days after 1 January, 91 days before 1 July.
    await spend('half-paid', '2027-04-01', -5000, 'fun', {
      schedule: halfYearly,
    });
    const result = await calculate('2027-07-01', '2027-12-31');
    expect(result.charges.map(c => [c.dueDate, c.status, c.paymentId])).toEqual(
      [['2027-07-01', 'expected', null]],
    );
    expect(result.derivedOffsetIds).toEqual([]);
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

  it('works out a schedule that started long ago from the due date before the first period', async () => {
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
    // The day before the first period: the payment of that day's charge.
    await spend('daily-before', '2026-12-31', -100, 'fun', {
      schedule: daily,
    });
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
  it('a payment that two charges name stays with the charge that is due earlier on every as-of day', async () => {
    await period('taxes', '2027-03-01', '2027-04-01', 90000);
    const monthly = await schedule(-1000, {
      start: '2027-01-01',
      frequency: 'monthly',
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = ?, base_next_date = ? WHERE schedule_id = ?',
      [20270301, 20270301, monthly],
    );
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    await spend('shared-payment', '2027-03-05', -1000, 'taxes');
    for (const dueDate of ['2027-01-01', '2027-03-01']) {
      await handlers['period-budget/set-charge-override']({
        scheduleId: monthly,
        dueDate,
        transactionId: 'shared-payment',
      });
    }
    // January 1 is in the days asked for on the first as-of day only.
    for (const asOf of ['2027-01-01', '2027-03-01', '2027-03-20']) {
      const result = await calculate(asOf, '2027-03-31');
      expect(
        result.charges.find(c => c.id === `${monthly}:2027-03-01`),
      ).toMatchObject({ status: 'expected', paymentId: null });
      expect(result.needsAttention).toEqual([
        {
          table: 'period_charge_overrides',
          id: `${monthly}:2027-03-01`,
          reason: 'invalid-override',
          detail: `transaction "shared-payment" already pays charge ${monthly}:2027-01-01`,
        },
      ]);
    }
    // The payment counts as spending of March, and the charge stays expected.
    expect(
      remainingOf(
        await calculate('2027-03-20', '2027-03-31'),
        'taxes:2027-03-01',
      ),
    ).toEqual({ remaining: 89000, expectedRemaining: 88000 });
  });

  it('a payment named for a charge after the horizon is not taken for the charge it is nearest to', async () => {
    await period('taxes', '2027-03-01', '2027-04-01', 90000);
    const monthly = await schedule(-1000, {
      start: '2027-03-01',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    await spend('paid', '2027-03-03', -1000, 'taxes', { schedule: monthly });
    await handlers['period-budget/set-charge-override']({
      scheduleId: monthly,
      dueDate: '2027-06-01',
      transactionId: 'paid',
    });
    // June 1 is in the days asked for with the second horizon only.
    for (const horizonEnd of ['2027-03-31', '2027-06-30']) {
      const result = await calculate('2027-03-10', horizonEnd);
      expect(
        result.charges.find(c => c.id === `${monthly}:2027-03-01`),
      ).toMatchObject({ status: 'expected', paymentId: null });
      expect(
        result.needsAttention.filter(
          row => row.reason !== 'charge-period-missing',
        ),
      ).toEqual([]);
    }
    const result = await calculate('2027-03-10', '2027-06-30');
    expect(
      result.charges.find(c => c.id === `${monthly}:2027-06-01`),
    ).toMatchObject({ status: 'paid', paymentId: 'paid' });
  });

  it('a day that is not a due date names no payment, also outside the days asked for', async () => {
    await period('taxes', '2027-03-01', '2027-04-01', 90000);
    const monthly = await schedule(-1000, {
      start: '2027-01-01',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: monthly,
      category: 'taxes',
    });
    await spend('shared-payment', '2027-03-05', -1000, 'taxes');
    for (const dueDate of ['2027-01-15', '2027-03-01']) {
      await handlers['period-budget/set-charge-override']({
        scheduleId: monthly,
        dueDate,
        transactionId: 'shared-payment',
      });
    }
    for (const asOf of ['2027-01-01', '2027-03-01']) {
      const result = await calculate(asOf, '2027-03-31');
      expect(
        result.charges.find(c => c.id === `${monthly}:2027-03-01`),
      ).toMatchObject({ status: 'paid', paymentId: 'shared-payment' });
      expect(result.charges.map(c => c.dueDate)).not.toContain('2027-01-15');
    }
  });

  it('a due date that is moved off a weekend keeps a payment it names, also outside the days asked for', async () => {
    await period('fun', '2027-06-01', '2027-07-01', 20000);
    // 3 April 2027 is a Saturday: the due dates are April 2, May 3, June 3.
    const moved = await schedule(-700, {
      start: '2027-04-03',
      frequency: 'monthly',
      skipWeekend: true,
      weekendSolveMode: 'before',
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = ?, base_next_date = ? WHERE schedule_id = ?',
      [20270603, 20270603, moved],
    );
    await handlers['period-budget/link-schedule']({
      scheduleId: moved,
      category: 'fun',
    });
    await spend('shared-payment', '2027-06-04', -700, 'fun');
    for (const dueDate of ['2027-04-02', '2027-06-03']) {
      await handlers['period-budget/set-charge-override']({
        scheduleId: moved,
        dueDate,
        transactionId: 'shared-payment',
      });
    }
    // April 2 is in the days asked for on the first as-of day only.
    for (const asOf of ['2027-04-01', '2027-06-10']) {
      const result = await calculate(asOf, '2027-06-30');
      expect(
        result.charges.find(c => c.id === `${moved}:2027-06-03`),
      ).toMatchObject({ status: 'expected', paymentId: null });
      expect(result.needsAttention).toEqual([
        {
          table: 'period_charge_overrides',
          id: `${moved}:2027-06-03`,
          reason: 'invalid-override',
          detail: `transaction "shared-payment" already pays charge ${moved}:2027-04-02`,
        },
      ]);
    }
  });

  it('a payment named for a charge after the horizon is planned on its own day with every horizon', async () => {
    await period('fun', '2027-04-01', '2027-05-01', 20000);
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const fee = await schedule(-700, {
      start: '2027-04-05',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: fee,
      category: 'fun',
    });
    await spend('pre-paid', '2027-04-25', -700, 'fun');
    await handlers['period-budget/set-charge-override']({
      scheduleId: fee,
      dueDate: '2027-08-05',
      transactionId: 'pre-paid',
    });
    let result = await calculate('2027-04-20', '2027-05-31');
    expect(
      result.movements.map(m => [m.id, m.date, m.scheduleId, m.isPosted]),
    ).toEqual([
      [`forecast-${fee}-2027-04-05`, '2027-04-20', fee, false],
      ['pre-paid', '2027-04-25', fee, true],
      [`forecast-${fee}-2027-05-05`, '2027-05-05', fee, false],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(7900);

    result = await calculate('2027-04-20', '2027-08-31');
    expect(result.movements.map(m => [m.id, m.date])).toEqual([
      [`forecast-${fee}-2027-04-05`, '2027-04-20'],
      ['pre-paid', '2027-04-25'],
      [`forecast-${fee}-2027-05-05`, '2027-05-05'],
      [`forecast-${fee}-2027-06-05`, '2027-06-05'],
      [`forecast-${fee}-2027-07-05`, '2027-07-05'],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(6500);
  });

  it('a named payment pays the charge it is named for and nothing else', async () => {
    await period('fun', '2027-04-01', '2027-05-01', 20000);
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const fee = await schedule(-700, {
      start: '2027-04-05',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: fee,
      category: 'fun',
    });
    const own = await schedule(-700, '2027-04-26');
    await spend('pre-paid', '2027-04-25', -700, 'fun', { schedule: own });
    // Not named, it settles the schedule it carries.
    let result = await calculate('2027-04-20', '2027-05-31');
    expect(
      result.movements.map(m => [m.id, m.date, m.scheduleId, m.isPosted]),
    ).toEqual([
      [`forecast-${fee}-2027-04-05`, '2027-04-20', fee, false],
      ['pre-paid', '2027-04-25', own, true],
      [`forecast-${fee}-2027-05-05`, '2027-05-05', fee, false],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(7900);

    // Named for the charge of May, it pays that one and is shown under it.
    await handlers['period-budget/set-charge-override']({
      scheduleId: fee,
      dueDate: '2027-05-05',
      transactionId: 'pre-paid',
    });
    result = await calculate('2027-04-20', '2027-05-31');
    expect(
      result.movements.map(m => [m.id, m.date, m.scheduleId, m.isPosted]),
    ).toEqual([
      [`forecast-${fee}-2027-04-05`, '2027-04-20', fee, false],
      ['pre-paid', '2027-04-25', fee, true],
      [`forecast-${own}-2027-04-26`, '2027-04-26', own, false],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(7900);
  });

  it('a named split does not settle the schedule it carries through a part that carries it too', async () => {
    await period('taxes', '2027-04-01', '2027-05-01', 10000);
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const tax = await schedule(-1000, '2027-04-28');
    await handlers['period-budget/link-schedule']({
      scheduleId: tax,
      category: 'taxes',
    });
    const own = await schedule(-1000, '2027-04-25');
    await spend('split', '2027-04-25', -1000, null, {
      is_parent: true,
      schedule: own,
    });
    await spend('part', '2027-04-25', -1000, 'taxes', {
      is_child: true,
      parent_id: 'split',
      schedule: own,
    });
    // Not named, the split settles the schedule it carries, once.
    let result = await calculate('2027-04-20', '2027-04-30');
    expect(
      result.movements.map(m => [m.id, m.date, m.scheduleId, m.isPosted]),
    ).toEqual([
      ['split', '2027-04-25', own, true],
      [`forecast-${tax}-2027-04-28`, '2027-04-28', tax, false],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(8000);

    // Named for the charge, it pays the charge and nothing else: its part is
    // no payment of its own.
    await handlers['period-budget/set-charge-override']({
      scheduleId: tax,
      dueDate: '2027-04-28',
      transactionId: 'split',
    });
    result = await calculate('2027-04-20', '2027-04-30');
    expect(result.charges.map(c => [c.status, c.paymentId])).toEqual([
      ['paid', 'split'],
    ]);
    expect(
      result.movements.map(m => [m.id, m.date, m.scheduleId, m.isPosted]),
    ).toEqual([
      [`forecast-${own}-2027-04-25`, '2027-04-25', own, false],
      ['split', '2027-04-25', tax, true],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(8000);
  });

  it('a split with a named part keeps the schedule it carries', async () => {
    await period('fun', '2027-04-01', '2027-05-01', 20000);
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const fee = await schedule(-700, {
      start: '2027-04-05',
      frequency: 'monthly',
    });
    await handlers['period-budget/link-schedule']({
      scheduleId: fee,
      category: 'fun',
    });
    const own = await schedule(-700, '2027-04-26');
    await spend('both', '2027-04-25', -700, null, {
      is_parent: true,
      schedule: own,
    });
    await spend('both-fee', '2027-04-25', -700, 'fun', {
      is_child: true,
      parent_id: 'both',
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: fee,
      dueDate: '2027-05-05',
      transactionId: 'both-fee',
    });
    const result = await calculate('2027-04-20', '2027-05-31');
    expect(
      result.movements.map(m => [m.id, m.date, m.scheduleId, m.isPosted]),
    ).toEqual([
      [`forecast-${fee}-2027-04-05`, '2027-04-20', fee, false],
      ['both', '2027-04-25', own, true],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(8600);
  });

  it('a part of a split that carries the schedule pays the charge, and the split is planned once', async () => {
    const taxSchedule = await storeExample();
    await spend('split', '2027-04-25', -100000, null, { is_parent: true });
    await spend('split-tax', '2027-04-25', -90000, 'taxes', {
      is_child: true,
      parent_id: 'split',
      schedule: taxSchedule,
    });
    await spend('split-fun', '2027-04-25', -10000, 'fun', {
      is_child: true,
      parent_id: 'split',
    });
    const result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'paid',
      paymentId: 'split-tax',
      isNamedPayment: false,
      furtherPaymentIds: [],
    });
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.scheduleId]),
    ).toEqual([['split', '2027-04-25', -100000, taxSchedule]]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(-30000);
    expect(result.paidOutsideBudget).toEqual([]);
  });

  it('one split pays every schedule that it and its parts carry, linked or not, and is planned once', async () => {
    const taxSchedule = await storeExample();
    const insuranceSchedule = await schedule(-120000, '2027-05-10');
    await handlers['period-budget/link-schedule']({
      scheduleId: insuranceSchedule,
      category: 'insurance',
    });
    const own = await schedule(-700, '2027-04-24');
    const fee = await schedule(-500, '2027-04-30');
    await spend('split', '2027-04-25', -211200, null, {
      is_parent: true,
      schedule: own,
    });
    await spend('split-tax', '2027-04-25', -90000, 'taxes', {
      is_child: true,
      parent_id: 'split',
      schedule: taxSchedule,
    });
    await spend('split-insurance', '2027-04-25', -120000, 'insurance', {
      is_child: true,
      parent_id: 'split',
      schedule: insuranceSchedule,
    });
    await spend('split-fee', '2027-04-25', -500, null, {
      is_child: true,
      parent_id: 'split',
      schedule: fee,
    });
    await spend('split-own', '2027-04-25', -700, null, {
      is_child: true,
      parent_id: 'split',
      schedule: own,
    });
    for (const asOf of ['2027-04-20', '2027-04-25']) {
      const result = await calculate(asOf, '2027-06-30');
      expect(result.charges.map(c => [c.id, c.status, c.paymentId])).toEqual([
        [`${taxSchedule}:2027-04-28`, 'paid', 'split-tax'],
        [`${insuranceSchedule}:2027-05-10`, 'paid', 'split-insurance'],
      ]);
      expect(
        result.movements.map(m => [m.id, m.date, m.amount, m.scheduleId]),
      ).toEqual(
        asOf === '2027-04-20' ? [['split', '2027-04-25', -211200, own]] : [],
      );
      expect(accountOf(result, 'checking').projectedEndingBalance).toBe(
        70000 - 211200,
      );
    }
  });

  it('a part without its split is no spending, pays nothing, is not planned and cannot be named', async () => {
    const taxSchedule = await storeExample();
    await spend('lone-part', '2027-04-25', -90000, 'taxes', {
      is_child: true,
      parent_id: 'lone-part',
      schedule: taxSchedule,
    });
    // Dated before the as-of day: no balance counts it, so no period does.
    await spend('lone-early', '2027-04-19', -1000, 'taxes', {
      is_child: true,
      parent_id: 'lone-early',
    });
    let result = await calculate();
    expect(result.projection.summary.monthlyActualSpending).toBe(223000);
    expect(remainingOf(result, 'taxes:2027-04-01')).toEqual({
      remaining: 90000,
      expectedRemaining: 0,
    });
    expect(accountOf(result, 'checking').currentBalance).toBe(70000);
    expect(result.charges[0]).toMatchObject({
      status: 'expected',
      paymentId: null,
    });
    expect(result.movements.map(m => [m.id, m.date, m.amount])).toEqual([
      [`forecast-${taxSchedule}-2027-04-28`, '2027-04-28', -90000],
    ]);

    await handlers['period-budget/set-charge-override']({
      scheduleId: taxSchedule,
      dueDate: '2027-04-28',
      transactionId: 'lone-part',
    });
    result = await calculate();
    expect(result.charges[0]).toMatchObject({
      status: 'expected',
      paymentId: null,
    });
    expect(
      result.needsAttention.filter(row => row.reason === 'invalid-override'),
    ).toEqual([
      {
        table: 'period_charge_overrides',
        id: `${taxSchedule}:2027-04-28`,
        reason: 'invalid-override',
        detail: 'named transaction "lone-part" is missing',
      },
    ]);
    expect(result.movements.map(m => m.id)).toEqual([
      `forecast-${taxSchedule}-2027-04-28`,
    ]);
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

  it('plans an entered payment of a schedule that is not linked once, on its own day', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const bill = await schedule(-9000, {
      start: '2027-04-28',
      frequency: 'monthly',
    });
    await spend('bill-paid', '2027-04-28', -9000, null, { schedule: bill });
    // A part that has itself as its split is in no balance, is not planned
    // and is no payment of the occurrence of May 28.
    await spend('bill-part', '2027-05-27', -100, null, {
      schedule: bill,
      is_child: true,
      parent_id: 'bill-part',
    });
    let result = await calculate('2027-04-20', '2027-05-27');
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.isPosted]),
    ).toEqual([['bill-paid', '2027-04-28', -9000, true]]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 10000,
      projectedEndingBalance: 1000,
    });

    result = await calculate('2027-04-20', '2027-05-28');
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.isPosted]),
    ).toEqual([
      ['bill-paid', '2027-04-28', -9000, true],
      [`forecast-${bill}-2027-05-28`, '2027-05-28', -9000, false],
    ]);

    result = await calculate('2027-04-28', '2027-05-27');
    expect(result.movements).toEqual([]);
    expect(accountOf(result, 'checking').currentBalance).toBe(1000);
  });

  it('a transfer to a part without its split is planned with its own leg only', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const move = await schedule(-300, '2027-04-26');
    await spend('move-out', '2027-04-26', -300, null, {
      schedule: move,
      transfer_id: 'lone-in',
    });
    // In no balance on any day, so never planned either.
    await db.insertTransaction({
      id: 'lone-in',
      account: 'savings',
      date: '2027-04-26',
      amount: 300,
      is_child: true,
      parent_id: 'lone-in',
      transfer_id: 'move-out',
    });
    let result = await calculate('2027-04-20', '2027-04-30');
    expect(result.movements.map(m => [m.id, m.account, m.amount])).toEqual([
      ['move-out', 'checking', -300],
    ]);
    expect(accountOf(result, 'savings').projectedEndingBalance).toBe(0);
    result = await calculate('2027-04-26', '2027-04-30');
    expect(result.movements).toEqual([]);
    expect(accountOf(result, 'savings').projectedEndingBalance).toBe(0);
  });

  it('plans an entered split payment with the other leg of the part that is a transfer', async () => {
    await storeExample();
    const pay = await schedule(-30000, '2027-04-26');
    await spend('pay-split', '2027-04-26', -30000, null, {
      schedule: pay,
      is_parent: true,
    });
    await spend('pay-split-save', '2027-04-26', -20000, null, {
      is_child: true,
      parent_id: 'pay-split',
      transfer_id: 'save-in',
    });
    await spend('pay-split-fun', '2027-04-26', -10000, 'fun', {
      is_child: true,
      parent_id: 'pay-split',
    });
    await db.insertTransaction({
      id: 'save-in',
      account: 'savings',
      date: '2027-04-26',
      amount: 20000,
      transfer_id: 'pay-split-save',
    });
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === pay)
        .map(m => [m.id, m.account, m.amount, m.isTransfer]),
    ).toEqual([
      ['pay-split', 'checking', -30000, false],
      ['save-in', 'savings', 20000, true],
    ]);
  });

  it('plans an entered transfer into a split with the whole split', async () => {
    await storeExample();
    const deposit = await schedule(20000, '2027-04-26');
    await db.insertTransaction({
      id: 'save-in',
      account: 'savings',
      date: '2027-04-26',
      amount: 20000,
      schedule: deposit,
      transfer_id: 'pay-split-save',
    });
    await spend('pay-split', '2027-04-26', -30000, null, { is_parent: true });
    await spend('pay-split-save', '2027-04-26', -20000, null, {
      is_child: true,
      parent_id: 'pay-split',
      transfer_id: 'save-in',
    });
    await spend('pay-split-fun', '2027-04-26', -10000, 'fun', {
      is_child: true,
      parent_id: 'pay-split',
    });
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === deposit)
        .map(m => [m.id, m.account, m.amount, m.isTransfer]),
    ).toEqual([
      ['pay-split', 'checking', -30000, false],
      ['save-in', 'savings', 20000, true],
    ]);
  });

  it('keeps the schedule of each leg of an entered transfer that carries two', async () => {
    await storeExample();
    const out = await schedule(-20000, '2027-04-26');
    const into = await schedule(20000, '2027-04-26', [
      { op: 'is', field: 'account', value: 'savings' },
    ]);
    await db.insertTransaction({
      id: 'leg-out',
      account: 'checking',
      date: '2027-04-26',
      amount: -20000,
      schedule: out,
      transfer_id: 'leg-in',
    });
    await db.insertTransaction({
      id: 'leg-in',
      account: 'savings',
      date: '2027-04-26',
      amount: 20000,
      schedule: into,
      transfer_id: 'leg-out',
    });
    const result = await calculate();
    expect(
      result.movements
        .filter(m => m.isPosted)
        .map(m => [m.id, m.scheduleId, m.isTransfer]),
    ).toEqual([
      ['leg-in', into, true],
      ['leg-out', out, true],
    ]);
  });

  it('plans every leg of the transfers of a split that an entered transfer reaches', async () => {
    await db.insertAccount({ id: 'third', name: 'Third' });
    for (const account of ['checking', 'savings', 'third']) {
      await db.insertTransaction({
        id: `open-${account}`,
        account,
        date: '2027-01-01',
        amount: 10000,
        starting_balance_flag: true,
      });
    }
    const deposit = await schedule(2000, '2027-04-26', [
      { op: 'is', field: 'account', value: 'savings' },
    ]);
    await spend('parent', '2027-04-26', -3000, null, { is_parent: true });
    await spend('to-savings', '2027-04-26', -2000, null, {
      is_child: true,
      parent_id: 'parent',
      transfer_id: 'savings-in',
    });
    await spend('to-third', '2027-04-26', -1000, null, {
      is_child: true,
      parent_id: 'parent',
      transfer_id: 'third-in',
    });
    await db.insertTransaction({
      id: 'savings-in',
      account: 'savings',
      date: '2027-04-26',
      amount: 2000,
      schedule: deposit,
      transfer_id: 'to-savings',
    });
    await db.insertTransaction({
      id: 'third-in',
      account: 'third',
      date: '2027-04-26',
      amount: 1000,
      transfer_id: 'to-third',
    });
    const result = await calculate('2027-04-20', '2027-04-30');
    expect(
      result.movements.map(m => [
        m.id,
        m.account,
        m.amount,
        m.scheduleId,
        m.isPosted,
      ]),
    ).toEqual([
      ['parent', 'checking', -3000, deposit, true],
      ['savings-in', 'savings', 2000, deposit, true],
      ['third-in', 'third', 1000, deposit, true],
    ]);
    expect(result.cash?.cashAvailable).toBe(30000);
    expect(result.cash?.projectedCash).toBe(30000);
  });

  it('a transaction that two entered transfers reach has the schedule of the one with the smaller id', async () => {
    const first = await schedule(-100, '2027-04-25');
    const second = await schedule(-200, '2027-04-26');
    // Stored in the order of their ids and of their days.
    await spend('a1', '2027-04-25', -100, null, {
      schedule: first,
      transfer_id: 'x1-a',
    });
    await spend('b1', '2027-04-26', -200, null, {
      schedule: second,
      transfer_id: 'x1-b',
    });
    // Stored against the order of their ids and of their days.
    await spend('d2', '2027-04-25', -100, null, {
      schedule: first,
      transfer_id: 'x2-d',
    });
    await spend('c2', '2027-04-26', -200, null, {
      schedule: second,
      transfer_id: 'x2-c',
    });
    // A split that has its schedule from a part, with a smaller id than a
    // transaction that carries its own.
    await spend('z3', '2027-04-25', -100, null, {
      schedule: first,
      transfer_id: 'x3-z',
    });
    await spend('y3', '2027-04-26', -200, null, { is_parent: true });
    await spend('y3-part', '2027-04-26', -200, null, {
      is_child: true,
      parent_id: 'y3',
      schedule: second,
      transfer_id: 'x3-y',
    });
    for (const [id, parts] of [
      ['x1', ['a', 'b']],
      ['x2', ['d', 'c']],
      ['x3', ['z', 'y']],
    ] satisfies Array<[string, string[]]>) {
      await db.insertTransaction({
        id,
        account: 'savings',
        date: '2027-04-27',
        amount: 300,
        is_parent: true,
      });
      for (const part of parts) {
        await db.insertTransaction({
          id: `${id}-${part}`,
          account: 'savings',
          date: '2027-04-27',
          amount: 150,
          is_child: true,
          parent_id: id,
        });
      }
    }
    const result = await calculate('2027-04-20', '2027-04-30');
    expect(
      result.movements
        .filter(m => m.account === 'savings')
        .map(m => [m.id, m.scheduleId]),
    ).toEqual([
      ['x1', first],
      ['x2', second],
      ['x3', second],
    ]);
  });

  it('a split has its own schedule, or else that of its part with the smallest id that carries one', async () => {
    const first = await schedule(-100, '2027-04-25');
    const second = await schedule(-200, '2027-04-26');
    for (const [id, own, parts] of [
      ['own', second, [['own-a', first]]],
      [
        'parts-1',
        null,
        [
          ['parts-1-a', first],
          ['parts-1-b', second],
        ],
      ],
      [
        'parts-2',
        null,
        [
          ['parts-2-b', first],
          ['parts-2-a', second],
        ],
      ],
    ] satisfies Array<[string, string | null, Array<[string, string]>]>) {
      await spend(id, '2027-04-27', -300, null, {
        is_parent: true,
        schedule: own,
      });
      for (const [partId, partSchedule] of parts) {
        await spend(partId, '2027-04-27', -150, null, {
          is_child: true,
          parent_id: id,
          schedule: partSchedule,
        });
      }
    }
    // Actual now reads this part before the one with the smaller id.
    db.runQuery(
      'UPDATE transactions SET sort_order = sort_order + 1 WHERE id = ?',
      ['parts-2-b'],
    );
    const result = await calculate('2027-04-20', '2027-04-30');
    expect(result.movements.map(m => [m.id, m.scheduleId])).toEqual([
      ['own', second],
      ['parts-1', first],
      ['parts-2', second],
    ]);
  });

  it('an entered payment of a schedule with one date is not expected again, dated before or after the due date', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const early = await schedule(-9000, '2027-04-28');
    await spend('early-entered', '2027-04-27', -9000, null, {
      schedule: early,
    });
    let result = await calculate('2027-04-20', '2027-04-30');
    expect(result.movements.map(m => [m.id, m.date, m.isPosted])).toEqual([
      ['early-entered', '2027-04-27', true],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(1000);

    const late = await schedule(-500, '2027-04-22');
    await spend('late-entered', '2027-04-29', -500, null, { schedule: late });
    result = await calculate('2027-04-20', '2027-04-30');
    expect(result.movements.map(m => [m.id, m.date, m.isPosted])).toEqual([
      ['early-entered', '2027-04-27', true],
      ['late-entered', '2027-04-29', true],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(500);

    // Both payments are in the balance; one schedule is overdue in Actual.
    result = await calculate('2027-04-29', '2027-04-30');
    expect(result.movements).toEqual([]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 500,
      projectedEndingBalance: 500,
    });

    // The payment is in the balance before the due date.
    result = await calculate('2027-04-27', '2027-04-30');
    expect(result.movements.map(m => m.id)).toEqual(['late-entered']);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 1000,
      projectedEndingBalance: 500,
    });
  });

  it('an early payment of a repeating schedule that is not linked settles the occurrence it is nearest to', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const bill = await schedule(-900, {
      start: '2027-04-28',
      frequency: 'monthly',
    });
    const pay = await schedule(3000, {
      start: '2027-04-30',
      frequency: 'monthly',
    });
    await spend('bill-early', '2027-04-19', -900, null, { schedule: bill });
    await spend('pay-early', '2027-04-23', 3000, null, { schedule: pay });
    const result = await calculate('2027-04-20', '2027-05-31');
    expect(
      result.movements.map(m => [m.id, m.date, m.amount, m.isPosted]),
    ).toEqual([
      ['pay-early', '2027-04-23', 3000, true],
      [`forecast-${bill}-2027-05-28`, '2027-05-28', -900, false],
      [`forecast-${pay}-2027-05-30`, '2027-05-30', 3000, false],
    ]);
    expect(accountOf(result, 'checking')).toMatchObject({
      currentBalance: 9100,
      projectedEndingBalance: 14200,
    });
  });

  it('a payment that is nearer to the due date before the next one settles nothing that is expected', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const bill = await schedule(-900, {
      start: '2027-02-01',
      frequency: 'monthly',
    });
    // February is paid and Actual expects March 1 next.
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = ?, base_next_date = ? WHERE schedule_id = ?',
      [20270301, 20270301, bill],
    );
    // 13 days after February 1 and 15 days before March 1.
    await spend('february', '2027-02-14', -900, null, { schedule: bill });
    let result = await calculate('2027-02-20', '2027-03-31');
    expect(result.movements.map(m => [m.id, m.amount])).toEqual([
      [`forecast-${bill}-2027-03-01`, -900],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(8200);

    // 14 days after February 1 and 14 days before March 1: the earlier one.
    db.runQuery('UPDATE transactions SET date = 20270215 WHERE id = ?', [
      'february',
    ]);
    result = await calculate('2027-02-20', '2027-03-31');
    expect(result.movements.map(m => m.id)).toEqual([
      `forecast-${bill}-2027-03-01`,
    ]);

    // 15 days after February 1 and 13 days before March 1.
    db.runQuery('UPDATE transactions SET date = 20270216 WHERE id = ?', [
      'february',
    ]);
    result = await calculate('2027-02-20', '2027-03-31');
    expect(result.movements).toEqual([]);
  });

  it('a payment of the occurrence before an overdue one does not settle the overdue one', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const bill = await schedule(-900, {
      start: '2027-02-01',
      frequency: 'monthly',
    });
    // February is paid, and March 1 is overdue on the as-of day.
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = ?, base_next_date = ? WHERE schedule_id = ?',
      [20270301, 20270301, bill],
    );
    await spend('february', '2027-02-14', -900, null, { schedule: bill });
    const result = await calculate('2027-03-10', '2027-03-31');
    expect(result.movements.map(m => [m.id, m.date, m.amount])).toEqual([
      [`forecast-${bill}-2027-03-01`, '2027-03-10', -900],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(8200);
  });

  it('an entered payment settles the next date Actual keeps, also when the rule does not give that date', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const bill = await schedule(-900, {
      start: '2027-02-01',
      frequency: 'monthly',
    });
    db.runQuery(
      'UPDATE schedules_next_date SET local_next_date = ?, base_next_date = ? WHERE schedule_id = ?',
      [20270303, 20270303, bill],
    );
    let result = await calculate('2027-02-20', '2027-03-31');
    expect(result.movements.map(m => [m.id, m.date])).toEqual([
      [`forecast-${bill}-2027-03-03`, '2027-03-03'],
    ]);

    await spend('march', '2027-03-04', -900, null, { schedule: bill });
    result = await calculate('2027-02-20', '2027-03-31');
    expect(result.movements.map(m => [m.id, m.date, m.isPosted])).toEqual([
      ['march', '2027-03-04', true],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(9100);
  });

  it('a payment nearer to the first due date after the horizon settles nothing inside it', async () => {
    await spend('open', '2027-01-01', 10000, null, {
      starting_balance_flag: true,
    });
    const bill = await schedule(-900, {
      start: '2027-03-01',
      frequency: 'monthly',
    });
    // 16 days after March 1 and 15 days before April 1.
    await spend('for-april', '2027-03-17', -900, null, { schedule: bill });
    const result = await calculate('2027-03-10', '2027-03-31');
    expect(result.movements.map(m => [m.id, m.date, m.isPosted])).toEqual([
      [`forecast-${bill}-2027-03-01`, '2027-03-10', false],
      ['for-april', '2027-03-17', true],
    ]);
    expect(accountOf(result, 'checking').projectedEndingBalance).toBe(8200);
  });

  it('an entered transfer of a schedule that is not linked settles both legs of its occurrence', async () => {
    await storeExample();
    const toSavings = await db.insertPayee({
      id: 'to-savings',
      name: 'Savings',
      transfer_acct: 'savings',
    });
    const save = await schedule(-20000, '2027-04-28', [
      { op: 'is', field: 'payee', value: toSavings },
    ]);
    let result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === save)
        .map(m => [m.id, m.account, m.amount]),
    ).toEqual([
      [`forecast-${save}-2027-04-28`, 'checking', -20000],
      [`forecast-${save}-2027-04-28-transfer`, 'savings', 20000],
    ]);

    await spend('save-out', '2027-04-26', -20000, null, {
      schedule: save,
      transfer_id: 'save-in',
    });
    await db.insertTransaction({
      id: 'save-in',
      account: 'savings',
      date: '2027-04-26',
      amount: 20000,
      transfer_id: 'save-out',
    });
    result = await calculate();
    expect(
      result.movements
        .filter(m => m.scheduleId === save)
        .map(m => [m.id, m.account, m.amount, m.isPosted]),
    ).toEqual([
      ['save-in', 'savings', 20000, true],
      ['save-out', 'checking', -20000, true],
    ]);
    expect(result.cash?.projectedCash).toBe(330000);
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
    const taxSchedule = await storeExample();
    const power = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'checking' },
        { op: 'isapprox', field: 'amount', value: -8000 },
        { op: 'is', field: 'date', value: '2027-05-04' },
      ] satisfies RuleConditionEntity[],
    });
    const water = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'checking' },
        {
          op: 'isbetween',
          field: 'amount',
          value: { num1: -1000, num2: -2000 },
        },
        { op: 'is', field: 'date', value: '2027-05-05' },
      ] satisfies RuleConditionEntity[],
    });
    const result = await calculate();
    expect(
      result.movements.map(m => [m.scheduleId, m.amount, m.isApproximate]),
    ).toEqual([
      [taxSchedule, -90000, false],
      [power, -8000, true],
      [water, -1500, true],
    ]);
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
    const taxSchedule = await storeExample();
    await spend('later', '2027-04-21', -1234, 'fun');
    // A day that does not exist is in no balance.
    await spend('no-such-day', '2027-02-01', -55, 'fun');
    db.runQuery('UPDATE transactions SET date = 20270231 WHERE id = ?', [
      'no-such-day',
    ]);
    const result = await calculate();
    expect(accountOf(result, 'checking').currentBalance).toBe(70000);
    // A transaction that carries no schedule and pays no charge is not planned.
    expect(result.movements.map(m => m.id)).toEqual([
      `forecast-${taxSchedule}-2027-04-28`,
    ]);
    expect(
      accountOf(await calculate('2027-04-21'), 'checking').currentBalance,
    ).toBe(68766);
  });

  it('gives the exact balance when large amounts cancel each other', async () => {
    const large = Number.MAX_SAFE_INTEGER;
    // Actual lists the latest transaction first. Added as plain numbers in
    // that order, the balances would come out as 1 and -1.
    await spend('opening', '2027-01-01', -large, null);
    await spend('small', '2027-01-02', 2, null);
    await spend('large', '2027-01-03', large, null);
    await spend('s-opening', '2027-01-04', large, null, { account: 'savings' });
    await spend('s-small', '2027-01-05', -2, null, { account: 'savings' });
    await spend('s-large', '2027-01-06', -large, null, { account: 'savings' });
    const result = await calculate();
    expect(accountOf(result, 'checking').currentBalance).toBe(2);
    expect(accountOf(result, 'savings').currentBalance).toBe(-2);
    expect(result.cash).toMatchObject({
      cashAvailable: 0,
      inAccounts: 2,
      owed: 2,
      projectedCash: 0,
    });
    // The amounts of the first two days do not cancel: the balance is exact
    // there too.
    expect(
      accountOf(await calculate('2027-01-02'), 'checking').currentBalance,
    ).toBe(2 - large);
  });

  it('gives no cash plan when the balance of a selected account is too large', async () => {
    const taxSchedule = await storeExample();
    await spend('huge', '2027-04-21', Number.MAX_SAFE_INTEGER, null);
    expect((await calculate()).cash?.cashAvailable).toBe(420000);
    const result = await calculate('2027-04-21');
    expect(result.cash).toBeNull();
    // The rest of the calculation is there.
    expect(remainingOf(result, 'groceries:2027-04-01').remaining).toBe(-8000);
    expect(result.movements.map(m => m.id)).toEqual([
      `forecast-${taxSchedule}-2027-04-28`,
    ]);
  });

  it('gives no cash plan when an amount of a selected account is no whole number', async () => {
    await storeExample();
    // Two halves add up to a whole number, and are still no amounts.
    await spend('half-1', '2027-04-21', 1, null, { account: 'savings' });
    await spend('half-2', '2027-04-21', 1, null, { account: 'savings' });
    db.runQuery('UPDATE transactions SET amount = 0.5 WHERE id IN (?, ?)', [
      'half-1',
      'half-2',
    ]);
    expect((await calculate()).cash?.cashAvailable).toBe(420000);
    expect((await calculate('2027-04-21')).cash).toBeNull();

    await handlers['period-budget/exclude-account']({ accountId: 'savings' });
    expect((await calculate('2027-04-21')).cash?.cashAvailable).toBe(70000);
  });

  it('an account that is not selected and has no exact balance leaves the cash plan as it is', async () => {
    await storeExample();
    await db.insertAccount({ id: 'old', name: 'Old', closed: 1 });
    await db.insertAccount({ id: 'loan', name: 'Loan', offbudget: 1 });
    const large = Number.MAX_SAFE_INTEGER;
    await spend('old-1', '2027-01-01', 3, null, { account: 'old' });
    db.runQuery('UPDATE transactions SET amount = 0.5 WHERE id = ?', ['old-1']);
    await spend('loan-1', '2027-01-01', -large, null, { account: 'loan' });
    await spend('loan-2', '2027-01-02', -large, null, { account: 'loan' });
    const result = await calculate();
    expect(result.cash?.accounts.map(a => a.accountId)).toEqual([
      'checking',
      'savings',
    ]);
    expect(result.cash?.cashAvailable).toBe(420000);
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

describe('period-budget/calculate: payments', () => {
  function paymentsOf(result: PeriodBudgetCalculation) {
    return [...result.payments].sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  it('lists the payments of the worked example with their periods', async () => {
    await storeExample();
    const result = await calculate();
    expect(paymentsOf(result)).toEqual([
      {
        id: 'cinema',
        category: 'fun',
        date: '2027-04-10',
        amount: -5000,
        periodId: 'fun:2027-04-01',
        account: 'checking',
        payee: null,
      },
      {
        id: 'food-1',
        category: 'groceries',
        date: '2027-04-05',
        amount: -40000,
        periodId: 'groceries:2027-04-01',
        account: 'checking',
        payee: null,
      },
      {
        id: 'food-2',
        category: 'groceries',
        date: '2027-04-12',
        amount: -28000,
        periodId: 'groceries:2027-04-01',
        account: 'checking',
        payee: null,
      },
      {
        id: 'insurance-paid',
        category: 'insurance',
        date: '2027-03-15',
        amount: -120000,
        periodId: 'insurance:2027-01-01',
        account: 'checking',
        payee: null,
      },
      {
        id: 'rent-paid',
        category: 'rent',
        date: '2027-04-01',
        amount: -150000,
        periodId: 'rent:2027-04-01',
        account: 'checking',
        payee: null,
      },
    ]);
  });

  it('the payments of a period add up to its spending, and those of the month to the monthly spending', async () => {
    const taxSchedule = await storeExample();
    await spend('tax-early', '2027-03-30', -91000, 'taxes', {
      schedule: taxSchedule,
    });
    await spend('food-late', '2027-05-02', -700, 'groceries');
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'food-late',
        periodId: 'groceries:2027-04-01',
      }),
    ).toEqual({ id: 'food-late' });
    await spend('food-before', '2027-03-31', -300, 'groceries');

    for (const asOf of ['2027-03-31', '2027-04-20', '2027-05-10']) {
      const result = await calculate(asOf, '2027-05-31');
      for (const { period, netSpending } of result.projection.summary.periods) {
        const counted = result.payments
          .filter(payment => payment.periodId === period.id)
          .reduce((sum, payment) => sum + payment.amount, 0);
        expect(counted === 0 ? 0 : -counted).toBe(netSpending);
      }
      const monthStart = `${asOf.slice(0, 8)}01`;
      const inMonth = result.payments
        .filter(payment => payment.date >= monthStart)
        .reduce((sum, payment) => sum + payment.amount, 0);
      expect(inMonth === 0 ? 0 : -inMonth).toBe(
        result.projection.summary.monthlyActualSpending,
      );
      expect(
        result.payments
          .filter(payment => payment.periodId === null)
          .map(payment => payment.id)
          .sort(),
      ).toEqual([...result.projection.summary.unassignedPostingIds].sort());
    }

    const result = await calculate('2027-05-10', '2027-05-31');
    expect(
      paymentsOf(result)
        .filter(payment => payment.id.includes('-'))
        .map(payment => [payment.id, payment.periodId]),
    ).toEqual([
      ['food-1', 'groceries:2027-04-01'],
      ['food-2', 'groceries:2027-04-01'],
      ['food-before', null],
      ['food-late', 'groceries:2027-04-01'],
      ['insurance-paid', 'insurance:2027-01-01'],
      ['rent-paid', 'rent:2027-04-01'],
      ['tax-early', 'taxes:2027-04-01'],
    ]);
    expect(result.derivedOffsetIds).toEqual(['tax-early']);
  });

  it('a payment in a category without a period is listed only in the month of the as-of day', async () => {
    await period('groceries', '2027-04-01', '2027-05-01', 60000);
    await spend('rent-march', '2027-03-01', -150000, 'rent');
    await spend('rent-april', '2027-04-01', -150000, 'rent');
    await spend('food-march', '2027-03-05', -4000, 'groceries');
    await spend('food-april', '2027-04-05', -4000, 'groceries');
    await spend('food-first', '2027-04-01', -100, 'groceries');
    await spend('rent-later', '2027-04-21', -100, 'rent');

    const result = await calculate();
    expect(
      paymentsOf(result).map(payment => [payment.id, payment.periodId]),
    ).toEqual([
      ['food-april', 'groceries:2027-04-01'],
      ['food-first', 'groceries:2027-04-01'],
      ['food-march', null],
      ['rent-april', null],
    ]);
    expect(result.projection.summary.unassignedPostingIds.sort()).toEqual([
      'food-march',
      'rent-april',
      'rent-march',
    ]);
  });

  it('gives the payee and the account, and the parts of a split in place of the split', async () => {
    await period('groceries', '2027-04-01', '2027-05-01', 60000);
    await period('fun', '2027-04-01', '2027-05-01', 20000);
    const shop = await db.insertPayee({ name: 'Shop' });
    await db.insertTransaction({
      id: 'from-savings',
      account: 'savings',
      date: '2027-04-03',
      amount: -1200,
      category: 'groceries',
      payee: shop,
    });
    await spend('split', '2027-04-06', -5000, null, { is_parent: true });
    await spend('part-food', '2027-04-06', -3000, 'groceries', {
      is_child: true,
      parent_id: 'split',
      payee: shop,
    });
    await spend('part-fun', '2027-04-06', -2000, 'fun', {
      is_child: true,
      parent_id: 'split',
    });

    const result = await calculate();
    expect(paymentsOf(result)).toEqual([
      {
        id: 'from-savings',
        category: 'groceries',
        date: '2027-04-03',
        amount: -1200,
        periodId: 'groceries:2027-04-01',
        account: 'savings',
        payee: shop,
      },
      {
        id: 'part-food',
        category: 'groceries',
        date: '2027-04-06',
        amount: -3000,
        periodId: 'groceries:2027-04-01',
        account: 'checking',
        payee: shop,
      },
      {
        id: 'part-fun',
        category: 'fun',
        date: '2027-04-06',
        amount: -2000,
        periodId: 'fun:2027-04-01',
        account: 'checking',
        payee: null,
      },
    ]);
  });
});
