import {
  copyBudgetPeriod,
  createBudgetPeriod,
  listPeriodPayments,
  projectCashBalances,
  projectPeriodCharges,
  summarizePeriodBudgets,
  validateBudgetPeriods,
} from './period-budget';
import type {
  BudgetPeriod,
  ChargeOccurrence,
  ExpensePosting,
  PeriodOffset,
} from './period-budget';

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
    ).toThrow('posting p2: monthly actual spending sum');
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
    ).toThrow('posting p2: attributed sum');
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
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: MAX,
        carryover: 1,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'p1', category: 'insurance', date: '2027-03-10', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toThrow('period big: budget + carryover');
  });

  // A7: remaining overflow
  test('A7: throws when remaining overflows', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'big',
        category: 'insurance',
        start: '2026-01-01',
        end: '2027-01-01',
        budget: MAX,
        carryover: 0,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'p1', category: 'insurance', date: '2026-06-10', amount: 1 },
        ],
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toThrow('period big: remaining');
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
    ).toThrow('period b: combined active remaining');
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
    ).toThrow('period b: total active overspending');
  });

  // G1: attributed sum overflows upward before cancelling
  test('G1: throws when the attributed sum overflows upward before cancelling', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'ins',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 0,
        carryover: 0,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'p1', category: 'insurance', date: '2027-03-10', amount: MAX },
          { id: 'p2', category: 'insurance', date: '2027-03-10', amount: 1 },
          { id: 'p3', category: 'insurance', date: '2027-03-10', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toThrow('posting p2: attributed sum');
  });

  // G2: remaining overflows downward in an inactive period
  test('G2: throws when remaining overflows downward in an inactive period', () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    const periods = [
      makePeriod({
        id: 'neg',
        category: 'insurance',
        start: '2026-01-01',
        end: '2027-01-01',
        budget: 0,
        carryover: -MAX,
      }),
    ];
    expect(() =>
      summarizePeriodBudgets({
        periods,
        postings: [
          { id: 'p1', category: 'insurance', date: '2026-06-10', amount: -1 },
        ],
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toThrow('period neg: remaining');
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

describe('projectPeriodCharges', () => {
  function makeOccurrence(
    overrides: Partial<ChargeOccurrence> = {},
  ): ChargeOccurrence {
    return {
      id: 'o1',
      periodId: 'p1',
      date: '2027-04-15',
      amount: 10000,
      state: 'scheduled',
      ...overrides,
    };
  }

  test('projects a scheduled occurrence against an otherwise empty period (SPEC section 8)', () => {
    const periods = [
      makePeriod({
        id: 'taxes',
        category: 'taxes',
        start: '2027-04-01',
        end: '2027-07-01',
        budget: 90000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'tax-q2',
        periodId: 'taxes',
        date: '2027-04-28',
        amount: 90000,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods).toEqual([
      {
        period: periods[0],
        remaining: 90000,
        outstandingCharges: 90000,
        expectedRemaining: 0,
        outstandingOccurrenceIds: ['tax-q2'],
      },
    ]);
    expect(result.summary).toEqual(
      summarizePeriodBudgets({
        periods,
        postings: [],
        offsets: [],
        asOf: '2027-04-20',
      }),
    );
  });

  test('an overdue scheduled occurrence is still outstanding', () => {
    const periods = [
      makePeriod({
        id: 'taxes',
        category: 'taxes',
        start: '2027-04-01',
        end: '2027-07-01',
        budget: 90000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'tax-q2',
        periodId: 'taxes',
        date: '2027-04-05',
        amount: 90000,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0].outstandingCharges).toBe(90000);
    expect(result.periods[0].outstandingOccurrenceIds).toEqual(['tax-q2']);
    expect(result.periods[0].expectedRemaining).toBe(0);
  });

  test('a posted occurrence whose posting is at or before the as-of date is not outstanding', () => {
    const periods = [
      makePeriod({
        id: 'utilities',
        category: 'utilities',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const postings = [
      { id: 'tx1', category: 'utilities', date: '2027-04-10', amount: -11000 },
    ];
    const occurrences = [
      makeOccurrence({
        id: 'util-apr',
        periodId: 'utilities',
        date: '2027-04-10',
        amount: 10000,
        state: 'posted',
        transactionId: 'tx1',
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings,
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0]).toEqual({
      period: periods[0],
      remaining: 19000,
      outstandingCharges: 0,
      expectedRemaining: 19000,
      outstandingOccurrenceIds: [],
    });
  });

  test('a posted occurrence whose posting is after the as-of date is outstanding', () => {
    const periods = [
      makePeriod({
        id: 'utilities',
        category: 'utilities',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const postings = [
      { id: 'tx1', category: 'utilities', date: '2027-04-25', amount: -11000 },
    ];
    const occurrences = [
      makeOccurrence({
        id: 'util-apr',
        periodId: 'utilities',
        date: '2027-04-10',
        amount: 10000,
        state: 'posted',
        transactionId: 'tx1',
      }),
    ];

    const before = projectPeriodCharges({
      periods,
      postings,
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(before.periods[0].remaining).toBe(30000);
    expect(before.periods[0].outstandingCharges).toBe(10000);
    expect(before.periods[0].expectedRemaining).toBe(20000);
    expect(before.periods[0].outstandingOccurrenceIds).toEqual(['util-apr']);

    const at = projectPeriodCharges({
      periods,
      postings,
      offsets: [],
      occurrences,
      asOf: '2027-04-25',
    });
    expect(at.periods[0].remaining).toBe(19000);
    expect(at.periods[0].outstandingCharges).toBe(0);
    expect(at.periods[0].expectedRemaining).toBe(19000);
    expect(at.periods[0].outstandingOccurrenceIds).toEqual([]);
  });

  test('an already-matched earlier occurrence is settled while a later one stays outstanding', () => {
    const periods = [
      makePeriod({
        id: 'ins',
        category: 'insurance',
        start: '2027-01-01',
        end: '2028-01-01',
        budget: 120000,
      }),
    ];
    const postings = [
      {
        id: 'tx-h1',
        category: 'insurance',
        date: '2027-03-15',
        amount: -60000,
      },
    ];
    const occurrences = [
      makeOccurrence({
        id: 'ins-h1',
        periodId: 'ins',
        date: '2027-03-15',
        amount: 60000,
        state: 'posted',
        transactionId: 'tx-h1',
      }),
      makeOccurrence({
        id: 'ins-h2',
        periodId: 'ins',
        date: '2027-09-15',
        amount: 60000,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings,
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0]).toEqual({
      period: periods[0],
      remaining: 60000,
      outstandingCharges: 60000,
      expectedRemaining: 0,
      outstandingOccurrenceIds: ['ins-h2'],
    });
  });

  test('projects every period in input order, including periods without occurrences', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2028-04-01',
        budget: 150000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Utilities',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'o1',
        periodId: 'p1',
        date: '2027-04-15',
        amount: 2500,
      }),
      makeOccurrence({
        id: 'o2',
        periodId: 'p1',
        date: '2027-06-15',
        amount: 4000,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods.map(p => p.period.id)).toEqual(['p1', 'p2']);
    expect(result.periods[0].outstandingCharges).toBe(6500);
    expect(result.periods[0].outstandingOccurrenceIds).toEqual(['o1', 'o2']);
    expect(result.periods[0].expectedRemaining).toBe(143500);
    expect(result.periods[1].outstandingCharges).toBe(0);
    expect(result.periods[1].outstandingOccurrenceIds).toEqual([]);
    expect(result.periods[1].remaining).toBe(30000);
    expect(result.periods[1].expectedRemaining).toBe(30000);
  });

  test('scheduled charges are not spending: negative expected remaining with zero overspending', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'rent',
        periodId: 'p1',
        date: '2027-04-05',
        amount: 150000,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0].remaining).toBe(30000);
    expect(result.periods[0].outstandingCharges).toBe(150000);
    expect(result.periods[0].expectedRemaining).toBe(-120000);
    expect(result.summary.totalActiveOverspending).toBe(0);
  });

  test('an occurrence with amount zero is outstanding but adds nothing', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'free',
        periodId: 'p1',
        date: '2027-04-05',
        amount: 0,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0].outstandingCharges).toBe(0);
    expect(result.periods[0].outstandingOccurrenceIds).toEqual(['free']);
    expect(result.periods[0].expectedRemaining).toBe(30000);
  });

  test('inactive periods are projected too', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-01-01',
        end: '2027-04-01',
        budget: 150000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'o1',
        periodId: 'p1',
        date: '2027-02-15',
        amount: 2500,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0].remaining).toBe(150000);
    expect(result.periods[0].outstandingCharges).toBe(2500);
    expect(result.periods[0].expectedRemaining).toBe(147500);
  });

  test('does not mutate its inputs', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'o1',
        periodId: 'p1',
        date: '2027-04-05',
        amount: 10000,
      }),
    ];
    const periodsBefore = structuredClone(periods);
    const occurrencesBefore = structuredClone(occurrences);
    projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(periods).toEqual(periodsBefore);
    expect(occurrences).toEqual(occurrencesBefore);
  });

  test('a scheduled occurrence may carry a transactionId; it is ignored', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [
      makeOccurrence({
        id: 'o1',
        periodId: 'p1',
        date: '2027-04-05',
        amount: 10000,
        state: 'scheduled',
        transactionId: 'tx1',
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0].outstandingOccurrenceIds).toEqual(['o1']);
  });

  describe('rejections', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];

    function call(
      occurrences: ChargeOccurrence[],
      postings: ExpensePosting[] = [],
    ) {
      return () =>
        projectPeriodCharges({
          periods,
          postings,
          offsets: [],
          occurrences,
          asOf: '2027-04-20',
        });
    }

    test('rejects duplicate occurrence ids', () => {
      expect(
        call([makeOccurrence({ id: 'o1' }), makeOccurrence({ id: 'o1' })]),
      ).toThrow('duplicate occurrence id "o1"');
    });

    test('rejects an occurrence whose period id does not exist', () => {
      expect(call([makeOccurrence({ id: 'o1', periodId: 'nope' })])).toThrow(
        'occurrence o1: period "nope" does not exist',
      );
    });

    test('rejects an occurrence with an invalid date', () => {
      expect(call([makeOccurrence({ id: 'o1', date: '2027/04/15' })])).toThrow(
        'occurrence o1: date "2027/04/15" is not a valid YYYY-MM-DD date',
      );
    });

    test.each([
      [Number.MAX_SAFE_INTEGER + 1],
      [Number.MAX_SAFE_INTEGER * 2],
      [1.5],
      [NaN],
      [Infinity],
    ])('rejects an occurrence with an unsafe amount %p', value => {
      expect(call([makeOccurrence({ id: 'o1', amount: value })])).toThrow(
        `occurrence o1: amount must be a safe integer, got ${value}`,
      );
    });

    test('rejects an occurrence with a negative amount', () => {
      expect(call([makeOccurrence({ id: 'o1', amount: -100 })])).toThrow(
        'occurrence o1: amount must be nonnegative, got -100',
      );
    });

    test('rejects a posted occurrence with a missing transactionId', () => {
      expect(call([makeOccurrence({ id: 'o1', state: 'posted' })])).toThrow(
        'occurrence o1: posted without a transaction id',
      );
    });

    test('rejects a posted occurrence with an empty transactionId', () => {
      expect(
        call([
          makeOccurrence({ id: 'o1', state: 'posted', transactionId: '' }),
        ]),
      ).toThrow('occurrence o1: posted without a transaction id');
    });

    test('rejects two occurrences linked to the same posting', () => {
      expect(
        call(
          [
            makeOccurrence({ id: 'o1', state: 'posted', transactionId: 'tx1' }),
            makeOccurrence({ id: 'o2', state: 'posted', transactionId: 'tx1' }),
          ],
          [{ id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -30000 }],
        ),
      ).toThrow('transaction "tx1" is linked to occurrences "o1" and "o2"');
    });

    test('rejects a posted occurrence whose posting is missing', () => {
      expect(
        call([
          makeOccurrence({ id: 'o1', state: 'posted', transactionId: 'tx1' }),
        ]),
      ).toThrow(
        'occurrence o1: linked transaction "tx1" is not among the postings',
      );
    });

    test('accepts a posted occurrence linked to an existing posting', () => {
      expect(
        call(
          [makeOccurrence({ id: 'o1', state: 'posted', transactionId: 'tx1' })],
          [{ id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -30000 }],
        ),
      ).not.toThrow();
    });

    test('propagates summarizePeriodBudgets rejections', () => {
      expect(() =>
        projectPeriodCharges({
          periods,
          postings: [
            { id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -30000 },
            { id: 'tx1', category: 'Rent', date: '2027-04-11', amount: -20000 },
          ],
          offsets: [],
          occurrences: [],
          asOf: '2027-04-20',
        }),
      ).toThrow('duplicate posting id "tx1"');
    });

    test('rejects when outstanding charges overflow', () => {
      expect(
        call([
          makeOccurrence({ id: 'o1', amount: Number.MAX_SAFE_INTEGER }),
          makeOccurrence({ id: 'o2', amount: 1 }),
        ]),
      ).toThrow(
        'occurrence o2: outstanding charges for period "p1" must be a safe integer, got 9007199254740992',
      );
    });

    test('rejects when expected remaining overflows', () => {
      const overspent = [
        makePeriod({
          id: 'p1',
          category: 'Rent',
          start: '2027-04-01',
          end: '2027-05-01',
          budget: 0,
        }),
      ];
      expect(() =>
        projectPeriodCharges({
          periods: overspent,
          postings: [
            { id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -30000 },
          ],
          offsets: [],
          occurrences: [
            makeOccurrence({
              id: 'o1',
              periodId: 'p1',
              amount: Number.MAX_SAFE_INTEGER,
            }),
          ],
          asOf: '2027-04-20',
        }),
      ).toThrow(
        'period p1: expected remaining must be a safe integer, got -9007199254770992',
      );
    });

    test('accepts an outstanding sum of exactly MAX_SAFE_INTEGER', () => {
      const big = [
        makePeriod({
          id: 'p1',
          category: 'Rent',
          start: '2027-04-01',
          end: '2027-05-01',
          budget: Number.MAX_SAFE_INTEGER,
        }),
      ];
      const result = projectPeriodCharges({
        periods: big,
        postings: [],
        offsets: [],
        occurrences: [
          makeOccurrence({
            id: 'o1',
            periodId: 'p1',
            amount: Number.MAX_SAFE_INTEGER,
          }),
        ],
        asOf: '2027-04-20',
      });
      expect(result.periods[0].outstandingCharges).toBe(
        Number.MAX_SAFE_INTEGER,
      );
      expect(result.periods[0].expectedRemaining).toBe(0);
    });
  });

  test('R1: occurrence in the second period', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
      makePeriod({
        id: 'p2',
        category: 'Utilities',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [makeOccurrence({ id: 'o1', periodId: 'p2' })];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0]).toEqual({
      period: periods[0],
      remaining: 30000,
      outstandingCharges: 0,
      expectedRemaining: 30000,
      outstandingOccurrenceIds: [],
    });
    expect(result.periods[1]).toEqual({
      period: periods[1],
      remaining: 30000,
      outstandingCharges: 10000,
      expectedRemaining: 20000,
      outstandingOccurrenceIds: ['o1'],
    });
  });

  test('R2: amount checks apply to posted occurrences (unsafe)', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const postings = [
      { id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -11000 },
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings,
        offsets: [],
        occurrences: [
          makeOccurrence({
            state: 'posted',
            transactionId: 'tx1',
            amount: 1.5,
          }),
        ],
        asOf: '2027-04-20',
      }),
    ).toThrow('occurrence o1: amount must be a safe integer, got 1.5');
  });

  test('R2: amount checks apply to posted occurrences (negative)', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const postings = [
      { id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -11000 },
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings,
        offsets: [],
        occurrences: [
          makeOccurrence({
            state: 'posted',
            transactionId: 'tx1',
            amount: -100,
          }),
        ],
        asOf: '2027-04-20',
      }),
    ).toThrow('occurrence o1: amount must be nonnegative, got -100');
  });

  test('R3: calendar-invalid date', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings: [],
        offsets: [],
        occurrences: [makeOccurrence({ date: '2027-02-30' })],
        asOf: '2027-04-20',
      }),
    ).toThrow(
      'occurrence o1: date "2027-02-30" is not a valid YYYY-MM-DD date',
    );
  });

  test('R4: input order preserved for unsorted occurrence ids', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const occurrences = [
      makeOccurrence({ id: 'z' }),
      makeOccurrence({ id: 'a' }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences,
      asOf: '2027-04-20',
    });
    expect(result.periods[0].outstandingOccurrenceIds).toEqual(['z', 'a']);
  });

  test('R4: input order preserved for unsorted period ids', () => {
    const periods = [
      makePeriod({
        id: 'z',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
      makePeriod({
        id: 'a',
        category: 'Utilities',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const result = projectPeriodCharges({
      periods,
      postings: [],
      offsets: [],
      occurrences: [],
      asOf: '2027-04-20',
    });
    expect(result.periods.map(entry => entry.period.id)).toEqual(['z', 'a']);
  });

  test('R5: a scheduled occurrence transactionId is not a link', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    const postings = [
      { id: 'tx1', category: 'Rent', date: '2027-04-10', amount: -11000 },
    ];
    const o1 = makeOccurrence({ state: 'scheduled', transactionId: 'tx1' });
    const o2 = makeOccurrence({
      id: 'o2',
      date: '2027-04-10',
      state: 'posted',
      transactionId: 'tx1',
    });
    const result = projectPeriodCharges({
      periods,
      postings,
      offsets: [],
      occurrences: [o1, o2],
      asOf: '2027-04-20',
    });
    expect(result.periods[0].remaining).toBe(19000);
    expect(result.periods[0].outstandingCharges).toBe(10000);
    expect(result.periods[0].expectedRemaining).toBe(9000);
    expect(result.periods[0].outstandingOccurrenceIds).toEqual(['o1']);
    expect(o1.transactionId).toBe('tx1');
  });

  test('R6: duplicate id checked before unknown period', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings: [],
        offsets: [],
        occurrences: [
          makeOccurrence({}),
          makeOccurrence({ id: 'o1', periodId: 'missing' }),
        ],
        asOf: '2027-04-20',
      }),
    ).toThrow('duplicate occurrence id "o1"');
  });

  test('R6: unknown period checked before invalid date', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings: [],
        offsets: [],
        occurrences: [
          makeOccurrence({ periodId: 'missing', date: '2027-02-30' }),
        ],
        asOf: '2027-04-20',
      }),
    ).toThrow('occurrence o1: period "missing" does not exist');
  });

  test('R6: invalid date checked before unsafe amount', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings: [],
        offsets: [],
        occurrences: [makeOccurrence({ date: '2027-02-30', amount: 1.5 })],
        asOf: '2027-04-20',
      }),
    ).toThrow(
      'occurrence o1: date "2027-02-30" is not a valid YYYY-MM-DD date',
    );
  });

  test('R6: unsafe amount checked before negative amount', () => {
    const periods = [
      makePeriod({
        id: 'p1',
        category: 'Rent',
        start: '2027-04-01',
        end: '2027-05-01',
        budget: 30000,
      }),
    ];
    expect(() =>
      projectPeriodCharges({
        periods,
        postings: [],
        offsets: [],
        occurrences: [makeOccurrence({ amount: -1.5 })],
        asOf: '2027-04-20',
      }),
    ).toThrow('occurrence o1: amount must be a safe integer, got -1.5');
  });
});

describe('projectCashBalances', () => {
  const MAX = Number.MAX_SAFE_INTEGER;

  test('T1 no movements', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 70000 },
          { id: 'savings', balance: 350000 },
        ],
        selectedAccountIds: ['checking', 'savings'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 420000,
      projectedCash: 420000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 70000,
          projectedEndingBalance: 70000,
          minimumDailyClosingBalance: 70000,
          firstShortfallDate: null,
        },
        {
          accountId: 'savings',
          currentBalance: 350000,
          projectedEndingBalance: 350000,
          minimumDailyClosingBalance: 350000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T2 SPEC section 6, no transfer', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 70000 },
          { id: 'savings', balance: 350000 },
        ],
        selectedAccountIds: ['checking', 'savings'],
        movements: [
          {
            id: 'bill',
            account: 'checking',
            date: '2027-04-28',
            amount: -90000,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 420000,
      projectedCash: 330000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 70000,
          projectedEndingBalance: -20000,
          minimumDailyClosingBalance: -20000,
          firstShortfallDate: '2027-04-28',
        },
        {
          accountId: 'savings',
          currentBalance: 350000,
          projectedEndingBalance: 350000,
          minimumDailyClosingBalance: 350000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T3 SPEC section 6, with transfer', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 70000 },
          { id: 'savings', balance: 350000 },
        ],
        selectedAccountIds: ['checking', 'savings'],
        movements: [
          {
            id: 't-out',
            account: 'savings',
            date: '2027-04-27',
            amount: -20000,
          },
          {
            id: 't-in',
            account: 'checking',
            date: '2027-04-27',
            amount: 20000,
          },
          {
            id: 'bill',
            account: 'checking',
            date: '2027-04-28',
            amount: -90000,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 420000,
      projectedCash: 330000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 70000,
          projectedEndingBalance: 0,
          minimumDailyClosingBalance: 0,
          firstShortfallDate: null,
        },
        {
          accountId: 'savings',
          currentBalance: 350000,
          projectedEndingBalance: 330000,
          minimumDailyClosingBalance: 330000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T4 income after a shortfall', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          {
            id: 'rent',
            account: 'checking',
            date: '2027-05-01',
            amount: -50000,
          },
          {
            id: 'pay',
            account: 'checking',
            date: '2027-05-15',
            amount: 100000,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 60000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 60000,
          minimumDailyClosingBalance: -40000,
          firstShortfallDate: '2027-05-01',
        },
      ],
    });
  });

  test('T5 two shortfalls, the first date is reported', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'a', account: 'checking', date: '2027-05-03', amount: -20000 },
          { id: 'b', account: 'checking', date: '2027-05-05', amount: 20000 },
          { id: 'c', account: 'checking', date: '2027-05-10', amount: -30000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: -20000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: -20000,
          minimumDailyClosingBalance: -20000,
          firstShortfallDate: '2027-05-03',
        },
      ],
    });
  });

  test('T6 movements are applied in date order, not input order', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          {
            id: 'late',
            account: 'checking',
            date: '2027-05-10',
            amount: 50000,
          },
          {
            id: 'early',
            account: 'checking',
            date: '2027-05-03',
            amount: -20000,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 40000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 40000,
          minimumDailyClosingBalance: -10000,
          firstShortfallDate: '2027-05-03',
        },
      ],
    });
  });

  test('T7 same-day movements are grouped', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          {
            id: 'out',
            account: 'checking',
            date: '2027-05-01',
            amount: -30000,
          },
          { id: 'in', account: 'checking', date: '2027-05-01', amount: 30000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 10000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 10000,
          minimumDailyClosingBalance: 10000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T8 same as T7 with the two movements in the opposite order', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'in', account: 'checking', date: '2027-05-01', amount: 30000 },
          {
            id: 'out',
            account: 'checking',
            date: '2027-05-01',
            amount: -30000,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 10000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 10000,
          minimumDailyClosingBalance: 10000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T9 boundaries', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'before', account: 'checking', date: '2027-04-19', amount: -1 },
          {
            id: 'on-asof',
            account: 'checking',
            date: '2027-04-20',
            amount: -2,
          },
          {
            id: 'day-after',
            account: 'checking',
            date: '2027-04-21',
            amount: -4,
          },
          {
            id: 'on-horizon',
            account: 'checking',
            date: '2027-05-31',
            amount: -8,
          },
          {
            id: 'after-horizon',
            account: 'checking',
            date: '2027-06-01',
            amount: -16,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 9988,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 9988,
          minimumDailyClosingBalance: 9988,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T10 unselected accounts', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 10000 },
          { id: 'savings', balance: 5000 },
        ],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'savings', date: '2027-05-01', amount: -9000 },
          { id: 'm2', account: 'checking', date: '2027-05-01', amount: -1000 },
          { id: 'm3', account: 'nowhere', date: '2027-05-01', amount: -7 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 9000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 9000,
          minimumDailyClosingBalance: 9000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T11 output follows the selection order', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'm', balance: 100 },
          { id: 'a', balance: 200 },
          { id: 'z', balance: 300 },
        ],
        selectedAccountIds: ['z', 'a'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 500,
      projectedCash: 500,
      accounts: [
        {
          accountId: 'z',
          currentBalance: 300,
          projectedEndingBalance: 300,
          minimumDailyClosingBalance: 300,
          firstShortfallDate: null,
        },
        {
          accountId: 'a',
          currentBalance: 200,
          projectedEndingBalance: 200,
          minimumDailyClosingBalance: 200,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T12 empty selection', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: [],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: -1000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({ cashAvailable: 0, projectedCash: 0, accounts: [] });
  });

  test('T13 horizon equal to as-of is allowed', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-04-21', amount: -1000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-04-20',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 10000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 10000,
          minimumDailyClosingBalance: 10000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T14 a snapshot that is already negative is a shortfall on the as-of date', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: -5000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'pay', account: 'checking', date: '2027-05-01', amount: 10000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: -5000,
      projectedCash: 5000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: -5000,
          projectedEndingBalance: 5000,
          minimumDailyClosingBalance: -5000,
          firstShortfallDate: '2027-04-20',
        },
      ],
    });
  });

  test('T15 the minimum includes the as-of balance', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'pay', account: 'checking', date: '2027-05-01', amount: 5000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 15000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 15000,
          minimumDailyClosingBalance: 10000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T16 a closing balance of exactly zero is not a shortfall', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 5000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: -5000 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 5000,
      projectedCash: 0,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 5000,
          projectedEndingBalance: 0,
          minimumDailyClosingBalance: 0,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T17 zero-amount movement changes nothing', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 10000 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'zero', account: 'checking', date: '2027-05-01', amount: 0 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 10000,
      projectedCash: 10000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 10000,
          minimumDailyClosingBalance: 10000,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T18 negative zero is never returned', () => {
    const result = projectCashBalances({
      accounts: [{ id: 'checking', balance: -0 }],
      selectedAccountIds: ['checking'],
      movements: [],
      asOf: '2027-04-20',
      horizonEnd: '2027-05-31',
    });
    expect(Object.is(result.cashAvailable, 0)).toBe(true);
    expect(Object.is(result.projectedCash, 0)).toBe(true);
    const row = result.accounts[0];
    expect(Object.is(row.currentBalance, 0)).toBe(true);
    expect(Object.is(row.projectedEndingBalance, 0)).toBe(true);
    expect(Object.is(row.minimumDailyClosingBalance, 0)).toBe(true);
  });

  test('T19 frozen inputs', () => {
    const accounts = Object.freeze([
      Object.freeze({ id: 'checking', balance: 10000 }),
    ]);
    const selectedAccountIds = Object.freeze(['checking']);
    const movements = Object.freeze([
      Object.freeze({
        id: 'late',
        account: 'checking',
        date: '2027-05-10',
        amount: 50000,
      }),
      Object.freeze({
        id: 'early',
        account: 'checking',
        date: '2027-05-03',
        amount: -20000,
      }),
    ]);
    const input = Object.freeze({
      accounts,
      selectedAccountIds,
      movements,
      asOf: '2027-04-20',
      horizonEnd: '2027-05-31',
    });
    expect(projectCashBalances(input)).toEqual({
      cashAvailable: 10000,
      projectedCash: 40000,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 10000,
          projectedEndingBalance: 40000,
          minimumDailyClosingBalance: -10000,
          firstShortfallDate: '2027-05-03',
        },
      ],
    });
  });

  test('T20 unselected balances are not summed', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'a', balance: MAX },
          { id: 'b', balance: 1 },
        ],
        selectedAccountIds: ['a'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: MAX,
      projectedCash: MAX,
      accounts: [
        {
          accountId: 'a',
          currentBalance: MAX,
          projectedEndingBalance: MAX,
          minimumDailyClosingBalance: MAX,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('T21 opposite same-day movements at the safe limit are accepted in either order', () => {
    const expected = {
      cashAvailable: 5,
      projectedCash: 5,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 5,
          projectedEndingBalance: 5,
          minimumDailyClosingBalance: 5,
          firstShortfallDate: null,
        },
      ],
    };
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 5 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'up', account: 'checking', date: '2027-05-01', amount: MAX },
          { id: 'down', account: 'checking', date: '2027-05-01', amount: -MAX },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual(expected);
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 5 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'down', account: 'checking', date: '2027-05-01', amount: -MAX },
          { id: 'up', account: 'checking', date: '2027-05-01', amount: MAX },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual(expected);
  });

  test('V1 asOf invalid date', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-02-30',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('asOf "2027-02-30" is not a valid YYYY-MM-DD date');
  });

  test('V2 horizonEnd invalid date', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-13-01',
      }),
    ).toThrow('horizonEnd "2027-13-01" is not a valid YYYY-MM-DD date');
  });

  test('V3 horizonEnd before asOf', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-04-19',
      }),
    ).toThrow('horizonEnd "2027-04-19" is before asOf "2027-04-20"');
  });

  test('V4 duplicate account id', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 1 },
          { id: 'checking', balance: 2 },
        ],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('duplicate account id "checking"');
  });

  test('V5 balance not a safe integer', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1.5 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account checking: balance must be a safe integer, got 1.5');
  });

  test('V6 balance above the safe limit', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: MAX + 1 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account checking: balance must be a safe integer');
  });

  test('V7 second account balance not a safe integer', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 1 },
          { id: 'other', balance: 0.5 },
        ],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account other: balance must be a safe integer, got 0.5');
  });

  test('V8 duplicate selected account id', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking', 'checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('duplicate selected account id "checking"');
  });

  test('V9 selected account has no snapshot', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking', 'ghost'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('selected account "ghost" has no snapshot');
  });

  test('V10 duplicate movement id', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-06-15', amount: -1 },
          { id: 'm1', account: 'checking', date: '2027-06-15', amount: -2 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('duplicate movement id "m1"');
  });

  test('V11 movement date invalid', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 1 },
          { id: 'savings', balance: 1 },
        ],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'savings', date: '2027-04-31', amount: -1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m1: date "2027-04-31" is not a valid YYYY-MM-DD date');
  });

  test('V12 movement amount not a safe integer', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: 0.5 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m1: amount must be a safe integer, got 0.5');
  });

  test('V13 movement amount above the safe limit', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [
          {
            id: 'm1',
            account: 'checking',
            date: '2027-06-15',
            amount: MAX + 1,
          },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m1: amount must be a safe integer');
  });

  test('S1 cash available overflows on the last account', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: MAX },
          { id: 'b', balance: 1 },
        ],
        selectedAccountIds: ['a', 'b'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account b: cash available');
  });

  test('S2 cash available underflows on the last account', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: -MAX },
          { id: 'b', balance: -1 },
        ],
        selectedAccountIds: ['a', 'b'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account b: cash available');
  });

  test('S3 same-day inflow overflows', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 0 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: MAX },
          { id: 'm2', account: 'checking', date: '2027-05-01', amount: 1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m2: inflow for account "checking" on 2027-05-01');
  });

  test('S4 same-day outflow overflows', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 0 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: -MAX },
          { id: 'm2', account: 'checking', date: '2027-05-01', amount: -1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m2: outflow for account "checking" on 2027-05-01');
  });

  test('S5 the overflow rejection does not depend on same-day order', () => {
    const movements = [
      { id: 'm1', account: 'checking', date: '2027-05-01', amount: MAX },
      { id: 'm2', account: 'checking', date: '2027-05-01', amount: 1 },
      { id: 'm3', account: 'checking', date: '2027-05-01', amount: -MAX },
    ];
    const base = {
      accounts: [{ id: 'checking', balance: 0 }],
      selectedAccountIds: ['checking'],
      asOf: '2027-04-20',
      horizonEnd: '2027-05-31',
    };
    expect(() => projectCashBalances({ ...base, movements })).toThrow(
      'movement m2: inflow for account "checking" on 2027-05-01',
    );
    expect(() =>
      projectCashBalances({
        ...base,
        movements: [movements[2], movements[0], movements[1]],
      }),
    ).toThrow('movement m2: inflow for account "checking" on 2027-05-01');
  });

  test('S6 closing balance overflows', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: MAX }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: 1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account checking: closing balance on 2027-05-01');
  });

  test('S7 closing balance underflows', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: -MAX }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: -1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account checking: closing balance on 2027-05-01');
  });

  test('S8 an unsafe closing balance is rejected even if a later day recovers it', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: MAX }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: 1 },
          { id: 'm2', account: 'checking', date: '2027-05-02', amount: -1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account checking: closing balance on 2027-05-01');
  });

  test('S9 projected cash overflows on the last account', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: MAX - 10 },
          { id: 'b', balance: 0 },
        ],
        selectedAccountIds: ['a', 'b'],
        movements: [{ id: 'm1', account: 'b', date: '2027-05-01', amount: 11 }],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account b: projected cash');
  });

  test('O1 asOf is validated before horizonEnd', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: 'bad',
        horizonEnd: 'worse',
      }),
    ).toThrow('asOf "bad" is not a valid YYYY-MM-DD date');
  });

  test('O2 the date order is validated before account ids', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'checking', balance: 1 },
          { id: 'checking', balance: 2 },
        ],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-04-19',
      }),
    ).toThrow('horizonEnd "2027-04-19" is before asOf "2027-04-20"');
  });

  test('O3 duplicate account id is reported before a bad balance', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: 1 },
          { id: 'a', balance: 1.5 },
        ],
        selectedAccountIds: ['a'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('duplicate account id "a"');
  });

  test('O4 a bad balance is reported before a missing snapshot', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'a', balance: 1.5 }],
        selectedAccountIds: ['ghost'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account a: balance must be a safe integer, got 1.5');
  });

  test('O5 duplicate selected id is reported before a missing snapshot', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'a', balance: 1 }],
        selectedAccountIds: ['a', 'a', 'ghost'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('duplicate selected account id "a"');
  });

  test('O6 a missing snapshot is reported before movement dates', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'a', balance: 1 }],
        selectedAccountIds: ['ghost'],
        movements: [{ id: 'm1', account: 'a', date: 'bad', amount: 1 }],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('selected account "ghost" has no snapshot');
  });

  test('O7 duplicate movement id is reported before a bad date', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: 1 },
          { id: 'm1', account: 'checking', date: 'bad', amount: 0.5 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('duplicate movement id "m1"');
  });

  test('O8 a bad movement date is reported on its own', () => {
    expect(() =>
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 1 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: 'bad', amount: 0.5 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m1: date "bad" is not a valid YYYY-MM-DD date');
  });

  test('O9 a bad movement amount is reported before cash overflow', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: MAX },
          { id: 'b', balance: 1 },
        ],
        selectedAccountIds: ['a', 'b'],
        movements: [
          { id: 'm1', account: 'a', date: '2027-05-01', amount: 0.5 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('movement m1: amount must be a safe integer, got 0.5');
  });

  test('O10 cash overflow is reported once movements validate', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: MAX },
          { id: 'b', balance: 1 },
        ],
        selectedAccountIds: ['a', 'b'],
        movements: [
          { id: 'm1', account: 'a', date: '2027-05-01', amount: MAX },
          { id: 'm2', account: 'a', date: '2027-05-01', amount: 1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow('account b: cash available');
  });

  test('T22 account ids containing a pipe are never confused', () => {
    const expected = {
      cashAvailable: 300,
      projectedCash: 250,
      accounts: [
        {
          accountId: 'a',
          currentBalance: 100,
          projectedEndingBalance: 100,
          minimumDailyClosingBalance: 100,
          firstShortfallDate: null,
        },
        {
          accountId: 'a|b',
          currentBalance: 200,
          projectedEndingBalance: 150,
          minimumDailyClosingBalance: 150,
          firstShortfallDate: null,
        },
      ],
    };
    expect(
      projectCashBalances({
        accounts: [
          { id: 'a', balance: 100 },
          { id: 'a|b', balance: 200 },
        ],
        selectedAccountIds: ['a', 'a|b'],
        movements: [
          { id: 'm1', account: 'a|b', date: '2027-05-01', amount: -50 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual(expected);
  });

  test('R1 cash available overflows in the middle of the selection', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'z', balance: MAX },
          { id: 'a', balance: 1 },
          { id: 'b', balance: -1 },
        ],
        selectedAccountIds: ['z', 'a', 'b'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow(
      'account a: cash available must be a safe integer, got 9007199254740992',
    );
  });

  test('R2 projected cash overflows in the middle of the selection', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'z', balance: MAX - 1 },
          { id: 'a', balance: 0 },
          { id: 'b', balance: 0 },
        ],
        selectedAccountIds: ['z', 'a', 'b'],
        movements: [
          { id: 'm1', account: 'a', date: '2027-05-01', amount: 2 },
          { id: 'm2', account: 'b', date: '2027-05-01', amount: -2 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow(
      'account a: projected cash must be a safe integer, got 9007199254740992',
    );
  });

  test('R3 projected cash underflows', () => {
    expect(() =>
      projectCashBalances({
        accounts: [
          { id: 'a', balance: -MAX + 1 },
          { id: 'b', balance: 0 },
        ],
        selectedAccountIds: ['a', 'b'],
        movements: [{ id: 'm1', account: 'b', date: '2027-05-01', amount: -2 }],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toThrow(
      'account b: projected cash must be a safe integer, got -9007199254740992',
    );
  });

  test('R4 movements of an unknown account never overflow', () => {
    expect(
      projectCashBalances({
        accounts: [],
        selectedAccountIds: [],
        movements: [
          { id: 'm1', account: 'ghost', date: '2027-05-01', amount: MAX },
          { id: 'm2', account: 'ghost', date: '2027-05-01', amount: 1 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({ cashAvailable: 0, projectedCash: 0, accounts: [] });
  });

  test('R5 opposite same-day movements at the safe limit keep a small balance exact', () => {
    const expected = {
      cashAvailable: 2,
      projectedCash: 2,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 2,
          projectedEndingBalance: 2,
          minimumDailyClosingBalance: 2,
          firstShortfallDate: null,
        },
      ],
    };
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 2 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: MAX },
          { id: 'm2', account: 'checking', date: '2027-05-01', amount: -MAX },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual(expected);
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 2 }],
        selectedAccountIds: ['checking'],
        movements: [
          { id: 'm2', account: 'checking', date: '2027-05-01', amount: -MAX },
          { id: 'm1', account: 'checking', date: '2027-05-01', amount: MAX },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual(expected);
  });

  test('R6 two account ids that share a prefix each get their own movement', () => {
    expect(
      projectCashBalances({
        accounts: [
          { id: 'a', balance: 100 },
          { id: 'a|b', balance: 200 },
        ],
        selectedAccountIds: ['a', 'a|b'],
        movements: [
          { id: 'm1', account: 'a', date: '2027-05-01', amount: -10 },
          { id: 'm2', account: 'a|b', date: '2027-05-01', amount: -50 },
        ],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 300,
      projectedCash: 240,
      accounts: [
        {
          accountId: 'a',
          currentBalance: 100,
          projectedEndingBalance: 90,
          minimumDailyClosingBalance: 90,
          firstShortfallDate: null,
        },
        {
          accountId: 'a|b',
          currentBalance: 200,
          projectedEndingBalance: 150,
          minimumDailyClosingBalance: 150,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('R7 an opening balance of zero is not a shortfall', () => {
    expect(
      projectCashBalances({
        accounts: [{ id: 'checking', balance: 0 }],
        selectedAccountIds: ['checking'],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-05-31',
      }),
    ).toEqual({
      cashAvailable: 0,
      projectedCash: 0,
      accounts: [
        {
          accountId: 'checking',
          currentBalance: 0,
          projectedEndingBalance: 0,
          minimumDailyClosingBalance: 0,
          firstShortfallDate: null,
        },
      ],
    });
  });

  test('R8 an invalid horizonEnd is reported before the date order', () => {
    expect(() =>
      projectCashBalances({
        accounts: [],
        selectedAccountIds: [],
        movements: [],
        asOf: '2027-04-20',
        horizonEnd: '2027-02-30',
      }),
    ).toThrow('horizonEnd "2027-02-30" is not a valid YYYY-MM-DD date');
  });
});

describe('listPeriodPayments', () => {
  const periods = [
    makePeriod({
      id: 'groceries-apr',
      category: 'Groceries',
      start: '2027-04-01',
      end: '2027-05-01',
    }),
    makePeriod({
      id: 'groceries-may',
      category: 'Groceries',
      start: '2027-05-01',
      end: '2027-06-01',
    }),
    makePeriod({
      id: 'insurance',
      category: 'Insurance',
      start: '2027-01-01',
      end: '2028-01-01',
    }),
  ];

  test('gives each posting up to the as-of day with the period it counts in', () => {
    const postings = [
      { id: 'late', category: 'Groceries', date: '2027-05-02', amount: -700 },
      { id: 'g1', category: 'Groceries', date: '2027-04-05', amount: -4000 },
      { id: 'before', category: 'Groceries', date: '2027-03-31', amount: -300 },
      { id: 'early', category: 'Insurance', date: '2026-12-20', amount: -900 },
      { id: 'other', category: 'Fun', date: '2027-04-10', amount: -500 },
      { id: 'refund', category: 'Groceries', date: '2027-05-01', amount: 250 },
      { id: 'future', category: 'Groceries', date: '2027-05-11', amount: -100 },
    ];
    const offsets = [
      { transactionId: 'late', periodId: 'groceries-apr' },
      { transactionId: 'early', periodId: 'insurance' },
    ];

    expect(
      listPeriodPayments({ periods, postings, offsets, asOf: '2027-05-10' }),
    ).toEqual([
      { ...postings[0], periodId: 'groceries-apr' },
      { ...postings[1], periodId: 'groceries-apr' },
      { ...postings[2], periodId: null },
      { ...postings[3], periodId: 'insurance' },
      { ...postings[4], periodId: null },
      { ...postings[5], periodId: 'groceries-may' },
    ]);
  });

  test('a posting on the as-of day is listed and one on the day after is not', () => {
    const postings = [
      { id: 'on', category: 'Groceries', date: '2027-04-20', amount: -100 },
      { id: 'after', category: 'Groceries', date: '2027-04-21', amount: -100 },
    ];
    expect(
      listPeriodPayments({
        periods,
        postings,
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toEqual([{ ...postings[0], periodId: 'groceries-apr' }]);
  });

  test('gives only the fields of a payment', () => {
    const posting = {
      id: 'g1',
      category: 'Groceries',
      date: '2027-04-05',
      amount: -4000,
      notes: 'not a field of a payment',
    };
    expect(
      listPeriodPayments({
        periods,
        postings: [posting],
        offsets: [],
        asOf: '2027-04-20',
      }),
    ).toEqual([
      {
        id: 'g1',
        category: 'Groceries',
        date: '2027-04-05',
        amount: -4000,
        periodId: 'groceries-apr',
      },
    ]);
  });

  test('refuses what the summary refuses', () => {
    expect(() =>
      listPeriodPayments({
        periods,
        postings: [],
        offsets: [{ transactionId: 't', periodId: 'missing' }],
        asOf: '2027-04-20',
      }),
    ).toThrow('offset for transaction "t" names unknown period "missing"');
    expect(() =>
      listPeriodPayments({
        periods,
        postings: [],
        offsets: [],
        asOf: '2027-04-31',
      }),
    ).toThrow('asOf "2027-04-31" is not a valid YYYY-MM-DD date');
  });

  test('agrees with the summary for many books', () => {
    let seed = 20261115;
    function pick(count: number): number {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return Math.floor((seed / 2147483648) * count);
    }
    function day(month: number, dayOfMonth: number): string {
      return `2027-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    }
    const categories = ['Groceries', 'Insurance', 'Fun'];

    for (let book = 0; book < 60; book++) {
      // Periods of one to three months with gaps, for the first two
      // categories only.
      const bookPeriods: BudgetPeriod[] = [];
      for (const category of categories.slice(0, 2)) {
        let month = 1 + pick(3);
        while (month <= 9) {
          const length = 1 + pick(3);
          bookPeriods.push(
            makePeriod({
              id: `${category}:${month}`,
              category,
              start: day(month, 1),
              end: day(month + length, 1),
              budget: 1000 * pick(50),
              carryover: 100 * (pick(21) - 10),
            }),
          );
          month += length + pick(2);
        }
      }
      const postings: ExpensePosting[] = [];
      const offsets: PeriodOffset[] = [];
      const postingCount = pick(40);
      for (let index = 0; index < postingCount; index++) {
        const category = categories[pick(3)];
        const id = `t${index}`;
        postings.push({
          id,
          category,
          date: day(1 + pick(12), 1 + pick(28)),
          amount: pick(10) === 0 ? pick(5000) : -pick(5000),
        });
        const own = bookPeriods.filter(period => period.category === category);
        if (own.length > 0 && pick(4) === 0) {
          offsets.push({
            transactionId: id,
            periodId: own[pick(own.length)].id,
          });
        }
      }
      const asOf = day(1 + pick(12), 1 + pick(28));

      const input = { periods: bookPeriods, postings, offsets, asOf };
      const summary = summarizePeriodBudgets(input);
      const payments = listPeriodPayments(input);

      expect(payments.map(payment => payment.id)).toEqual(
        postings.filter(posting => posting.date <= asOf).map(p => p.id),
      );
      for (const { period, netSpending } of summary.periods) {
        const counted = payments
          .filter(payment => payment.periodId === period.id)
          .reduce((sum, payment) => sum + payment.amount, 0);
        expect(counted === 0 ? 0 : -counted).toBe(netSpending);
      }
      expect(
        payments
          .filter(payment => payment.periodId === null)
          .map(payment => payment.id),
      ).toEqual(summary.unassignedPostingIds);
      const monthStart = `${asOf.slice(0, 8)}01`;
      const inMonth = payments
        .filter(payment => payment.date >= monthStart)
        .reduce((sum, payment) => sum + payment.amount, 0);
      expect(inMonth === 0 ? 0 : -inMonth).toBe(summary.monthlyActualSpending);
    }
  });
});
