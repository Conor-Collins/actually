import { checkPeriodWrite } from '@actual-app/core/shared/period-store';
import type { PeriodBudgetRow } from '@actual-app/core/types/models';

import { findOverlappingPeriod } from './overlap';

function row(
  id: string,
  start: string | null,
  end: string | null,
  fields: Partial<PeriodBudgetRow> = {},
): PeriodBudgetRow {
  return {
    id,
    category: 'food',
    start_date: start,
    end_date: end,
    budget: 100,
    carryover: 0,
    carried_from: null,
    tombstone: false,
    ...fields,
  };
}

const MAY = row('may', '2017-05-01', '2017-06-01');

function overlapOf(
  periods: PeriodBudgetRow[],
  start: string,
  end: string,
  id: string | null = null,
) {
  return findOverlappingPeriod(periods, { id, category: 'food', start, end });
}

describe('findOverlappingPeriod', () => {
  it('finds the period that has a day in common', () => {
    const found = { start: '2017-05-01', end: '2017-06-01' };
    // Its last day, its first day, inside it and around it
    expect(overlapOf([MAY], '2017-05-31', '2017-07-01')).toEqual(found);
    expect(overlapOf([MAY], '2017-04-01', '2017-05-02')).toEqual(found);
    expect(overlapOf([MAY], '2017-05-10', '2017-05-11')).toEqual(found);
    expect(overlapOf([MAY], '2017-01-01', '2018-01-01')).toEqual(found);
  });

  it('lets a period start on the day another ends, and end on the day another starts', () => {
    expect(overlapOf([MAY], '2017-06-01', '2017-07-01')).toBeNull();
    expect(overlapOf([MAY], '2017-04-01', '2017-05-01')).toBeNull();
  });

  it('does not compare a period with itself', () => {
    expect(overlapOf([MAY], '2017-05-01', '2017-06-15', 'may')).toBeNull();
    expect(
      overlapOf([MAY], '2017-05-01', '2017-06-15', 'other'),
    ).not.toBeNull();
  });

  it('leaves out deleted periods and those of other categories', () => {
    expect(
      overlapOf(
        [
          row('deleted', '2017-05-01', '2017-06-01', { tombstone: true }),
          row('tax', '2017-05-01', '2017-06-01', { category: 'tax' }),
          row('none', '2017-05-01', '2017-06-01', { category: null }),
        ],
        '2017-05-01',
        '2017-06-01',
      ),
    ).toBeNull();
  });

  it('leaves out periods whose days cannot be used', () => {
    expect(
      overlapOf(
        [
          row('no-start', null, '2017-06-01'),
          row('no-end', '2017-05-01', null),
          row('odd-start', 'soon', '2017-06-01'),
          row('odd-end', '2017-05-01', 'later'),
          row('backwards', '2017-06-01', '2017-05-01'),
          row('empty', '2017-05-10', '2017-05-10'),
        ],
        '2017-01-01',
        '2018-01-01',
      ),
    ).toBeNull();
  });

  it('leaves out periods with a day that the calendar does not have', () => {
    expect(
      overlapOf(
        [
          row('february-30', '2017-02-30', '2017-04-01'),
          // 2017 is not a leap year
          row('february-29', '2017-01-01', '2017-02-29'),
          row('month-13', '2017-13-01', '2018-01-01'),
          row('day-0', '2017-03-00', '2017-04-01'),
        ],
        '2017-01-01',
        '2018-01-01',
      ),
    ).toBeNull();
    // 2016 is one
    expect(
      overlapOf(
        [row('leap', '2016-02-01', '2016-02-29')],
        '2016-02-28',
        '2016-03-01',
      ),
    ).toEqual({ start: '2016-02-01', end: '2016-02-29' });
  });

  it('refuses what the server refuses as an overlap, and nothing else', () => {
    const days = [
      null,
      'soon',
      '2017-02-28',
      '2017-02-29',
      '2017-02-30',
      '2017-03-01',
      '2017-03-15',
      '2017-04-01',
    ];
    const stored: PeriodBudgetRow[] = [];
    for (const start of days) {
      for (const end of days) {
        stored.push(row(`${start}/${end}`, start, end));
      }
    }
    stored.push(
      row('deleted', '2017-03-01', '2017-04-01', { tombstone: true }),
      row('tax', '2017-03-01', '2017-04-01', { category: 'tax' }),
    );
    const candidates = [
      ['2017-02-01', '2017-02-28'],
      ['2017-02-28', '2017-03-01'],
      ['2017-03-01', '2017-03-15'],
      ['2017-03-15', '2017-04-01'],
      ['2017-04-01', '2017-05-01'],
    ];

    for (const one of stored) {
      for (const [start, end] of candidates) {
        for (const id of [null, one.id]) {
          const refusal = checkPeriodWrite({
            candidate: {
              id: id ?? 'new',
              category: 'food',
              start_date: start,
              end_date: end,
              budget: 100,
              carryover: 0,
            },
            periods: [one],
          });
          const found = findOverlappingPeriod([one], {
            id,
            category: 'food',
            start,
            end,
          });
          expect([one.id, start, end, id, found !== null]).toEqual([
            one.id,
            start,
            end,
            id,
            refusal !== null,
          ]);
        }
      }
    }
  });

  it('gives the first of several', () => {
    expect(
      overlapOf(
        [MAY, row('june', '2017-06-01', '2017-07-01')],
        '2017-05-15',
        '2017-06-15',
      ),
    ).toEqual({ start: '2017-05-01', end: '2017-06-01' });
  });
});
