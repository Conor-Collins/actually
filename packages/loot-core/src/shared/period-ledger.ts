import type { ExpensePosting } from './period-budget';
import type { IntegerAmount } from './util';

export type LedgerTransaction = {
  id: string;
  account: string;
  date: string;
  amount: IntegerAmount;
  category?: string | null;
  payee?: string | null;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string | null;
  tombstone?: boolean;
  starting_balance_flag?: boolean;
};

export type LedgerAccount = {
  id: string;
  offbudget: boolean | 0 | 1;
};

export type LedgerCategory = {
  id: string;
  is_income?: boolean;
};

export type LedgerPayee = {
  id: string;
  transfer_acct?: string | null;
};

export type UnresolvedExpense = {
  id: string;
  account: string;
  date: string;
  amount: IntegerAmount;
  reason: 'uncategorized' | 'unknown-category';
};

export type LedgerPostings = {
  postings: ExpensePosting[];
  unresolved: UnresolvedExpense[];
};

type ToPeriodPostingsInput = {
  transactions: readonly LedgerTransaction[];
  accounts: readonly LedgerAccount[];
  categories: readonly LedgerCategory[];
  payees: readonly LedgerPayee[];
};

function isOffBudget(account: LedgerAccount): boolean {
  return account.offbudget === true || account.offbudget === 1;
}

export function toPeriodPostings({
  transactions,
  accounts,
  categories,
  payees,
}: ToPeriodPostingsInput): LedgerPostings {
  const accountById = new Map<string, LedgerAccount>();
  for (const account of accounts) {
    if (accountById.has(account.id)) {
      throw new Error(`duplicate account id "${account.id}"`);
    }
    accountById.set(account.id, account);
  }

  const categoryById = new Map<string, LedgerCategory>();
  for (const category of categories) {
    if (categoryById.has(category.id)) {
      throw new Error(`duplicate category id "${category.id}"`);
    }
    categoryById.set(category.id, category);
  }

  const payeeById = new Map<string, LedgerPayee>();
  for (const payee of payees) {
    if (payeeById.has(payee.id)) {
      throw new Error(`duplicate payee id "${payee.id}"`);
    }
    payeeById.set(payee.id, payee);
  }

  const transactionById = new Map<string, LedgerTransaction>();
  for (const transaction of transactions) {
    if (transactionById.has(transaction.id)) {
      throw new Error(`duplicate transaction id "${transaction.id}"`);
    }
    transactionById.set(transaction.id, transaction);
  }

  const postings: ExpensePosting[] = [];
  const unresolved: UnresolvedExpense[] = [];

  for (const t of transactions) {
    if (t.tombstone === true) {
      continue;
    }

    if (t.is_child === true && typeof t.parent_id === 'string') {
      const parent = transactionById.get(t.parent_id);
      if (parent !== undefined && parent.tombstone === true) {
        continue;
      }
    }

    if (t.is_parent === true) {
      continue;
    }

    const account = accountById.get(t.account);
    if (account === undefined) {
      throw new Error(
        `transaction ${t.id}: account "${t.account}" is not in accounts`,
      );
    }

    if (isOffBudget(account)) {
      continue;
    }

    if (t.starting_balance_flag === true) {
      continue;
    }

    if (typeof t.payee === 'string') {
      const payee = payeeById.get(t.payee);
      if (payee !== undefined && typeof payee.transfer_acct === 'string') {
        const transferAccount = accountById.get(payee.transfer_acct);
        if (transferAccount === undefined) {
          throw new Error(
            `transaction ${t.id}: transfer account "${payee.transfer_acct}" is not in accounts`,
          );
        }
        if (!isOffBudget(transferAccount)) {
          continue;
        }
      }
    }

    if (t.category === undefined || t.category === null) {
      unresolved.push({
        id: t.id,
        account: t.account,
        date: t.date,
        amount: t.amount,
        reason: 'uncategorized',
      });
      continue;
    }

    const category = categoryById.get(t.category);
    if (category === undefined) {
      unresolved.push({
        id: t.id,
        account: t.account,
        date: t.date,
        amount: t.amount,
        reason: 'unknown-category',
      });
      continue;
    }

    if (category.is_income === true) {
      continue;
    }

    postings.push({
      id: t.id,
      category: t.category,
      date: t.date,
      amount: t.amount,
    });
  }

  return { postings, unresolved };
}
