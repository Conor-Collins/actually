import {
  CASH_HORIZONS,
  cashHorizonEnd,
  DEFAULT_CASH_HORIZON,
  toCashHorizon,
} from './horizon';

describe('toCashHorizon', () => {
  it('takes each horizon that can be stored', () => {
    expect(CASH_HORIZONS.map(toCashHorizon)).toEqual([
      'this-month',
      'next-month',
      '90-days',
      '12-months',
    ]);
  });

  it('gives the end of next month when nothing usable is stored', () => {
    expect(DEFAULT_CASH_HORIZON).toBe('next-month');
    expect(toCashHorizon(undefined)).toBe('next-month');
    expect(toCashHorizon('')).toBe('next-month');
    expect(toCashHorizon('6-months')).toBe('next-month');
  });
});

describe('cashHorizonEnd', () => {
  it('ends this month on its last day', () => {
    expect(cashHorizonEnd('2017-06-15', 'this-month')).toBe('2017-06-30');
    expect(cashHorizonEnd('2017-06-30', 'this-month')).toBe('2017-06-30');
    expect(cashHorizonEnd('2016-02-01', 'this-month')).toBe('2016-02-29');
  });

  it('ends next month on its last day', () => {
    expect(cashHorizonEnd('2017-06-15', 'next-month')).toBe('2017-07-31');
    expect(cashHorizonEnd('2017-01-31', 'next-month')).toBe('2017-02-28');
    expect(cashHorizonEnd('2017-12-01', 'next-month')).toBe('2018-01-31');
  });

  it('ends 90 days after the as-of day', () => {
    expect(cashHorizonEnd('2017-06-15', '90-days')).toBe('2017-09-13');
    expect(cashHorizonEnd('2017-12-31', '90-days')).toBe('2018-03-31');
  });

  it('ends on the same day a year later, or on the last day of that month', () => {
    expect(cashHorizonEnd('2017-06-15', '12-months')).toBe('2018-06-15');
    expect(cashHorizonEnd('2017-01-31', '12-months')).toBe('2018-01-31');
    expect(cashHorizonEnd('2016-02-29', '12-months')).toBe('2017-02-28');
    expect(cashHorizonEnd('2015-02-28', '12-months')).toBe('2016-02-28');
  });
});
