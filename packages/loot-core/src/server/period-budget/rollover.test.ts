import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { setSyncingMode } from '#server/sync';
import { clearUndo, undo } from '#server/undo';
import { summarizePeriodBudgets } from '#shared/period-budget';
import type { ExpensePosting } from '#shared/period-budget';
import { loadPeriodBudgetInput } from '#shared/period-loader';
import { q } from '#shared/query';

import { app, storeDuePeriods, storeDuePeriodsAfterSync } from './app';

const handlers = app.handlers;

async function periods() {
  return (await handlers['period-budget/get-rows']()).periods;
}

async function describePeriods() {
  return (await periods()).map(
    row =>
      `${row.id} ${row.start_date} ${row.end_date} ${row.budget}${row.tombstone ? ' deleted' : ''}`,
  );
}

async function setMonthlyCadence(anchorDate = '2027-01-01', budget = 500) {
  await handlers['period-budget/set-cadence']({
    category: 'cat1',
    anchorDate,
    months: 1,
    budget,
  });
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
  await db.insertCategory({
    id: 'cat1',
    name: 'Insurance',
    cat_group: 'group1',
  });
  await db.insertCategory({ id: 'cat2', name: 'Food', cat_group: 'group1' });
  clearUndo();
});

afterEach(() => {
  prefs.unloadPrefs();
  setSyncingMode('disabled');
});

describe('period-budget/get-planned-periods', () => {
  it('plans the periods of a cadence up to a date, with the ids they will get', async () => {
    await setMonthlyCadence();
    const planned = await handlers['period-budget/get-planned-periods']({
      until: '2027-04-15',
    });
    expect(planned.map(row => row.id)).toEqual([
      'cat1:2027-02-01',
      'cat1:2027-03-01',
      'cat1:2027-04-01',
    ]);
    expect(planned[0]).toEqual({
      id: 'cat1:2027-02-01',
      category: 'cat1',
      start_date: '2027-02-01',
      end_date: '2027-03-01',
      budget: 500,
      carryover: 0,
      carried_from: null,
      tombstone: false,
    });
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
    ]);
  });

  it('plans nothing for a cadence that is off, a deleted category or an invalid date', async () => {
    await setMonthlyCadence();
    expect(
      await handlers['period-budget/get-planned-periods']({ until: 'soon' }),
    ).toEqual([]);
    await handlers['period-budget/stop-cadence']({ category: 'cat1' });
    expect(
      await handlers['period-budget/get-planned-periods']({
        until: '2027-04-15',
      }),
    ).toEqual([]);
    await setMonthlyCadence();
    await db.deleteCategory({ id: 'cat1' });
    expect(
      await handlers['period-budget/get-planned-periods']({
        until: '2027-04-15',
      }),
    ).toEqual([]);
  });

  it('stores an edited planned row under its planned id', async () => {
    await setMonthlyCadence();
    const [planned] = await handlers['period-budget/get-planned-periods']({
      until: '2027-02-01',
    });
    expect(
      await handlers['period-budget/create-period']({
        category: 'cat1',
        start: planned.start_date ?? '',
        end: planned.end_date ?? '',
        budget: 650,
      }),
    ).toEqual({ id: planned.id });
    const next = await handlers['period-budget/get-planned-periods']({
      until: '2027-03-01',
    });
    expect(next.map(row => `${row.id} ${row.budget}`)).toEqual([
      'cat1:2027-03-01 650',
    ]);
  });
});

describe('storeDuePeriods', () => {
  it('stores every period that has started, with the allowance copied and no carry', async () => {
    await setMonthlyCadence();
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2026-12-01',
      end: '2027-01-01',
      budget: 400,
    });
    await handlers['period-budget/carry']({
      id: 'cat1:2027-01-01',
      fromPeriodId: 'cat1:2026-12-01',
      amount: -80,
    });
    expect(await storeDuePeriods('2027-03-10')).toEqual([
      'cat1:2027-02-01',
      'cat1:2027-03-01',
    ]);
    expect((await periods()).slice(2)).toEqual([
      {
        id: 'cat1:2027-02-01',
        category: 'cat1',
        start_date: '2027-02-01',
        end_date: '2027-03-01',
        budget: 500,
        carryover: 0,
        carried_from: null,
        tombstone: false,
      },
      {
        id: 'cat1:2027-03-01',
        category: 'cat1',
        start_date: '2027-03-01',
        end_date: '2027-04-01',
        budget: 500,
        carryover: 0,
        carried_from: null,
        tombstone: false,
      },
    ]);
  });

  it('stores nothing the second time and nothing before the next start date', async () => {
    await setMonthlyCadence();
    expect(await storeDuePeriods('2027-01-31')).toEqual([]);
    expect(await storeDuePeriods('2027-02-01')).toEqual(['cat1:2027-02-01']);
    expect(await storeDuePeriods('2027-02-01')).toEqual([]);
    expect(await storeDuePeriods('not a date')).toEqual([]);
  });

  it('copies the allowance as its own value', async () => {
    await setMonthlyCadence();
    await storeDuePeriods('2027-02-01');
    await handlers['period-budget/update-period']({
      id: 'cat1:2027-01-01',
      budget: 900,
    });
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 900',
      'cat1:2027-02-01 2027-02-01 2027-03-01 500',
    ]);
  });

  it('leaves a deleted period deleted and continues after it', async () => {
    await setMonthlyCadence();
    await storeDuePeriods('2027-02-01');
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-02-01' });
    expect(await storeDuePeriods('2027-02-20')).toEqual([]);
    expect(await storeDuePeriods('2027-03-10')).toEqual(['cat1:2027-03-01']);
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
      'cat1:2027-02-01 2027-02-01 2027-03-01 500 deleted',
      'cat1:2027-03-01 2027-03-01 2027-04-01 500',
    ]);
  });

  it('adds :2 to the id when the id belongs to a period whose dates were moved', async () => {
    await setMonthlyCadence();
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-03-01',
      end: '2027-04-01',
      budget: 700,
    });
    await handlers['period-budget/update-period']({
      id: 'cat1:2027-03-01',
      start: '2027-02-01',
      end: '2027-03-01',
    });
    expect(await storeDuePeriods('2027-03-01')).toEqual(['cat1:2027-03-01:2']);
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
      'cat1:2027-03-01 2027-02-01 2027-03-01 700',
      'cat1:2027-03-01:2 2027-03-01 2027-04-01 700',
    ]);
  });

  it('leaves a deleted :2 period deleted and continues after it', async () => {
    await setMonthlyCadence();
    await handlers['period-budget/create-period']({
      category: 'cat1',
      start: '2027-03-01',
      end: '2027-04-01',
      budget: 700,
    });
    await handlers['period-budget/update-period']({
      id: 'cat1:2027-03-01',
      start: '2027-02-01',
      end: '2027-03-01',
    });
    await storeDuePeriods('2027-03-01');
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-03-01:2' });
    expect(await storeDuePeriods('2027-03-20')).toEqual([]);
    expect(await storeDuePeriods('2027-04-01')).toEqual(['cat1:2027-04-01']);
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
      'cat1:2027-03-01 2027-02-01 2027-03-01 700',
      'cat1:2027-03-01:2 2027-03-01 2027-04-01 700 deleted',
      'cat1:2027-04-01 2027-04-01 2027-05-01 700',
    ]);
  });

  it('stores every period after a long time away', async () => {
    await setMonthlyCadence();
    const stored = await storeDuePeriods('2127-01-01');
    expect(stored.length).toBe(1200);
    expect(stored[1199]).toBe('cat1:2127-01-01');
    expect(await storeDuePeriods('2127-01-01')).toEqual([]);
  });

  it('stores no period that would end after the year 9999', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '9997-01-01',
      months: 12,
      budget: 500,
    });
    expect(await storeDuePeriods('9999-12-31')).toEqual(['cat1:9998-01-01']);
    expect(await describePeriods()).toEqual([
      'cat1:9997-01-01 9997-01-01 9998-01-01 500',
      'cat1:9998-01-01 9998-01-01 9999-01-01 500',
    ]);
    expect(await storeDuePeriods('9999-12-31')).toEqual([]);
  });

  it('stores nothing for a cadence that is off or has no period yet', async () => {
    await handlers['period-budget/set-cadence']({
      category: 'cat2',
      anchorDate: '2027-01-01',
      months: 1,
    });
    await setMonthlyCadence();
    await handlers['period-budget/stop-cadence']({ category: 'cat1' });
    expect(await storeDuePeriods('2027-06-01')).toEqual([]);
  });

  it('stores the periods of several categories', async () => {
    await setMonthlyCadence();
    await handlers['period-budget/set-cadence']({
      category: 'cat2',
      anchorDate: '2027-01-15',
      months: 3,
      budget: 90,
    });
    expect(await storeDuePeriods('2027-04-20')).toEqual([
      'cat1:2027-02-01',
      'cat1:2027-03-01',
      'cat1:2027-04-01',
      'cat2:2027-04-15',
    ]);
  });
});

describe('period-budget/store-due-periods', () => {
  it('stores at once in a file without a sync server', async () => {
    await setMonthlyCadence();
    expect(
      await handlers['period-budget/store-due-periods']({
        today: '2027-02-10',
      }),
    ).toEqual({ stored: ['cat1:2027-02-01'], waitingForSync: false });
  });

  it('uses the current day when no day is given', async () => {
    await setMonthlyCadence('2016-12-01');
    expect(await handlers['period-budget/store-due-periods']()).toEqual({
      stored: ['cat1:2017-01-01'],
      waitingForSync: false,
    });
  });

  it('stores nothing in a file with a sync server and shows the planned row', async () => {
    await setMonthlyCadence();
    await prefs.savePrefs({ groupId: 'g1' }, { avoidSync: true });
    expect(
      await handlers['period-budget/store-due-periods']({
        today: '2027-02-10',
      }),
    ).toEqual({ stored: [], waitingForSync: true });
    expect((await periods()).map(row => row.id)).toEqual(['cat1:2027-01-01']);
    const planned = await handlers['period-budget/get-planned-periods']({
      until: '2027-02-10',
    });
    expect(planned.map(row => row.id)).toEqual(['cat1:2027-02-01']);
  });

  it('is not undone by undo', async () => {
    await setMonthlyCadence();
    clearUndo();
    await handlers['period-budget/store-due-periods']({ today: '2027-02-10' });
    await undo();
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
      'cat1:2027-02-01 2027-02-01 2027-03-01 500',
    ]);
  });
});

describe('storeDuePeriodsAfterSync', () => {
  beforeEach(async () => {
    await setMonthlyCadence('2016-12-01');
    await prefs.savePrefs({ groupId: 'g1' }, { avoidSync: true });
  });

  it('stores the due periods after a successful sync', async () => {
    setSyncingMode('enabled');
    expect(await storeDuePeriodsAfterSync({ type: 'success' })).toEqual([
      'cat1:2017-01-01',
    ]);
    expect((await periods()).map(row => row.id)).toEqual([
      'cat1:2016-12-01',
      'cat1:2017-01-01',
    ]);
  });

  it('stores nothing after a sync that failed', async () => {
    setSyncingMode('enabled');
    expect(await storeDuePeriodsAfterSync({ type: 'error' })).toEqual([]);
    expect(await storeDuePeriodsAfterSync({ type: 'unauthorized' })).toEqual(
      [],
    );
    expect((await periods()).map(row => row.id)).toEqual(['cat1:2016-12-01']);
  });

  it('stores nothing when syncing is off or offline, where no sync ran', async () => {
    setSyncingMode('disabled');
    expect(await storeDuePeriodsAfterSync({ type: 'success' })).toEqual([]);
    setSyncingMode('offline');
    expect(await storeDuePeriodsAfterSync({ type: 'success' })).toEqual([]);
    expect((await periods()).map(row => row.id)).toEqual(['cat1:2016-12-01']);
  });

  it('listens to sync events', () => {
    expect(app.events.all.get('sync')?.length).toBe(1);
  });
});

describe('stored rows after a category is deleted', () => {
  it('hides its periods and lets its payments follow the category they were moved to', async () => {
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    await db.insertTransaction({
      id: 'txn1',
      account: 'acct1',
      date: '2027-01-10',
      amount: -100,
      category: 'cat1',
    });
    for (const category of ['cat1', 'cat2']) {
      await handlers['period-budget/create-period']({
        category,
        start: '2027-01-01',
        end: '2027-02-01',
        budget: 500,
      });
    }
    await db.deleteCategory({ id: 'cat1' }, 'cat2');

    const rows = await handlers['period-budget/get-rows']();
    const categories = await db.getCategories();
    const { data } = await aqlQuery(
      q('transactions').select(['id', 'category', 'date', 'amount']),
    );
    const postings: ExpensePosting[] = data;
    const loaded = loadPeriodBudgetInput({
      periods: rows.periods,
      offsets: rows.offsets,
      occurrences: [],
      postings,
      categoryIds: new Set(categories.map(category => category.id)),
      asOf: '2027-01-20',
    });
    expect(loaded.periods.map(row => row.id)).toEqual(['cat2:2027-01-01']);
    expect(loaded.setAside).toEqual([]);
    const summary = summarizePeriodBudgets({
      periods: loaded.periods,
      postings: loaded.postings,
      offsets: loaded.offsets,
      asOf: '2027-01-20',
    });
    expect(summary.periods.map(row => row.netSpending)).toEqual([100]);
    expect(summary.unassignedPostingIds).toEqual([]);
  });
});
