import { q } from './query';
import type { Query } from './query';

type PaymentDays = {
  start: string;
  end: string; // the last day
};

// What can be named as the payment of a charge: the money that left an
// account on these days, in any category or in none, with the parts of a
// split in place of the split, the latest first.
export function nameablePaymentsQuery({ start, end }: PaymentDays): Query {
  return q('transactions')
    .filter({
      $and: [{ date: { $gte: start } }, { date: { $lte: end } }],
      amount: { $lt: 0 },
      // The calculation leaves out a transaction whose account is deleted,
      // so it cannot pay a charge
      account: { $ne: null },
    })
    .options({ splits: 'inline' })
    .select('*')
    .orderBy([{ date: 'desc' }, 'id']);
}

// One transaction, whatever it is: a payment that is named already is shown
// also when it could not be named now.
export function paymentByIdQuery(id: string): Query {
  return q('transactions')
    .filter({ id })
    .options({ splits: 'all' })
    .select('*');
}
