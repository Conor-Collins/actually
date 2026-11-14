import {
  copyBudgetPeriod,
  createBudgetPeriod,
  summarizePeriodBudgets,
  validateBudgetPeriods,
} from './period-budget';
import type { BudgetPeriod } from './period-budget';

function makePeriod(overrides: Partial<BudgetPeriod> = {}): BudgetPeriod {
  return {
    id: 'p1',
    category: 'Rent',
    start: '2027-01-01',
    end: '2028-01-01',
    budget: 150000,
    carryover: 0,
    ...overrides,
  };
}

describe('createBudgetPeriod', () => {
  test('returns an annual period with the given fields', () => {
    const period = createBudgetPeriod({
      id: 'annual-rent',
      category: 'Rent',
      start: '2027-01-01',
      end: '2028-01-01',
      budget: 150000,
    });
    expect(period).toEqual({
      id: 'annual-rent',
      category: 'Rent',
      start: '2027-01-01',
      end: '2028-01-01',
      budget: 150000,
      carryover: 0,
    });
  });

  test('accepts a period that does not follow the calendar year', () => {
    const period = createBudgetPeriod({
      id: 'taxes',
      category: 'Taxes',
      start: '2027-04-06',
      end: '2028-04-06',
      budget: 90000,
    });
    expect(period.start).toBe('2027-04-06');
    expect(period.end).toBe('2028-04-06');
  });

  test('defaults carryover to 0', () => {
    const period = createBudgetPeriod({
      id: 'p1',
      category: 'Rent',
      start: '2027-01-01',
      end: '2028-01-01',
      budget: 150000,
    });
    expect(period.carryover).toBe(0);
  });

  test('accepts a negative carryover', () => {
    const period = createBudgetPeriod({
      id: 'p1',
      category: 'Rent',
      start: '2027-01-01',
      end: '2028-01-01',
      budget: 150000,
      carryover: -2500,
    });
    expect(period.carryover).toBe(-2500);
  });

  test('rejects an empty id', () => {
    expect(() =>
      createBudgetPeriod({
        id: '',
        category: 'Rent',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/id/);
  });

  test('rejects an empty category and names the period id', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: '',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/p1/);
  });

  test('rejects a start that is not a real calendar date', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-02-30',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-02-30"/);
  });

  test('rejects a date that is not in YYYY-MM-DD form', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-1-1',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-1-1"/);
  });

  test('rejects an end equal to the start', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2027-01-01',
        budget: 150000,
      }),
    ).toThrow(/end "2027-01-01" must be after start/);
  });

  test('rejects an end before the start', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-06',
        end: '2027-04-05',
        budget: 150000,
      }),
    ).toThrow(/end "2027-04-05" must be after start/);
  });

  test('rejects a negative budget', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: -1,
      }),
    ).toThrow(/budget must be nonnegative/);
  });

  test('accepts a zero budget', () => {
    const period = createBudgetPeriod({
      id: 'p1',
      category: 'Rent',
      start: '2027-01-01',
      end: '2028-01-01',
      budget: 0,
    });
    expect(period.budget).toBe(0);
  });

  test('rejects a fractional budget', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 150000.5,
      }),
    ).toThrow(/budget must be a safe integer/);
  });

  test('rejects a budget outside the safe integer range', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(/budget must be a safe integer/);
  });

  test('rejects a fractional carryover', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 150000,
        carryover: -25.5,
      }),
    ).toThrow(/carryover must be a safe integer/);
  });

  test('rejects an unsafe carryover', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 150000,
        carryover: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(/carryover must be a safe integer/);
  });

  test('accepts a period starting before year 100', () => {
    const period = createBudgetPeriod({
      id: 'p1',
      category: 'Rent',
      start: '0099-01-01',
      end: '0100-01-01',
      budget: 150000,
    });
    expect(period.start).toBe('0099-01-01');
    expect(period.end).toBe('0100-01-01');
  });

  test('accepts Feb 29 in a leap year', () => {
    const period = createBudgetPeriod({
      id: 'p1',
      category: 'Rent',
      start: '2028-02-29',
      end: '2029-01-01',
      budget: 150000,
    });
    expect(period.start).toBe('2028-02-29');
  });

  test('accepts Feb 29 in a year divisible by 400', () => {
    const period = createBudgetPeriod({
      id: 'p1',
      category: 'Rent',
      start: '2000-02-29',
      end: '2001-01-01',
      budget: 150000,
    });
    expect(period.start).toBe('2000-02-29');
  });

  test('rejects Feb 29 in a non-leap year', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-02-29',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-02-29"/);
  });

  test('rejects Feb 29 in a century year that is not a leap year', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2100-02-29',
        end: '2101-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2100-02-29"/);
  });

  test('rejects month 13', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-13-01',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-13-01"/);
  });

  test('rejects month 0', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-00-10',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-00-10"/);
  });

  test('rejects a day beyond the length of the month', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-31',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-04-31"/);
  });

  test('rejects day 0', () => {
    expect(() =>
      createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-00',
        end: '2028-01-01',
        budget: 150000,
      }),
    ).toThrow(/start "2027-01-00"/);
  });

  const daysInMonth2027: Array<[string, number]> = [
    ['01', 31],
    ['02', 28],
    ['03', 31],
    ['04', 30],
    ['05', 31],
    ['06', 30],
    ['07', 31],
    ['08', 31],
    ['09', 30],
    ['10', 31],
    ['11', 30],
    ['12', 31],
  ];

  test.each(daysInMonth2027)(
    'accepts the last day of month %s in 2027 and rejects the next day',
    (month, lastDay) => {
      const lastDayText = String(lastDay).padStart(2, '0');
      const period = createBudgetPeriod({
        id: 'p1',
        category: 'Rent',
        start: `2027-${month}-${lastDayText}`,
        end: '2028-06-01',
        budget: 150000,
      });
      expect(period.start).toBe(`2027-${month}-${lastDayText}`);
      const nextDayText = String(lastDay + 1).padStart(2, '0');
      expect(() =>
        createBudgetPeriod({
          id: 'p1',
          category: 'Rent',
          start: `2027-${month}-${nextDayText}`,
          end: '2028-06-01',
          budget: 150000,
        }),
      ).toThrow(new RegExp(`start "2027-${month}-${nextDayText}"`));
    },
  );
});

describe('copyBudgetPeriod', () => {
  function makeSource() {
    return makePeriod({
      id: 'p1',
      category: 'Rent',
      budget: 150000,
      carryover: -2500,
    });
  }

  test('copies the category and allowance by value and defaults carryover to 0', () => {
    const source = makeSource();
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2028-01-01',
      end: '2029-01-01',
    });
    expect(copy).toEqual({
      id: 'p2',
      category: 'Rent',
      start: '2028-01-01',
      end: '2029-01-01',
      budget: 150000,
      carryover: 0,
    });
  });

  test('does not modify the source, and changing the copy leaves the source intact', () => {
    const source = makeSource();
    const snapshot = { ...source };
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2029-01-01',
      end: '2030-01-01',
    });
    expect(copy).not.toBe(source);
    copy.id = 'x';
    copy.category = 'Groceries';
    copy.start = '2030-01-01';
    copy.end = '2031-01-01';
    copy.budget = 1;
    copy.carryover = 2;
    expect(source).toEqual(snapshot);
    expect(source.id).toBe('p1');
    expect(source.category).toBe('Rent');
    expect(source.start).toBe('2027-01-01');
    expect(source.end).toBe('2028-01-01');
    expect(source.budget).toBe(150000);
    expect(source.carryover).toBe(-2500);
  });

  test('does not throw when the source is frozen', () => {
    const source = Object.freeze(makeSource());
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2029-01-01',
      end: '2030-01-01',
    });
    expect(copy).toEqual({
      id: 'p2',
      category: 'Rent',
      start: '2029-01-01',
      end: '2030-01-01',
      budget: 150000,
      carryover: 0,
    });
  });

  test('keeps an explicit carryover', () => {
    const source = makeSource();
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2028-01-01',
      end: '2029-01-01',
      carryover: 123,
    });
    expect(copy.carryover).toBe(123);
  });

  test('keeps a negative explicit carryover', () => {
    const source = makeSource();
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2028-01-01',
      end: '2029-01-01',
      carryover: -500,
    });
    expect(copy.carryover).toBe(-500);
  });

  test('rejects a fractional carryover', () => {
    const source = makeSource();
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p2',
        start: '2028-01-01',
        end: '2029-01-01',
        carryover: 12.5,
      }),
    ).toThrow(/carryover must be a safe integer/);
  });

  test('rejects an unsafe carryover', () => {
    const source = makeSource();
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p2',
        start: '2028-01-01',
        end: '2029-01-01',
        carryover: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(/carryover must be a safe integer/);
  });

  test('rejects an id equal to the source id', () => {
    const source = makeSource();
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p1',
        start: '2028-01-01',
        end: '2029-01-01',
      }),
    ).toThrow(/must differ from source id/);
  });

  test('rejects an empty id', () => {
    const source = makeSource();
    expect(() =>
      copyBudgetPeriod(source, {
        id: '',
        start: '2028-01-01',
        end: '2029-01-01',
      }),
    ).toThrow(/id/);
  });

  test('rejects an invalid end date', () => {
    const source = makeSource();
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p2',
        start: '2028-01-01',
        end: '2028-02-30',
      }),
    ).toThrow(/end "2028-02-30"/);
  });

  test('rejects an end on or before the start', () => {
    const source = makeSource();
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p2',
        start: '2028-01-01',
        end: '2027-12-31',
      }),
    ).toThrow(/must be after start/);
  });
});

describe('validateBudgetPeriods', () => {
  test('accepts adjacent periods in the same category', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2027-07-01',
        }),
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-07-01',
          end: '2028-01-01',
        }),
      ]),
    ).not.toThrow();
  });

  test('accepts gaps in the same category', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2027-04-01',
        }),
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-06-01',
          end: '2027-09-01',
        }),
      ]),
    ).not.toThrow();
  });

  test('accepts overlapping dates in different categories', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2028-01-01',
        }),
        makePeriod({
          id: 'b',
          category: 'Groceries',
          start: '2027-04-06',
          end: '2028-04-06',
        }),
      ]),
    ).not.toThrow();
  });

  test('rejects duplicate ids', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({ id: 'p1' }),
        makePeriod({ id: 'p1', category: 'Groceries' }),
      ]),
    ).toThrow(/duplicate period id "p1"/);
  });

  test('rejects two overlapping periods in the same category', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2027-07-01',
        }),
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-06-01',
          end: '2028-01-01',
        }),
      ]),
    ).toThrow(/periods "a" and "b" overlap in category "Rent"/);
  });

  test('rejects an overlap given with the later period first', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-06-01',
          end: '2028-01-01',
        }),
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2027-07-01',
        }),
      ]),
    ).toThrow(/periods "b" and "a" overlap in category "Rent"/);
  });

  test('rejects an overlap given with the earlier period first', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2027-07-01',
        }),
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-06-01',
          end: '2028-01-01',
        }),
      ]),
    ).toThrow(/periods "a" and "b" overlap in category "Rent"/);
  });

  test('rejects a period wholly inside another, outer first', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2028-01-01',
        }),
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-04-06',
          end: '2027-07-01',
        }),
      ]),
    ).toThrow(/periods "a" and "b" overlap in category "Rent"/);
  });

  test('rejects a period wholly inside another, inner first', () => {
    expect(() =>
      validateBudgetPeriods([
        makePeriod({
          id: 'b',
          category: 'Rent',
          start: '2027-04-06',
          end: '2027-07-01',
        }),
        makePeriod({
          id: 'a',
          category: 'Rent',
          start: '2027-01-01',
          end: '2028-01-01',
        }),
      ]),
    ).toThrow(/periods "b" and "a" overlap in category "Rent"/);
  });
});

describe('summarizePeriodBudgets', () => {
  function makeSpecExample() {
    const periods = [
      makePeriod({
        id: 'rent-apr',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 150000,
      }),
      makePeriod({
        id: 'groceries-apr',
        category: 'Groceries',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 60000,
      }),
      makePeriod({
        id: 'fun-apr',
        category: 'Entertainment',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 20000,
      }),
      makePeriod({
        id: 'insurance',
        category: 'Insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 120000,
      }),
      makePeriod({
        id: 'taxes',
        category: 'Taxes',
        start: '2027-04-01',
        end: '2027-07-01',
        budget: 90000,
      }),
    ];
    const postings = [
      { id: 'rent', category: 'Rent', date: '2027-04-01', amount: -150000 },
      { id: 'g1', category: 'Groceries', date: '2027-04-05', amount: -40000 },
      { id: 'g2', category: 'Groceries', date: '2027-04-18', amount: -28000 },
      {
        id: 'fun',
        category: 'Entertainment',
        date: '2027-04-10',
        amount: -5000,
      },
      { id: 'ins', category: 'Insurance', date: '2027-03-15', amount: -120000 },
    ];
    return { periods, postings };
  }

  test('matches the worked example from the spec', () => {
    const { periods, postings } = makeSpecExample();
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.periods).toEqual([
      {
        period: periods[0],
        netSpending: 150000,
        remaining: 0,
        overspending: 0,
      },
      {
        period: periods[1],
        netSpending: 68000,
        remaining: -8000,
        overspending: 8000,
      },
      {
        period: periods[2],
        netSpending: 5000,
        remaining: 15000,
        overspending: 0,
      },
      {
        period: periods[3],
        netSpending: 120000,
        remaining: 0,
        overspending: 0,
      },
      { period: periods[4], netSpending: 0, remaining: 90000, overspending: 0 },
    ]);
    expect(summary.activePeriods.map(s => s.period.id)).toEqual([
      'rent-apr',
      'groceries-apr',
      'fun-apr',
      'insurance',
      'taxes',
    ]);
    expect(summary.combinedActiveRemaining).toBe(97000);
    expect(summary.overspentActivePeriods.map(s => s.period.id)).toEqual([
      'groceries-apr',
    ]);
    expect(summary.totalActiveOverspending).toBe(8000);
    expect(summary.monthlyActualSpending).toBe(223000);
    expect(summary.unassignedPostingIds).toEqual([]);
  });

  test('computes different figures for different asOf dates on the same data', () => {
    const { periods, postings } = makeSpecExample();
    const early = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-01',
    });
    expect(early.periods).toEqual([
      {
        period: periods[0],
        netSpending: 150000,
        remaining: 0,
        overspending: 0,
      },
      {
        period: periods[1],
        netSpending: 0,
        remaining: 60000,
        overspending: 0,
      },
      { period: periods[2], netSpending: 0, remaining: 20000, overspending: 0 },
      {
        period: periods[3],
        netSpending: 120000,
        remaining: 0,
        overspending: 0,
      },
      { period: periods[4], netSpending: 0, remaining: 90000, overspending: 0 },
    ]);
    expect(early.combinedActiveRemaining).toBe(170000);
    expect(early.overspentActivePeriods).toEqual([]);
    expect(early.totalActiveOverspending).toBe(0);
    expect(early.monthlyActualSpending).toBe(150000);
    expect(early.unassignedPostingIds).toEqual([]);

    const late = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-30',
    });
    expect(late.combinedActiveRemaining).toBe(97000);
    expect(late.totalActiveOverspending).toBe(8000);
    expect(late.monthlyActualSpending).toBe(223000);
  });

  test('attributes postings on the start date, not on the end date', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'a', category: 'Rent', date: '2027-03-31', amount: -1000 },
      { id: 'b', category: 'Rent', date: '2027-04-01', amount: -2000 },
      { id: 'c', category: 'Rent', date: '2027-04-30', amount: -3000 },
      { id: 'd', category: 'Rent', date: '2027-05-01', amount: -4000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-05-01',
    });
    expect(summary.periods[0].netSpending).toBe(5000);
    expect(summary.periods[0].remaining).toBe(95000);
    expect(summary.monthlyActualSpending).toBe(4000);
    expect(summary.unassignedPostingIds).toEqual(['a', 'd']);
  });

  test('an offset attributes a posting dated before every period of the category', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Rent',
        start: '2027-05-01',
        end: '2027-06-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'tx', category: 'Rent', date: '2027-03-20', amount: -12000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [{ transactionId: 'tx', periodId: 'p1' }],
      asOf: '2027-04-15',
    });
    expect(summary.periods[0].netSpending).toBe(12000);
    expect(summary.periods[0].remaining).toBe(88000);
    expect(summary.periods[1].netSpending).toBe(0);
    expect(summary.monthlyActualSpending).toBe(0);
    expect(summary.unassignedPostingIds).toEqual([]);
  });

  test('an offset attributes a posting dated after every period of the category', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Rent',
        start: '2027-05-01',
        end: '2027-06-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'tx', category: 'Rent', date: '2027-06-10', amount: -12000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [{ transactionId: 'tx', periodId: 'p2' }],
      asOf: '2027-06-15',
    });
    expect(summary.periods[1].netSpending).toBe(12000);
    expect(summary.periods[1].remaining).toBe(88000);
    expect(summary.periods[0].netSpending).toBe(0);
    expect(summary.monthlyActualSpending).toBe(12000);
    expect(summary.unassignedPostingIds).toEqual([]);
  });

  test('an offset does not change the posting date used for monthly spending', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Rent',
        start: '2027-05-01',
        end: '2027-06-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'tx', category: 'Rent', date: '2027-03-20', amount: -12000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [{ transactionId: 'tx', periodId: 'p1' }],
      asOf: '2027-04-20',
    });
    expect(summary.periods[0].netSpending).toBe(12000);
    expect(summary.monthlyActualSpending).toBe(0);
  });

  test('a positive posting reduces net spending without becoming unassigned', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'a', category: 'Rent', date: '2027-04-05', amount: -15000 },
      { id: 'r', category: 'Rent', date: '2027-04-10', amount: 5000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.periods[0].netSpending).toBe(10000);
    expect(summary.periods[0].remaining).toBe(90000);
    expect(summary.monthlyActualSpending).toBe(10000);
    expect(summary.unassignedPostingIds).toEqual([]);
  });

  test('negative carryover reduces remaining', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
        carryover: -2500,
      }),
    ];
    const postings = [
      { id: 'a', category: 'Rent', date: '2027-04-05', amount: -15000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.periods[0].netSpending).toBe(15000);
    expect(summary.periods[0].remaining).toBe(82500);
    expect(summary.periods[0].overspending).toBe(0);
  });

  test('postings with no matching period are unassigned but still count toward monthly spending', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'a', category: 'Groceries', date: '2027-04-05', amount: -9000 },
      { id: 'b', category: 'Rent', date: '2027-03-15', amount: -7000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.unassignedPostingIds).toEqual(['a', 'b']);
    expect(summary.periods[0].netSpending).toBe(0);
    expect(summary.periods[0].remaining).toBe(100000);
    expect(summary.monthlyActualSpending).toBe(9000);
  });

  test('postings dated after asOf are ignored by every figure', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    const postings = [
      { id: 'a', category: 'Rent', date: '2027-04-05', amount: -15000 },
      { id: 'b', category: 'Rent', date: '2027-04-25', amount: -20000 },
      { id: 'c', category: 'Groceries', date: '2027-04-26', amount: -9000 },
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.periods[0].netSpending).toBe(15000);
    expect(summary.periods[0].remaining).toBe(85000);
    expect(summary.monthlyActualSpending).toBe(15000);
    expect(summary.unassignedPostingIds).toEqual([]);
  });

  test('a period is active only while start <= asOf < end', () => {
    const periods = [
      makePeriod({
        id: 'past',
        category: 'Rent',
        start: '2027-03-01',
        end: '2027-04-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'current',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'future',
        category: 'Rent',
        start: '2027-05-01',
        end: '2027-06-01',
        budget: 100000,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [],
      offsets: [],
      asOf: '2027-04-15',
    });
    expect(summary.activePeriods.map(s => s.period.id)).toEqual(['current']);
    expect(summary.combinedActiveRemaining).toBe(100000);
    expect(summary.overspentActivePeriods).toEqual([]);
    expect(summary.totalActiveOverspending).toBe(0);
  });

  test('an offset whose transactionId matches no posting is ignored', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [],
      offsets: [{ transactionId: 'ghost', periodId: 'p1' }],
      asOf: '2027-04-15',
    });
    expect(summary.periods[0].netSpending).toBe(0);
    expect(summary.unassignedPostingIds).toEqual([]);
  });

  test('rejects an invalid asOf date', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [],
        offsets: [],
        asOf: '2027-4-15',
      }),
    ).toThrow(/asOf "2027-4-15" is not a valid YYYY-MM-DD date/);
  });

  test('rejects duplicate period ids', () => {
    const p1 = makePeriod({
      id: 'p1',
      category: 'Rent',
      start: '2027-04-01',
      end: '2027-05-01',
      budget: 100000,
    });
    expect(() =>
      summarizePeriodBudgets({
        periods: [p1, { ...p1 }],
        postings: [],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/duplicate period id "p1"/);
  });

  test('rejects overlapping periods of the same category', () => {
    const p1 = makePeriod({
      id: 'p1',
      category: 'Rent',
      start: '2027-04-01',
      end: '2027-05-01',
      budget: 100000,
    });
    const p2 = makePeriod({
      id: 'p2',
      category: 'Rent',
      start: '2027-04-15',
      end: '2027-05-15',
      budget: 100000,
    });
    expect(() =>
      summarizePeriodBudgets({
        periods: [p1, p2],
        postings: [],
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toThrow(/periods "p1" and "p2" overlap in category "Rent"/);
  });

  test('rejects duplicate posting ids', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'a', category: 'Rent', date: '2027-04-05', amount: -1 },
          { id: 'a', category: 'Rent', date: '2027-04-06', amount: -2 },
        ],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/duplicate posting id "a"/);
  });

  test('rejects an invalid posting date', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'a', category: 'Rent', date: '2027-04-32', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/posting a: date "2027-04-32" is not a valid YYYY-MM-DD date/);
  });

  test('rejects a non-safe-integer posting amount', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'a', category: 'Rent', date: '2027-04-05', amount: 1.5 },
        ],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/posting a: amount must be a safe integer/);
  });

  test('rejects two offsets for the same transaction', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Rent',
        start: '2027-05-01',
        end: '2027-06-01',
        budget: 100000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'tx', category: 'Rent', date: '2027-03-20', amount: -1 },
        ],
        offsets: [
          { transactionId: 'tx', periodId: 'p1' },
          { transactionId: 'tx', periodId: 'p2' },
        ],
        asOf: '2027-04-15',
      }),
    ).toThrow(/two offsets for transaction "tx"/);
  });

  test('rejects an offset naming an unknown period', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'tx', category: 'Rent', date: '2027-03-20', amount: -1 },
        ],
        offsets: [{ transactionId: 'tx', periodId: 'nope' }],
        asOf: '2027-04-15',
      }),
    ).toThrow(/offset for transaction "tx" names unknown period "nope"/);
  });

  test('rejects an offset that crosses categories', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Groceries',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 60000,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'tx', category: 'Rent', date: '2027-03-20', amount: -1 },
        ],
        offsets: [{ transactionId: 'tx', periodId: 'p2' }],
        asOf: '2027-04-15',
      }),
    ).toThrow(
      /offset for transaction "tx" crosses categories: posting is in "Rent", period "p2" is in "Groceries"/,
    );
  });

  // A1: posting amount outside safe integer range is rejected
  test.each([2 ** 53, -(2 ** 53), NaN, Infinity, 1.5])(
    'A1: rejects a posting with unsafe amount %p',
    amount => {
      const periods = [
        makePeriod({
          id: 'p1',
          category: 'misc',
          start: '2027-04-01',
          end: '2027-05-01',
          budget: 0,
        }),
      ];
      expect(() =>
        summarizePeriodBudgets({
          periods,
          postings: [
            { id: 'bad', category: 'misc', date: '2027-04-10', amount },
          ],
          offsets: [],
          asOf: '2027-04-15',
        }),
      ).toThrow(/bad/);
    },
  );

  // A2: posting dated after asOf is still validated
  test('A2: rejects an unsafe amount even when the posting is after asOf', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'misc',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 0,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          {
            id: 'future',
            category: 'misc',
            date: '2027-06-01',
            amount: 2 ** 53,
          },
        ],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/future/);
  });

  // A3: monthly sum overflow
  test('A3: throws when the monthly actual spending sum overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    expect(() =>
      summarizePeriodBudgets({
        periods: [],
        postings: [
          { id: 'p1', category: 'misc', date: '2027-04-10', amount: -MAX },
          { id: 'p2', category: 'misc', date: '2027-04-10', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/p2/);
  });

  // A4: attributed sum overflow
  test('A4: throws when the attributed sum for a period overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'ins',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 0,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'p1', category: 'insurance', date: '2027-03-10', amount: -MAX },
          { id: 'p2', category: 'insurance', date: '2027-03-10', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-06-15',
      }),
    ).toThrow(/p2/);
  });

  // A5: running total overflow that would cancel
  test('A5: throws when an intermediate monthly sum overflows even if a later posting would cancel it', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    expect(() =>
      summarizePeriodBudgets({
        periods: [],
        postings: [
          { id: 'p1', category: 'misc', date: '2027-04-10', amount: MAX },
          { id: 'p2', category: 'misc', date: '2027-04-10', amount: 1 },
          { id: 'p3', category: 'misc', date: '2027-04-10', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-04-15',
      }),
    ).toThrow(/p2/);
  });

  // A6: budget + carryover overflow
  test('A6: throws when budget plus carryover overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'big',
        category: 'misc',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: MAX,
        carryover: 1,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [],
        offsets: [],
        asOf: '2027-06-15',
      }),
    ).toThrow(/big/);
  });

  // A7: remaining overflow
  test('A7: throws when remaining overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'big',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: MAX,
        carryover: 0,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          {
            id: 'refund',
            category: 'insurance',
            date: '2027-03-10',
            amount: 1,
          },
        ],
        offsets: [],
        asOf: '2027-06-15',
      }),
    ).toThrow(/big/);
  });

  // A8: combined remaining overflow
  test('A8: throws when the combined active remaining overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'a',
        category: 'c1',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: MAX,
      }),
      makePeriod({
        id: 'b',
        category: 'c2',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: MAX,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [],
        offsets: [],
        asOf: '2027-06-15',
      }),
    ).toThrow(/b/);
  });

  // A9: overspending total overflow
  test('A9: throws when the total active overspending overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'a',
        category: 'c1',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 0,
      }),
      makePeriod({
        id: 'c',
        category: 'c3',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: MAX,
      }),
      makePeriod({
        id: 'b',
        category: 'c2',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 0,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'pa', category: 'c1', date: '2027-02-10', amount: -MAX },
          { id: 'pb', category: 'c2', date: '2027-03-10', amount: -MAX },
        ],
        offsets: [],
        asOf: '2027-06-15',
      }),
    ).toThrow(/b/);
  });

  // A10: exactly -MAX is accepted
  test('A10: accepts an attributed sum of exactly -MAX_SAFE_INTEGER', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'ins',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 0,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [
        { id: 'p1', category: 'insurance', date: '2027-03-10', amount: -MAX },
      ],
      offsets: [],
      asOf: '2027-06-15',
    });
    expect(summary.periods[0].netSpending).toBe(MAX);
    expect(summary.periods[0].remaining).toBe(-MAX);
    expect(summary.periods[0].overspending).toBe(MAX);

    const summary2 = summarizePeriodBudgets({
      periods,
      postings: [
        { id: 'p1', category: 'insurance', date: '2027-03-10', amount: MAX },
      ],
      offsets: [],
      asOf: '2027-06-15',
    });
    expect(summary2.periods[0].netSpending).toBe(-MAX);
    expect(summary2.periods[0].remaining).toBe(MAX);
    expect(summary2.periods[0].overspending).toBe(0);
  });

  // B: refund-only period
  test('B: a refund-only posting produces negative net spending and positive remaining', () => {
    const periods = [
      makePeriod({
        id: 'ent',
        category: 'entertainment',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 10000,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [
        {
          id: 'refund',
          category: 'entertainment',
          date: '2027-04-10',
          amount: 3000,
        },
      ],
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.periods[0].netSpending).toBe(-3000);
    expect(summary.periods[0].remaining).toBe(13000);
    expect(summary.periods[0].overspending).toBe(0);
    expect(summary.monthlyActualSpending).toBe(-3000);
  });

  // C1: active period boundaries
  test('C1: a period is active when asOf equals its start but not when asOf equals its end', () => {
    const periods = [
      makePeriod({
        id: 'april',
        category: 'misc',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100,
      }),
      makePeriod({
        id: 'may',
        category: 'misc',
        start: '2027-05-01',
        end: '2027-06-01',
        budget: 100,
      }),
    ];
    const atMayStart = summarizePeriodBudgets({
      periods,
      postings: [],
      offsets: [],
      asOf: '2027-05-01',
    });
    expect(atMayStart.activePeriods.map(s => s.period.id)).toEqual(['may']);

    const atAprilEnd = summarizePeriodBudgets({
      periods,
      postings: [],
      offsets: [],
      asOf: '2027-04-30',
    });
    expect(atAprilEnd.activePeriods.map(s => s.period.id)).toEqual(['april']);
  });

  // C2: overspent active period selection
  test('C2: only overspent active periods appear in overspentActivePeriods', () => {
    const periods = [
      makePeriod({
        id: 'march',
        category: 'groceries',
        start: '2027-03-01',
        end: '2027-04-01',
        budget: 100,
      }),
      makePeriod({
        id: 'april',
        category: 'groceries',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [
        { id: 'm1', category: 'groceries', date: '2027-03-10', amount: -500 },
        { id: 'a1', category: 'groceries', date: '2027-04-05', amount: -150 },
      ],
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.overspentActivePeriods.map(s => s.period.id)).toEqual([
      'april',
    ]);
    expect(summary.totalActiveOverspending).toBe(50);
    const marchEntry = summary.periods.find(s => s.period.id === 'march');
    expect(marchEntry?.overspending).toBe(400);
  });

  // C3: multiple overspent active periods in input order
  test('C3: multiple overspent active periods appear in input order', () => {
    const periods = [
      makePeriod({
        id: 'apr-c1',
        category: 'c1',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100,
      }),
      makePeriod({
        id: 'apr-c2',
        category: 'c2',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 100,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [
        { id: 'p1', category: 'c1', date: '2027-04-10', amount: -8100 },
        { id: 'p2', category: 'c2', date: '2027-04-10', amount: -2600 },
      ],
      offsets: [],
      asOf: '2027-04-20',
    });
    expect(summary.overspentActivePeriods.map(s => s.period.id)).toEqual([
      'apr-c1',
      'apr-c2',
    ]);
    expect(summary.totalActiveOverspending).toBe(10500);
  });

  // D1: SPEC worked example at three asOf dates
  test.each(['2027-04-20', '2027-08-15', '2027-12-31'])(
    'D1: insurance figures hold at asOf %s',
    asOf => {
      const { periods, postings } = makeSpecExample();
      const summary = summarizePeriodBudgets({
        periods,
        postings,
        offsets: [],
        asOf,
      });
      const insEntry = summary.periods.find(s => s.period.id === 'insurance');
      expect(insEntry?.netSpending).toBe(120000);
      expect(insEntry?.remaining).toBe(0);
      expect(summary.activePeriods.map(s => s.period.id)).toContain(
        'insurance',
      );

      const expectedMonthly = asOf === '2027-04-20' ? 223000 : 0;
      expect(summary.monthlyActualSpending).toBe(expectedMonthly);
    },
  );

  // D2: early offset (posting before period start, offset to that period)
  test('D2: an offset attributes a pre-period posting to the named period', () => {
    const periods = [
      makePeriod({
        id: 'insurance-2027',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 120000,
      }),
    ];
    const postings = [
      {
        id: 'ins-early',
        category: 'insurance',
        date: '2026-12-20',
        amount: -120000,
      },
    ];
    const offsets = [
      { transactionId: 'ins-early', periodId: 'insurance-2027' },
    ];

    const early = summarizePeriodBudgets({
      periods,
      postings,
      offsets,
      asOf: '2026-12-31',
    });
    expect(early.periods[0].netSpending).toBe(120000);
    expect(early.periods[0].remaining).toBe(0);
    expect(early.monthlyActualSpending).toBe(120000);
    expect(early.activePeriods).toEqual([]);
    expect(early.unassignedPostingIds).toEqual([]);

    const late = summarizePeriodBudgets({
      periods,
      postings,
      offsets,
      asOf: '2027-01-31',
    });
    expect(late.periods[0].netSpending).toBe(120000);
    expect(late.monthlyActualSpending).toBe(0);
    expect(late.activePeriods.map(s => s.period.id)).toContain(
      'insurance-2027',
    );
  });

  // D3: late offset (posting after period end, offset to earlier period)
  test('D3: an offset attributes a post-period posting to the named period', () => {
    const periods = [
      makePeriod({
        id: 'insurance-2027',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 120000,
      }),
      makePeriod({
        id: 'insurance-2028',
        category: 'insurance',
        start: '2028-01-01',
        end: '2029-01-01',
        budget: 120000,
      }),
    ];
    const postings = [
      {
        id: 'ins-late',
        category: 'insurance',
        date: '2028-01-10',
        amount: -120000,
      },
    ];

    const withOffset = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [{ transactionId: 'ins-late', periodId: 'insurance-2027' }],
      asOf: '2028-01-31',
    });
    const p2027 = withOffset.periods.find(
      s => s.period.id === 'insurance-2027',
    );
    const p2028 = withOffset.periods.find(
      s => s.period.id === 'insurance-2028',
    );
    expect(p2027?.netSpending).toBe(120000);
    expect(p2028?.netSpending).toBe(0);
    expect(p2028?.remaining).toBe(120000);
    expect(withOffset.monthlyActualSpending).toBe(120000);

    const withoutOffset = summarizePeriodBudgets({
      periods,
      postings,
      offsets: [],
      asOf: '2028-01-31',
    });
    const p2027no = withoutOffset.periods.find(
      s => s.period.id === 'insurance-2027',
    );
    const p2028no = withoutOffset.periods.find(
      s => s.period.id === 'insurance-2028',
    );
    expect(p2027no?.netSpending).toBe(0);
    expect(p2028no?.netSpending).toBe(120000);
    expect(withoutOffset.monthlyActualSpending).toBe(120000);
  });

  // E: inputs are not mutated
  test('E: does not mutate its input arrays or objects', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 10000,
        carryover: 500,
      }),
      makePeriod({
        id: 'p2',
        category: 'Groceries',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 6000,
        carryover: -300,
      }),
    ];
    const postings = [
      { id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -5000 },
      { id: 'tx2', category: 'Groceries', date: '2027-04-15', amount: -2000 },
    ];
    const offsets = [{ transactionId: 'tx1', periodId: 'p1' }];

    Object.freeze(periods);
    Object.freeze(periods[0]);
    Object.freeze(periods[1]);
    Object.freeze(postings);
    Object.freeze(postings[0]);
    Object.freeze(postings[1]);
    Object.freeze(offsets);
    Object.freeze(offsets[0]);

    const periodsCopy = JSON.parse(JSON.stringify(periods));
    const postingsCopy = JSON.parse(JSON.stringify(postings));
    const offsetsCopy = JSON.parse(JSON.stringify(offsets));

    summarizePeriodBudgets({ periods, postings, offsets, asOf: '2027-04-20' });

    expect(periods).toEqual(periodsCopy);
    expect(postings).toEqual(postingsCopy);
    expect(offsets).toEqual(offsetsCopy);
  });

  // F: -0 normalization
  test('F: normalizes -0 to 0 in remaining and combinedActiveRemaining', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: -0,
        carryover: -0,
      }),
    ];
    const summary = summarizePeriodBudgets({
      periods,
      postings: [],
      offsets: [],
      asOf: '2027-04-15',
    });
    expect(Object.is(summary.periods[0].remaining, 0)).toBe(true);
    expect(Object.is(summary.combinedActiveRemaining, 0)).toBe(true);
  });
});
