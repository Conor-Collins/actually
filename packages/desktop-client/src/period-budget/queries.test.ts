import { isPeriodBudgetChange, periodBudgetQueries } from './queries';

describe('isPeriodBudgetChange', () => {
  it.each([
    'period_cadences',
    'period_budgets',
    'period_offsets',
    'period_schedule_links',
    'period_charge_overrides',
    'period_accounts',
    'transactions',
    'schedules',
    'schedules_next_date',
    'rules',
    'accounts',
    'categories',
    'category_mapping',
    'payees',
    'payee_mapping',
  ])('is a change of %s', table => {
    expect(isPeriodBudgetChange([table])).toBe(true);
  });

  it('is a change of several tables when one of them counts', () => {
    expect(isPeriodBudgetChange(['notes', 'transactions'])).toBe(true);
  });

  it('is not a change of other tables, or of none', () => {
    expect(isPeriodBudgetChange(['notes', 'zero_budgets', 'reports'])).toBe(
      false,
    );
    expect(isPeriodBudgetChange([])).toBe(false);
  });
});

describe('nameablePayments', () => {
  it('is another query for other days and for another payment to keep', () => {
    const march: { start: string; end: string; keepId: string | null } = {
      start: '2017-03-01',
      end: '2017-03-31',
      keepId: null,
    };
    const keyOf = (range: Partial<typeof march>) =>
      JSON.stringify(
        periodBudgetQueries.nameablePayments({ ...march, ...range }).queryKey,
      );

    const keys = [
      keyOf({}),
      keyOf({ start: '2017-02-01' }),
      keyOf({ end: '2017-04-30' }),
      keyOf({ keepId: 'a' }),
      keyOf({ keepId: 'b' }),
    ];

    expect(new Set(keys).size).toBe(keys.length);
    expect(keyOf({ ...march })).toBe(keys[0]);
  });
});
