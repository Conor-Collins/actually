import { q } from '@actual-app/core/shared/query';
import { act, render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';
import { aqlQuery } from '#queries/aqlQuery';

import type { TransactionTableColumnId } from './table/columns';
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
  const footer = screen.getByRole('group', {
    name: 'Sum of shown posted transactions',
  });
  expectResponsiveRules(footer.className, 460, 650, '-2/-1');
  expect(depositCell.parentElement).toHaveStyle({
    gridRow: 'var(--totals-amount-row, 2)',
    gridColumn: '2',
  });
  expect(paymentCell.parentElement).toHaveStyle({
    gridRow: 'var(--totals-amount-row, 2)',
    gridColumn: '4',
  });
  expect(footer.querySelector('[data-totals-grid]')).toHaveStyle({
    whiteSpace: 'nowrap',
  });
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

test('keeps container-query rules available before the pane is measured', () => {
  render(
    <TestProviders>
      <div style={{ width: 539 }}>
        <TransactionTotalsRow
          columns={['date', 'payee', 'payment', 'deposit']}
          amountColumnWidths={{ amount: 100, balance: 103 }}
          scrollWidth={0}
          totals={{ payment: 100, deposit: 200 }}
        />
      </div>
    </TestProviders>,
  );
  const footer = screen.getByRole('group', {
    name: 'Sum of shown posted transactions',
  });
  const summary = screen
    .getByLabelText('Net total')
    .closest('[data-totals-summary]');
  expect(summary).toHaveStyle({
    gridRow: '1',
    gridColumn: 'var(--totals-summary-column, 1 / -1)',
  });
  for (const label of ['Total payments', 'Total deposits']) {
    expect(screen.getByLabelText(label).parentElement).toHaveStyle({
      gridRow: 'var(--totals-amount-row, 2)',
    });
  }
  expect(summary?.querySelector('[data-totals-label]')).toHaveTextContent(
    'Sum of shown posted transactions',
  );
  expectResponsiveRules(footer.className, 350, 540, '2/4');
});

function expectResponsiveRules(
  className: string,
  compact: number,
  full: number,
  column: string,
) {
  const rules = Array.from(document.styleSheets)
    .flatMap(sheet => Array.from(sheet.cssRules, rule => rule.cssText))
    .join('')
    .replaceAll(/\s/g, '');
  const placement = `.${className}>[data-totals-grid]>[data-totals-summary]{--totals-summary-column:${column};}.${className}>[data-totals-grid]>[data-totals-amount]{--totals-amount-row:1;}`;
  expect(rules).toContain(`.${className}[data-totals-label]{display:none;}`);
  expect(rules).toContain(`@container(min-width:${compact}px){${placement}}`);
  expect(rules).toContain(
    `@container(min-width:${full}px){${placement}.${className}[data-totals-label]{display:inline;}}`,
  );
}

test.each([
  {
    columns: ['date', 'payee', 'payment', 'deposit'],
    scrollWidth: 0,
    compact: 350,
    full: 540,
    column: '2 / 4',
  },
  {
    columns: ['date', 'payee', 'payment', 'deposit'],
    scrollWidth: 15,
    compact: 350,
    full: 540,
    column: '2 / 4',
  },
  {
    columns: ['deposit', 'date', 'payment'],
    scrollWidth: 0,
    compact: 460,
    full: 650,
    column: '-2 / -1',
  },
] satisfies {
  columns: TransactionTableColumnId[];
  scrollWidth: number;
  compact: number;
  full: number;
  column: string;
}[])(
  'renders breakpoint styles for $columns with $scrollWidth px of scrollbar width',
  ({ columns, scrollWidth, compact, full, column }) => {
    const observer = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    const resizeObserver = vi.fn(function (_callback: ResizeObserverCallback) {
      return observer;
    });
    vi.stubGlobal('ResizeObserver', resizeObserver);
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    const measure = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.firstElementChild?.hasAttribute('data-totals-grid')) {
          return new DOMRect(0, 0, compact - 1, 36);
        }
        return originalRect.call(this);
      });

    try {
      const { unmount } = render(
        <TestProviders>
          <TransactionTotalsRow
            columns={columns}
            amountColumnWidths={{ amount: 100, balance: 103 }}
            scrollWidth={scrollWidth}
            totals={{ payment: 100, deposit: 200 }}
          />
        </TestProviders>,
      );
      const footer = screen.getByRole('group', {
        name: 'Sum of shown posted transactions',
      });
      const grid = footer.querySelector('[data-totals-grid]');
      const summary = grid?.querySelector('[data-totals-summary]');
      const label = summary?.querySelector('[data-totals-label]');
      const amounts = grid?.querySelectorAll('[data-totals-amount]');
      expect(footer.style.paddingLeft).toBe('');
      expect(footer.style.paddingRight).toBe('');
      expect(grid).toHaveStyle({ paddingRight: `${5 + scrollWidth}px` });
      expect(observer.observe).toHaveBeenCalledWith(footer);
      expect(amounts).toHaveLength(2);

      function expectLayout(
        summaryColumn: string,
        amountRow: string,
        showLabel: boolean,
      ) {
        expect(summary).toHaveStyle({
          gridColumn: summaryColumn,
          gridRow: '1',
        });
        amounts?.forEach(amount =>
          expect(amount).toHaveStyle({ gridRow: amountRow }),
        );
        if (showLabel) {
          expect(label).toBeVisible();
        } else {
          expect(label).not.toBeVisible();
        }
      }

      expectLayout('1 / -1', '2', false);
      const [callback] = resizeObserver.mock.calls[0];
      for (const width of [compact, full - 1, full]) {
        act(() => {
          callback(
            [
              {
                target: footer,
                borderBoxSize:
                  width === compact
                    ? [{ inlineSize: width, blockSize: 36 }]
                    : [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
                contentRect: new DOMRect(
                  0,
                  0,
                  width === compact ? 0 : width,
                  36,
                ),
              },
            ],
            observer,
          );
        });
        expectLayout(column, '1', width === full);
      }
      unmount();
      expect(observer.disconnect).toHaveBeenCalledOnce();
    } finally {
      measure.mockRestore();
      vi.unstubAllGlobals();
    }
  },
);
