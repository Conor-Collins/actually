import { cadenceEnd, isValidDay, isWholeNumber, newPeriodId } from './period-store';

describe('newPeriodId', () => {
  it('uses category and start date when the id is free', () => {
    expect(newPeriodId('cat1', '2027-01-01', new Set())).toBe('cat1:2027-01-01');
  });

  it('adds :2 when the id is taken', () => {
    expect(newPeriodId('cat1', '2027-01-01', new Set(['cat1:2027-01-01']))).toBe(
      'cat1:2027-01-01:2',
    );
  });

  it('adds :3 when :2 is taken too', () => {
    expect(
      newPeriodId('cat1', '2027-01-01', new Set(['cat1:2027-01-01', 'cat1:2027-01-01:2'])),
    ).toBe('cat1:2027-01-01:3');
  });

  it('uses the plain id when only :2 is taken', () => {
    expect(newPeriodId('cat1', '2027-01-01', new Set(['cat1:2027-01-01:2']))).toBe(
      'cat1:2027-01-01',
    );
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
