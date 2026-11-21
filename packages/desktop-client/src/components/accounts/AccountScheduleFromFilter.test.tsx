import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type * as Connection from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type {
  RuleConditionEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { SelectedProviderWithItems } from '#hooks/useSelected';
import { createTestAppStore, TestProviders } from '#mocks';

import { Account } from './Account';
import { rangeFilters } from './account-date-filters';
import type * as Header from './Header';

vi.mock(
  '@actual-app/core/platform/client/connection',
  async importOriginal => ({
    ...(await importOriginal<typeof Connection>()),
    send: vi.fn(),
  }),
);
vi.mock('./BalanceHistoryGraph', () => ({ BalanceHistoryGraph: () => null }));
vi.mock('#hooks/useSheetValue', () => ({ useSheetValue: () => 0 }));
vi.mock('#components/transactions/TransactionList', () => ({
  TransactionList: () => null,
}));
vi.mock('./Header', () => ({
  AccountHeader: ({
    rangeConditions,
    onDateRangeChange,
    onMenuSelect,
  }: Parameters<typeof Header.AccountHeader>[0]) => (
    <>
      <output>{String(rangeConditions[0]?.value ?? '')}</output>
      <button
        type="button"
        onClick={() =>
          onDateRangeChange(
            rangeFilters({ start: '2026-01-01', end: '2026-12-31' }),
          )
        }
      >
        Select 2026
      </button>
      <button
        type="button"
        onClick={() => onMenuSelect('schedule-from-filter')}
      >
        Schedule from this filter
      </button>
    </>
  ),
}));

function insuranceTransaction(year: string): TransactionEntity {
  return {
    id: year,
    date: `${year}-06-15`,
    account: 'card',
    amount: -219813,
    category: 'insurance',
    payee: 'mutual-acme',
  };
}

const matchingChild: TransactionEntity = {
  ...insuranceTransaction('2026'),
  id: 'matching-child',
  amount: -3517,
  is_child: true,
  parent_id: 'split',
};
const groupedSplit: TransactionEntity = {
  ...matchingChild,
  id: 'split',
  is_child: false,
  is_parent: true,
  parent_id: undefined,
  amount: -5320,
  subtransactions: [
    matchingChild,
    {
      ...matchingChild,
      id: 'unmatched-child',
      amount: -1803,
      _unmatched: true,
    },
  ],
};

function holdQuery() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>(release => {
    resolve = release;
  });
  return { promise, resolve: () => resolve?.() };
}

test.each(['while installing the range', 'while reading the old rows'])(
  'protects schedule conversion %s',
  async timing => {
    const store = createTestAppStore();
    const rangeReady = holdQuery();
    const oldRowsReady = holdQuery();
    const oldPageRead = vi.fn();
    const newPageRead = vi.fn();

    vi.mocked(send).mockImplementation(async (name, args) => {
      if (
        name === 'make-filters-from-conditions' &&
        args &&
        'conditions' in args
      ) {
        const filters = args.conditions.map(
          (condition: RuleConditionEntity) => {
            if (condition.field === 'category') {
              return { category: condition.value };
            }
            return {
              date: {
                [condition.op === 'gte' ? '$gte' : '$lte']: condition.value,
              },
            };
          },
        );
        if (JSON.stringify(filters).includes('2026-')) {
          await rangeReady.promise;
        }
        return { filters };
      }
      if (name === 'query' && args && 'table' in args) {
        if (
          args.table === 'categories' &&
          args.selectExpressions.includes('name')
        ) {
          return { data: [{ name: 'Insurance' }] };
        }
        if (
          args.table === 'transactions' &&
          args.selectExpressions.includes('*')
        ) {
          const year = JSON.stringify(args.filterExpressions).includes('2026-')
            ? '2026'
            : '2025';
          if (args.limit) {
            (year === '2026' ? newPageRead : oldPageRead)();
          } else if (
            year === '2025' &&
            timing === 'while reading the old rows'
          ) {
            await oldRowsReady.promise;
          }
          return {
            data: [year === '2026' ? groupedSplit : insuranceTransaction(year)],
          };
        }
        return { data: args.calculation ? 0 : [] };
      }
      return {};
    });

    render(
      <TestProviders store={store}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/accounts',
              state: {
                filterConditions: [
                  { field: 'category', op: 'is', value: 'insurance' },
                  ...rangeFilters({ start: '2025-01-01', end: '2025-12-31' }),
                ],
              },
            },
          ]}
        >
          <Account />
        </MemoryRouter>
      </TestProviders>,
    );

    await waitFor(() => expect(oldPageRead).toHaveBeenCalled());
    const convert = () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Schedule from this filter' }),
      );
    const select2026 = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Select 2026' }));
    if (timing === 'while reading the old rows') {
      await act(async () => {
        convert();
      });
    }

    select2026();
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    if (timing === 'while installing the range') {
      await act(async () => {
        convert();
      });
    }

    await act(async () => {
      oldRowsReady.resolve();
    });
    expect(store.getState().modals.modalStack).toEqual([]);
    await act(async () => {
      rangeReady.resolve();
    });
    await waitFor(() => expect(newPageRead).toHaveBeenCalled());

    if (timing === 'while reading the old rows') {
      await act(async () => {
        convert();
      });
    }
    expect(store.getState().modals.modalStack).toEqual([
      expect.objectContaining({
        name: 'schedule-edit',
        options: {
          filtered: expect.objectContaining({
            year: '2026',
            schedule: expect.objectContaining({ _amount: -3517 }),
            transactions: [matchingChild],
          }),
        },
      }),
    ]);
  },
);

test('offers a direct filter-bar button only with a category filter', async () => {
  const { AccountHeader } = await vi.importActual<typeof Header>('./Header');
  const root = q('transactions');
  const insurance = {
    field: 'category',
    op: 'is',
    value: 'insurance',
  } satisfies RuleConditionEntity;
  const rangeConditions = rangeFilters({
    start: '2026-01-01',
    end: '2026-12-31',
  });
  vi.mocked(send).mockResolvedValue({ data: [] });
  const onMenuSelect = vi.fn();
  const props = {
    tableRef: { current: null },
    isNameEditable: false,
    workingHard: false,
    accountName: 'All Accounts',
    savedFilters: [],
    accountsSyncing: [],
    accounts: [],
    transactions: [],
    showExtraBalances: false,
    showReconciled: true,
    showEmptyMessage: false,
    balanceQuery: {
      name: 'balance-query-test',
      query: root.calculate({ $sum: '$amount' }),
    },
    isSorted: false,
    search: '',
    filterConditionsOp: 'and',
    rangeConditions,
    chartQuery: null,
    saveNameError: null,
    onMenuSelect,
    onDateRangeChange: vi.fn(),
    onClearDateAlternatives: vi.fn(),
    onSearch: vi.fn(),
    onAddTransaction: vi.fn(),
    onShowTransactions: vi.fn(),
    onDoneReconciling: vi.fn(),
    onCreateReconciliationTransaction: vi.fn(),
    onToggleExtraBalances: vi.fn(),
    onSaveName: vi.fn(),
    onSync: vi.fn(),
    onImport: vi.fn(),
    onReconcile: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchDuplicate: vi.fn(),
    onBatchEdit: vi.fn(),
    onBatchLinkSchedule: vi.fn(),
    onBatchUnlinkSchedule: vi.fn(),
    onCreateRule: vi.fn(),
    onApplyFilter: vi.fn(),
    onUpdateFilter: vi.fn(),
    onClearFilters: vi.fn(),
    onReloadSavedFilter: vi.fn(),
    onConditionsOpChange: vi.fn(),
    onDeleteFilter: vi.fn(),
    onScheduleAction: vi.fn(),
    onSetTransfer: vi.fn(),
    onRunRules: vi.fn(),
    onMakeAsSplitTransaction: vi.fn(),
    onMakeAsNonSplitTransactions: vi.fn(),
    onMergeTransactions: vi.fn(),
  } satisfies Omit<ComponentProps<typeof AccountHeader>, 'filterConditions'>;

  const header = (filterConditions: RuleConditionEntity[]) => (
    <TestProviders>
      <SelectedProviderWithItems
        name="transactions"
        items={[]}
        fetchAllIds={async () => []}
      >
        <AccountHeader {...props} filterConditions={filterConditions} />
      </SelectedProviderWithItems>
    </TestProviders>
  );
  const { rerender } = render(header([]));
  expect(
    screen.queryByRole('button', { name: 'Schedule from this filter' }),
  ).not.toBeInTheDocument();

  await act(async () => {
    rerender(header([insurance]));
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Schedule from this filter' }),
    );
  });
  expect(onMenuSelect).toHaveBeenCalledWith('schedule-from-filter');
});
