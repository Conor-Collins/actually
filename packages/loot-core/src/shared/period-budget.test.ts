import {
  copyBudgetPeriod,
  createBudgetPeriod,
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
});

describe('copyBudgetPeriod', () => {
  const source = makePeriod({
    id: 'p1',
    category: 'Rent',
    budget: 150000,
    carryover: -2500,
  });

  test('copies the category and allowance by value and defaults carryover to 0', () => {
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
    const snapshot = { ...source };
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2028-01-01',
      end: '2029-01-01',
    });
    expect(copy).not.toBe(source);
    copy.id = 'x';
    copy.category = 'Groceries';
    copy.start = '2030-01-01';
    copy.end = '2031-01-01';
    copy.budget = 1;
    copy.carryover = 2;
    expect(source).toEqual(snapshot);
  });

  test('keeps an explicit carryover', () => {
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2028-01-01',
      end: '2029-01-01',
      carryover: 123,
    });
    expect(copy.carryover).toBe(123);
  });

  test('keeps a negative explicit carryover', () => {
    const copy = copyBudgetPeriod(source, {
      id: 'p2',
      start: '2028-01-01',
      end: '2029-01-01',
      carryover: -500,
    });
    expect(copy.carryover).toBe(-500);
  });

  test('rejects a fractional carryover', () => {
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
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p1',
        start: '2028-01-01',
        end: '2029-01-01',
      }),
    ).toThrow(/must differ from source id/);
  });

  test('rejects an empty id', () => {
    expect(() =>
      copyBudgetPeriod(source, {
        id: '',
        start: '2028-01-01',
        end: '2029-01-01',
      }),
    ).toThrow(/id/);
  });

  test('rejects an invalid end date', () => {
    expect(() =>
      copyBudgetPeriod(source, {
        id: 'p2',
        start: '2028-01-01',
        end: '2028-02-30',
      }),
    ).toThrow(/end "2028-02-30"/);
  });

  test('rejects an end on or before the start', () => {
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
