import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { clearUndo, undo } from '#server/undo';

import { app } from './app';

const handlers = app.handlers;

async function rows() {
  return handlers['period-budget/get-rows']();
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
  await db.insertCategory({
    id: 'cat1',
    name: 'Insurance',
    cat_group: 'group1',
  });
  await db.insertCategory({ id: 'cat2', name: 'Food', cat_group: 'group1' });
  await db.insertAccount({ id: 'acct1', name: 'Checking' });
  await db.insertTransaction({
    id: 'txn1',
    account: 'acct1',
    date: '2026-12-20',
    amount: -100,
    category: 'cat1',
  });
  await db.insertTransaction({
    id: 'txn2',
    account: 'acct1',
    date: '2026-12-21',
    amount: -50,
    category: 'cat2',
  });
  await db.insert('schedules', {
    id: 'sched1',
    active: 1,
    completed: 0,
    posts_transaction: 0,
  });
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
  clearUndo();
});

describe('period-budget offsets', () => {
  it('stores an offset under the transaction id', async () => {
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'cat1:2027-01-01',
      }),
    ).toEqual({ id: 'txn1' });
    expect((await rows()).offsets).toEqual([
      { id: 'txn1', period_id: 'cat1:2027-01-01', tombstone: false },
    ]);
  });

  it('keeps one row when the offset is changed', async () => {
    await handlers['period-budget/set-offset']({
      transactionId: 'txn1',
      periodId: 'cat1:2027-01-01',
    });
    await handlers['period-budget/set-offset']({
      transactionId: 'txn1',
      periodId: 'cat1:2027-02-01',
    });
    expect((await rows()).offsets).toEqual([
      { id: 'txn1', period_id: 'cat1:2027-02-01', tombstone: false },
    ]);
  });

  it('refuses an invalid offset and says why', async () => {
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'nope',
        periodId: 'cat1:2027-01-01',
      }),
    ).toEqual({ error: 'transaction "nope" does not exist' });
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'nope',
      }),
    ).toEqual({ error: 'period "nope" does not exist' });
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'txn2',
        periodId: 'cat1:2027-01-01',
      }),
    ).toEqual({ error: "the transaction is not in the period's category" });
    await handlers['period-budget/delete-period']({ id: 'cat1:2027-02-01' });
    expect(
      await handlers['period-budget/set-offset']({
        transactionId: 'txn1',
        periodId: 'cat1:2027-02-01',
      }),
    ).toEqual({ error: 'period "cat1:2027-02-01" does not exist' });
    expect((await rows()).offsets).toEqual([]);
  });

  it('clears an offset and sets it again', async () => {
    await handlers['period-budget/set-offset']({
      transactionId: 'txn1',
      periodId: 'cat1:2027-01-01',
    });
    expect(
      await handlers['period-budget/clear-offset']({ transactionId: 'txn1' }),
    ).toEqual({ id: 'txn1' });
    expect((await rows()).offsets).toEqual([
      { id: 'txn1', period_id: 'cat1:2027-01-01', tombstone: true },
    ]);
    expect(
      await handlers['period-budget/clear-offset']({ transactionId: 'txn1' }),
    ).toEqual({ error: 'transaction "txn1" has no offset' });
    await handlers['period-budget/set-offset']({
      transactionId: 'txn1',
      periodId: 'cat1:2027-02-01',
    });
    expect((await rows()).offsets).toEqual([
      { id: 'txn1', period_id: 'cat1:2027-02-01', tombstone: false },
    ]);
  });

  it('undoes setting and clearing an offset', async () => {
    await handlers['period-budget/set-offset']({
      transactionId: 'txn1',
      periodId: 'cat1:2027-01-01',
    });
    await undo();
    expect((await rows()).offsets.filter(row => !row.tombstone)).toEqual([]);

    clearUndo();
    await handlers['period-budget/set-offset']({
      transactionId: 'txn1',
      periodId: 'cat1:2027-01-01',
    });
    clearUndo();
    await handlers['period-budget/clear-offset']({ transactionId: 'txn1' });
    await undo();
    expect((await rows()).offsets).toEqual([
      { id: 'txn1', period_id: 'cat1:2027-01-01', tombstone: false },
    ]);
  });
});

describe('period-budget schedule links', () => {
  it('links a schedule to a category and changes the link', async () => {
    expect(
      await handlers['period-budget/link-schedule']({
        scheduleId: 'sched1',
        category: 'cat1',
      }),
    ).toEqual({ id: 'sched1' });
    await handlers['period-budget/link-schedule']({
      scheduleId: 'sched1',
      category: 'cat2',
    });
    expect((await rows()).scheduleLinks).toEqual([
      { id: 'sched1', category: 'cat2', tombstone: false },
    ]);
  });

  it('refuses an invalid link and says why', async () => {
    expect(
      await handlers['period-budget/link-schedule']({
        scheduleId: 'nope',
        category: 'cat1',
      }),
    ).toEqual({ error: 'schedule "nope" does not exist' });
    expect(
      await handlers['period-budget/link-schedule']({
        scheduleId: 'sched1',
        category: 'nope',
      }),
    ).toEqual({ error: 'category "nope" does not exist' });
    expect(
      await handlers['period-budget/unlink-schedule']({ scheduleId: 'sched1' }),
    ).toEqual({ error: 'schedule "sched1" is not linked' });
    expect((await rows()).scheduleLinks).toEqual([]);
  });

  it('unlinks a schedule and undoes it', async () => {
    await handlers['period-budget/link-schedule']({
      scheduleId: 'sched1',
      category: 'cat1',
    });
    clearUndo();
    expect(
      await handlers['period-budget/unlink-schedule']({ scheduleId: 'sched1' }),
    ).toEqual({ id: 'sched1' });
    expect((await rows()).scheduleLinks).toEqual([
      { id: 'sched1', category: 'cat1', tombstone: true },
    ]);
    await undo();
    expect((await rows()).scheduleLinks).toEqual([
      { id: 'sched1', category: 'cat1', tombstone: false },
    ]);
  });

  it('undoes a link', async () => {
    await handlers['period-budget/link-schedule']({
      scheduleId: 'sched1',
      category: 'cat1',
    });
    await undo();
    expect((await rows()).scheduleLinks.filter(row => !row.tombstone)).toEqual(
      [],
    );
  });
});

describe('period-budget charge overrides', () => {
  it('stores an override under schedule id and due date', async () => {
    expect(
      await handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-01-05',
        skipped: true,
      }),
    ).toEqual({ id: 'sched1:2027-01-05' });
    expect((await rows()).chargeOverrides).toEqual([
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

  it('changes only the fields that are given', async () => {
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      amount: 12000,
      transactionId: 'txn1',
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      openAmount: 300,
    });
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      transactionId: null,
    });
    expect((await rows()).chargeOverrides).toEqual([
      {
        id: 'sched1:2027-01-05',
        amount: 12000,
        skipped: false,
        transaction_id: null,
        open_amount: 300,
        tombstone: false,
      },
    ]);
  });

  it('refuses an invalid override and says why', async () => {
    expect(
      await handlers['period-budget/set-charge-override']({
        scheduleId: 'nope',
        dueDate: '2027-01-05',
        skipped: true,
      }),
    ).toEqual({ error: 'schedule "nope" does not exist' });
    expect(
      await handlers['period-budget/set-charge-override']({
        scheduleId: 'sched1',
        dueDate: '2027-02-30',
        skipped: true,
      }),
    ).toEqual({ error: 'due date "2027-02-30" is not a valid date' });
    for (const amount of [-1, 1.5]) {
      expect(
        await handlers['period-budget/set-charge-override']({
          scheduleId: 'sched1',
          dueDate: '2027-01-05',
          amount,
        }),
      ).toEqual({
        error: 'amount must be a whole number that is not negative',
      });
      expect(
        await handlers['period-budget/set-charge-override']({
          scheduleId: 'sched1',
          dueDate: '2027-01-05',
          openAmount: amount,
        }),
      ).toEqual({
        error: 'still expected must be a whole number that is not negative',
      });
    }
    expect((await rows()).chargeOverrides).toEqual([]);
  });

  it('clears an override, and a new one starts from the defaults', async () => {
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      amount: 12000,
      skipped: true,
    });
    expect(
      await handlers['period-budget/clear-charge-override']({
        id: 'sched1:2027-01-05',
      }),
    ).toEqual({ id: 'sched1:2027-01-05' });
    expect((await rows()).chargeOverrides[0].tombstone).toBe(true);
    expect(
      await handlers['period-budget/clear-charge-override']({
        id: 'sched1:2027-01-05',
      }),
    ).toEqual({ error: 'charge override "sched1:2027-01-05" does not exist' });
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      openAmount: 40,
    });
    expect((await rows()).chargeOverrides).toEqual([
      {
        id: 'sched1:2027-01-05',
        amount: null,
        skipped: false,
        transaction_id: null,
        open_amount: 40,
        tombstone: false,
      },
    ]);
  });

  it('undoes setting, changing and clearing an override', async () => {
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      amount: 12000,
    });
    await undo();
    expect(
      (await rows()).chargeOverrides.filter(row => !row.tombstone),
    ).toEqual([]);

    clearUndo();
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      amount: 12000,
    });
    clearUndo();
    await handlers['period-budget/set-charge-override']({
      scheduleId: 'sched1',
      dueDate: '2027-01-05',
      amount: 9000,
      skipped: true,
    });
    await undo();
    expect((await rows()).chargeOverrides[0]).toMatchObject({
      amount: 12000,
      skipped: false,
      tombstone: false,
    });

    clearUndo();
    await handlers['period-budget/clear-charge-override']({
      id: 'sched1:2027-01-05',
    });
    await undo();
    expect((await rows()).chargeOverrides[0]).toMatchObject({
      amount: 12000,
      tombstone: false,
    });
  });
});

describe('period-budget accounts', () => {
  it('excludes and includes an account', async () => {
    expect(
      await handlers['period-budget/exclude-account']({ accountId: 'acct1' }),
    ).toEqual({ id: 'acct1' });
    expect((await rows()).accounts).toEqual([
      { id: 'acct1', excluded: true, tombstone: false },
    ]);
    expect(
      await handlers['period-budget/include-account']({ accountId: 'acct1' }),
    ).toEqual({ id: 'acct1' });
    expect((await rows()).accounts).toEqual([
      { id: 'acct1', excluded: false, tombstone: false },
    ]);
  });

  it('refuses an account that does not exist', async () => {
    expect(
      await handlers['period-budget/exclude-account']({ accountId: 'nope' }),
    ).toEqual({ error: 'account "nope" does not exist' });
    expect(
      await handlers['period-budget/include-account']({ accountId: 'nope' }),
    ).toEqual({ error: 'account "nope" does not exist' });
    expect((await rows()).accounts).toEqual([]);
  });

  it('undoes excluding and including an account', async () => {
    await handlers['period-budget/exclude-account']({ accountId: 'acct1' });
    clearUndo();
    await handlers['period-budget/include-account']({ accountId: 'acct1' });
    await undo();
    expect((await rows()).accounts).toEqual([
      { id: 'acct1', excluded: true, tombstone: false },
    ]);

    clearUndo();
    await handlers['period-budget/exclude-account']({ accountId: 'acct2' });
    await db.insertAccount({ id: 'acct2', name: 'Savings' });
    await handlers['period-budget/exclude-account']({ accountId: 'acct2' });
    await undo();
    expect(
      (await rows()).accounts.filter(row => !row.tombstone).map(row => row.id),
    ).toEqual(['acct1']);
  });
});
