import { MemoryRouter, Route, Routes } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  ObjectExpression,
  QueryState,
} from '@actual-app/core/shared/query';
import type {
  RuleConditionEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import type { SavedFilter } from '#components/filters/SavedFilterMenuButton';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  createTestQueryClient,
  resetTestProviders,
  TestProviders,
} from '#mocks';
import { serverPush } from '#mocks/connection';

import { Account } from './Account';
import { describeDateFilters, monthFilter } from './account-date-filters';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#hooks/useAccountPreviewTransactions', () => ({
  useAccountPreviewTransactions: () => previewResult,
}));
vi.mock('#components/transactions/TransactionList', () => ({
  TransactionList: ({
    allTransactions,
  }: {
    allTransactions: TransactionEntity[];
  }) => (
    <ul aria-label="Register rows">
      {allTransactions.map(transaction => (
        <li key={transaction.id}>{transaction.notes}</li>
      ))}
    </ul>
  ),
}));

const lower = {
  field: 'date',
  op: 'gte',
  value: '2026-11-01',
} satisfies RuleConditionEntity;
const upper = {
  field: 'date',
  op: 'lte',
  value: '2026-11-20',
} satisfies RuleConditionEntity;
const category = {
  field: 'category',
  op: 'is',
  value: 'childcare',
} satisfies RuleConditionEntity;

const payee = {
  field: 'payee',
  op: 'is',
  value: 'merchant',
} satisfies RuleConditionEntity;
const checking = generateAccount('Checking');

const posted = [
  {
    id: 'October food',
    date: '2026-10-31',
    category: 'food',
    payee: 'merchant',
  },
  { id: 'October childcare', date: '2026-10-30', category: 'childcare' },
  { id: 'November food', date: '2026-11-10', category: 'food' },
  { id: 'Late November food', date: '2026-11-25', category: 'food' },
].map(row => ({ ...row, notes: row.id, amount: -300 }));

const previewResult = {
  previewTransactions: [
    {
      id: 'preview/october',
      date: '2026-10-31',
      notes: 'October preview',
      amount: -100,
    },
    {
      id: 'preview/november',
      date: '2026-11-10',
      notes: 'November preview',
      amount: -100,
    },
  ],
  runningBalances: new Map(),
  isLoading: false,
};

function matches(
  row: (typeof posted)[number],
  expression: ObjectExpression,
): boolean {
  if (Array.isArray(expression.$and)) {
    return expression.$and.every(part => matches(row, part));
  }
  if (Array.isArray(expression.$or)) {
    return expression.$or.some(part => matches(row, part));
  }
  if (typeof expression.category === 'string') {
    return row.category === expression.category;
  }
  if (typeof expression.payee === 'string') {
    return row.payee === expression.payee;
  }
  const bounds = expression.date;
  if (bounds && typeof bounds === 'object') {
    return (
      (!('$gte' in bounds) ||
        typeof bounds.$gte !== 'string' ||
        row.date >= bounds.$gte) &&
      (!('$lte' in bounds) ||
        typeof bounds.$lte !== 'string' ||
        row.date <= bounds.$lte)
    );
  }
  return true;
}

let saved: SavedFilter[];
let saveFilter: ReturnType<typeof vi.fn<(state: SavedFilter) => void>>;
let validated: RuleConditionEntity[];

beforeEach(() => {
  resetTestProviders();
  validated = [];
  saved = [
    {
      id: 'any-filter',
      name: 'Childcare or November',
      conditionsOp: 'or',
      conditions: [category, monthFilter('2026-11')],
    },
  ];
  saveFilter = vi.fn();
  initServer({
    'accounts-get': async () => [checking],
    'account-update': async () => ({}),
    'get-cell': async ({
      sheetName,
      name,
    }: {
      sheetName: string;
      name: string;
    }) => ({
      name: `${sheetName}!${name}`,
      value: 0,
    }),
    'create-query': async () => 'test-balance',
    query: async (query: QueryState) => {
      if (query.table === 'transaction_filters') {
        return {
          data: saved.map(filter => ({
            ...filter,
            conditions_op: filter.conditionsOp,
          })),
          dependencies: ['transaction_filters'],
        };
      }
      const rows =
        query.table === 'transactions'
          ? posted.filter(row =>
              query.filterExpressions.every(expression =>
                matches(row, expression),
              ),
            )
          : [];
      return {
        data: query.calculation ? rows.length : rows,
        dependencies: [query.table],
      };
    },
    'rule-validate': async ({ conditions }) => {
      validated.push(...(conditions ?? []));
      return { error: null };
    },
    'make-filters-from-conditions': async ({ conditions }) => {
      if (!Array.isArray(conditions)) {
        throw new Error('Expected filter conditions');
      }
      return {
        filters: conditions.map((condition: RuleConditionEntity) => {
          if (condition.field === 'category') {
            return { category: condition.value };
          }
          if (condition.field === 'payee') {
            return { payee: condition.value };
          }
          const { start, end } = describeDateFilters([condition]) ?? {};
          return { date: { $gte: start, $lte: end } };
        }),
      };
    },
    'filter-create': async ({ state }: { state: SavedFilter }) => {
      saveFilter(state);
      saved.push({ id: 'new-filter', ...state });
      serverPush('sync-event', {
        type: 'applied',
        tables: ['transaction_filters'],
      });
      return 'new-filter';
    },
  });
});

function openAccount(
  filterConditions?: RuleConditionEntity[],
  accountId?: string,
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(accountQueries.list().queryKey, [checking]);
  render(
    <TestProviders queryClient={queryClient}>
      <SpreadsheetProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: accountId ? `/accounts/${accountId}` : '/accounts',
              state: filterConditions ? { filterConditions } : undefined,
            },
          ]}
        >
          <Routes>
            <Route path="/accounts/:id?" element={<Account />} />
          </Routes>
        </MemoryRouter>
      </SpreadsheetProvider>
    </TestProviders>,
  );
  return userEvent.setup();
}

function register() {
  return within(screen.getByRole('list', { name: 'Register rows' }));
}

async function openFilter(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole('button', { name: 'Filter' }));
  await user.click(await screen.findByText(name, { exact: true }));
}

async function addBound(
  user: ReturnType<typeof userEvent.setup>,
  op: string,
  date: string,
) {
  await openFilter(user, 'Date');
  const editor = within(screen.getByTestId('filters-menu-tooltip'));
  await user.click(editor.getByRole('button', { name: op }));
  const input = editor.getByRole('textbox');
  await user.clear(input);
  await user.type(input, date);
  await user.click(editor.getByRole('button', { name: 'Apply' }));
  await waitFor(() =>
    expect(screen.queryByTestId('filters-menu-tooltip')).toBeNull(),
  );
}

test('adds both date bounds from the Filter menu and reloads the saved conjunction', async () => {
  const user = openAccount();
  await user.click(await screen.findByRole('button', { name: 'All dates' }));
  expect(await register().findByText('October food')).toBeVisible();

  await addBound(user, 'is greater than or equals', '11/01/2026');
  expect(validated.at(-1)).toMatchObject(lower);
  await waitFor(() =>
    expect(register().queryByText('October food')).toBeNull(),
  );
  expect(register().getByText('Late November food')).toBeVisible();
  await addBound(user, 'is less than or equals', '11/20/2026');
  expect(validated.at(-1)).toMatchObject(upper);
  expect(await register().findByText('November food')).toBeVisible();
  await waitFor(() =>
    expect(register().queryByText('Late November food')).toBeNull(),
  );
  expect(register().queryByText('October food')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Unsaved filter' }));
  await user.click(await screen.findByText('Save new filter'));
  await user.type(screen.getByLabelText('Filter name'), 'November ledger');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await waitFor(() =>
    expect(saveFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        conditionsOp: 'and',
        conditions: [
          expect.objectContaining(lower),
          expect.objectContaining(upper),
        ],
      }),
    ),
  );

  await user.click(screen.getByRole('button', { name: 'All dates' }));
  expect(await register().findByText('October food')).toBeVisible();
  await openFilter(user, 'Saved');
  await user.click(await screen.findByTestId('November ledger-filter-item'));
  await user.click(screen.getByRole('button', { name: 'Apply' }));
  await waitFor(() =>
    expect(register().queryByText('October food')).toBeNull(),
  );
  expect(register().getByText('November food')).toBeVisible();
  expect(register().queryByText('Late November food')).toBeNull();
});

async function loadAnyFilter(user: ReturnType<typeof userEvent.setup>) {
  await openFilter(user, 'Saved');
  await user.click(
    await screen.findByTestId('Childcare or November-filter-item'),
  );
  await user.click(screen.getByRole('button', { name: 'Apply' }));
  expect(
    await screen.findByRole('button', { name: 'Or November 2026' }),
  ).toBeVisible();
}

async function saveModifiedFilter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /Childcare or November.*modified/i }),
  );
  await user.click(await screen.findByText('Save new filter'));
  const input = screen.getByLabelText('Filter name');
  await user.clear(input);
  await user.type(input, 'Edited filter');
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

test('All dates removes a saved Any date alternative and saves the remaining category', async () => {
  const user = openAccount();
  await loadAnyFilter(user);
  expect(await register().findByText('October childcare')).toBeVisible();
  expect(register().getByText('November food')).toBeVisible();
  expect(register().queryByText('October food')).toBeNull();
  expect(screen.queryByRole('button', { name: /^date is/i })).toBeNull();

  await user.click(screen.getByRole('button', { name: 'All dates' }));
  await waitFor(() =>
    expect(register().queryByText('November food')).toBeNull(),
  );
  expect(register().getByText('October childcare')).toBeVisible();
  await saveModifiedFilter(user);
  await waitFor(() =>
    expect(saveFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        conditionsOp: 'and',
        conditions: [category],
      }),
    ),
  );
});

test.each([false, true])(
  'keeps the saved date inside Any after an All round-trip (payee branch: %s)',
  async withPayee => {
    const conditions = [
      category,
      ...(withPayee ? [payee] : []),
      monthFilter('2026-11'),
    ];
    saved = saved.map(filter => ({ ...filter, conditions }));
    const user = openAccount();
    await loadAnyFilter(user);

    await user.click(screen.getByRole('button', { name: 'any' }));
    await user.click(await screen.findByText('all', { exact: true }));
    expect(
      await screen.findByRole('button', { name: 'November 2026' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(register().queryByText('October childcare')).toBeNull(),
    );
    expect(register().queryByText('November food')).toBeNull();
    expect(screen.queryByRole('button', { name: /^date is/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'all' }));
    await user.click(await screen.findByText('any', { exact: true }));
    expect(
      await screen.findByRole('button', { name: 'Or November 2026' }),
    ).toBeVisible();
    expect(await register().findByText('October childcare')).toBeVisible();
    expect(register().getByText('November food')).toBeVisible();
    expect(Boolean(register().queryByText('October food'))).toBe(withPayee);
    await saveModifiedFilter(user);
    await waitFor(() =>
      expect(saveFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          conditionsOp: 'or',
          conditions,
        }),
      ),
    );
  },
);

test('keeps a date from a saved All filter when switching to Any', async () => {
  saved = saved.map(filter => ({ ...filter, conditionsOp: 'and' }));
  const user = openAccount();
  await openFilter(user, 'Saved');
  await user.click(
    await screen.findByTestId('Childcare or November-filter-item'),
  );
  await user.click(screen.getByRole('button', { name: 'Apply' }));
  await user.click(await screen.findByRole('button', { name: 'all' }));
  await user.click(await screen.findByText('any', { exact: true }));
  expect(
    await screen.findByRole('button', { name: 'Or November 2026' }),
  ).toBeVisible();
  expect(await register().findByText('October childcare')).toBeVisible();
  expect(register().getByText('November food')).toBeVisible();
});

test('saves only the active reconciliation filter and restores November on exit', async () => {
  const user = openAccount([monthFilter('2026-11')], checking.id);
  expect(await register().findByText('November food')).toBeVisible();
  expect(register().queryByText('October food')).toBeNull();

  await user.click(await screen.findByRole('button', { name: 'Reconcile' }));
  const prompt = await screen.findByText(/Enter the current balance/);
  const form = prompt.closest('form');
  if (!form) throw new Error('Missing reconcile form');
  const input = await within(form).findByRole('textbox');
  await user.clear(input);
  await user.type(input, '12.34');
  await user.click(within(form).getByRole('button', { name: 'Reconcile' }));
  expect(await register().findByText('October food')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Unsaved filter' })).toBeNull();

  await addBound(user, 'is greater than or equals', '10/01/2026');
  expect(screen.getByRole('button', { name: /^date is/i })).toBeVisible();
  expect(register().getByText('October food')).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Unsaved filter' }));
  await user.click(await screen.findByText('Save new filter'));
  await user.type(screen.getByLabelText('Filter name'), 'Reconciliation dates');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await waitFor(() =>
    expect(saveFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        conditionsOp: 'and',
        conditions: [
          expect.objectContaining({ ...lower, value: '2026-10-01' }),
        ],
      }),
    ),
  );
  expect(
    await screen.findByRole('button', { name: 'Reconciliation dates' }),
  ).toBeVisible();
  expect(register().getByText('October food')).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Exit reconciliation' }));
  expect(
    await screen.findByRole('button', { name: 'November 2026' }),
  ).toBeVisible();
  await waitFor(() =>
    expect(register().queryByText('October food')).toBeNull(),
  );
  expect(register().getByText('November food')).toBeVisible();
});

test('a contradictory date conjunction hides scheduled previews', async () => {
  openAccount([lower, { ...upper, value: '2026-10-31' }]);
  expect(
    await screen.findByRole('button', { name: 'No matching dates' }),
  ).toBeVisible();
  expect(register().queryByText('October preview')).toBeNull();
  expect(register().queryByText('November preview')).toBeNull();
});

test('All dates includes scheduled previews from different months', async () => {
  const user = openAccount([lower, upper]);
  await user.click(await screen.findByRole('button', { name: 'All dates' }));
  expect(await register().findByText('October preview')).toBeVisible();
  expect(register().getByText('November preview')).toBeVisible();
});
