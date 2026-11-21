import { send } from '@actual-app/core/platform/client/connection';
import type * as Connection from '@actual-app/core/platform/client/connection';
import { act, render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { ScheduleEditForm } from './ScheduleEditForm';

vi.mock(
  '@actual-app/core/platform/client/connection',
  async importOriginal => ({
    ...(await importOriginal<typeof Connection>()),
    send: vi.fn(),
  }),
);

it('associates the schedule field labels with the autocomplete inputs', async () => {
  vi.mocked(send).mockResolvedValue({ data: [] });
  await act(async () => {
    render(
      <TestProviders>
        <ScheduleEditForm
          fields={{
            payees: [],
            category: '',
            account: null,
            name: '',
            amount: 0,
            amountOp: 'isapprox',
            date: null,
            posts_transaction: false,
            custom_upcoming_length: null,
          }}
          dispatch={vi.fn()}
          upcomingDates={null}
          repeats={false}
          schedule={{}}
          adding
          isCustom={false}
          onEditRule={vi.fn()}
          transactions={[]}
          transactionsMode="matched"
          error={null}
          selectedInst={{ items: new Set(), dispatch: vi.fn() }}
          onSwitchTransactions={vi.fn()}
          onLinkTransactions={vi.fn()}
          onUnlinkTransactions={vi.fn()}
        />
      </TestProviders>,
    );
  });
  expect(
    screen.getByLabelText('Payees', { selector: 'input' }),
  ).toHaveAttribute('id', 'payee-field');
  expect(
    screen.getByLabelText('Category', { selector: 'input' }),
  ).toHaveAttribute('id', 'category-field');
  expect(
    screen.getByLabelText('Account', { selector: 'input' }),
  ).toHaveAttribute('id', 'account-field');
});
