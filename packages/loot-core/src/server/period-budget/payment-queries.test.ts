import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  listNameablePayments,
  nameablePaymentsQuery,
  paymentByIdQuery,
} from '#shared/period-payment-queries';
import type { Query } from '#shared/query';

type Listed = { id: string; account: string | null };

async function listed(query: Query): Promise<Listed[]> {
  const { data }: { data: Listed[] } = await aqlQuery(query);
  return data;
}

async function idsOf(query: Query): Promise<string[]> {
  return (await listed(query)).map(entry => entry.id);
}

const MARCH = { start: '2027-03-01', end: '2027-03-31' };

async function listedIds(): Promise<string[]> {
  const payments = await listNameablePayments<Listed>(aqlQuery, MARCH);
  return payments.map(payment => payment.id);
}

// A split of March 15 with two parts
async function insertSplit(id: string, account = 'checking') {
  await db.insertTransaction({
    id,
    account,
    date: '2027-03-15',
    amount: -500,
    is_parent: true,
  });
  for (const [part, amount] of [
    ['a', -200],
    ['b', -300],
  ] satisfies Array<[string, number]>) {
    await db.insertTransaction({
      id: `${id}-${part}`,
      account,
      date: '2027-03-15',
      amount,
      category: 'rent',
      is_child: true,
      parent_id: id,
    });
  }
}

async function insertPart(id: string, parent_id: string) {
  await db.insertTransaction({
    id,
    account: 'checking',
    date: '2027-03-20',
    amount: -100,
    category: 'rent',
    is_child: true,
    parent_id,
  });
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
  await db.insertCategory({ id: 'rent', name: 'rent', cat_group: 'group1' });
  await db.insertCategory({ id: 'fun', name: 'fun', cat_group: 'group1' });
  await db.insertAccount({ id: 'checking', name: 'Checking' });
  await db.insertAccount({ id: 'savings', name: 'Savings', offbudget: 1 });
  await db.insertAccount({ id: 'gone', name: 'Gone' });
});

describe('nameablePaymentsQuery', () => {
  it('gives the money that left any account, in any category or in none', async () => {
    await db.insertTransaction({
      id: 'in-budget',
      account: 'checking',
      date: '2027-03-10',
      amount: -100,
      category: 'rent',
    });
    await db.insertTransaction({
      id: 'off-budget',
      account: 'savings',
      date: '2027-03-12',
      amount: -200,
    });
    await db.insertTransaction({
      id: 'inflow',
      account: 'checking',
      date: '2027-03-11',
      amount: 300,
      category: 'rent',
    });
    await db.insertTransaction({
      id: 'nothing',
      account: 'checking',
      date: '2027-03-11',
      amount: 0,
      category: 'rent',
    });

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'off-budget',
      'in-budget',
    ]);
  });

  it('gives the first and the last day, and no day before or after them', async () => {
    const days = ['2027-02-28', '2027-03-01', '2027-03-31', '2027-04-01'];
    for (const date of days) {
      await db.insertTransaction({
        id: `on-${date}`,
        account: 'checking',
        date,
        amount: -100,
      });
    }

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'on-2027-03-31',
      'on-2027-03-01',
    ]);
  });

  it('gives the latest day first, and the payments of one day by their id', async () => {
    // The ids are not in the order of the days
    await db.insertTransaction({
      id: 'a',
      account: 'checking',
      date: '2027-03-05',
      amount: -100,
    });
    await db.insertTransaction({
      id: 'd',
      account: 'checking',
      date: '2027-03-20',
      amount: -100,
    });
    await db.insertTransaction({
      id: 'c',
      account: 'checking',
      date: '2027-03-20',
      amount: -100,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'checking',
      date: '2027-03-25',
      amount: -100,
    });

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'b',
      'c',
      'd',
      'a',
    ]);
  });

  it('gives the parts of a split in place of the split', async () => {
    await db.insertTransaction({
      id: 'split',
      account: 'checking',
      date: '2027-03-15',
      amount: -500,
      is_parent: true,
    });
    await db.insertTransaction({
      id: 'part-rent',
      account: 'checking',
      date: '2027-03-15',
      amount: -200,
      category: 'rent',
      is_child: true,
      parent_id: 'split',
    });
    await db.insertTransaction({
      id: 'part-fun',
      account: 'checking',
      date: '2027-03-15',
      amount: -300,
      category: 'fun',
      is_child: true,
      parent_id: 'split',
    });

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'part-fun',
      'part-rent',
    ]);
  });

  it('gives no deleted payment and no payment of a deleted account', async () => {
    await db.insertTransaction({
      id: 'kept',
      account: 'checking',
      date: '2027-03-10',
      amount: -100,
    });
    await db.insertTransaction({
      id: 'deleted',
      account: 'checking',
      date: '2027-03-11',
      amount: -100,
    });
    await db.insertTransaction({
      id: 'left-behind',
      account: 'gone',
      date: '2027-03-12',
      amount: -100,
    });
    await db.deleteTransaction({ id: 'deleted' });
    // Only the account: as when another device added the payment meanwhile
    await db.deleteAccount({ id: 'gone' });

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual(['kept']);
  });

  it('gives a payment of a closed account', async () => {
    await db.insertAccount({ id: 'old', name: 'Old', closed: 1 });
    await db.insertTransaction({
      id: 'from-closed',
      account: 'old',
      date: '2027-03-10',
      amount: -100,
    });

    expect(await listed(nameablePaymentsQuery(MARCH))).toMatchObject([
      { id: 'from-closed', account: 'old' },
    ]);
    expect(await listedIds()).toEqual(['from-closed']);
  });
});

describe('listNameablePayments', () => {
  it('gives what the query gives while every part has its split', async () => {
    await db.insertTransaction({
      id: 'plain',
      account: 'checking',
      date: '2027-03-20',
      amount: -100,
    });
    await insertSplit('split');
    await insertSplit('other');

    const ids = ['plain', 'other-a', 'other-b', 'split-a', 'split-b'];
    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual(ids);
    expect(await listedIds()).toEqual(ids);
  });

  it('gives no part that has itself as its split', async () => {
    await insertSplit('split');
    await insertPart('alone', 'alone');

    // Actual's query gives it
    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'alone',
      'split-a',
      'split-b',
    ]);
    expect(await listedIds()).toEqual(['split-a', 'split-b']);
  });

  it('gives no part whose split is a part', async () => {
    await insertSplit('split');
    await insertPart('part-of-part', 'split-a');

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'part-of-part',
      'split-a',
      'split-b',
    ]);
    expect(await listedIds()).toEqual(['split-a', 'split-b']);
  });

  it('gives no part whose split is in a deleted account', async () => {
    await insertSplit('split');
    await db.insertTransaction({
      id: 'left-behind',
      account: 'gone',
      date: '2027-03-12',
      amount: -100,
    });
    await insertPart('part-elsewhere', 'left-behind');
    await db.deleteAccount({ id: 'gone' });

    expect(await idsOf(nameablePaymentsQuery(MARCH))).toEqual([
      'part-elsewhere',
      'split-a',
      'split-b',
    ]);
    expect(await listedIds()).toEqual(['split-a', 'split-b']);
  });
});

describe('paymentByIdQuery', () => {
  it('gives a payment of any day, a split or a part of it, and a payment of a deleted account', async () => {
    await db.insertTransaction({
      id: 'old',
      account: 'checking',
      date: '2026-01-01',
      amount: -50,
    });
    await db.insertTransaction({
      id: 'split',
      account: 'checking',
      date: '2027-03-15',
      amount: -500,
      is_parent: true,
    });
    await db.insertTransaction({
      id: 'part',
      account: 'checking',
      date: '2027-03-15',
      amount: -500,
      category: 'rent',
      is_child: true,
      parent_id: 'split',
    });
    await db.insertTransaction({
      id: 'left-behind',
      account: 'gone',
      date: '2027-03-12',
      amount: -100,
    });
    await db.deleteAccount({ id: 'gone' });

    expect(await idsOf(paymentByIdQuery('old'))).toEqual(['old']);
    expect(await idsOf(paymentByIdQuery('part'))).toEqual(['part']);
    // A split can be named too, and comes alone
    expect(await idsOf(paymentByIdQuery('split'))).toEqual(['split']);
    expect(await listed(paymentByIdQuery('left-behind'))).toMatchObject([
      { id: 'left-behind', account: null },
    ]);
    expect(await idsOf(paymentByIdQuery('unknown'))).toEqual([]);
  });

  it('gives no deleted payment', async () => {
    await db.insertTransaction({
      id: 'deleted',
      account: 'checking',
      date: '2027-03-11',
      amount: -100,
    });
    await db.deleteTransaction({ id: 'deleted' });

    expect(await idsOf(paymentByIdQuery('deleted'))).toEqual([]);
  });
});
