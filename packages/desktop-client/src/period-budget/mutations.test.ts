import { calculate, NO_ROWS, period, stored } from './fixtures';
import { buildPeriodBudgetView, findRow } from './model';
import type { PeriodView } from './model';
import { onStoredPeriod } from './mutations';
import type { PeriodBudgetWrite } from './mutations';

const FOOD_MAY = period('food-may', 'food', '2026-05-01', '2026-06-01', 30000);
const FOOD_JUNE = period(
  'food:2026-06-01',
  'food',
  '2026-06-01',
  '2026-07-01',
  30000,
);

function periodsOfFood(): PeriodView[] {
  const view = buildPeriodBudgetView({
    calculation: calculate({
      asOf: '2026-05-10',
      periods: [FOOD_MAY, FOOD_JUNE],
      fields: { plannedPeriodIds: [FOOD_JUNE.id] },
    }),
    rows: { ...NO_ROWS, periods: [stored(FOOD_MAY)] },
    categoryGroups: [
      {
        id: 'usual',
        name: 'Usual expenses',
        categories: [{ id: 'food', name: 'Food', group: 'usual' }],
      },
    ],
  });
  return findRow(view, 'food')?.periods ?? [];
}

function carry(id: string): PeriodBudgetWrite {
  return {
    name: 'period-budget/carry',
    args: { id, fromPeriodId: null, amount: 0 },
  };
}

describe('onStoredPeriod', () => {
  it('writes to a stored period under its id', () => {
    const [may] = periodsOfFood();

    expect(onStoredPeriod(may, carry)).toEqual([carry('food-may')]);
  });

  it('stores a planned period first and writes under the id it was stored with', () => {
    const [, june] = periodsOfFood();

    const steps = onStoredPeriod(june, carry);

    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({
      name: 'period-budget/create-period',
      args: {
        category: 'food',
        start: '2026-06-01',
        end: '2026-07-01',
        budget: 30000,
      },
    });
    const [, second] = steps;
    expect(typeof second === 'function' ? second('stored-id') : second).toEqual(
      carry('stored-id'),
    );
  });
});
