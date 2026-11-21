import { useRef } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import type { AccountEntity } from '@actual-app/core/types/models';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import type * as AppSlice from '#app/appSlice';
import { FinancesApp } from '#components/FinancesApp';
import type * as ServerContext from '#components/ServerContext';
import { ScrollProvider } from '#hooks/useScrollListener';
import { createTestQueryClient, TestProviders } from '#mocks';

import { MobileNavTabs } from './MobileNavTabs';

vi.mock('#hooks/useAutomaticBankSync', () => ({
  useAutomaticBankSync: vi.fn(),
}));
vi.mock('#hooks/useNewsNotification', () => ({ useNewsNotification: vi.fn() }));
vi.mock('#components/ServerContext', async importOriginal => ({
  ...(await importOriginal<typeof ServerContext>()),
  useMultiuserEnabled: () => false,
}));
vi.mock('#app/appSlice', async importOriginal => ({
  ...(await importOriginal<typeof AppSlice>()),
  sync: () => ({ type: 'test/sync' }),
  getLatestAppVersion: () => ({ type: 'test/getLatestAppVersion' }),
}));
vi.mock('#components/CommandBar', () => ({ CommandBar: () => null }));
vi.mock('#components/GlobalKeys', () => ({ GlobalKeys: () => null }));
vi.mock('../sidebar/index', () => ({ FloatableSidebar: () => null }));
vi.mock('#components/Titlebar', () => ({ Titlebar: () => null }));
vi.mock('#components/tour/TourAutoOffer', () => ({
  TourAutoOffer: () => null,
}));
vi.mock('#components/tour/Tour', () => ({ Tour: () => null }));
vi.mock('#components/BankSyncStatus', () => ({ BankSyncStatus: () => null }));
vi.mock('#components/Notifications', () => ({ Notifications: () => null }));
vi.mock('../settings/index', () => ({
  Settings: () => null,
  SettingsIndex: () => null,
  GeneralSettings: () => null,
  AdvancedSettings: () => null,
  ExperimentalSettings: () => null,
}));
vi.mock('#components/mobile/transactions/TransactionEdit', () => ({
  TransactionEdit: () => null,
}));
vi.mock('#components/mobile/accounts/AccountTransactions', () => ({
  AccountTransactions: () => null,
}));
vi.mock('#components/mobile/accounts/AllAccountTransactions', () => ({
  AllAccountTransactions: () => null,
}));
vi.mock('../responsive/narrow', async () => ({
  Account: (await import('#components/mobile/accounts/AccountPage'))
    .AccountPage,
  Budget: () => null,
}));

const destinations = [
  ['Accounts', '/accounts'],
  ['Transactions', '/accounts/all'],
  ['Budget', '/budget'],
  ['Schedules', '/schedules'],
  ['Reports', '/reports'],
];

function TestLayout() {
  const scrollableRef = useRef<HTMLDivElement>(null);
  return (
    <ScrollProvider scrollableRef={scrollableRef} delayMs={0}>
      <div ref={scrollableRef} data-testid="page-content" />
      <MobileNavTabs />
    </ScrollProvider>
  );
}

function renderNavigation(initialPath: string) {
  const router = createMemoryRouter([{ path: '*', element: <TestLayout /> }], {
    initialEntries: [initialPath],
  });

  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.stubGlobal('innerWidth', 375);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('shows exactly five destinations in order, with Budget in the center', () => {
  renderNavigation('/budget');

  const navigation = screen.getByRole('navigation');
  const links = within(navigation).getAllByRole('link');
  expect(
    links.map(link => [link.textContent, link.getAttribute('href')]),
  ).toEqual(destinations);
  expect(navigation).toHaveStyle({ flexDirection: 'row', flexWrap: 'nowrap' });
});

test.each([
  ['/accounts', 'Accounts'],
  ['/accounts/acc-1', 'Accounts'],
  ['/accounts/all', 'Transactions'],
  ['/budget', 'Budget'],
  ['/categories/cat-1', 'Budget'],
  ['/schedules/sched-1', 'Schedules'],
  ['/reports/dashboard-1', 'Reports'],
])('highlights only the matching tab at %s', (path, name) => {
  renderNavigation(path);

  expect(
    within(screen.getByRole('navigation')).getAllByRole('link', {
      current: 'page',
    }),
  ).toEqual([screen.getByRole('link', { name })]);
});

test('keeps the same navigation mounted across sub-routes and scrolling', async () => {
  const router = renderNavigation('/budget');
  const navigation = screen.getByRole('navigation');
  const content = screen.getByTestId('page-content');

  for (const path of [
    '/accounts/acc-1',
    '/categories/cat-1',
    '/transactions/tx-1',
    '/schedules/sched-1',
    '/settings/general',
    '/payees',
    '/rules',
    '/bank-sync',
    '/notifications',
  ]) {
    await act(() => router.navigate(path));
    expect(screen.getByRole('navigation')).toBe(navigation);
  }

  await act(async () => {
    fireEvent.scroll(content, { target: { scrollTop: 40 } });
    await new Promise(resolve => setTimeout(resolve, 0));
    fireEvent.scroll(content, { target: { scrollTop: 100 } });
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(navigation).toBeVisible();
  expect(navigation).toHaveAttribute('data-navbar-state', 'default');
});

async function renderFinancesApp(initialPath: string) {
  // Load the lazy route module before asserting against its rendered header.
  await import('../responsive/narrow');
  const queryClient = createTestQueryClient();
  const { queryKey } = accountQueries.list();
  queryClient.setQueryDefaults(queryKey, { staleTime: Infinity });
  queryClient.setQueryData<AccountEntity[]>(queryKey, [
    {
      id: 'acc-1',
      name: 'Checking',
      offbudget: 0,
      closed: 0,
      sort_order: 0,
      last_reconciled: null,
      tombstone: 0,
      account_group_id: null,
      account_id: null,
      bank: null,
      bankName: null,
      bankId: null,
      mask: null,
      official_name: null,
      balance_current: null,
      balance_available: null,
      balance_limit: null,
      account_sync_source: null,
      last_sync: null,
      bank_sync_status: null,
    },
  ]);
  vi.stubGlobal('Actual', {
    ...global.Actual,
    waitForUpdateReadyForDownload: () => new Promise(vi.fn()),
  });

  const router = createMemoryRouter([{ path: '*', element: <FinancesApp /> }], {
    initialEntries: [initialPath],
  });
  render(
    <TestProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return router;
}

test.each(['/accounts/acc-1', '/accounts/all', '/transactions/new'])(
  'FinancesApp keeps the same mobile navigation mounted at %s',
  async path => {
    const router = await renderFinancesApp('/budget');
    const navigation = screen.getByRole('navigation', {
      name: 'Main navigation',
    });

    await act(() => router.navigate(path));
    expect(router.state.location.pathname).toBe(path);
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBe(
      navigation,
    );
  },
);

test('the real account headers expose Settings, Back, and Add transaction on the appropriate routes', async () => {
  const router = await renderFinancesApp('/accounts/acc-1');
  const user = userEvent.setup();
  const navigation = screen.getByRole('navigation', {
    name: 'Main navigation',
  });

  expect(
    await screen.findByRole('heading', { name: 'Checking' }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Back' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Add transaction' })).toBeVisible();

  await user.click(
    within(navigation).getByRole('link', { name: 'Transactions' }),
  );
  expect(router.state.location.pathname).toBe('/accounts/all');
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  expect(router.state.location.pathname).toBe('/settings');

  await user.click(
    within(navigation).getByRole('link', { name: 'Transactions' }),
  );
  expect(router.state.location.pathname).toBe('/accounts/all');
  await user.click(
    await screen.findByRole('button', { name: 'Add transaction' }),
  );
  expect(router.state.location.pathname).toBe('/transactions/new');
});

test('omits the mobile bar at desktop widths', () => {
  vi.stubGlobal('innerWidth', 1100);
  renderNavigation('/budget');
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
