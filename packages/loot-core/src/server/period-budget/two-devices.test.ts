// One test per row of the plan's table "Two devices changing the same thing"
// (docs/plans/period-budget.md, B7). Each device's change is made with the
// real handlers; the sync messages it sent are then applied to a third
// database in both orders.
import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { deserializeValue } from '#server/sync/serialization';
import { summarizePeriodBudgets } from '#shared/period-budget';
import type { ExpensePosting } from '#shared/period-budget';
import {
  listOverridesWithoutCharge,
  loadPeriodBudgetInput,
} from '#shared/period-loader';

import { app, storeDuePeriods, storeDuePeriodsAfterSync } from './app';

const handlers = app.handlers;

type Device = 'A' | 'B';
type Change = () => Promise<unknown>;
type StoredMessage = {
  dataset: string;
  row: string;
  column: string;
  value: string;
};

const NODES = { A: '000000000000000A', B: '000000000000000B' };

const MINUTE = 60 * 1000;

let counter = 0;

// The same rows on every device, as after an earlier sync.
async function startDevice() {
  await global.emptyDatabase()();
  await loadMappings();
  await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
  await db.insertCategory({
    id: 'cat1',
    name: 'Insurance',
    cat_group: 'group1',
  });
  await db.insertAccount({ id: 'acct1', name: 'Checking' });
  await db.insertTransaction({
    id: 'txn1',
    account: 'acct1',
    date: '2027-01-10',
    amount: -100,
    category: 'cat1',
  });
  await db.insert('schedules', {
    id: 'sched1',
    active: 1,
    completed: 0,
    posts_transaction: 0,
  });
}

// Runs a change on a device that has `earlier` and returns the sync messages
// the change sent, stamped with the device and a minute. A later minute is a
// later change. The minutes count from 1970, before the clock of the tests, so
// that the change itself is later than `earlier` on the device that makes it.
async function changeOn(
  device: Device,
  minute: number,
  earlier: Message[],
  change: Change,
): Promise<Message[]> {
  await startDevice();
  setSyncingMode('offline');
  await applyMessages(earlier);
  const before = await db.first<{ id: number }>(
    'SELECT MAX(id) AS id FROM messages_crdt',
  );
  await change();
  const sent = await db.all<StoredMessage>(
    'SELECT dataset, row, column, value FROM messages_crdt WHERE id > ? ORDER BY id',
    [before?.id ?? 0],
  );
  setSyncingMode('disabled');
  return sent.map(message => {
    counter += 1;
    return {
      dataset: message.dataset,
      row: message.row,
      column: message.column,
      value: deserializeValue(message.value),
      timestamp: new Timestamp(minute * MINUTE, counter, NODES[device]),
    };
  });
}

// A third device receives the batches in the given order.
async function receive(batches: Message[][]) {
  await startDevice();
  setSyncingMode('offline');
  for (const batch of batches) {
    await applyMessages(batch);
  }
  setSyncingMode('disabled');
}

// Checks the result with the two changes arriving in both orders.
async function inBothOrders(
  earlier: Message[],
  first: Message[],
  second: Message[],
  check: () => Promise<void>,
) {
  await receive([earlier, first, second]);
  await check();
  await receive([earlier, second, first]);
  await check();
}

async function describePeriods() {
  const { periods } = await handlers['period-budget/get-rows']();
  return periods.map(
    row =>
      `${row.id} ${row.start_date} ${row.end_date} ${row.budget}${row.tombstone ? ' deleted' : ''}`,
  );
}

function storeNextPeriod() {
  return storeDuePeriods('2027-02-01');
}

// January is stored and the cadence is monthly.
async function january(): Promise<Message[]> {
  return changeOn('A', 0, [], () =>
    handlers['period-budget/set-cadence']({
      category: 'cat1',
      anchorDate: '2027-01-01',
      months: 1,
      budget: 500,
    }),
  );
}

// January and February are stored.
async function januaryAndFebruary(): Promise<Message[]> {
  const earlier = await january();
  return [...earlier, ...(await changeOn('A', 1, earlier, storeNextPeriod))];
}

beforeEach(() => {
  counter = 0;
});

afterEach(() => {
  prefs.unloadPrefs();
  setSyncingMode('disabled');
});

describe('two devices changing the same thing', () => {
  it('both store the next period: one row with the copied allowance', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, storeNextPeriod);
    const b = await changeOn('B', 20, earlier, storeNextPeriod);
    expect(a.map(message => message.row)).toEqual(
      b.map(message => message.row),
    );
    await inBothOrders(earlier, a, b, async () => {
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 500',
        'cat1:2027-02-01 2027-02-01 2027-03-01 500',
      ]);
      expect(await storeNextPeriod()).toEqual([]);
    });
  });

  it('one edits a coming period, the other would store it: the edit stays', async () => {
    const earlier = await january();
    const edit = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/create-period']({
        category: 'cat1',
        start: '2027-02-01',
        end: '2027-03-01',
        budget: 650,
      }),
    );

    // The second device syncs before storing, sees the row and leaves it.
    await receive([earlier, edit]);
    expect(await storeNextPeriod()).toEqual([]);
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
      'cat1:2027-02-01 2027-02-01 2027-03-01 650',
    ]);

    // With no connection it shows the planned row and stores nothing.
    await receive([earlier]);
    await prefs.loadPrefs();
    await prefs.savePrefs({ groupId: 'g1' }, { avoidSync: true });
    setSyncingMode('offline');
    expect(await storeDuePeriodsAfterSync({ type: 'success' })).toEqual([]);
    expect(
      await handlers['period-budget/store-due-periods']({
        today: '2027-02-01',
      }),
    ).toEqual({ stored: [], waitingForSync: true });
    const planned = await handlers['period-budget/get-planned-periods']({
      until: '2027-02-01',
    });
    expect(planned.map(row => row.id)).toEqual(['cat1:2027-02-01']);
    expect(await describePeriods()).toEqual([
      'cat1:2027-01-01 2027-01-01 2027-02-01 500',
    ]);
  });

  it('an offline edit that syncs after the other device stored the period is lost', async () => {
    const earlier = await january();
    const offlineEdit = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/create-period']({
        category: 'cat1',
        start: '2027-02-01',
        end: '2027-03-01',
        budget: 650,
      }),
    );
    const stored = await changeOn('B', 20, earlier, storeNextPeriod);
    await inBothOrders(earlier, offlineEdit, stored, async () => {
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 500',
        'cat1:2027-02-01 2027-02-01 2027-03-01 500',
      ]);
    });
  });

  it('one deletes a period, the other edits it: it stays deleted and is not created again', async () => {
    const earlier = await januaryAndFebruary();
    const remove = () =>
      handlers['period-budget/delete-period']({ id: 'cat1:2027-02-01' });
    const edit = () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-02-01',
        budget: 800,
      });
    const check = async () => {
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 500',
        'cat1:2027-02-01 2027-02-01 2027-03-01 800 deleted',
      ]);
      expect(await storeDuePeriods('2027-02-20')).toEqual([]);
      // The next period copies the allowance of the last period that is not
      // deleted.
      expect(await storeDuePeriods('2027-03-01')).toEqual(['cat1:2027-03-01']);
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 500',
        'cat1:2027-02-01 2027-02-01 2027-03-01 800 deleted',
        'cat1:2027-03-01 2027-03-01 2027-04-01 500',
      ]);
    };
    // The delete is the earlier change, then the later one.
    await inBothOrders(
      earlier,
      await changeOn('A', 10, earlier, remove),
      await changeOn('B', 20, earlier, edit),
      check,
    );
    await inBothOrders(
      earlier,
      await changeOn('A', 20, earlier, remove),
      await changeOn('B', 10, earlier, edit),
      check,
    );
  });

  it('one changes an allowance, the other the end date: both changes apply', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        budget: 600,
      }),
    );
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        end: '2027-02-10',
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-10 600',
      ]);
    });
  });

  it('both change the same allowance: the later change stays', async () => {
    const earlier = await january();
    const a = await changeOn('A', 20, earlier, () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        budget: 600,
      }),
    );
    const b = await changeOn('B', 10, earlier, () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        budget: 700,
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 600',
      ]);
    });
  });

  it('one moves an end date later while the other stores the next period: the earlier period is kept', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        end: '2027-02-15',
      }),
    );
    const b = await changeOn('B', 20, earlier, storeNextPeriod);
    await inBothOrders(earlier, a, b, async () => {
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-15 500',
        'cat1:2027-02-01 2027-02-01 2027-03-01 500',
      ]);
      const rows = await handlers['period-budget/get-rows']();
      const loaded = loadPeriodBudgetInput({
        periods: rows.periods,
        offsets: rows.offsets,
        occurrences: [],
        postings: [],
        categoryIds: new Set(['cat1']),
        asOf: '2027-02-05',
      });
      expect(loaded.periods.map(period => period.id)).toEqual([
        'cat1:2027-01-01',
      ]);
      expect(
        loaded.setAside.map(row => `${row.table} ${row.id} ${row.reason}`),
      ).toEqual(['period_budgets cat1:2027-02-01 overlap']);
    });
  });

  it('one moves an end date earlier while the other stores the next period: the gap is unassigned spending', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/update-period']({
        id: 'cat1:2027-01-01',
        end: '2027-01-20',
      }),
    );
    const b = await changeOn('B', 20, earlier, storeNextPeriod);
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      const postings: ExpensePosting[] = [
        { id: 'txn1', category: 'cat1', date: '2027-01-10', amount: -100 },
        { id: 'txn2', category: 'cat1', date: '2027-01-25', amount: -40 },
      ];
      const loaded = loadPeriodBudgetInput({
        periods: rows.periods,
        offsets: rows.offsets,
        occurrences: [],
        postings,
        categoryIds: new Set(['cat1']),
        asOf: '2027-02-05',
      });
      expect(loaded.setAside).toEqual([]);
      expect(
        loaded.periods.map(period => `${period.start} ${period.end}`),
      ).toEqual(['2027-01-01 2027-01-20', '2027-02-01 2027-03-01']);
      const summary = summarizePeriodBudgets({
        periods: loaded.periods,
        postings,
        offsets: loaded.offsets,
        asOf: '2027-02-05',
      });
      expect(summary.unassignedPostingIds).toEqual(['txn2']);
    });
  });

  it('both change a cadence: the later value of each field stays and stored periods are not touched', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-01-15',
        months: 3,
      }),
    );
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/stop-cadence']({ category: 'cat1' }),
    );
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.cadences).toEqual([
        {
          id: 'cat1',
          anchor_date: '2027-01-15',
          months: 3,
          active: false,
          tombstone: false,
        },
      ]);
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 500',
      ]);
    });
  });

  it('both offset one transaction to different periods: one row, the later choice stays', async () => {
    const earlier = await januaryAndFebruary();
    const a = await changeOn('A', 20, earlier, () =>
      handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'cat1:2027-01-01',
      }),
    );
    const b = await changeOn('B', 10, earlier, () =>
      handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'cat1:2027-02-01',
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.offsets).toEqual([
        { id: 'txn1', period_id: 'cat1:2027-01-01', tombstone: false },
      ]);
    });
  });

  it('both override the same charge: one row, the later value of each field stays', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, async () => {
      await handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-05',
        amount: 1200,
        skipped: true,
      });
    });
    const b = await changeOn('B', 20, earlier, async () => {
      await handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-05',
        amount: 1300,
        openAmount: 300,
      });
    });
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.chargeOverrides).toEqual([
        {
          id: 'sched1:2027-01-05',
          amount: 1300,
          skipped: true,
          transaction_id: null,
          open_amount: 300,
          tombstone: false,
        },
      ]);
    });
  });

  it("a schedule's dates are edited: an override for a vanished date needs attention", async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-05',
        amount: 1200,
      }),
    );
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-12',
        skipped: true,
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      // After the edit the schedule is due on the 12th, not on the 5th.
      const rows = await handlers['period-budget/get-rows']();
      const needsAttention = listOverridesWithoutCharge({
        overrides: rows.chargeOverrides,
        occurrenceIds: new Set(['sched1:2027-01-12']),
        start: '2027-01-01',
        end: '2027-02-01',
      });
      expect(
        needsAttention.map(row => `${row.table} ${row.id} ${row.reason}`),
      ).toEqual([
        'period_charge_overrides sched1:2027-01-05 override-without-charge',
      ]);
    });
  });
});
