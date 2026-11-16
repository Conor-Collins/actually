import type { ScheduledCashMovement } from '@actual-app/core/server/period-budget/calculate';
import * as monthUtils from '@actual-app/core/shared/months';
import { planCash } from '@actual-app/core/shared/period-charges';

import { calculate } from './fixtures';
import { accountGroups, buildCashForecast } from './forecast';
import type { CashForecast } from './forecast';

const AS_OF = '2017-06-15';
// The last day the calculation looks at
const LAST_DAY = '2018-06-30';

type Balances = Record<string, number>;

// A scheduled movement as the calculation gives it: one that was due before
// the as-of day is planned on that day.
function move(
  id: string,
  account: string,
  dueDate: string,
  amount: number,
  fields: Partial<ScheduledCashMovement> = {},
  asOf = AS_OF,
): ScheduledCashMovement {
  return {
    id,
    account,
    date: dueDate < asOf ? asOf : dueDate,
    amount,
    dueDate,
    scheduleId: `sched-${id}`,
    isTransfer: false,
    isApproximate: false,
    isPosted: false,
    ...fields,
  };
}

function byDateThenId(a: ScheduledCashMovement, b: ScheduledCashMovement) {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function book(
  balances: Balances,
  movements: ScheduledCashMovement[],
  asOf = AS_OF,
  lastDay = LAST_DAY,
) {
  const ids = Object.keys(balances);
  const sorted = [...movements].sort(byDateThenId);
  return calculate({
    asOf,
    periods: [],
    fields: {
      horizonEnd: lastDay,
      cash: planCash({
        accounts: ids.map(id => ({ id, balance: balances[id] })),
        selectedAccountIds: ids,
        movements: sorted,
        asOf,
        horizonEnd: lastDay,
      }),
      movements: sorted,
    },
  });
}

function forecastOf(
  balances: Balances,
  movements: ScheduledCashMovement[],
  horizonEnd: string,
): CashForecast {
  const forecast = buildCashForecast({
    calculation: book(balances, movements),
    horizonEnd,
  });
  if (forecast === null) {
    throw new Error('No forecast');
  }
  return forecast;
}

function accountOf(forecast: CashForecast, id: string) {
  const account = forecast.accounts.find(entry => entry.accountId === id);
  if (!account) {
    throw new Error(`No account ${id}`);
  }
  return account;
}

describe('buildCashForecast', () => {
  it('is null when the calculation has no cash plan', () => {
    expect(
      buildCashForecast({
        calculation: calculate({ asOf: AS_OF, periods: [] }),
        horizonEnd: '2017-07-31',
      }),
    ).toBeNull();
  });

  it('is null when the last day is before the as-of day', () => {
    expect(
      buildCashForecast({
        calculation: book({ checking: 100000 }, []),
        horizonEnd: '2017-06-14',
      }),
    ).toBeNull();
  });

  it('counts the movements up to the last day, and the cash by its sign', () => {
    const forecast = forecastOf(
      { checking: 100000, card: -25000, savings: 300000 },
      [
        move('rent', 'checking', '2017-07-01', -90000),
        move('pay', 'checking', '2017-07-31', 200000),
        // The day after the last day
        move('rent-august', 'checking', '2017-08-01', -90000),
        move('card-bill', 'card', '2017-07-10', 25000),
      ],
      '2017-07-31',
    );

    expect(forecast).toMatchObject({
      asOf: '2017-06-15',
      horizonEnd: '2017-07-31',
      cashAvailable: 375000,
      inAccounts: 400000,
      owed: 25000,
      projectedCash: 510000,
    });
    expect(forecast.accounts.map(account => account.accountId)).toEqual([
      'checking',
      'card',
      'savings',
    ]);
    expect(accountOf(forecast, 'checking')).toMatchObject({
      currentBalance: 100000,
      minimumDailyClosingBalance: 10000,
      projectedEndingBalance: 210000,
      firstShortfallDate: null,
      transferNeeded: 0,
      isForecast: true,
    });
    expect(
      accountOf(forecast, 'checking').payments.map(movement => movement.id),
    ).toEqual(['rent']);
    expect(
      accountOf(forecast, 'checking').income.map(movement => movement.id),
    ).toEqual(['pay']);
  });

  it('does not look further than the calculation did', () => {
    const forecast = forecastOf(
      { checking: 100000 },
      [move('rent', 'checking', '2018-06-30', -90000)],
      '2018-12-31',
    );

    expect(forecast.horizonEnd).toBe('2018-06-30');
    expect(forecast.projectedCash).toBe(10000);

    // An account that is still short then is short until that day
    const short = forecastOf(
      { checking: 50000 },
      [move('rent', 'checking', '2018-06-20', -60000)],
      '2018-12-31',
    );
    expect(accountOf(short, 'checking').shortfalls).toEqual([
      { start: '2018-06-20', lastDay: '2018-06-30' },
    ]);
  });

  it('tells payments, income and transfers apart, and what is overdue', () => {
    const forecast = forecastOf(
      { checking: 100000, savings: 0 },
      [
        move('late-bill', 'checking', '2017-06-10', -1000),
        move('today', 'checking', '2017-06-15', -2000),
        move('pay', 'checking', '2017-06-20', 50000, { isApproximate: true }),
        move('to-savings', 'checking', '2017-06-25', -30000, {
          isTransfer: true,
        }),
        move('from-checking', 'savings', '2017-06-25', 30000, {
          isTransfer: true,
        }),
        move('entered', 'checking', '2017-06-28', -500, { isPosted: true }),
      ],
      '2017-06-30',
    );
    const checking = accountOf(forecast, 'checking');

    expect(
      checking.payments.map(movement => [
        movement.id,
        movement.kind,
        movement.date,
        movement.dueDate,
        movement.isOverdue,
      ]),
    ).toEqual([
      ['late-bill', 'payment', '2017-06-15', '2017-06-10', true],
      ['today', 'payment', '2017-06-15', '2017-06-15', false],
      ['entered', 'payment', '2017-06-28', '2017-06-28', false],
    ]);
    expect(checking.income).toMatchObject([
      { id: 'pay', kind: 'income', isApproximate: true, isOverdue: false },
    ]);
    expect(checking.transfers).toMatchObject([
      { id: 'to-savings', kind: 'transfer', amount: -30000 },
    ]);
    // A transfer that comes in is a transfer, not income
    expect(accountOf(forecast, 'savings')).toMatchObject({
      income: [],
      payments: [],
      transfers: [{ id: 'from-checking', kind: 'transfer', amount: 30000 }],
    });
  });

  it('has the closing balance of the as-of day and of each later day with a movement', () => {
    const forecast = forecastOf(
      { checking: 100000 },
      [
        // Both leave the account on the as-of day
        move('late-bill', 'checking', '2017-06-10', -1000),
        move('today', 'checking', '2017-06-15', -2000),
        move('a', 'checking', '2017-06-20', -40000),
        move('b', 'checking', '2017-06-20', 15000),
        move('c', 'checking', '2017-06-30', -5000),
        move('d', 'checking', '2017-07-01', -7000),
      ],
      '2017-06-30',
    );

    expect(accountOf(forecast, 'checking').points).toEqual([
      { date: '2017-06-15', balance: 97000 },
      { date: '2017-06-20', balance: 72000 },
      { date: '2017-06-30', balance: 67000 },
    ]);
  });

  it('marks the days an account is short, until it recovers or the forecast ends', () => {
    const forecast = forecastOf(
      { checking: 50000, savings: 20000 },
      [
        move('rent', 'checking', '2017-06-20', -60000),
        move('more', 'checking', '2017-06-22', -5000),
        move('pay', 'checking', '2017-06-25', 30000),
        move('tax', 'checking', '2017-07-10', -40000),
        move('gift', 'savings', '2017-07-05', -20000),
      ],
      '2017-07-31',
    );
    const checking = accountOf(forecast, 'checking');

    expect(checking.shortfalls).toEqual([
      { start: '2017-06-20', lastDay: '2017-06-24' },
      { start: '2017-07-10', lastDay: '2017-07-31' },
    ]);
    expect(checking).toMatchObject({
      firstShortfallDate: '2017-06-20',
      minimumDailyClosingBalance: -25000,
      transferNeeded: 25000,
      projectedEndingBalance: -25000,
    });
    // At zero an account is not short
    expect(accountOf(forecast, 'savings')).toMatchObject({
      shortfalls: [],
      firstShortfallDate: null,
      transferNeeded: 0,
      minimumDailyClosingBalance: 0,
    });
  });

  it('is short from the as-of day when what is overdue is more than the balance', () => {
    const forecast = forecastOf(
      { checking: 50000 },
      [
        move('late-bill', 'checking', '2017-06-01', -60000),
        move('pay', 'checking', '2017-06-17', 10000),
      ],
      '2017-06-30',
    );

    expect(accountOf(forecast, 'checking')).toMatchObject({
      shortfalls: [{ start: '2017-06-15', lastDay: '2017-06-16' }],
      firstShortfallDate: '2017-06-15',
      transferNeeded: 10000,
    });
  });

  it('forecasts no shortfall for an account without a balance above zero', () => {
    const forecast = forecastOf(
      { card: -25000, empty: 0 },
      [
        move('shopping', 'card', '2017-06-20', -5000),
        move('fee', 'empty', '2017-06-20', -100),
      ],
      '2017-06-30',
    );

    expect(accountOf(forecast, 'card')).toMatchObject({
      isForecast: false,
      shortfalls: [],
      firstShortfallDate: null,
      transferNeeded: 0,
      minimumDailyClosingBalance: -30000,
      points: [
        { date: '2017-06-15', balance: -25000 },
        { date: '2017-06-20', balance: -30000 },
      ],
    });
    expect(accountOf(forecast, 'empty')).toMatchObject({
      isForecast: false,
      shortfalls: [],
    });
  });

  // A small generator with a seed, so that a failure can be repeated
  function random(seed: number) {
    let state = seed;
    return (limit: number) => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return Math.floor((state / 2147483648) * limit);
    };
  }

  it('agrees with the balance of every day, counted one movement at a time', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const next = random(seed);
      const balances: Balances = {};
      const ids = ['a', 'b', 'c'].slice(0, 1 + next(3));
      for (const id of ids) {
        balances[id] = (next(40) - 10) * 5000;
      }
      const movements: ScheduledCashMovement[] = [];
      const count = next(14);
      for (let index = 0; index < count; index++) {
        movements.push(
          move(
            `m${index}`,
            ids[next(ids.length)],
            monthUtils.addDays(AS_OF, next(80) - 10),
            (next(30) - 20) * 2500,
          ),
        );
      }
      const lastDay = monthUtils.addDays(AS_OF, 60);
      const horizonEnd = monthUtils.addDays(AS_OF, next(61));
      const calculation = book(balances, movements, AS_OF, lastDay);
      const forecast = buildCashForecast({ calculation, horizonEnd });
      if (forecast === null) {
        throw new Error(`No forecast for seed ${seed}`);
      }

      for (const account of forecast.accounts) {
        const own = movements.filter(
          movement => movement.account === account.accountId,
        );
        let lowest = Infinity;
        let firstShort: string | null = null;
        let closing = 0;
        for (
          let day = AS_OF;
          day <= horizonEnd;
          day = monthUtils.addDays(day, 1)
        ) {
          closing = balances[account.accountId];
          for (const movement of own) {
            if (movement.date <= day) {
              closing += movement.amount;
            }
          }
          lowest = Math.min(lowest, closing);
          if (closing < 0 && firstShort === null) {
            firstShort = day;
          }

          // The point of the day, or the last one before it
          const point = account.points
            .filter(entry => entry.date <= day)
            .at(-1);
          expect([seed, day, point?.balance]).toEqual([seed, day, closing]);
          const isShort = account.shortfalls.some(
            span => span.start <= day && day <= span.lastDay,
          );
          expect([seed, day, isShort]).toEqual([
            seed,
            day,
            account.isForecast && closing < 0,
          ]);
        }

        const isForecast = balances[account.accountId] > 0;
        expect([seed, account]).toMatchObject([
          seed,
          {
            currentBalance: balances[account.accountId],
            isForecast,
            minimumDailyClosingBalance: lowest,
            projectedEndingBalance: closing,
            firstShortfallDate: isForecast ? firstShort : null,
            transferNeeded: isForecast && lowest < 0 ? -lowest : 0,
          },
        ]);
        expect(
          [...account.payments, ...account.income, ...account.transfers]
            .map(movement => movement.id)
            .sort(),
        ).toEqual(
          own
            .filter(movement => movement.date <= horizonEnd)
            .map(movement => movement.id)
            .sort(),
        );
      }

      // Up to the calculation's own last day it is the calculation's plan
      const whole = buildCashForecast({ calculation, horizonEnd: lastDay });
      expect([seed, whole]).toMatchObject([seed, calculation.cash]);
    }
  });
});

describe('accountGroups', () => {
  it('has the accounts with money, then the others, each with its part of the cash', () => {
    const forecast = forecastOf(
      { checking: 100000, card: -25000, savings: 300000, empty: 0 },
      [],
      '2017-06-30',
    );

    expect(
      accountGroups(forecast).map(group => [
        group.kind,
        group.total,
        group.accounts.map(account => account.accountId),
      ]),
    ).toEqual([
      ['in-accounts', 400000, ['checking', 'savings']],
      ['owed', 25000, ['card', 'empty']],
    ]);
  });

  it('leaves out a group without accounts', () => {
    expect(
      accountGroups(forecastOf({ checking: 100000 }, [], '2017-06-30')).map(
        group => group.kind,
      ),
    ).toEqual(['in-accounts']);
    expect(
      accountGroups(forecastOf({ card: -100 }, [], '2017-06-30')).map(
        group => group.kind,
      ),
    ).toEqual(['owed']);
    expect(accountGroups(forecastOf({}, [], '2017-06-30'))).toEqual([]);
  });
});
