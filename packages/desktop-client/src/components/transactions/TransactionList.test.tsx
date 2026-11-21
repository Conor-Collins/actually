import { useRef, useState } from 'react';
import { MemoryRouter } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type * as Connection from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { ObjectExpression } from '@actual-app/core/shared/query';
import { integerToCurrency } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { useTransactionBatchActions } from '#hooks/useTransactionBatchActions';
import { createTestAppStore, TestProviders } from '#mocks';

import { TransactionList } from './TransactionList';
import type { TransactionTableProps } from './TransactionsTable';
import {
  getTransactionTotals,
  TransactionTotalsRow,
  updateTransactionTotals,
} from './TransactionTotals';

vi.mock(
  '@actual-app/core/platform/client/connection',
  async importOriginal => ({
    ...(await importOriginal<typeof Connection>()),
    send: vi.fn(),
  }),
);

vi.mock('#hooks/useSyncedPref', () => ({ useSyncedPref: () => [] }));

vi.mock('./TransactionsTable', () => ({
  TransactionTable: ({
    transactions,
    totals,
    onSave,
    onAdd,
    onBatchDelete,
  }: TransactionTableProps) => (
    <>
      {transactions.map(transaction => (
        <output key={transaction.id} aria-label={transaction.id}>
          {integerToCurrency(Math.abs(transaction.amount))}
        </output>
      ))}
      <button onClick={() => onSave({ ...payment, amount: -10000 })}>
        Edit payment
      </button>
      <button onClick={() => onAdd([addition])}>Add payment</button>
      <button onClick={() => onBatchDelete([payment.id])}>
        Delete payment
      </button>
      {totals && (
        <TransactionTotalsRow
          columns={['date', 'payment', 'deposit']}
          amountColumnWidths={{ amount: 100, balance: 103 }}
          scrollWidth={0}
          totals={totals}
        />
      )}
    </>
  ),
}));

const payment: TransactionEntity = {
  id: 'original-payment',
  account: 'checking',
  amount: -8000,
  date: '2026-11-04',
};
const addition: TransactionEntity = {
  ...payment,
  id: 'added-payment',
  amount: -2500,
};
const registerQuery = q('transactions')
  .options({ splits: 'grouped' })
  .filter({ date: { $gte: '2026-11-01', $lte: '2026-11-30' } });

test('refreshes posted totals after editing, adding, and deleting a payment', async () => {
  let posted = [payment];
  let finishEdit: () => void = () => {
    throw new Error('Edit save has not started');
  };
  const editSaved = new Promise<void>(resolve => {
    finishEdit = resolve;
  });
  vi.mocked(send).mockImplementation(async (name, payload) => {
    if (
      name === 'query' &&
      payload &&
      typeof payload === 'object' &&
      'filterExpressions' in payload
    ) {
      const data = payload.filterExpressions.some(
        (filter: ObjectExpression) => filter.reconciled === true,
      )
        ? []
        : posted;
      return { data, dependencies: ['transactions'] };
    }
    if (
      name !== 'transactions-batch-update' ||
      !payload ||
      typeof payload !== 'object'
    ) {
      throw new Error(`Unexpected request ${name}`);
    }
    if (
      'updated' in payload &&
      Array.isArray(payload.updated) &&
      payload.updated.length
    ) {
      await editSaved;
      posted = [{ ...payment, amount: -10000 }];
    }
    if (
      'added' in payload &&
      Array.isArray(payload.added) &&
      payload.added.length
    ) {
      posted = [...posted, addition];
    }
    if (
      'deleted' in payload &&
      Array.isArray(payload.deleted) &&
      payload.deleted.length
    ) {
      posted = posted.filter(row => row.id !== payment.id);
    }
    return { updated: [] };
  });

  const unused = vi.fn();

  function Register() {
    const tableRef = useRef(null);
    const [transactions, setTransactions] = useState([payment]);
    const [totals, setTotals] = useState({ payment: 8000, deposit: 0 });
    const { onBatchDelete } = useTransactionBatchActions();
    const refresh = async () => {
      setTransactions(posted);
      setTotals(await getTransactionTotals(registerQuery));
    };
    return (
      <TransactionList
        tableRef={tableRef}
        transactions={transactions}
        allTransactions={transactions}
        totals={totals}
        account={undefined}
        category={undefined}
        accounts={[]}
        categoryGroups={[]}
        payees={[]}
        balances={null}
        showBalances={false}
        showCleared={false}
        showReconciled
        showSelection
        showAccount
        hideFraction={false}
        isAdding={false}
        isNew={() => false}
        isMatched={() => false}
        dateFormat="MM/dd/yyyy"
        renderEmpty={null}
        sortField="date"
        ascDesc="desc"
        loadMoreTransactions={unused}
        onSort={unused}
        onChange={(_, rows) => {
          setTotals(current =>
            updateTransactionTotals(current, transactions, rows),
          );
          setTransactions(rows);
        }}
        onRefetch={refresh}
        onApplyFilter={unused}
        onBatchDelete={ids => void onBatchDelete({ ids, onSuccess: refresh })}
        onBatchDuplicate={unused}
        onBatchLinkSchedule={unused}
        onBatchUnlinkSchedule={unused}
        onCreateRule={unused}
        onScheduleAction={unused}
        onMakeAsNonSplitTransactions={unused}
        onCloseAddTransaction={unused}
        onCreatePayee={async () => null}
      />
    );
  }

  const store = createTestAppStore();
  render(
    <TestProviders store={store}>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </TestProviders>,
  );
  const total = () => screen.getByLabelText('Total payments').textContent;
  expect(total()).toBe('80.00');

  fireEvent.click(screen.getByRole('button', { name: 'Edit payment' }));
  expect(screen.getByLabelText(payment.id).textContent).toBe('100.00');
  expect(total()).toBe('100.00');
  expect(screen.getByLabelText('Net total')).toHaveTextContent('-100.00');
  await act(async () => finishEdit());
  await waitFor(() => expect(total()).toBe('100.00'));
  expect(screen.getByLabelText(payment.id).textContent).toBe('100.00');

  fireEvent.click(screen.getByRole('button', { name: 'Add payment' }));
  await waitFor(() => expect(total()).toBe('125.00'));
  expect(screen.getByLabelText(addition.id).textContent).toBe('25.00');

  fireEvent.click(screen.getByRole('button', { name: 'Delete payment' }));
  const modal = await waitFor(() => {
    const current = store.getState().modals.modalStack.at(-1);
    if (current?.name !== 'confirm-delete') {
      throw new Error('Expected deletion confirmation');
    }
    return current;
  });
  await act(async () => modal.options.onConfirm());
  await waitFor(() => expect(total()).toBe('25.00'));
  expect(screen.queryByLabelText(payment.id)).toBeNull();
});
