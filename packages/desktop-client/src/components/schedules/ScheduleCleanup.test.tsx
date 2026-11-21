import { send, sendCatch } from '@actual-app/core/platform/client/connection';
import type * as Connection from '@actual-app/core/platform/client/connection';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';

import { ScheduleCleanup, ScheduleCleanupModal } from './ScheduleCleanup';
import { ScheduleEditModal } from './ScheduleEditModal';
import { SchedulesTable } from './SchedulesTable';

vi.mock('./ScheduleEditForm', () => ({ ScheduleEditForm: () => null }));

vi.mock(
  '@actual-app/core/platform/client/connection',
  async importOriginal => ({
    ...(await importOriginal<typeof Connection>()),
    send: vi.fn(),
    sendCatch: vi.fn(),
  }),
);

const emptyPlan = {
  category: 'Insurance',
  amounts: [],
  replacements: [],
  links: [],
  moves: [],
};

const plan = {
  ...emptyPlan,
  amounts: [
    { month: '2026-01', amount: 10000 },
    { month: '2026-02', amount: 10000 },
  ],
  links: [
    { id: 'one', date: '2026-01-15', account: 'card', amount: -104060 },
    { id: 'two', date: '2026-02-15', account: 'card', amount: 603 },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(send).mockImplementation(async name =>
    name === 'schedule/preview-cleanup' ? plan : { data: [] },
  );
});

it('discloses uniform amounts and shows only available actions with payment and deposit amounts', async () => {
  render(
    <TestProviders>
      <ScheduleCleanup
        request={{ id: 'schedule', year: '2026' }}
        close={vi.fn()}
      />
    </TestProviders>,
  );
  const clear = await screen.findByRole('checkbox', {
    name: /Clear 2 monthly/,
  });
  expect(clear.closest('label')).toHaveStyle({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  });
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);

  const disclosure = screen.getByRole('button', { name: /per month/ });
  expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  fireEvent.click(disclosure);
  expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  fireEvent.click(disclosure);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);

  expect(screen.getByText(/Payment/)).toBeInTheDocument();
  expect(screen.getByText(/Deposit/)).toBeInTheDocument();
  expect(screen.getByText('1040.60')).toBeInTheDocument();
  expect(screen.queryByText('-1040.60')).not.toBeInTheDocument();
  expect(sendCatch).not.toHaveBeenCalled();
});

it('applies only after confirmation and reloads a stale plan with its actions unchecked', async () => {
  vi.mocked(sendCatch).mockResolvedValue({
    data: { changed: true },
    error: undefined,
  });
  const close = vi.fn();
  render(
    <TestProviders>
      <ScheduleCleanup
        request={{ id: 'schedule', year: '2026' }}
        close={close}
      />
    </TestProviders>,
  );

  expect(
    await screen.findByRole('checkbox', { name: /Link 2 transactions/ }),
  ).toBeChecked();
  expect(sendCatch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply cleanup' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /Review the updated cleanup options/,
  );
  expect(sendCatch).toHaveBeenCalledWith('schedule/apply-cleanup', {
    request: { id: 'schedule', year: '2026' },
    plan,
    actions: ['links'],
  });
  expect(
    screen.getByRole('checkbox', { name: /Link 2 transactions/ }),
  ).not.toBeChecked();
  expect(close).not.toHaveBeenCalled();
});

it('reopens with no selections and discovers transactions again when the year changes', async () => {
  vi.mocked(send).mockImplementation(async (name, args) =>
    name === 'schedule/preview-cleanup'
      ? args && 'year' in args && args.year === '2026'
        ? plan
        : emptyPlan
      : { data: [] },
  );
  render(
    <TestProviders>
      <ScheduleCleanupModal id="schedule" year="2026" isReopened />
    </TestProviders>,
  );

  expect(
    await screen.findByRole('checkbox', { name: /Link 2 transactions/ }),
  ).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
  expect(
    await screen.findByText('Nothing left to clean up for 2027.'),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith('schedule/preview-cleanup', {
      id: 'schedule',
      year: '2027',
    }),
  );
  expect(
    screen.queryByRole('button', { name: 'Apply cleanup' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
});

const schedule = {
  id: 'insurance',
  name: 'Insurance',
  rule: 'rule',
  next_date: '2026-03-10',
  completed: false,
  posts_transaction: false,
  tombstone: false,
  _payee: 'payee',
  _account: 'card',
  _amount: -100,
  _amountOp: 'is',
  _date: '2026-03-10',
  _conditions: [{ field: 'category', op: 'is', value: 'insurance' }],
  _actions: [],
} satisfies ScheduleEntity;

it('offers cleanup in the eligible schedule row menu', async () => {
  const store = createTestAppStore();
  const onAction = vi.fn();
  render(
    <TestProviders store={store}>
      <SchedulesTable
        schedules={[schedule]}
        statuses={new Map([['insurance', 'scheduled']])}
        filter=""
        allowCompleted
        onSelect={vi.fn()}
        onAction={onAction}
        style={{ height: 200 }}
      />
    </TestProviders>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
  const cleanup = store
    .getState()
    .contextMenu.items.find(
      item => typeof item === 'object' && item.name === 'cleanup',
    );
  if (typeof cleanup !== 'object') {
    throw new Error('Expected a cleanup menu item');
  }
  cleanup.onClick?.();
  expect(onAction).toHaveBeenCalledWith('cleanup', schedule.id);
});

it('opens cleanup from the edit modal footer', async () => {
  const store = createTestAppStore();
  vi.mocked(send).mockImplementation(async (name, args) =>
    name === 'query' && args && 'table' in args && args.table === 'schedules'
      ? { data: [schedule] }
      : { data: [] },
  );
  render(
    <TestProviders store={store}>
      <ScheduleEditModal id={schedule.id} />
    </TestProviders>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Clean up…' }));
  expect(store.getState().modals.modalStack).toEqual([
    expect.objectContaining({
      name: 'schedule-cleanup',
      options: { id: schedule.id, isReopened: true },
    }),
  ]);
});
