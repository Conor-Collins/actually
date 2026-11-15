import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { createSchedule as createScheduleBase } from '#server/schedules/app';
import { getScheduleDates } from '#server/schedules/occurrences';
import { loadRules } from '#server/transactions/transaction-rules';
import type { RecurConfig, RuleConditionEntity } from '#types/models';

import { app } from './app';
import type { PeriodBudgetCalculation } from './calculate';

// Books made from a seed, worked out on several as-of days and with several
// horizons. What must not change between them is compared, and the period
// every payment counts in is worked out a second time from the charges. No
// figure is written down here. Every transaction dated after the first as-of
// day carries a schedule or belongs to one that does: one without is not
// planned.

const handlers = app.handlers;
const createSchedule = createScheduleBase as (args: {
  conditions: RuleConditionEntity[];
}) => Promise<string>;

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

async function calculate(
  asOf: string,
  horizonEnd: string,
): Promise<PeriodBudgetCalculation> {
  const result = await handlers['period-budget/calculate']({
    asOf,
    horizonEnd,
  });
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result;
}

// The day `n` days after 1 January 2027.
function day(n: number): string {
  const date = new Date(Date.UTC(2027, 0, 1 + n));
  return date.toISOString().slice(0, 10);
}

// How many random books each test works out.
const SEEDS = 40;

const PERIOD_STARTS = [
  '2027-03-01',
  '2027-04-01',
  '2027-05-01',
  '2027-06-01',
  '2027-07-01',
];

// The period of category `fun` that a day lies in.
function periodIdOf(date: string): string | null {
  for (let i = 0; i < PERIOD_STARTS.length - 1; i++) {
    if (date >= PERIOD_STARTS[i] && date < PERIOD_STARTS[i + 1]) {
      return `fun:${PERIOD_STARTS[i]}`;
    }
  }
  return null;
}

type Entered = {
  id: string;
  date: string;
  amount: number;
  category: string | null;
  schedule: string | null;
  parent: string | null;
  isParent: boolean;
};

// Where plan B3 counts every payment, worked out from the charges of a result
// and the book, not from the offsets of the result. A transaction has a
// charge of its own when the user named it, or when it carries a linked
// schedule that its split does not carry. It counts in the period of the
// charge it pays, a part without a charge of its own in the period of the
// charge its split pays, and everything else (also a payment of a charge
// without a period or outside the days asked for, and one that is matched to
// no charge) in the period of its date.
function expectedAttribution(
  rows: readonly Entered[],
  namedIds: ReadonlySet<string>,
  linkedIds: ReadonlySet<string>,
  result: PeriodBudgetCalculation,
): { offsetIds: string[]; spent: Array<[string, number]> } {
  const rowById = new Map(rows.map(row => [row.id, row]));
  const chargePeriodByPaymentId = new Map<string, string | null>();
  for (const charge of result.charges) {
    for (const id of [charge.paymentId, ...charge.furtherPaymentIds]) {
      if (id !== null) {
        chargePeriodByPaymentId.set(id, charge.periodId);
      }
    }
  }
  function paysItself(row: Entered): boolean {
    if (namedIds.has(row.id)) {
      return true;
    }
    if (row.schedule === null || !linkedIds.has(row.schedule)) {
      return false;
    }
    const split = row.parent === null ? undefined : rowById.get(row.parent);
    return split?.schedule !== row.schedule;
  }
  const offsetIds: string[] = [];
  const spentById = new Map<string, number>();
  for (const row of rows) {
    if (row.isParent || row.category !== 'fun') {
      continue;
    }
    const split = row.parent === null ? undefined : rowById.get(row.parent);
    let payerId: string | null = null;
    if (paysItself(row)) {
      payerId = row.id;
    } else if (split !== undefined && paysItself(split)) {
      payerId = split.id;
    }
    const ownPeriod = periodIdOf(row.date);
    const chargePeriod =
      payerId === null ? null : (chargePeriodByPaymentId.get(payerId) ?? null);
    if (chargePeriod !== null && chargePeriod !== ownPeriod) {
      offsetIds.push(row.id);
    }
    const counted = chargePeriod ?? ownPeriod;
    if (counted !== null && row.date <= result.asOf) {
      spentById.set(counted, (spentById.get(counted) ?? 0) - row.amount);
    }
  }
  return {
    offsetIds: offsetIds.sort(),
    spent: PERIOD_STARTS.slice(0, -1).map(start => [
      `fun:${start}`,
      spentById.get(`fun:${start}`) ?? 0,
    ]),
  };
}

// What a result says about charges, spending and cash.
function summaryOf(result: PeriodBudgetCalculation) {
  return {
    charges: result.charges.map(charge => [
      charge.id,
      charge.status,
      charge.paymentId,
      charge.furtherPaymentIds,
    ]),
    offsets: result.derivedOffsetIds,
    remaining: result.projection.periods.map(p => [p.period.id, p.remaining]),
    movements: result.movements.map(m => [
      m.id,
      m.date,
      m.amount,
      m.scheduleId,
      m.isPosted,
    ]),
    ending: result.cash?.accounts.map(a => [
      a.accountId,
      a.projectedEndingBalance,
    ]),
  };
}

describe('period-budget/calculate: random books, charges and payments', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    it(`gives the same charges and cash on every as-of day and horizon, book ${seed}`, async () => {
      await global.emptyDatabase()();
      await loadMappings();
      await loadRules();
      await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
      await db.insertCategory({ id: 'fun', name: 'fun', cat_group: 'group1' });
      await db.insertAccount({ id: 'checking', name: 'Checking' });
      await db.insertAccount({ id: 'savings', name: 'Savings' });
      const random = rng(seed);
      const pick = (n: number) => Math.floor(random() * n);
      for (let i = 0; i < PERIOD_STARTS.length - 1; i++) {
        await handlers['period-budget/create-period']({
          category: 'fun',
          start: PERIOD_STARTS[i],
          end: PERIOD_STARTS[i + 1],
          budget: 50000,
        });
      }
      await db.insertTransaction({
        id: 'open',
        account: 'checking',
        date: '2026-12-01',
        amount: 100000,
        starting_balance_flag: true,
      });
      const schedules: Array<{ id: string; dates: string[]; linked: boolean }> =
        [];
      const count = 1 + pick(3);
      for (let i = 0; i < count; i++) {
        const kind = pick(4);
        const start = day(pick(100));
        let date: string | RecurConfig;
        if (kind === 0) {
          date = day(60 + pick(150));
        } else if (kind === 1) {
          date = { start, frequency: 'monthly' };
        } else if (kind === 2) {
          date = { start, frequency: 'weekly', interval: 1 + pick(3) };
        } else {
          date = { start, frequency: 'monthly', interval: 2 + pick(2) };
        }
        const amount = pick(5) === 0 ? 100 + pick(900) : -(100 + pick(900));
        const id = await createSchedule({
          conditions: [
            { op: 'is', field: 'account', value: 'checking' },
            { op: 'is', field: 'amount', value: amount },
            { op: 'is', field: 'date', value: date },
          ] satisfies RuleConditionEntity[],
        });
        const dates =
          typeof date === 'string'
            ? [date]
            : getScheduleDates(date, {
                start: '2026-12-01',
                end: '2028-03-01',
              });
        if (typeof date !== 'string' && pick(2) === 0) {
          const next = dates[pick(Math.min(dates.length, 8))];
          const n = Number(next.replaceAll('-', ''));
          db.runQuery(
            'UPDATE schedules_next_date SET local_next_date = ?, base_next_date = ? WHERE schedule_id = ?',
            [n, n, id],
          );
        }
        const linked = amount < 0 && pick(3) !== 0;
        if (linked) {
          await handlers['period-budget/link-schedule']({
            scheduleId: id,
            category: 'fun',
          });
        }
        schedules.push({ id, dates, linked });
      }
      const entered: Entered[] = [];
      const payments = pick(7);
      for (let i = 0; i < payments; i++) {
        const schedule = schedules[pick(schedules.length)];
        const id = `p${i}`;
        const date = day(30 + pick(260));
        if (pick(3) === 0) {
          // A split: it and its parts carry a schedule or none.
          const amounts = [-(100 + pick(900)), -(100 + pick(900))];
          // At least one of the three carries a schedule: a transaction
          // without any is not planned (a known limit).
          const carries = [pick(2) === 0, pick(2) === 0, pick(2) === 0];
          if (!carries.includes(true)) {
            carries[pick(3)] = true;
          }
          entered.push({
            id,
            date,
            amount: amounts[0] + amounts[1],
            category: null,
            schedule: carries[2] ? schedule.id : null,
            parent: null,
            isParent: true,
          });
          for (let part = 0; part < 2; part++) {
            const partSchedule = schedules[pick(schedules.length)];
            entered.push({
              id: `${id}-${part}`,
              date,
              amount: amounts[part],
              category: pick(2) === 0 ? 'fun' : null,
              schedule: carries[part] ? partSchedule.id : null,
              parent: id,
              isParent: false,
            });
          }
          continue;
        }
        const amount = -(100 + pick(900));
        entered.push({
          id,
          date,
          amount,
          category: pick(2) === 0 ? 'fun' : null,
          schedule: schedule.id,
          parent: null,
          isParent: false,
        });
      }
      for (const row of entered) {
        await db.insertTransaction({
          id: row.id,
          account: 'checking',
          date: row.date,
          amount: row.amount,
          category: row.category,
          ...(row.isParent ? { is_parent: true } : {}),
          ...(row.parent === null
            ? {}
            : { is_child: true, parent_id: row.parent }),
          ...(row.schedule === null ? {} : { schedule: row.schedule }),
        });
      }
      // The transaction every charge is named for; the last one set counts.
      const namedByChargeId = new Map<string, string>();
      const overrides = pick(4);
      for (let i = 0; i < overrides && entered.length > 0; i++) {
        const linked = schedules.filter(s => s.linked);
        if (linked.length === 0) {
          break;
        }
        const schedule = linked[pick(linked.length)];
        const dueDate = schedule.dates[pick(schedule.dates.length)];
        const transactionId = entered[pick(entered.length)].id;
        await handlers['period-budget/set-charge-override']({
          scheduleId: schedule.id,
          dueDate,
          transactionId,
        });
        namedByChargeId.set(`${schedule.id}:${dueDate}`, transactionId);
      }
      const namedIds = new Set(namedByChargeId.values());
      const linkedIds = new Set(schedules.filter(s => s.linked).map(s => s.id));

      const asOfs = ['2027-03-05', '2027-04-17', '2027-06-02', '2027-08-20'];
      const horizons = ['2027-06-30', '2027-09-30', '2028-01-31'];
      const chargeSeen = new Map<string, string>();
      const endingByHorizon = new Map<string, number>();
      for (const asOf of asOfs) {
        let shorter: PeriodBudgetCalculation | null = null;
        for (const horizon of horizons) {
          if (horizon < asOf) {
            continue;
          }
          const result = await calculate(asOf, horizon);
          // A charge has the same payment on every as-of day and horizon.
          for (const charge of result.charges) {
            const key = JSON.stringify([
              charge.status,
              charge.paymentId,
              charge.paymentDate,
              charge.isNamedPayment,
              charge.amount,
              charge.openAmount,
              charge.furtherPaymentIds,
            ]);
            const seen = chargeSeen.get(charge.id);
            if (seen === undefined) {
              chargeSeen.set(charge.id, key);
            } else {
              expect([charge.id, asOf, horizon, key]).toEqual([
                charge.id,
                asOf,
                horizon,
                seen,
              ]);
            }
          }
          // Every payment counts in the period plan B3 gives it.
          const expected = expectedAttribution(
            entered,
            namedIds,
            linkedIds,
            result,
          );
          expect([asOf, horizon, result.derivedOffsetIds]).toEqual([
            asOf,
            horizon,
            expected.offsetIds,
          ]);
          const spentById = new Map<string, number>();
          for (const p of result.projection.periods) {
            spentById.set(
              p.period.id,
              p.period.budget + p.period.carryover - p.remaining,
            );
          }
          expect([
            asOf,
            horizon,
            expected.spent.map(([id]) => [id, spentById.get(id)]),
          ]).toEqual([asOf, horizon, expected.spent]);
          // What the account holds at the end of a horizon is the same from
          // every as-of day: a payment is in the balance or planned, once.
          const ending = result.cash?.accounts.find(
            a => a.accountId === 'checking',
          )?.projectedEndingBalance;
          const before = endingByHorizon.get(horizon);
          if (before === undefined) {
            endingByHorizon.set(horizon, ending ?? NaN);
          } else {
            expect([asOf, horizon, ending]).toEqual([asOf, horizon, before]);
          }
          // A longer horizon adds movements and changes none.
          if (shorter !== null) {
            const limit = shorter.horizonEnd;
            expect(
              result.movements
                .filter(m => m.date <= limit && m.dueDate <= limit)
                .map(m => [m.id, m.date, m.amount]),
            ).toEqual(shorter.movements.map(m => [m.id, m.date, m.amount]));
          }
          shorter = result;
        }
      }

      // A part that carries the schedule of its split is no payment of its
      // own: taking that schedule off the part changes nothing.
      const withSchedules = summaryOf(
        await calculate('2027-04-17', '2027-09-30'),
      );
      for (const row of entered) {
        const split = entered.find(other => other.id === row.parent);
        if (row.schedule !== null && split?.schedule === row.schedule) {
          db.runQuery('UPDATE transactions SET schedule = NULL WHERE id = ?', [
            row.id,
          ]);
        }
      }
      expect(summaryOf(await calculate('2027-04-17', '2027-09-30'))).toEqual(
        withSchedules,
      );
    });
  }
});

const ACCOUNTS = ['a', 'b', 'c'];

type Node = {
  id: string;
  account: string;
  amount: number;
  parent?: string;
  isParent?: boolean;
  transfer?: string;
};

describe('period-budget/calculate: random books, transfers and splits', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    it(`gives every account the same cash on every as-of day, book ${seed}`, async () => {
      await global.emptyDatabase()();
      await loadMappings();
      await loadRules();
      await db.insertCategoryGroup({ id: 'group1', name: 'Bills' });
      await db.insertCategory({ id: 'fun', name: 'fun', cat_group: 'group1' });
      for (const account of ACCOUNTS) {
        await db.insertAccount({ id: account, name: account });
        await db.insertTransaction({
          id: `open-${account}`,
          account,
          date: '2026-12-01',
          amount: 100000,
          starting_balance_flag: true,
        });
      }
      const random = rng(seed * 7919);
      const pick = (n: number) => Math.floor(random() * n);
      const groups = 1 + pick(4);
      for (let g = 0; g < groups; g++) {
        const date = day(60 + pick(100));
        const order = [...ACCOUNTS].sort(() => random() - 0.5);
        const [x, y, z] = order;
        const shape = pick(4);
        const nodes: Node[] = [];
        const amount1 = 100 + pick(900);
        const amount2 = 100 + pick(900);
        const amount3 = 100 + pick(900);
        const p = `g${g}`;
        if (shape === 0) {
          nodes.push(
            {
              id: `${p}-out`,
              account: x,
              amount: -amount1,
              transfer: `${p}-in`,
            },
            {
              id: `${p}-in`,
              account: y,
              amount: amount1,
              transfer: `${p}-out`,
            },
          );
        } else if (shape === 1) {
          nodes.push(
            {
              id: `${p}-par`,
              account: x,
              amount: -(amount1 + amount2 + amount3),
              isParent: true,
            },
            {
              id: `${p}-p1`,
              account: x,
              amount: -amount1,
              parent: `${p}-par`,
              transfer: `${p}-in1`,
            },
            {
              id: `${p}-p2`,
              account: x,
              amount: -amount2,
              parent: `${p}-par`,
              transfer: `${p}-in2`,
            },
            { id: `${p}-p3`, account: x, amount: -amount3, parent: `${p}-par` },
            {
              id: `${p}-in1`,
              account: y,
              amount: amount1,
              transfer: `${p}-p1`,
            },
            {
              id: `${p}-in2`,
              account: z,
              amount: amount2,
              transfer: `${p}-p2`,
            },
          );
        } else if (shape === 2) {
          // A split in x sends to a split in y, which sends on to z.
          nodes.push(
            {
              id: `${p}-par`,
              account: x,
              amount: -(amount1 + amount2),
              isParent: true,
            },
            {
              id: `${p}-p1`,
              account: x,
              amount: -amount1,
              parent: `${p}-par`,
              transfer: `${p}-q1`,
            },
            { id: `${p}-p2`, account: x, amount: -amount2, parent: `${p}-par` },
            {
              id: `${p}-qar`,
              account: y,
              amount: amount1 - amount3,
              isParent: true,
            },
            {
              id: `${p}-q1`,
              account: y,
              amount: amount1,
              parent: `${p}-qar`,
              transfer: `${p}-p1`,
            },
            {
              id: `${p}-q2`,
              account: y,
              amount: -amount3,
              parent: `${p}-qar`,
              transfer: `${p}-in`,
            },
            { id: `${p}-in`, account: z, amount: amount3, transfer: `${p}-q2` },
          );
        } else {
          // Two splits that send to each other twice, and one on to z.
          nodes.push(
            {
              id: `${p}-par`,
              account: x,
              amount: -(amount1 + amount2),
              isParent: true,
            },
            {
              id: `${p}-p1`,
              account: x,
              amount: -amount1,
              parent: `${p}-par`,
              transfer: `${p}-q1`,
            },
            {
              id: `${p}-p2`,
              account: x,
              amount: -amount2,
              parent: `${p}-par`,
              transfer: `${p}-q2`,
            },
            {
              id: `${p}-qar`,
              account: y,
              amount: amount1 + amount2 - amount3,
              isParent: true,
            },
            {
              id: `${p}-q1`,
              account: y,
              amount: amount1,
              parent: `${p}-qar`,
              transfer: `${p}-p1`,
            },
            {
              id: `${p}-q2`,
              account: y,
              amount: amount2,
              parent: `${p}-qar`,
              transfer: `${p}-p2`,
            },
            {
              id: `${p}-q3`,
              account: y,
              amount: -amount3,
              parent: `${p}-qar`,
              transfer: `${p}-in`,
            },
            { id: `${p}-in`, account: z, amount: amount3, transfer: `${p}-q3` },
          );
        }
        // One or two of the transactions carry a schedule.
        const carriers = new Map<string, string>();
        const carrierCount = 1 + pick(2);
        for (let c = 0; c < carrierCount; c++) {
          const node = nodes[pick(nodes.length)];
          if (carriers.has(node.id)) {
            continue;
          }
          const whole =
            node.parent === undefined
              ? node
              : nodes.find(n => n.id === node.parent);
          const scheduleDate = day(
            Math.round(
              (new Date(date).getTime() - Date.UTC(2027, 0, 1)) / 86400000,
            ) +
              pick(9) -
              4,
          );
          const id = await createSchedule({
            conditions: [
              {
                op: 'is',
                field: 'account',
                value: whole?.account ?? node.account,
              },
              {
                op: 'is',
                field: 'amount',
                value: whole?.amount ?? node.amount,
              },
              { op: 'is', field: 'date', value: scheduleDate },
            ] satisfies RuleConditionEntity[],
          });
          carriers.set(node.id, id);
        }
        // Stored in a random order.
        for (const node of [...nodes].sort(() => random() - 0.5)) {
          await db.insertTransaction({
            id: node.id,
            account: node.account,
            date,
            amount: node.amount,
            ...(node.isParent ? { is_parent: true } : {}),
            ...(node.parent ? { is_child: true, parent_id: node.parent } : {}),
            ...(node.transfer ? { transfer_id: node.transfer } : {}),
            ...(carriers.has(node.id)
              ? { schedule: carriers.get(node.id) }
              : {}),
          });
        }
      }

      const asOfs = ['2027-02-15', '2027-04-10', '2027-05-20', '2027-07-01'];
      const horizons = ['2027-07-31', '2027-12-31'];
      for (const horizon of horizons) {
        // On the last as-of day every transaction is in the balances.
        const truth = await calculate('2027-07-01', horizon);
        expect(truth.movements).toEqual([]);
        const expected = truth.cash?.accounts.map(a => [
          a.accountId,
          a.projectedEndingBalance,
        ]);
        expect(expected?.length).toBe(3);
        for (const asOf of asOfs) {
          const result = await calculate(asOf, horizon);
          expect([
            asOf,
            result.cash?.accounts.map(a => [
              a.accountId,
              a.projectedEndingBalance,
            ]),
          ]).toEqual([asOf, expected]);
          const ids = result.movements.map(m => m.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
    });
  }
});
