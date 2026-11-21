import { useRef } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MobilePageHeader } from '#components/Page';
import { ScrollProvider } from '#hooks/useScrollListener';

import { MobileNavTabs } from './MobileNavTabs';
import { MobileSettingsButton } from './MobileSettingsButton';
import { AddTransactionButton } from './transactions/AddTransactionButton';

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
      <div ref={scrollableRef} data-testid="page-content">
        <Outlet />
      </div>
      <MobileNavTabs />
    </ScrollProvider>
  );
}

function renderNavigation(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        element: <TestLayout />,
        children: [
          {
            path: '/accounts/all',
            element: (
              <MobilePageHeader
                title="Transactions"
                leftContent={<MobileSettingsButton />}
                rightContent={<AddTransactionButton />}
              />
            ),
          },
          { path: '*', element: <div /> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

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

test('top header opens Settings and Transactions retains Add transaction', async () => {
  const router = renderNavigation('/accounts/all');
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: 'Settings' }));
  expect(router.state.location.pathname).toBe('/settings');

  await user.click(screen.getByRole('link', { name: 'Transactions' }));
  await user.click(screen.getByRole('button', { name: 'Add transaction' }));
  expect(router.state.location.pathname).toBe('/transactions/new');
});

test('omits the mobile bar at desktop widths', () => {
  vi.stubGlobal('innerWidth', 1100);
  renderNavigation('/budget');
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
