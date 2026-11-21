import { q } from '@actual-app/core/shared/query';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';
import { aqlQuery } from '#queries/aqlQuery';

import {
  getTransactionTotals,
  TransactionTotalsRow,
} from './TransactionTotals';

vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));

test('puts filtered payment and deposit sums in visible column order', async () => {
  vi.mocked(aqlQuery).mockResolvedValueOnce({
    data: [
      { id: 'payment', amount: -2450 },
      { id: 'deposit', amount: 10000 },
    ],
    dependencies: [],
  });

  const shown = {
    date: { $gte: '2026-11-01', $lte: '2026-11-30' },
    category: 'childcare',
  };
  const totals = await getTransactionTotals(
    q('transactions').options({ splits: 'grouped' }).filter(shown),
  );
  const [query] = vi.mocked(aqlQuery).mock.lastCall ?? [];
  expect(query?.serialize().filterExpressions).toEqual([shown]);
  expect(query?.serialize().limit).toBeNull();

  render(
    <TestProviders>
      <TransactionTotalsRow
        columns={['deposit', 'date', 'payment']}
        amountColumnWidths={{ amount: 100, balance: 103 }}
        scrollWidth={0}
        totals={totals}
      />
    </TestProviders>,
  );

  expect(
    screen.getByRole('group', { name: 'Sum of shown posted transactions' }),
  ).toBeInTheDocument();
  const depositCell = screen.getByLabelText('Total deposits');
  const paymentCell = screen.getByLabelText('Total payments');
  expect(depositCell.textContent).toBe('100.00');
  expect(paymentCell.textContent).toBe('24.50');
  const net = screen.getByLabelText('Net total');
  expect(net).toHaveTextContent('75.50');
  const summary = screen.getByText(
    'Sum of shown posted transactions',
  ).parentElement;
  expect(summary).toContainElement(net);
  expect(summary).toHaveStyle({
    gridColumn: 'var(--totals-summary-column, 1 / -1)',
    gridRow: '1',
  });
  expect(summary?.style.overflowX).toBe('');
  expect(depositCell.parentElement).toHaveStyle({
    gridRow: 'var(--totals-amount-row, 2)',
    gridColumn: '2',
  });
  expect(paymentCell.parentElement).toHaveStyle({
    gridRow: 'var(--totals-amount-row, 2)',
    gridColumn: '4',
  });
  expect(
    screen.getByRole('group', { name: 'Sum of shown posted transactions' }),
  ).toHaveStyle({ whiteSpace: 'nowrap' });
  expect(
    depositCell.compareDocumentPosition(paymentCell) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test('classifies a mixed-sign split by its net amount', async () => {
  vi.mocked(aqlQuery).mockImplementation(async query => {
    const state = query.serialize();
    const data = state.calculation
      ? state.filterExpressions.some(
          expression => JSON.stringify(expression.amount) === '{"$lt":0}',
        )
        ? -10000
        : 2000
      : [split];
    return { data, dependencies: [] };
  });
  expect(await getTransactionTotals(grouped)).toEqual({
    payment: 8000,
    deposit: 0,
  });
});

test('uses only the matching child when a category filter excludes its parent and sibling', async () => {
  vi.mocked(aqlQuery).mockResolvedValueOnce({
    data: [
      {
        ...split,
        _unmatched: true,
        subtransactions: [
          split.subtransactions[0],
          { ...split.subtransactions[1], _unmatched: true },
        ],
      },
    ],
    dependencies: [],
  });
  expect(
    await getTransactionTotals(grouped.filter({ category: 'childcare' })),
  ).toEqual({ payment: 10000, deposit: 0 });
});

const grouped = q('transactions').options({ splits: 'grouped' });
const split = {
  id: 'split',
  date: '2026-11-20',
  amount: -8000,
  subtransactions: [
    { id: 'payment', amount: -10000 },
    { id: 'deposit', amount: 2000 },
  ],
};
