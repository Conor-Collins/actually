import * as monthUtils from '@actual-app/core/shared/months';

import { lastDayOf, outstandingOf } from './model';
import type { ChargeView, PaymentView, PeriodView } from './model';

// A period's graph: its allowance as a level line over its days, what is
// spent so far as a line that steps at each payment's real date, and what is
// still expected as a line that goes on from the as-of day and steps at each
// scheduled charge. Places across are from 0 at the start of the first day
// shown to 1 at the end of the last; a day's marker is in its middle.

export type GraphZone = 'early' | 'inside' | 'late';

export type GraphPayment = {
  payment: PaymentView;
  x: number;
  level: number; // what is spent with this payment
};

export type GraphCharge = {
  charge: ChargeView;
  // Its due date, or the as-of day when it is overdue
  x: number;
  amount: number; // what is still expected of it
  level: number; // what is spent and expected with this charge
};

// A level part of a line.
export type GraphRun = {
  // The line, the payment or charge the part begins at, and its zone
  id: string;
  kind: 'spent' | 'expected';
  // Where it is against the days of the period: before them, in them, or
  // after them
  zone: GraphZone;
  from: number;
  to: number;
  level: number;
};

// Where a line steps from one level to the next.
export type GraphRise = {
  // The line, and the payment or charge of the step
  id: string;
  kind: 'spent' | 'expected';
  x: number;
  from: number;
  to: number;
};

export type PeriodGraph = {
  start: string; // the first day shown
  lastDay: string; // the last day shown
  // The days of the period, as places across
  periodFrom: number;
  periodTo: number;
  allowance: number;
  spent: number;
  expected: number; // spent, and the charges that are still expected
  payments: GraphPayment[];
  charges: GraphCharge[];
  runs: GraphRun[];
  rises: GraphRise[];
  // Where the as-of day is against the days shown, and its place when it is
  // one of them
  asOfPlace: 'before' | 'shown' | 'after';
  asOfX: number | null;
  // The amounts the graph has room for
  low: number;
  high: number;
};

// A step of a line: `id` is its payment or charge, and nothing where the
// line begins
type Step = { id: string; x: number; level: number };

export function isShownCharge(charge: ChargeView): boolean {
  return charge.status === 'expected' || outstandingOf(charge) > 0;
}

export function buildPeriodGraph(view: PeriodView, asOf: string): PeriodGraph {
  const { period, payments, allowance } = view;
  const periodLastDay = lastDayOf(period.end);
  let start = period.start;
  let lastDay = periodLastDay;
  for (const payment of payments) {
    if (payment.date < start) {
      start = payment.date;
    }
    if (payment.date > lastDay) {
      lastDay = payment.date;
    }
  }
  const dayCount = monthUtils.differenceInCalendarDays(lastDay, start) + 1;

  // The start of a day
  function edge(day: string) {
    return monthUtils.differenceInCalendarDays(day, start) / dayCount;
  }
  // The middle of a day
  function middle(day: string) {
    return edge(day) + 0.5 / dayCount;
  }

  const periodFrom = edge(period.start);
  const periodTo = edge(period.end);
  const asOfPlace =
    asOf < start ? 'before' : asOf > lastDay ? 'after' : 'shown';
  const asOfX = asOfPlace === 'shown' ? middle(asOf) : null;
  // Where what is known ends and what is expected begins
  const nowX =
    asOfPlace === 'before' ? 0 : asOfPlace === 'after' ? 1 : middle(asOf);

  let level = 0;
  const graphPayments = payments.map((payment): GraphPayment => {
    // A payment is a negative amount, a refund a positive one
    level -= payment.amount;
    return { payment, x: middle(payment.date), level };
  });
  const spent = level;

  const graphCharges = view.charges
    .filter(isShownCharge)
    .map(charge => ({
      charge,
      x: charge.dueDate > asOf ? middle(charge.dueDate) : nowX,
      amount: outstandingOf(charge),
    }))
    .map((entry): GraphCharge => {
      level += entry.amount;
      return { ...entry, level };
    });
  const expected = level;

  const runs: GraphRun[] = [];
  const rises: GraphRise[] = [];

  function zoneOf(from: number, to: number): GraphZone {
    const center = (from + to) / 2;
    if (center < periodFrom) {
      return 'early';
    }
    return center < periodTo ? 'inside' : 'late';
  }

  // The line through the steps, from the first of them to `end`
  function draw(kind: GraphRun['kind'], steps: Step[], end: number) {
    steps.forEach((step, index) => {
      if (index > 0) {
        rises.push({
          id: `${kind}:${step.id}`,
          kind,
          x: step.x,
          from: steps[index - 1].level,
          to: step.level,
        });
      }
      const to = index + 1 < steps.length ? steps[index + 1].x : end;
      // A level part is cut where the period begins and where it ends
      const cuts = [step.x, periodFrom, periodTo, to]
        .filter(cut => cut >= step.x && cut <= to)
        .sort((a, b) => a - b);
      for (let part = 0; part + 1 < cuts.length; part++) {
        if (cuts[part + 1] > cuts[part]) {
          const zone = zoneOf(cuts[part], cuts[part + 1]);
          runs.push({
            id: `${kind}:${step.id}:${zone}`,
            kind,
            zone,
            from: cuts[part],
            to: cuts[part + 1],
            level: step.level,
          });
        }
      }
    });
  }

  // The line ends at the as-of day. An early payment is joined to its period
  // also when the period has not begun: then the line goes on to its first day
  draw(
    'spent',
    [
      { id: '', x: 0, level: 0 },
      ...graphPayments.map(({ payment, x, level }) => ({
        id: payment.id,
        x,
        level,
      })),
    ],
    Math.max(nowX, periodFrom),
  );
  if (graphCharges.length > 0) {
    draw(
      'expected',
      [
        { id: '', x: nowX, level: spent },
        ...graphCharges.map(({ charge, x, level }) => ({
          id: charge.id,
          x,
          level,
        })),
      ],
      1,
    );
  }

  const levels = [
    0,
    allowance,
    ...graphPayments.map(entry => entry.level),
    ...graphCharges.map(entry => entry.level),
  ];
  const low = Math.min(...levels);
  const high = Math.max(...levels);

  return {
    start,
    lastDay,
    periodFrom,
    periodTo,
    allowance,
    spent,
    expected,
    payments: graphPayments,
    charges: graphCharges,
    runs,
    rises,
    asOfPlace,
    asOfX,
    low,
    high: high === low ? low + 1 : high,
  };
}

// Where an amount is between the top (0) and the bottom (1) of the graph.
export function graphHeight(graph: PeriodGraph, amount: number): number {
  return (graph.high - amount) / (graph.high - graph.low);
}
