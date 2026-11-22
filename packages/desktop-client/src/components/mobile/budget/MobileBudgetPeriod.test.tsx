import { GridList } from 'react-aria-components';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BudgetPeriodsProvider } from '#components/period-budget/BudgetPeriods';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { calculate, NO_ROWS, period, stored } from '#period-budget/fixtures';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

vi.hoisted(vi.resetModules);
vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true, width: 360 }),
}));
vi.mock('#hooks/useSheetValue', () => ({ useSheetValue: () => null }));
vi.mock('./BudgetCell', () => ({ BudgetCell: () => null }));
vi.mock('./SpentCell', () => ({ SpentCell: () => null }));

it('shows full period amounts and opens the graph inside a mobile category list', async () => {
  const month = '2024-01';
  const category: CategoryEntity = {
    id: 'insurance',
    name: 'Insurance',
    group: 'usual',
  };
  const annual = period(
    'annual',
    category.id,
    '2024-01-01',
    '2025-01-01',
    1234567,
    234567,
  );
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  initServer({
    'accounts-get': async () => [],
    'payees-get': async () => [],
    'get-categories': async () => ({
      grouped: [{ id: 'usual', name: 'Usual', categories: [category] }],
      list: [category],
    }),
    'period-budget/get-rows': async () => ({
      ...NO_ROWS,
      periods: [stored(annual)],
    }),
    'period-budget/calculate': async ({ asOf }) =>
      calculate({
        asOf,
        periods: [annual],
        postings: [
          {
            id: 'payment',
            date: '2024-01-15',
            category: category.id,
            amount: -123456,
          },
        ],
      }),
    query: async () => ({ data: [], dependencies: [] }),
  });
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <MemoryRouter>
        <div style={{ width: 360 }}>
          <BudgetPeriodsProvider visibleMonths={[month]}>
            <SheetNameProvider name="budget202401">
              <GridList aria-label="Categories" items={[category]}>
                {item => (
                  <ExpenseCategoryListItem
                    value={item}
                    month={month}
                    isHidden={false}
                    show3Columns
                    showBudgetedColumn
                    onEditCategory={vi.fn()}
                    onBudgetAction={vi.fn()}
                  />
                )}
              </GridList>
            </SheetNameProvider>
          </BudgetPeriodsProvider>
        </div>
      </MemoryRouter>
    </TestProviders>,
  );

  const row = screen.getByTestId('category-row');
  const snapshot = await within(row).findByRole('button', {
    name: 'Period details for Insurance',
  });
  for (const value of ['Yearly', '14,691.34', '1,234.56', '13,456.78']) {
    expect(within(snapshot).getByText(value)).toBeVisible();
  }
  await userEvent.click(snapshot);
  const dialog = screen.getByRole('dialog', {
    name: 'Period details for Insurance',
  });
  expect(
    within(dialog).getByRole('group', { name: 'Graph of Insurance, 2024' }),
  ).toBeVisible();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
