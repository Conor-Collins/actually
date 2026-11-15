// One test per row of the plan's table "Two devices changing the same thing"
// (docs/plans/period-budget.md, B7). Each device's change is made with the
// real handlers; the sync messages it sent are then applied to a third
// database in both orders.
import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { getRuleForSchedule, app as schedulesApp } from '#server/schedules/app';
import { getScheduleDates } from '#server/schedules/occurrences';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { deserializeValue } from '#server/sync/serialization';
import { loadRules } from '#server/transactions/transaction-rules';
import { summarizePeriodBudgets } from '#shared/period-budget';
import type { ExpensePosting } from '#shared/period-budget';
import {
  listOverridesWithoutCharge,
  loadPeriodBudgetInput,
} from '#shared/period-loader';
import { extractScheduleConds } from '#shared/schedules';
import type { RecurConfig } from '#types/models';

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
  await loadRules();
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

    // The second device syncs before storing, sees the row and leaves it:
    // it sends nothing.
    const afterSync = await changeOn(
      'B',
      20,
      [...earlier, ...edit],
      storeNextPeriod,
    );
    expect(afterSync).toEqual([]);
    await inBothOrders(earlier, edit, afterSync, async () => {
      expect(await storeNextPeriod()).toEqual([]);
      expect(await describePeriods()).toEqual([
        'cat1:2027-01-01 2027-01-01 2027-02-01 500',
        'cat1:2027-02-01 2027-02-01 2027-03-01 650',
      ]);
    });

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
    const offlineEdit = await changeOn('A', 10, earlier, async () => {
      await handlers['period-budget/create-period']({
        category: 'cat1',
        start: '2027-02-01',
        end: '2027-03-01',
        budget: 650,
      });
      await handlers['period-budget/carry']({
        id: 'cat1:2027-02-01',
        fromPeriodId: 'cat1:2027-01-01',
        amount: 120,
      });
    });
    const stored = await changeOn('B', 20, earlier, storeNextPeriod);
    await inBothOrders(earlier, offlineEdit, stored, async () => {
      const { periods } = await handlers['period-budget/get-rows']();
      // Every field of the edit is replaced, the carry and its source too.
      expect(periods[1]).toEqual({
        id: 'cat1:2027-02-01',
        category: 'cat1',
        start_date: '2027-02-01',
        end_date: '2027-03-01',
        budget: 500,
        carryover: 0,
        carried_from: null,
        tombstone: false,
      });
      expect(periods.length).toBe(2);
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

  it("one changes a cadence's start date, the other its length: both changes apply", async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-01-15',
      }),
    );
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/set-cadence']({ category: 'cat1', months: 3 }),
    );
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.cadences).toEqual([
        {
          id: 'cat1',
          anchor_date: '2027-01-15',
          months: 3,
          active: true,
          tombstone: false,
        },
      ]);
    });
  });

  it("both change a cadence's length: the later length stays", async () => {
    const earlier = await january();
    const a = await changeOn('A', 20, earlier, () =>
      handlers['period-budget/set-cadence']({ category: 'cat1', months: 3 }),
    );
    const b = await changeOn('B', 10, earlier, () =>
      handlers['period-budget/set-cadence']({
        category: 'cat1',
        anchorDate: '2027-01-01',
        months: 6,
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.cadences).toEqual([
        {
          id: 'cat1',
          anchor_date: '2027-01-01',
          months: 3,
          active: true,
          tombstone: false,
        },
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

  it('one sets and clears an offset, the other sets it later: the offset is there', async () => {
    const earlier = await januaryAndFebruary();
    const a = await changeOn('A', 10, earlier, async () => {
      await handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'cat1:2027-01-01',
      });
      await handlers['period-budget/clear-offset']({ transactionId: 'txn1' });
    });
    // This device never had the row, so for it the offset is new.
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'cat1:2027-02-01',
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.offsets).toEqual([
        { id: 'txn1', period_id: 'cat1:2027-02-01', tombstone: false },
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

  it('one sets an amount for a charge, the other later sets it back to none: no amount', async () => {
    const earlier = await january();
    const a = await changeOn('A', 10, earlier, () =>
      handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-05',
        amount: 1200,
        transactionId: 'txn1',
        openAmount: 300,
      }),
    );
    // This device never had the row, so for it the override is new.
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-05',
        amount: null,
        skipped: true,
        transactionId: null,
        openAmount: null,
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      const rows = await handlers['period-budget/get-rows']();
      expect(rows.chargeOverrides).toEqual([
        {
          id: 'sched1:2027-01-05',
          amount: null,
          skipped: true,
          transaction_id: null,
          open_amount: null,
          tombstone: false,
        },
      ]);
    });
  });

  it("a schedule's dates are edited: charges follow and an override for a vanished date needs attention", async () => {
    // A real schedule, due on the 5th of every month.
    const monthlyOn = (start: string): RecurConfig => ({
      frequency: 'monthly',
      start,
      patterns: [],
    });
    const earlier = await changeOn('A', 0, [], async () => {
      await schedulesApp.handlers['schedule/create']({
        schedule: { id: 'sched2' },
        conditions: [
          { op: 'is', field: 'date', value: monthlyOn('2027-01-05') },
        ],
      });
    });
    // One device moves it to the 12th.
    const a = await changeOn('A', 10, earlier, () =>
      schedulesApp.handlers['schedule/update']({
        schedule: { id: 'sched2' },
        conditions: [
          { op: 'is', field: 'date', value: monthlyOn('2027-01-12') },
        ],
      }),
    );
    // The other, which still sees the 5th, changes that charge.
    const b = await changeOn('B', 20, earlier, () =>
      handlers['period-budget/set-charge-override']({
        scheduleId: 'sched2',
        dueDate: '2027-01-05',
        amount: 1200,
      }),
    );
    await inBothOrders(earlier, a, b, async () => {
      // The charges of January, from the schedule as it is after the sync.
      const rule = await getRuleForSchedule('sched2');
      const dateCond: { value: RecurConfig | string } = extractScheduleConds(
        rule.serialize().conditions,
      ).date;
      const dueDates = getScheduleDates(dateCond.value, {
        start: '2027-01-01',
        end: '2027-01-31',
      });
      expect(dueDates).toEqual(['2027-01-12']);

      const rows = await handlers['period-budget/get-rows']();
      const needsAttention = listOverridesWithoutCharge({
        overrides: rows.chargeOverrides,
        occurrenceIds: new Set(dueDates.map(date => `sched2:${date}`)),
        start: '2027-01-01',
        end: '2027-01-31',
      });
      expect(
        needsAttention.map(row => `${row.table} ${row.id} ${row.reason}`),
      ).toEqual([
        'period_charge_overrides sched2:2027-01-05 override-without-charge',
      ]);
    });
  });
});
