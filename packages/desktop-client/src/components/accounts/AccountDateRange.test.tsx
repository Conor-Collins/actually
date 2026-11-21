import { useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type * as Connection from '@actual-app/core/platform/client/connection';
import { currentMonth } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FiltersStack } from '#components/filters/FiltersStack';
import { useQuery } from '#hooks/useQuery';
import { TestProviders } from '#mocks';

import {
  accountDateQueries,
  describeDateFilters,
  initialAccountFilters,
  isDateFilter,
  monthFilter,
  splitAccountFilters,
} from './account-date-filters';
import type { AccountFilter } from './account-date-filters';
import { AccountDateRange } from './AccountDateRange';

vi.mock('#hooks/useQuery', () => ({ useQuery: vi.fn() }));
vi.mock(
  '@actual-app/core/platform/client/connection',
  async importOriginal => ({
    ...(await importOriginal<typeof Connection>()),
    send: vi.fn(),
  }),
);

const november = {
  field: 'date',
  op: 'is',
  value: '2026-11',
  options: { month: true },
} satisfies RuleConditionEntity;

const category = {
  field: 'category',
  op: 'is',
  value: 'childcare',
} satisfies RuleConditionEntity;

const root = q('transactions').options({ splits: 'grouped' });
const categoryExpression = { category: 'childcare' };
const novemberExpression = {
  date: { $gte: '2026-11-01', $lte: '2026-11-30' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(send).mockImplementation(async (name, arg) => {
    if (
      name !== 'make-filters-from-conditions' ||
      !arg ||
      typeof arg !== 'object' ||
      !('conditions' in arg)
    ) {
      throw new Error(`Unexpected request ${name}`);
    }
    if (!Array.isArray(arg.conditions)) throw new Error('Expected conditions');
    return {
      filters: arg.conditions.map((condition: RuleConditionEntity) => {
        if (condition.field !== 'date') return categoryExpression;
        const { start, end } = describeDateFilters([condition]) ?? {};
        return { date: { $gte: start, $lte: end } };
      }),
    };
  });
});

test('keeps the date available for saving without showing it as a filter chip', () => {
  render(
    <TestProviders>
      <FiltersStack
        conditions={[category, november]}
        conditionsOp="and"
        onUpdateFilter={vi.fn()}
        onDeleteFilter={vi.fn()}
        onClearFilters={vi.fn()}
        onReloadSavedFilter={vi.fn()}
        savedFilters={[]}
        onConditionsOpChange={vi.fn()}
        visibleConditions={[category]}
        rightActions={<button type="button">Schedule from this filter</button>}
      />
    </TestProviders>,
  );

  expect(screen.queryByText('11/2026')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Schedule from this filter' }),
  ).toBeVisible();
});

test('steps through neighboring months and narrows the table query', async () => {
  const onChange = vi.fn<(conditions: AccountFilter[]) => void>();

  function Range() {
    const [conditions, setConditions] = useState<AccountFilter[]>([
      category,
      november,
    ]);
    return (
      <AccountDateRange
        conditions={conditions}
        chartQuery={null}
        onChange={dates => {
          const next = [
            ...conditions.filter(condition => !isDateFilter(condition)),
            ...dates,
          ];
          setConditions(next);
          onChange(next);
        }}
      />
    );
  }

  render(
    <TestProviders>
      <Range />
    </TestProviders>,
  );
  expect(
    screen.getByRole('button', { name: 'November 2026' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(
    screen.getByRole('button', { name: 'October 2026' }),
  ).toBeInTheDocument();
  const { dated } = await accountDateQueries(
    root,
    [category],
    'and',
    onChange.mock.calls[0][0].filter(isDateFilter),
  );
  expect(dated.serialize().filterExpressions).toEqual([
    { $and: [categoryExpression] },
    { $and: [{ date: { $gte: '2026-10-01', $lte: '2026-10-31' } }] },
  ]);

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(
    screen.getByRole('button', { name: 'November 2026' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All dates' }));
  expect(onChange).toHaveBeenLastCalledWith([category]);
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(onChange).toHaveBeenLastCalledWith([
    category,
    monthFilter(currentMonth()),
  ]);
  expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
});

test('charts counts for other matching months and shift-clicks a span', async () => {
  const { dateFree, dated } = await accountDateQueries(
    root,
    [category],
    'and',
    [november],
  );
  expect(dated.serialize().filterExpressions).toContainEqual({
    $and: [novemberExpression],
  });
  vi.mocked(useQuery).mockReturnValue({
    isLoading: false,
    data: [
      {
        id: 'september',
        date: '2026-09-01',
        amount: -8000,
        subtransactions: [
          { id: 'payment', amount: -10000 },
          { id: 'deposit', amount: 2000 },
        ],
      },
      { id: 'november', date: '2026-11-01', amount: -100 },
      { id: 'november', date: '2026-11-01', amount: -100 },
      { id: 'november-2', date: '2026-11-02', amount: 300 },
    ],
  });
  const onChange = vi.fn();

  render(
    <TestProviders>
      <AccountDateRange
        conditions={[category, november]}
        chartQuery={dateFree}
        onChange={onChange}
      />
    </TestProviders>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'November 2026' }));
  const september = await screen.findByRole('button', {
    name: 'September 2026: 1 transaction',
  });
  const dialog = screen.getByRole('dialog', { name: 'Transaction date range' });
  expect(dialog.closest('[data-popover]')).toHaveAttribute(
    'data-placement',
    'bottom',
  );
  expect(screen.getByLabelText('Start date').className).toMatch(/css-/);
  expect(screen.getByLabelText('End date')).toHaveValue('2026-11-30');
  const october = screen.getByRole('button', {
    name: 'October 2026: 0 transactions',
  });
  expect(october.querySelector('[aria-hidden]')).toBeEmptyDOMElement();
  const user = userEvent.setup();
  await user.hover(september);
  expect(screen.getByRole('tooltip')).toHaveTextContent(
    '1 transaction · Net -80.00',
  );
  const [makeQuery] = vi.mocked(useQuery).mock.calls[0];
  const query = makeQuery()?.serialize();
  expect(query?.filterExpressions).toEqual([{ $and: [categoryExpression] }]);
  expect(query?.tableOptions.splits).toBe('grouped');
  expect(query?.limit).toBeNull();
  const novemberBar = screen.getByRole('button', {
    name: 'November 2026: 2 transactions',
  });
  await user.hover(novemberBar);
  expect(screen.getByRole('tooltip')).toHaveTextContent(
    '2 transactions · Net 2.00',
  );
  fireEvent.click(september);
  expect(onChange).toHaveBeenLastCalledWith([monthFilter('2026-09')]);

  fireEvent.click(novemberBar, { shiftKey: true });
  expect(onChange).toHaveBeenCalledWith([
    { field: 'date', op: 'gte', value: '2026-09-01' },
    { field: 'date', op: 'lte', value: '2026-11-30' },
  ]);
  await user.pointer([
    { target: novemberBar, keys: '[MouseLeft>]' },
    { target: october },
    { target: october, keys: '[/MouseLeft]' },
  ]);
  expect(onChange).toHaveBeenLastCalledWith([
    { field: 'date', op: 'gte', value: '2026-10-01' },
    { field: 'date', op: 'lte', value: '2026-11-30' },
  ]);
});

test('accepts saved year and between date conditions', async () => {
  const year = {
    field: 'date',
    op: 'is',
    value: '2026',
    options: { year: true },
  } satisfies RuleConditionEntity;
  const between = {
    field: 'date',
    op: 'isbetween',
    value: { num1: 20261005, num2: 20261120 },
  } satisfies RuleConditionEntity;

  expect(describeDateFilters([year])).toEqual({
    start: '2026-01-01',
    end: '2026-12-31',
  });
  expect(describeDateFilters([between])).toEqual({
    start: '2026-10-05',
    end: '2026-11-20',
  });
  const { dated } = await accountDateQueries(root, [category], 'and', [
    between,
  ]);
  expect(dated.serialize().filterExpressions).toEqual([
    { $and: [categoryExpression] },
    { $and: [{ date: { $gte: '2026-10-05', $lte: '2026-11-20' } }] },
  ]);
});

test('keeps the saved Any expression and ANDs a new range on top', async () => {
  const { filterConditions, rangeConditions } = splitAccountFilters(
    [category, november],
    'or',
  );
  expect(rangeConditions).toEqual([]);
  const loaded = await accountDateQueries(
    root,
    filterConditions,
    'or',
    rangeConditions,
  );
  expect(loaded.dated.serialize().filterExpressions).toEqual([
    { $or: [categoryExpression, novemberExpression] },
  ]);

  // Exercise both saved branches against transactions that each match only one.
  const predicates = loaded.dated.serialize().filterExpressions[0].$or;
  const transactions = [
    { category: 'childcare', date: '2026-10-10' },
    { category: 'groceries', date: '2026-11-12' },
    { category: 'groceries', date: '2026-10-10' },
  ];
  expect(
    transactions.filter(
      transaction =>
        Array.isArray(predicates) &&
        predicates.some(predicate =>
          'category' in predicate
            ? transaction.category === predicate.category
            : transaction.date >= predicate.date.$gte &&
              transaction.date <= predicate.date.$lte,
        ),
    ),
  ).toEqual(transactions.slice(0, 2));

  const narrowed = await accountDateQueries(root, filterConditions, 'or', [
    november,
  ]);
  expect(narrowed.dated.serialize().filterExpressions).toEqual([
    { $or: [categoryExpression, novemberExpression] },
    { $and: [novemberExpression] },
  ]);

  const october = { ...november, value: '2026-10' };
  const alternatives = await accountDateQueries(
    root,
    [october, november],
    'or',
    [],
  );
  expect(alternatives.dated.serialize().filterExpressions).toEqual([
    {
      $or: [
        { date: { $gte: '2026-10-01', $lte: '2026-10-31' } },
        novemberExpression,
      ],
    },
  ]);
});

test('defaults only plain register entries to the current month', () => {
  expect(initialAccountFilters(undefined, [], false).rangeConditions).toEqual([
    monthFilter(currentMonth()),
  ]);
  expect(initialAccountFilters('checking', [], false).rangeConditions).toEqual([
    monthFilter(currentMonth()),
  ]);
  for (const accountId of [
    'onbudget',
    'offbudget',
    'closed',
    'uncategorized',
  ]) {
    expect(initialAccountFilters(accountId, [], false).rangeConditions).toEqual(
      [],
    );
  }
  expect(initialAccountFilters(undefined, [category], true)).toEqual({
    filterConditions: [category],
    rangeConditions: [],
  });
  expect(initialAccountFilters(undefined, [category, november], true)).toEqual({
    filterConditions: [category],
    rangeConditions: [november],
  });
});
