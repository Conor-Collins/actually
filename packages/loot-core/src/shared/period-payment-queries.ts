import { q } from './query';
import type { Query } from './query';

type PaymentDays = {
  start: string;
  end: string; // the last day
};

type ListedPayment = {
  id: string;
  is_child?: boolean;
  parent_id?: string | null;
};

type ListedSplit = {
  id: string;
  is_child: boolean;
  account: string | null;
};

// How a list is read: the app and the server each have their own way
type RunQuery = <Row>(query: Query) => Promise<{ data: Row[] }>;

// The money that left an account on these days, in any category or in none,
// with the parts of a split in place of the split, the latest first. Actual
// also gives a part whose split is a part itself, or is of a deleted account:
// see listNameablePayments.
export function nameablePaymentsQuery({ start, end }: PaymentDays): Query {
  return q('transactions')
    .filter({
      $and: [{ date: { $gte: start } }, { date: { $lte: end } }],
      amount: { $lt: 0 },
      // The calculation leaves out a transaction whose account is deleted,
      // so it cannot pay a charge
      account: { $ne: null },
      // A part that has itself as its split is a part of no transaction
      parent_id: { $ne: '$id' },
    })
    .options({ splits: 'inline' })
    .select('*')
    .orderBy([{ date: 'desc' }, 'id']);
}

// The transactions that parts name as their split
function splitsQuery(ids: string[]): Query {
  return q('transactions')
    .filter({ id: { $oneof: ids } })
    .options({ splits: 'all' })
    .select(['id', 'is_child', 'account']);
}

// What can be named as the payment of a charge on these days. The
// calculation counts a part of a split only when its split is a whole
// transaction of an account that exists, and leaves out any other part (one
// that has itself as its split, for example). Such a part cannot pay a
// charge, so it is not listed.
export async function listNameablePayments<Payment extends ListedPayment>(
  run: RunQuery,
  days: PaymentDays,
): Promise<Payment[]> {
  const { data: payments } = await run<Payment>(nameablePaymentsQuery(days));
  const splitIds = new Set<string>();
  for (const payment of payments) {
    const splitId = payment.parent_id;
    if (payment.is_child === true && typeof splitId === 'string') {
      splitIds.add(splitId);
    }
  }
  const wholeIds = new Set<string>();
  if (splitIds.size > 0) {
    const { data: splits } = await run<ListedSplit>(splitsQuery([...splitIds]));
    for (const split of splits) {
      if (split.is_child !== true && split.account !== null) {
        wholeIds.add(split.id);
      }
    }
  }
  return payments.filter(
    payment =>
      payment.is_child !== true ||
      (typeof payment.parent_id === 'string' &&
        wholeIds.has(payment.parent_id)),
  );
}

// One transaction, whatever it is: a payment that is named already is shown
// also when it could not be named now.
export function paymentByIdQuery(id: string): Query {
  return q('transactions')
    .filter({ id })
    .options({ splits: 'all' })
    .select('*');
}
