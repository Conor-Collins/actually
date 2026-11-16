import { isPeriodBudgetChange } from './queries';

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
