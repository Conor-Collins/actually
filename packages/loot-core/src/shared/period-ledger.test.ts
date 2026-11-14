import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  TransactionEntity,
} from '#types/models';

import { toPeriodPostings } from './period-ledger';
import type {
  LedgerAccount,
  LedgerCategory,
  LedgerPayee,
} from './period-ledger';

const ACCOUNTS: readonly LedgerAccount[] = [
  { id: 'checking', offbudget: 0 },
  { id: 'savings', offbudget: 0 },
  { id: 'brokerage', offbudget: 1 },
];

const CATEGORIES: readonly LedgerCategory[] = [
  { id: 'food' },
  { id: 'insurance', is_income: false },
  { id: 'salary', is_income: true },
];

const PAYEES: readonly LedgerPayee[] = [
  { id: 'p-shop' },
  { id: 'p-checking', transfer_acct: 'checking' },
  { id: 'p-savings', transfer_acct: 'savings' },
  { id: 'p-brokerage', transfer_acct: 'brokerage' },
];

describe('toPeriodPostings', () => {
  test('A1 a categorized expense becomes a posting', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          payee: 'p-shop',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-05', amount: -4500 },
      ],
      unresolved: [],
    });
  });

  test('A2 a posting has exactly four keys', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          payee: 'p-shop',
          is_parent: false,
          is_child: false,
          parent_id: null,
          tombstone: false,
          starting_balance_flag: false,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(Object.keys(result.postings[0]).sort()).toEqual([
      'amount',
      'category',
      'date',
      'id',
    ]);
  });

  test('A3 a refund keeps its positive amount', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-09',
          amount: 1500,
          category: 'food',
          payee: 'p-shop',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-09', amount: 1500 },
      ],
      unresolved: [],
    });
  });

  test('A4 a deleted transaction is excluded', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          tombstone: true,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A5 a starting balance is excluded', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-01-01',
          amount: -100,
          category: 'food',
          starting_balance_flag: true,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A6 income is excluded', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-01',
          amount: 250000,
          category: 'salary',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A7 a negative amount in an income category is excluded too', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-02',
          amount: -500,
          category: 'salary',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A8 split children are counted once, each with its own category', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'p1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          is_parent: true,
        },
        {
          id: 'c1',
          account: 'checking',
          date: '2027-03-10',
          amount: -6000,
          category: 'food',
          is_child: true,
          parent_id: 'p1',
        },
        {
          id: 'c2',
          account: 'checking',
          date: '2027-03-10',
          amount: -4000,
          category: 'insurance',
          is_child: true,
          parent_id: 'p1',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 'c1', category: 'food', date: '2027-03-10', amount: -6000 },
        { id: 'c2', category: 'insurance', date: '2027-03-10', amount: -4000 },
      ],
      unresolved: [],
    });
  });

  test('A9 a split parent is excluded even when it carries a category', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'p1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          category: 'food',
          is_parent: true,
        },
        {
          id: 'c1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          category: 'insurance',
          is_child: true,
          parent_id: 'p1',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 'c1', category: 'insurance', date: '2027-03-10', amount: -10000 },
      ],
      unresolved: [],
    });
  });

  test('A10 a split parent without a category is not reported as uncategorized', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'p1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          is_parent: true,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A11 an uncategorized split child is returned for resolution', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'p1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          is_parent: true,
        },
        {
          id: 'c1',
          account: 'checking',
          date: '2027-03-10',
          amount: -6000,
          category: 'food',
          is_child: true,
          parent_id: 'p1',
        },
        {
          id: 'c2',
          account: 'checking',
          date: '2027-03-10',
          amount: -4000,
          is_child: true,
          parent_id: 'p1',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 'c1', category: 'food', date: '2027-03-10', amount: -6000 },
      ],
      unresolved: [
        {
          id: 'c2',
          account: 'checking',
          date: '2027-03-10',
          amount: -4000,
          reason: 'uncategorized',
        },
      ],
    });
  });

  test('A12 children of a deleted parent are excluded', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'c1',
          account: 'checking',
          date: '2027-03-10',
          amount: -6000,
          category: 'food',
          is_child: true,
          parent_id: 'p1',
        },
        {
          id: 'p1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          is_parent: true,
          tombstone: true,
        },
        {
          id: 'c2',
          account: 'checking',
          date: '2027-03-10',
          amount: -4000,
          is_child: true,
          parent_id: 'p1',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A13 a child whose parent is not in the input is kept', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'c1',
          account: 'checking',
          date: '2027-03-10',
          amount: -6000,
          category: 'food',
          is_child: true,
          parent_id: 'p-missing',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 'c1', category: 'food', date: '2027-03-10', amount: -6000 },
      ],
      unresolved: [],
    });
  });

  test('A14 a transfer between on-budget accounts is not spending', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-15',
          amount: -20000,
          payee: 'p-savings',
        },
        {
          id: 't2',
          account: 'savings',
          date: '2027-03-15',
          amount: 20000,
          payee: 'p-checking',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A15 a transfer between on-budget accounts is excluded even when it carries a category', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-15',
          amount: -20000,
          payee: 'p-savings',
          category: 'food',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A16 a categorized transfer to an off-budget account is spending', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-20',
          amount: -30000,
          payee: 'p-brokerage',
          category: 'insurance',
        },
        {
          id: 't2',
          account: 'brokerage',
          date: '2027-03-20',
          amount: 30000,
          payee: 'p-checking',
          category: 'insurance',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'insurance', date: '2027-03-20', amount: -30000 },
      ],
      unresolved: [],
    });
  });

  test('A17 an uncategorized transfer to an off-budget account is returned for resolution', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-20',
          amount: -30000,
          payee: 'p-brokerage',
        },
        {
          id: 't2',
          account: 'brokerage',
          date: '2027-03-20',
          amount: 30000,
          payee: 'p-checking',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [],
      unresolved: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-20',
          amount: -30000,
          reason: 'uncategorized',
        },
      ],
    });
  });

  test('A18 a transaction in an off-budget account is excluded', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'brokerage',
          date: '2027-03-05',
          amount: -100,
          category: 'food',
          payee: 'p-shop',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('A19 an expense without a category is returned for resolution', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          payee: 'p-shop',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [],
      unresolved: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          reason: 'uncategorized',
        },
      ],
    });
  });

  test('A20 a null category is uncategorized', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: null,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [],
      unresolved: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          reason: 'uncategorized',
        },
      ],
    });
  });

  test('A21 an uncategorized deposit is returned for resolution too', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: 7000,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [],
      unresolved: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: 7000,
          reason: 'uncategorized',
        },
      ],
    });
  });

  test('A22 a category that is not in the list is returned for resolution', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'gone',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [],
      unresolved: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          reason: 'unknown-category',
        },
      ],
    });
  });

  test('A23 results follow the input order', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't3',
          account: 'checking',
          date: '2027-03-30',
          amount: -300,
          category: 'food',
        },
        {
          id: 'u2',
          account: 'savings',
          date: '2027-03-02',
          amount: -20,
        },
        {
          id: 't1',
          account: 'savings',
          date: '2027-03-01',
          amount: -100,
          category: 'insurance',
        },
        {
          id: 'u1',
          account: 'checking',
          date: '2027-03-29',
          amount: -10,
          category: 'gone',
        },
        {
          id: 't2',
          account: 'checking',
          date: '2027-03-15',
          amount: 200,
          category: 'food',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 't3', category: 'food', date: '2027-03-30', amount: -300 },
        { id: 't1', category: 'insurance', date: '2027-03-01', amount: -100 },
        { id: 't2', category: 'food', date: '2027-03-15', amount: 200 },
      ],
      unresolved: [
        {
          id: 'u2',
          account: 'savings',
          date: '2027-03-02',
          amount: -20,
          reason: 'uncategorized',
        },
        {
          id: 'u1',
          account: 'checking',
          date: '2027-03-29',
          amount: -10,
          reason: 'unknown-category',
        },
      ],
    });
  });

  test('A24 a zero amount is still a posting', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: 0,
          category: 'food',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [{ id: 't1', category: 'food', date: '2027-03-05', amount: 0 }],
      unresolved: [],
    });
  });

  test('A25 an unknown or null payee is not a transfer', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -100,
          category: 'food',
          payee: 'p-unknown',
        },
        {
          id: 't2',
          account: 'checking',
          date: '2027-03-06',
          amount: -200,
          category: 'food',
          payee: null,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-05', amount: -100 },
        { id: 't2', category: 'food', date: '2027-03-06', amount: -200 },
      ],
      unresolved: [],
    });
  });

  test('A26 offbudget may be a boolean', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -100,
          category: 'food',
        },
        {
          id: 't2',
          account: 'brokerage',
          date: '2027-03-05',
          amount: -200,
          category: 'food',
        },
        {
          id: 't3',
          account: 'checking',
          date: '2027-03-06',
          amount: -300,
          category: 'food',
          payee: 'p-brokerage',
        },
      ],
      accounts: [
        { id: 'checking', offbudget: false },
        { id: 'brokerage', offbudget: true },
      ],
      categories: CATEGORIES,
      payees: [
        { id: 'p-checking', transfer_acct: 'checking' },
        { id: 'p-brokerage', transfer_acct: 'brokerage' },
      ],
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-05', amount: -100 },
        { id: 't3', category: 'food', date: '2027-03-06', amount: -300 },
      ],
      unresolved: [],
    });
  });

  test('B1 duplicate account id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [],
        accounts: [
          { id: 'checking', offbudget: 0 },
          { id: 'checking', offbudget: 1 },
        ],
        categories: CATEGORIES,
        payees: PAYEES,
      }),
    ).toThrow('duplicate account id "checking"');
  });

  test('B2 duplicate category id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [],
        accounts: ACCOUNTS,
        categories: [{ id: 'food' }, { id: 'food', is_income: true }],
        payees: PAYEES,
      }),
    ).toThrow('duplicate category id "food"');
  });

  test('B3 duplicate payee id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: [{ id: 'p-shop' }, { id: 'p-shop', transfer_acct: 'savings' }],
      }),
    ).toThrow('duplicate payee id "p-shop"');
  });

  test('B4 duplicate transaction id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
          {
            id: 't1',
            account: 'savings',
            date: '2027-03-06',
            amount: -100,
            category: 'insurance',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: PAYEES,
      }),
    ).toThrow('duplicate transaction id "t1"');
  });

  test('B5 a duplicate id is rejected even when one copy is deleted', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
            tombstone: true,
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: PAYEES,
      }),
    ).toThrow('duplicate transaction id "t1"');
  });

  test('B6 unknown account', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'nowhere',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: PAYEES,
      }),
    ).toThrow('transaction t1: account "nowhere" is not in accounts');
  });

  test('B7 a deleted transaction with an unknown account is skipped, not rejected', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'nowhere',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          tombstone: true,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B8 a split parent with an unknown account is skipped, not rejected', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'p1',
          account: 'nowhere',
          date: '2027-03-05',
          amount: -4500,
          is_parent: true,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B9 unknown transfer account', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
            payee: 'p-x',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: [{ id: 'p-x', transfer_acct: 'nowhere' }],
      }),
    ).toThrow('transaction t1: transfer account "nowhere" is not in accounts');
  });

  test('B10 an off-budget transaction is skipped before its transfer account is looked up', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'brokerage',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          payee: 'p-x',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: [{ id: 'p-x', transfer_acct: 'nowhere' }],
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B11 a starting balance is skipped before its transfer account is looked up', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          payee: 'p-x',
          starting_balance_flag: true,
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: [{ id: 'p-x', transfer_acct: 'nowhere' }],
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B12 duplicate account id is reported before duplicate category id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [],
        accounts: [
          { id: 'checking', offbudget: 0 },
          { id: 'checking', offbudget: 0 },
        ],
        categories: [{ id: 'food' }, { id: 'food' }],
        payees: PAYEES,
      }),
    ).toThrow('duplicate account id "checking"');
  });

  test('B13 duplicate category id is reported before duplicate payee id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [],
        accounts: ACCOUNTS,
        categories: [{ id: 'food' }, { id: 'food' }],
        payees: [{ id: 'p-shop' }, { id: 'p-shop' }],
      }),
    ).toThrow('duplicate category id "food"');
  });

  test('B14 duplicate payee id is reported before duplicate transaction id', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: [{ id: 'p-shop' }, { id: 'p-shop' }],
      }),
    ).toThrow('duplicate payee id "p-shop"');
  });

  test('B15 duplicate transaction id is reported before an unknown account', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't0',
            account: 'nowhere',
            date: '2027-03-05',
            amount: -1,
            category: 'food',
          },
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
          {
            id: 't1',
            account: 'checking',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: PAYEES,
      }),
    ).toThrow('duplicate transaction id "t1"');
  });

  test('B16 an unknown account is reported before an unknown transfer account', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'nowhere',
            date: '2027-03-05',
            amount: -4500,
            category: 'food',
            payee: 'p-x',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: [{ id: 'p-x', transfer_acct: 'elsewhere' }],
      }),
    ).toThrow('transaction t1: account "nowhere" is not in accounts');
  });

  test('B17 the first failing transaction in input order is reported', () => {
    expect(() =>
      toPeriodPostings({
        transactions: [
          {
            id: 't1',
            account: 'x',
            date: '2027-03-05',
            amount: -1,
            category: 'food',
          },
          {
            id: 't2',
            account: 'y',
            date: '2027-03-05',
            amount: -1,
            category: 'food',
          },
        ],
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        payees: PAYEES,
      }),
    ).toThrow('transaction t1: account "x" is not in accounts');
  });

  test('B18 an on-budget transfer is excluded before its category is looked up', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-15',
          amount: -20000,
          payee: 'p-savings',
          category: 'gone',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B19 a transfer to an off-budget account with an unknown category is returned for resolution', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-20',
          amount: -30000,
          payee: 'p-brokerage',
          category: 'gone',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [],
      unresolved: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-20',
          amount: -30000,
          reason: 'unknown-category',
        },
      ],
    });
  });

  test('B20 a transfer to an off-budget account in an income category is excluded', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-20',
          amount: 30000,
          payee: 'p-brokerage',
          category: 'salary',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B21 a payee with a null transfer account is not a transfer', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          payee: 'p-null',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: [{ id: 'p-null', transfer_acct: null }],
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-05', amount: -4500 },
      ],
      unresolved: [],
    });
  });

  test('B22 parent_id is ignored on a transaction that is not a child', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 't1',
          account: 'checking',
          date: '2027-03-05',
          amount: -4500,
          category: 'food',
          tombstone: true,
        },
        {
          id: 't2',
          account: 'checking',
          date: '2027-03-06',
          amount: -100,
          category: 'food',
          parent_id: 't1',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({
      postings: [
        { id: 't2', category: 'food', date: '2027-03-06', amount: -100 },
      ],
      unresolved: [],
    });
  });

  test('B23 a child of a deleted parent is skipped before its account is looked up', () => {
    const result = toPeriodPostings({
      transactions: [
        {
          id: 'p1',
          account: 'checking',
          date: '2027-03-10',
          amount: -10000,
          is_parent: true,
          tombstone: true,
        },
        {
          id: 'c1',
          account: 'nowhere',
          date: '2027-03-10',
          amount: -10000,
          category: 'food',
          is_child: true,
          parent_id: 'p1',
        },
      ],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B24 empty input', () => {
    const result = toPeriodPostings({
      transactions: [],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result).toEqual({ postings: [], unresolved: [] });
  });

  test('B25 frozen inputs are accepted and not changed', () => {
    const transactions = Object.freeze([
      Object.freeze({
        id: 't1',
        account: 'checking',
        date: '2027-03-05',
        amount: -4500,
        category: 'food',
        payee: 'p-shop',
      }),
      Object.freeze({
        id: 't2',
        account: 'checking',
        date: '2027-03-06',
        amount: -100,
      }),
    ]);
    const accounts = Object.freeze([
      Object.freeze({ id: 'checking', offbudget: false }),
    ]);
    const categories = Object.freeze([Object.freeze({ id: 'food' })]);
    const payees = Object.freeze([Object.freeze({ id: 'p-shop' })]);
    const result = toPeriodPostings({
      transactions,
      accounts,
      categories,
      payees,
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-05', amount: -4500 },
      ],
      unresolved: [
        {
          id: 't2',
          account: 'checking',
          date: '2027-03-06',
          amount: -100,
          reason: 'uncategorized',
        },
      ],
    });
  });

  test('B26 result objects are new objects', () => {
    const transactions = [
      {
        id: 't1',
        account: 'checking',
        date: '2027-03-05',
        amount: -4500,
        category: 'food',
      },
      { id: 't2', account: 'checking', date: '2027-03-06', amount: -100 },
    ];
    const result = toPeriodPostings({
      transactions,
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      payees: PAYEES,
    });
    expect(result.postings[0]).not.toBe(transactions[0]);
    expect(result.unresolved[0]).not.toBe(transactions[1]);
    expect(Object.keys(result.unresolved[0]).sort()).toEqual([
      'account',
      'amount',
      'date',
      'id',
      'reason',
    ]);
  });

  test("B27 Actual's entity types are accepted", () => {
    const transactions: TransactionEntity[] = [
      {
        id: 't1',
        account: 'checking',
        date: '2027-03-05',
        amount: -4500,
        category: 'food',
        payee: 'p-shop',
      },
    ];
    const accounts: Pick<AccountEntity, 'id' | 'offbudget'>[] = [
      { id: 'checking', offbudget: 0 },
    ];
    const categories: Pick<CategoryEntity, 'id' | 'is_income'>[] = [
      { id: 'food', is_income: false },
    ];
    const payees: Pick<PayeeEntity, 'id' | 'transfer_acct'>[] = [
      { id: 'p-shop' },
    ];
    const result = toPeriodPostings({
      transactions,
      accounts,
      categories,
      payees,
    });
    expect(result).toEqual({
      postings: [
        { id: 't1', category: 'food', date: '2027-03-05', amount: -4500 },
      ],
      unresolved: [],
    });
  });
});
