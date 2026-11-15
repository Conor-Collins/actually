import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { clearUndo, undo } from '#server/undo';

import { app } from './app';

const handlers = app.handlers;

async function livePeriods() {
  const { periods } = await handlers['period-budget/get-rows']();
  return periods.filter(row => !row.tombstone);
}

async function period(id: string) {
  const { periods } = await handlers['period-budget/get-rows']();
  return periods.find(row => row.id === id);
}

async function cadence(id: string) {
  const { cadences } = await handlers['period-budget/get-rows']();
  return cadences.find(row => row.id === id);
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  clearUndo();
  await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
  await db.insertCategory({
    id: 'cat1',
    name: 'Insurance',
    cat_group: 'group1',
  });
  await db.insertCategory({ id: 'cat2', name: 'Food', cat_group: 'group1' });
});

describe('period-budget/get-rows', () => {
  it('returns six empty lists for a new file', async () => {
    expect(await handlers['period-budget/get-rows']()).toEqual({
      cadences: [],
      periods: [],
      offsets: [],
      scheduleLinks: [],
      chargeOverrides: [],
      accounts: [],
    });
  });

  it('returns deleted rows too, sorted by id', async () => {
    await handlers['period-budget/create-period']({
      category: 'cat2',
      start: '2027-01-01',
      end: '2027-02-01',
      budget: 300,
    });
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-01-01',
      end: '2027-02-01',
      budget: 500,
    });
    await handlers['period-budget/delete-period']({ id: 'cat2:2027-01-01' });
    const { periods } = await handlers['period-budget/get-rows']();
    expect(periods).toEqual([
      {
        id: 'cat1:2027-01-01',
        category: 'cat1',
        start_date: '2027-01-01',
        end_date: '2027-02-01',
        budget: 500,
        carryover: 0,
        carried_from: null,
        tombstone: false,
      },
      {
        id: 'cat2:2027-01-01',
        category: 'cat2',
        start_date: '2027-01-01',
        end_date: '2027-02-01',
        budget: 300,
        carryover: 0,
        carried_from: null,
        tombstone: true,
      },
    ]);
  });
});

describe('period-budget/set-cadence and stop-cadence', () => {
  it('stores the cadence and the first period', async () => {
    const result = await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 12,
      budget: 120000,
    });
    expect(result).toEqual({ id: 'cat1' });
    expect(await cadence('cat1')).toEqual({
      id: 'cat1',
      anchor_date: '2027-01-01',
      months: 12,
      active: true,
      tombstone: false,
    });
    expect(await livePeriods()).toEqual([
      {
        id: 'cat1:2027-01-01',
        category: 'cat1',
        start_date: '2027-01-01',
        end_date: '2028-01-01',
        budget: 120000,
        carryover: 0,
        carried_from: null,
        tombstone: false,
      },
    ]);
  });

  it('ends the first period of a cadence on the 31st at the end of the next month', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-31',
      months: 1,
      budget: 100,
    });
    expect((await period('cat1:2027-01-31'))?.end_date).toBe('2027-02-28');
  });

  it('stores no period when no budget is given', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
    });
    expect((await cadence('cat1'))?.months).toBe(1);
    expect(await livePeriods()).toEqual([]);
  });

  it('changes the cadence without touching stored periods', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
      budget: 500,
    });
    const result = await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-03-15',
      months: 3,
      budget: 900,
    });
    expect(result).toEqual({ id: 'cat1' });
    expect(await cadence('cat1')).toEqual({
      id: 'cat1',
      anchor_date: '2027-03-15',
      months: 3,
      active: true,
      tombstone: false,
    });
    expect(
      (await livePeriods()).map(
        row => `${row.id} ${row.end_date} ${row.budget}`,
      ),
    ).toEqual(['cat1:2027-01-01 2027-02-01 500']);
  });

  it('changes only the length or only the start date of a cadence', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
    });
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        months: 3,
      }),
    ).toEqual({ id: 'cat1' });
    expect(await cadence('cat1')).toMatchObject({
      anchor_date: '2027-01-01',
      months: 3,
      active: true,
    });
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-01-15',
      }),
    ).toEqual({ id: 'cat1' });
    expect(await cadence('cat1')).toMatchObject({
      anchor_date: '2027-01-15',
      months: 3,
      active: true,
    });
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        months: 121,
      }),
    ).toEqual({
      error: 'length must be a whole number of months from 1 to 120',
    });
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-02-30',
      }),
    ).toEqual({ error: 'start date "2027-02-30" is not a valid date' });
    expect(await cadence('cat1')).toMatchObject({
      anchor_date: '2027-01-15',
      months: 3,
    });
  });

  it('stores the first period of a cadence that is only given a budget later', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-31',
      months: 2,
    });
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      budget: 700,
    });
    expect(
      (await livePeriods()).map(
        row => `${row.id} ${row.end_date} ${row.budget}`,
      ),
    ).toEqual(['cat1:2027-01-31 2027-03-31 700']);
  });

  it('refuses a new cadence without a start date or a length', async () => {
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        months: 1,
      }),
    ).toEqual({ error: 'a new cadence needs a start date and a length' });
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-01-01',
      }),
    ).toEqual({ error: 'a new cadence needs a start date and a length' });
    expect(await cadence('cat1')).toBe(undefined);
  });

  it('stores no first period when the category only has a deleted period', async () => {
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-01-01',
      end: '2027-02-01',
      budget: 500,
    });
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' });
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
      budget: 700,
    });
    expect(await livePeriods()).toEqual([]);
    expect((await period('cat1:2027-01-01'))?.budget).toBe(500);
  });

  it('refuses an invalid cadence and says why', async () => {
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'nope',
        anchorDate: '2027-01-01',
        months: 1,
      }),
    ).toEqual({ error: 'category "nope" does not exist' });
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-02-30',
        months: 1,
      }),
    ).toEqual({ error: 'start date "2027-02-30" is not a valid date' });
    for (const months of [0, 1.5, 121]) {
      expect(
        await handlers['period-budget/set-cadence']({
          category: 'cat1',
          anchorDate: '2027-01-01',
          months,
        }),
      ).toEqual({
        error: 'length must be a whole number of months from 1 to 120',
      });
    }
    expect(
      await handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-01-01',
        months: 1,
        budget: -1,
      }),
    ).toEqual({ error: 'budget must be a whole number that is not negative' });
    expect(await handlers['period-budget/get-rows']()).toMatchObject({
      cadences: [],
      periods: [],
    });
  });

  it('switches a cadence off and on again', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
    });
    expect(
      await handlers['period-budget/stop-cadence']({ category: 'cat1' }),
    ).toEqual({ id: 'cat1' });
    expect((await cadence('cat1'))?.active).toBe(false);
    await handlers['period-budget/set-cadence']({ category: 'cat1' });
    expect(await cadence('cat1')).toEqual({
      id: 'cat1',
      anchor_date: '2027-01-01',
      months: 1,
      active: true,
      tombstone: false,
    });
  });

  it('refuses to switch off a cadence that does not exist', async () => {
    expect(
      await handlers['period-budget/stop-cadence']({ category: 'cat1' }),
    ).toEqual({ error: 'category "cat1" has no cadence' });
  });

  it('undoes setting a cadence with its first period in one step', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
      budget: 500,
    });
    await undo();
    expect((await cadence('cat1'))?.tombstone).toBe(true);
    expect(await livePeriods()).toEqual([]);
  });

  it('undoes switching a cadence off', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
    });
    await handlers['period-budget/stop-cadence']({ category: 'cat1' });
    await undo();
    expect((await cadence('cat1'))?.active).toBe(true);
  });
});

describe('period-budget periods', () => {
  async function createJanuary() {
    return handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-01-01',
      end: '2027-02-01',
      budget: 500,
    });
  }

  it('creates a period with an id made of category and start date', async () => {
    expect(await createJanuary()).toEqual({ id: 'cat1:2027-01-01' });
    expect(await period('cat1:2027-01-01')).toEqual({
      id: 'cat1:2027-01-01',
      category: 'cat1',
      start_date: '2027-01-01',
      end_date: '2027-02-01',
      budget: 500,
      carryover: 0,
      carried_from: null,
      tombstone: false,
    });
  });

  it('refuses a period that is invalid and says why', async () => {
    await createJanuary();
    expect(
      await handlers['period-budget/create-period']({
        category: 'nope',
        start: '2027-03-01',
        end: '2027-04-01',
        budget: 1,
      }),
    ).toEqual({ error: 'category "nope" does not exist' });
    expect(
      await handlers['period-budget/create-period']({
        category: 'cat1',
        start: '2027-03-01',
        end: '2027-03-01',
        budget: 1,
      }),
    ).toEqual({
      error: 'end date 2027-03-01 must be after start date 2027-03-01',
    });
    expect(
      await handlers['period-budget/create-period']({
        category: 'cat1',
        start: '2027-01-15',
        end: '2027-02-15',
        budget: 1,
      }),
    ).toEqual({
      error: 'overlaps period cat1:2027-01-01 (2027-01-01 to 2027-02-01)',
    });
    expect(
      await handlers['period-budget/create-period']({
        category: 'cat1',
        start: '2027-03-01',
        end: '2027-04-01',
        budget: -5,
      }),
    ).toEqual({ error: 'budget must be a whole number that is not negative' });
    expect((await livePeriods()).map(row => row.id)).toEqual([
      'cat1:2027-01-01',
    ]);
  });

  it('allows the same dates in another category', async () => {
    await createJanuary();
    expect(
      await handlers['period-budget/create-period']({
        category: 'cat2',
        start: '2027-01-15',
        end: '2027-02-15',
        budget: 1,
      }),
    ).toEqual({ id: 'cat2:2027-01-15' });
  });

  it('gives a new id when the id belongs to a deleted period', async () => {
    await createJanuary();
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' });
    expect(await createJanuary()).toEqual({ id: 'cat1:2027-01-01:2' });
    expect((await period('cat1:2027-01-01'))?.tombstone).toBe(true);
  });

  it('edits only the fields that are given and keeps the id', async () => {
    await createJanuary();
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        budget: 650,
      }),
    ).toEqual({ id: 'cat1:2027-01-01' });
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        start: '2027-01-10',
        end: '2027-02-10',
      }),
    ).toEqual({ id: 'cat1:2027-01-01' });
    expect(await period('cat1:2027-01-01')).toEqual({
      id: 'cat1:2027-01-01',
      category: 'cat1',
      start_date: '2027-01-10',
      end_date: '2027-02-10',
      budget: 650,
      carryover: 0,
      carried_from: null,
      tombstone: false,
    });
  });

  it('refuses an edit that is invalid and says why', async () => {
    await createJanuary();
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-02-01',
      end: '2027-03-01',
      budget: 500,
    });
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        end: '2027-02-15',
      }),
    ).toEqual({
      error: 'overlaps period cat1:2027-02-01 (2027-02-01 to 2027-03-01)',
    });
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        end: '2027-01-01',
      }),
    ).toEqual({
      error: 'end date 2027-01-01 must be after start date 2027-01-01',
    });
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        budget: 1.5,
      }),
    ).toEqual({ error: 'budget must be a whole number that is not negative' });
    expect(
      await handlers['period-budget/update-period']({ id: 'nope', budget: 1 }),
    ).toEqual({ error: 'period "nope" does not exist' });
    expect((await period('cat1:2027-01-01'))?.end_date).toBe('2027-02-01');
    expect((await period('cat1:2027-01-01'))?.budget).toBe(500);
  });

  it('deletes a period and refuses to edit or delete it afterwards', async () => {
    await createJanuary();
    expect(
      await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' }),
    ).toEqual({ id: 'cat1:2027-01-01' });
    expect(await livePeriods()).toEqual([]);
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        budget: 1,
      }),
    ).toEqual({ error: 'period "cat1:2027-01-01" does not exist' });
    expect(
      await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' }),
    ).toEqual({ error: 'period "cat1:2027-01-01" does not exist' });
  });

  it('restores a deleted period with its values', async () => {
    await createJanuary();
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' });
    expect(
      await handlers['period-budget/restore-period']({ id: 'cat1:2027-01-01' }),
    ).toEqual({ id: 'cat1:2027-01-01' });
    expect((await livePeriods()).map(row => `${row.id} ${row.budget}`)).toEqual(
      ['cat1:2027-01-01 500'],
    );
  });

  it('refuses to restore a period that is not deleted or would overlap', async () => {
    await createJanuary();
    expect(
      await handlers['period-budget/restore-period']({ id: 'cat1:2027-01-01' }),
    ).toEqual({ error: 'period "cat1:2027-01-01" is not deleted' });
    expect(
      await handlers['period-budget/restore-period']({ id: 'nope' }),
    ).toEqual({ error: 'period "nope" is not deleted' });
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' });
    await createJanuary();
    expect(
      await handlers['period-budget/restore-period']({ id: 'cat1:2027-01-01' }),
    ).toEqual({
      error: 'overlaps period cat1:2027-01-01:2 (2027-01-01 to 2027-02-01)',
    });
  });

  it('undoes create, edit, delete and restore', async () => {
    await createJanuary();
    await undo();
    expect(await livePeriods()).toEqual([]);

    clearUndo();
    await handlers['period-budget/restore-period']({ id: 'cat1:2027-01-01' });
    await handlers['period-budget/update-period']({
      id: 'cat1:2027-01-01',
      budget: 650,
      end: '2027-02-10',
    });
    await undo();
    expect(await period('cat1:2027-01-01')).toMatchObject({
      budget: 500,
      end_date: '2027-02-01',
    });

    clearUndo();
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' });
    await undo();
    expect((await period('cat1:2027-01-01'))?.tombstone).toBe(false);

    clearUndo();
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-01-01' });
    clearUndo();
    await handlers['period-budget/restore-period']({ id: 'cat1:2027-01-01' });
    await undo();
    expect((await period('cat1:2027-01-01'))?.tombstone).toBe(true);
  });
});

describe('period-budget/carry', () => {
  beforeEach(async () => {
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-01-01',
      end: '2027-02-01',
      budget: 500,
    });
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-02-01',
      end: '2027-03-01',
      budget: 500,
    });
    await handlers['period-budget/create-period']({
      category: 'cat2',
      start: '2027-01-01',
      end: '2027-02-01',
      budget: 300,
    });
    clearUndo();
  });

  it('stores the amount and the period it came from', async () => {
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'cat1:2027-01-01',
        amount: -80,
      }),
    ).toEqual({ id: 'cat1:2027-02-01' });
    expect(await period('cat1:2027-02-01')).toMatchObject({
      carryover: -80,
      carried_from: 'cat1:2027-01-01',
      budget: 500,
    });
  });

  it('clears a carry', async () => {
    await handlers['period-budget/carry']({
      id: 'cat1:2027-02-01',
      fromPeriodId: 'cat1:2027-01-01',
      amount: -80,
    });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: null,
        amount: 0,
      }),
    ).toEqual({ id: 'cat1:2027-02-01' });
    expect(await period('cat1:2027-02-01')).toMatchObject({
      carryover: 0,
      carried_from: null,
    });
  });

  it('refuses a carry that is invalid and says why', async () => {
    expect(
      await handlers['period-budget/carry']({
        id: 'nope',
        fromPeriodId: 'cat1:2027-01-01',
        amount: 1,
      }),
    ).toEqual({ error: 'period "nope" does not exist' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'cat1:2027-01-01',
        amount: 1.5,
      }),
    ).toEqual({ error: 'carryover must be a whole number' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: null,
        amount: 5,
      }),
    ).toEqual({ error: 'a carry without a period must be 0' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'nope',
        amount: 1,
      }),
    ).toEqual({ error: 'period "nope" does not exist' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'cat2:2027-01-01',
        amount: 1,
      }),
    ).toEqual({ error: 'carry must come from a period of the same category' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-01-01',
        fromPeriodId: 'cat1:2027-02-01',
        amount: 1,
      }),
    ).toEqual({ error: 'carry must come from an earlier period' });
    expect(await period('cat1:2027-02-01')).toMatchObject({
      carryover: 0,
      carried_from: null,
    });
  });

  it('refuses a budget and a carryover that are too large together', async () => {
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-02-01',
        budget: Number.MAX_SAFE_INTEGER,
      }),
    ).toEqual({ id: 'cat1:2027-02-01' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'cat1:2027-01-01',
        amount: 1,
      }),
    ).toEqual({ error: 'budget plus carryover is too large' });
    expect(
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'cat1:2027-01-01',
        amount: -1,
      }),
    ).toEqual({ id: 'cat1:2027-02-01' });
    await handlers['period-budget/update-period']({
      id: 'cat1:2027-02-01',
      budget: 500,
    });
    await handlers['period-budget/carry']({
      id: 'cat1:2027-02-01',
      fromPeriodId: 'cat1:2027-01-01',
      amount: 1,
    });
    expect(
      await handlers['period-budget/update-period']({
        id: 'cat1:2027-02-01',
        budget: Number.MAX_SAFE_INTEGER,
      }),
    ).toEqual({ error: 'budget plus carryover is too large' });
    expect(await period('cat1:2027-02-01')).toMatchObject({
      budget: 500,
      carryover: 1,
    });
  });

  it('undoes a carry', async () => {
    await handlers['period-budget/carry']({
      id: 'cat1:2027-02-01',
      fromPeriodId: 'cat1:2027-01-01',
      amount: -80,
    });
    await undo();
    expect(await period('cat1:2027-02-01')).toMatchObject({
      carryover: 0,
      carried_from: null,
    });
  });
});
