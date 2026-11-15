import type { PeriodBudgetRow, PeriodCadenceRow } from '#types/models';

import {
  cadenceEnd,
  checkPeriodWrite,
  isValidDay,
  isWholeNumber,
  newPeriodId,
  planPeriods,
} from './period-store';
import type { PeriodCandidate } from './period-store';

function row(
  id: string,
  start: string | null,
  end: string | null,
  budget: number | null = 60000,
  extra: Partial<PeriodBudgetRow> = {},
): PeriodBudgetRow {
  return {
    id,
    category: 'cat1',
    start_date: start,
    end_date: end,
    budget,
    carryover: 0,
    carried_from: null,
    tombstone: false,
    ...extra,
  };
}

function cadence(extra: Partial<PeriodCadenceRow> = {}): PeriodCadenceRow {
  return {
    id: 'cat1',
    anchor_date: '2027-01-01',
    months: 1,
    active: true,
    tombstone: false,
    ...extra,
  };
}

const JAN = row('cat1:2027-01-01', '2027-01-01', '2027-02-01');

describe('newPeriodId', () => {
  it('uses category and start date when the id is free', () => {
    expect(newPeriodId('cat1', '2027-01-01', new Set())).toBe(
      'cat1:2027-01-01',
    );
  });

  it('adds :2 when the id is taken', () => {
    expect(
      newPeriodId('cat1', '2027-01-01', new Set(['cat1:2027-01-01'])),
    ).toBe('cat1:2027-01-01:2');
  });

  it('adds :3 when :2 is taken too', () => {
    expect(
      newPeriodId(
        'cat1',
        '2027-01-01',
        new Set(['cat1:2027-01-01', 'cat1:2027-01-01:2']),
      ),
    ).toBe('cat1:2027-01-01:3');
  });

  it('uses the plain id when only :2 is taken', () => {
    expect(
      newPeriodId('cat1', '2027-01-01', new Set(['cat1:2027-01-01:2'])),
    ).toBe('cat1:2027-01-01');
  });
});

describe('cadenceEnd', () => {
  it('adds one month', () => {
    expect(cadenceEnd('2027-01-01', 1, 1)).toBe('2027-02-01');
  });

  it('adds twelve months', () => {
    expect(cadenceEnd('2027-01-01', 12, 1)).toBe('2028-01-01');
  });

  it('adds three months across a year end', () => {
    expect(cadenceEnd('2027-11-15', 3, 15)).toBe('2028-02-15');
  });

  it('clamps the 31st to the end of February', () => {
    expect(cadenceEnd('2027-01-31', 1, 31)).toBe('2027-02-28');
  });

  it('returns to the 31st after February', () => {
    expect(cadenceEnd('2027-02-28', 1, 31)).toBe('2027-03-31');
  });

  it('clamps the 31st to the 30th of April', () => {
    expect(cadenceEnd('2027-03-31', 1, 31)).toBe('2027-04-30');
  });

  it('uses 29 February in a leap year', () => {
    expect(cadenceEnd('2028-01-31', 1, 31)).toBe('2028-02-29');
  });

  it('keeps the 28th when the anchor is the 28th', () => {
    expect(cadenceEnd('2027-02-28', 1, 28)).toBe('2027-03-28');
  });

  it('keeps the start day when it is not the anchor day', () => {
    expect(cadenceEnd('2027-04-15', 1, 1)).toBe('2027-05-15');
  });

  it('rolls December into January', () => {
    expect(cadenceEnd('2027-12-01', 1, 1)).toBe('2028-01-01');
  });

  it('handles an anchor on the 30th', () => {
    expect(cadenceEnd('2027-01-30', 1, 30)).toBe('2027-02-28');
    expect(cadenceEnd('2027-02-28', 1, 30)).toBe('2027-03-30');
  });
});

describe('isValidDay and isWholeNumber', () => {
  it('accepts real days only', () => {
    expect(isValidDay('2027-02-28')).toBe(true);
    expect(isValidDay('2028-02-29')).toBe(true);
    expect(isValidDay('2027-02-29')).toBe(false);
    expect(isValidDay('2027-13-01')).toBe(false);
    expect(isValidDay('2027-1-1')).toBe(false);
    expect(isValidDay(null)).toBe(false);
    expect(isValidDay(20270101)).toBe(false);
  });

  it('accepts safe integers only', () => {
    expect(isWholeNumber(0)).toBe(true);
    expect(isWholeNumber(-5)).toBe(true);
    expect(isWholeNumber(1.5)).toBe(false);
    expect(isWholeNumber(null)).toBe(false);
    expect(isWholeNumber('1')).toBe(false);
    expect(isWholeNumber(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });
});

describe('planPeriods', () => {
  it('plans nothing without a stored period', () => {
    expect(
      planPeriods({ cadence: cadence(), periods: [], until: '2027-12-31' }),
    ).toEqual([]);
  });

  it('plans nothing before the next start date', () => {
    expect(
      planPeriods({ cadence: cadence(), periods: [JAN], until: '2027-01-31' }),
    ).toEqual([]);
  });

  it('plans the next period on its start date', () => {
    expect(
      planPeriods({ cadence: cadence(), periods: [JAN], until: '2027-02-01' }),
    ).toEqual([row('cat1:2027-02-01', '2027-02-01', '2027-03-01')]);
  });

  it('plans every period up to the day', () => {
    expect(
      planPeriods({ cadence: cadence(), periods: [JAN], until: '2027-04-15' }),
    ).toEqual([
      row('cat1:2027-02-01', '2027-02-01', '2027-03-01'),
      row('cat1:2027-03-01', '2027-03-01', '2027-04-01'),
      row('cat1:2027-04-01', '2027-04-01', '2027-05-01'),
    ]);
  });

  it('copies the latest allowance and no carry', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          JAN,
          row('cat1:2027-02-01', '2027-02-01', '2027-03-01', 65000, {
            carryover: 500,
            carried_from: 'cat1:2027-01-01',
          }),
        ],
        until: '2027-03-01',
      }),
    ).toEqual([row('cat1:2027-03-01', '2027-03-01', '2027-04-01', 65000)]);
  });

  it('takes the latest period whatever the input order', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          row('cat1:2027-02-01', '2027-02-01', '2027-03-01', 65000),
          JAN,
        ],
        until: '2027-03-01',
      }),
    ).toEqual([row('cat1:2027-03-01', '2027-03-01', '2027-04-01', 65000)]);
  });

  it('plans nothing for a deleted cadence', () => {
    expect(
      planPeriods({
        cadence: cadence({ tombstone: true }),
        periods: [JAN],
        until: '2027-12-31',
      }),
    ).toEqual([]);
  });

  it('plans nothing for a cadence that is switched off', () => {
    expect(
      planPeriods({
        cadence: cadence({ active: false }),
        periods: [JAN],
        until: '2027-12-31',
      }),
    ).toEqual([]);
  });

  it('plans nothing for an invalid cadence', () => {
    const cadences = [
      cadence({ months: null }),
      cadence({ months: 0 }),
      cadence({ months: 1.5 }),
      cadence({ anchor_date: null }),
      cadence({ anchor_date: 'x' }),
    ];
    for (const c of cadences) {
      expect(
        planPeriods({ cadence: c, periods: [JAN], until: '2027-12-31' }),
      ).toEqual([]);
    }
  });

  it('ignores periods of other categories', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          row('cat2:2027-01-01', '2027-01-01', '2027-02-01', 60000, {
            category: 'cat2',
          }),
        ],
        until: '2027-12-31',
      }),
    ).toEqual([]);
  });

  it('leaves a deleted period deleted', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          JAN,
          row('cat1:2027-02-01', '2027-02-01', '2027-03-01', 70000, {
            tombstone: true,
          }),
        ],
        until: '2027-02-15',
      }),
    ).toEqual([]);
  });

  it('continues after a deleted period with the last live allowance', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          JAN,
          row('cat1:2027-02-01', '2027-02-01', '2027-03-01', 70000, {
            tombstone: true,
          }),
        ],
        until: '2027-03-01',
      }),
    ).toEqual([row('cat1:2027-03-01', '2027-03-01', '2027-04-01', 60000)]);
  });

  it('continues from the end date a deleted period had', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          JAN,
          row('cat1:2027-02-01', '2027-02-01', '2027-02-15', 70000, {
            tombstone: true,
          }),
        ],
        until: '2027-02-20',
      }),
    ).toEqual([row('cat1:2027-02-15', '2027-02-15', '2027-03-15', 60000)]);
  });

  it('skips a deleted period that has no valid end date', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          JAN,
          row('cat1:2027-02-01', '2027-02-01', null, 70000, {
            tombstone: true,
          }),
        ],
        until: '2027-03-01',
      }),
    ).toEqual([row('cat1:2027-03-01', '2027-03-01', '2027-04-01', 60000)]);
  });

  it('adds :2 when a moved live period has the id', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [
          row('cat1:2027-01-01', '2027-01-01', '2027-01-15'),
          row('cat1:2027-02-01', '2027-01-15', '2027-02-01', 61000),
        ],
        until: '2027-02-01',
      }),
    ).toEqual([row('cat1:2027-02-01:2', '2027-02-01', '2027-03-01', 61000)]);
  });

  it('ignores live rows with invalid dates', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [JAN, row('cat1:x', null, null, 99)],
        until: '2027-02-01',
      }),
    ).toEqual([row('cat1:2027-02-01', '2027-02-01', '2027-03-01', 60000)]);
  });

  it('uses 0 when the latest allowance is not a valid number', () => {
    expect(
      planPeriods({
        cadence: cadence(),
        periods: [row('cat1:2027-01-01', '2027-01-01', '2027-02-01', null)],
        until: '2027-02-01',
      }),
    ).toEqual([row('cat1:2027-02-01', '2027-02-01', '2027-03-01', 0)]);
  });

  it('keeps an end-of-month cadence on the last day', () => {
    expect(
      planPeriods({
        cadence: cadence({ anchor_date: '2027-01-31' }),
        periods: [row('cat1:2027-01-31', '2027-01-31', '2027-02-28')],
        until: '2027-04-01',
      }),
    ).toEqual([
      row('cat1:2027-02-28', '2027-02-28', '2027-03-31'),
      row('cat1:2027-03-31', '2027-03-31', '2027-04-30'),
    ]);
  });

  it('plans yearly periods', () => {
    expect(
      planPeriods({
        cadence: cadence({ months: 12 }),
        periods: [row('cat1:2027-01-01', '2027-01-01', '2028-01-01', 120000)],
        until: '2029-06-01',
      }),
    ).toEqual([
      row('cat1:2028-01-01', '2028-01-01', '2029-01-01', 120000),
      row('cat1:2029-01-01', '2029-01-01', '2030-01-01', 120000),
    ]);
  });

  it('stops after 1000 periods', () => {
    expect(
      planPeriods({ cadence: cadence(), periods: [JAN], until: '9999-12-31' })
        .length,
    ).toBe(1000);
  });

  it('does not change its input', () => {
    const periods = [JAN];
    const before = JSON.stringify(periods);
    planPeriods({ cadence: cadence(), periods, until: '2027-04-15' });
    expect(JSON.stringify(periods)).toBe(before);
  });
});

describe('checkPeriodWrite', () => {
  function candidate(extra: Partial<PeriodCandidate> = {}): PeriodCandidate {
    return {
      id: 'cat1:2027-02-01',
      category: 'cat1',
      start_date: '2027-02-01',
      end_date: '2027-03-01',
      budget: 60000,
      carryover: 0,
      ...extra,
    };
  }

  it('accepts a valid period', () => {
    expect(checkPeriodWrite({ candidate: candidate(), periods: [JAN] })).toBe(
      null,
    );
  });

  it('refuses an invalid start date', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate({ start_date: 'x' }),
        periods: [],
      }),
    ).toBe('start date "x" is not a valid date');
  });

  it('refuses an invalid end date', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate({ end_date: '2027-02-30' }),
        periods: [],
      }),
    ).toBe('end date "2027-02-30" is not a valid date');
  });

  it('refuses an end date that is not after the start date', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate({ end_date: '2027-02-01' }),
        periods: [],
      }),
    ).toBe('end date 2027-02-01 must be after start date 2027-02-01');
  });

  it('refuses a negative or fractional budget', () => {
    expect(
      checkPeriodWrite({ candidate: candidate({ budget: -1 }), periods: [] }),
    ).toBe('budget must be a whole number that is not negative');
    expect(
      checkPeriodWrite({ candidate: candidate({ budget: 1.5 }), periods: [] }),
    ).toBe('budget must be a whole number that is not negative');
  });

  it('refuses a fractional carryover', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate({ carryover: 0.5 }),
        periods: [],
      }),
    ).toBe('carryover must be a whole number');
    expect(
      checkPeriodWrite({
        candidate: candidate({ carryover: -80 }),
        periods: [],
      }),
    ).toBe(null);
  });

  it('refuses an overlap with a live period of the category', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate({ start_date: '2027-01-15' }),
        periods: [JAN],
      }),
    ).toBe('overlaps period cat1:2027-01-01 (2027-01-01 to 2027-02-01)');
  });

  it('accepts a period that starts where another ends', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate(),
        periods: [JAN, row('cat1:2027-03-01', '2027-03-01', '2027-04-01')],
      }),
    ).toBe(null);
  });

  it('ignores deleted periods, other categories, itself and invalid rows', () => {
    const c = candidate({ start_date: '2027-01-15' });
    const periodLists = [
      [
        row('cat1:2027-01-01', '2027-01-01', '2027-02-01', 60000, {
          tombstone: true,
        }),
      ],
      [
        row('cat2:2027-01-01', '2027-01-01', '2027-02-01', 60000, {
          category: 'cat2',
        }),
      ],
      [row('cat1:2027-02-01', '2027-01-01', '2027-02-10')],
      [row('cat1:x', '2027-01-20', null)],
    ];
    for (const periods of periodLists) {
      expect(checkPeriodWrite({ candidate: c, periods })).toBe(null);
    }
  });

  it('reports the first overlapping period in input order', () => {
    expect(
      checkPeriodWrite({
        candidate: candidate({
          start_date: '2027-01-15',
          end_date: '2027-03-15',
        }),
        periods: [row('cat1:2027-03-01', '2027-03-01', '2027-04-01'), JAN],
      }),
    ).toBe('overlaps period cat1:2027-03-01 (2027-03-01 to 2027-04-01)');
  });
});
