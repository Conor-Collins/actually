import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import type { PeriodBudgetCalculation } from '@actual-app/core/server/period-budget/calculate';
import * as months from '@actual-app/core/shared/months';
import type { BudgetPeriod } from '@actual-app/core/shared/period-budget';
import { planCash } from '@actual-app/core/shared/period-charges';
import type { SetAsideRow } from '@actual-app/core/shared/period-loader';
import type { Handlers } from '@actual-app/core/types/handlers';
import type {
  CategoryGroupEntity,
  PayeeEntity,
  PeriodBudgetRows,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { onlineManager } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import { BudgetPeriodRow } from '#components/budget/BudgetPeriodRow';
import { MonthPicker } from '#components/budget/MonthPicker';
import { MonthsProvider } from '#components/budget/MonthsContext';
import { MobileBudgetPeriod } from '#components/mobile/budget/MobileBudgetPeriod';
import { SidebarMenuRoute } from '#components/sidebar/SidebarMenuRoute';
import { useAccounts } from '#hooks/useAccounts';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { payeeQueries } from '#payees';
import { periodBudgetQueries } from '#period-budget';
import {
  calculate,
  charge,
  NO_ROWS,
  period,
  stored,
} from '#period-budget/fixtures';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { BudgetCashStrip } from './BudgetCashStrip';
import { BudgetPeriodsProvider } from './BudgetPeriods';
import { BudgetPeriodTotals } from './BudgetPeriodTotals';
import { PeriodBudgetPage } from './PeriodBudgetPage';
import { clusterTimelineMarkers, TimelineMarkers } from './TimelineMarkers';

// The test setup loads the accounts and payees queries before the connection mock.
vi.hoisted(vi.resetModules);

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const responsive = vi.hoisted(() => ({ isNarrowWidth: false }));
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => responsive,
}));

type WriteResult = { id: string } | { error: string };

const WRITE_NAMES = [
  'period-budget/set-cadence',
  'period-budget/stop-cadence',
  'period-budget/create-period',
  'period-budget/update-period',
  'period-budget/delete-period',
  'period-budget/restore-period',
  'period-budget/carry',
  'period-budget/set-offset',
  'period-budget/clear-offset',
  'period-budget/link-schedule',
  'period-budget/unlink-schedule',
  'period-budget/set-charge-override',
  'period-budget/clear-charge-override',
] as const;

// The book: Food has a period for each month from the cadence (July only
// follows from it), Tax has one period for the year with a linked schedule,
// and Rent has nothing of the period budget yet.
const GROUPS: CategoryGroupEntity[] = [
  {
    id: 'usual',
    name: 'Usual expenses',
    categories: [
      { id: 'food', name: 'Food', group: 'usual' },
      { id: 'tax', name: 'Tax', group: 'usual' },
      { id: 'rent', name: 'Rent', group: 'usual' },
    ],
  },
  {
    id: 'income',
    name: 'Income',
    is_income: true,
    categories: [
      { id: 'salary', name: 'Salary', group: 'income', is_income: true },
    ],
  },
];

const PAYEES: PayeeEntity[] = [
  { id: 'grocer', name: 'Grocer' },
  { id: 'market', name: 'Market' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'tax-office', name: 'Tax office' },
  { id: 'landlord', name: 'Landlord' },
  { id: 'to-checking', name: '', transfer_acct: 'checking' },
];

const CHECKING = { ...generateAccount('Checking'), id: 'checking' };
// Not one of the accounts of the budget
const SAVINGS = { ...generateAccount('Savings', false, true), id: 'savings' };

const FOOD_FEBRUARY = period(
  'food-feb',
  'food',
  '2017-02-01',
  '2017-03-01',
  38000,
);
const FOOD_MARCH = period(
  'food-march',
  'food',
  '2017-03-01',
  '2017-04-01',
  40000,
);
const FOOD_MAY = period('food-may', 'food', '2017-05-01', '2017-06-01', 40000);
const FOOD_JUNE = period(
  'food-june',
  'food',
  '2017-06-01',
  '2017-07-01',
  40000,
  10000,
);
const FOOD_JULY = period(
  'food:2017-07-01',
  'food',
  '2017-07-01',
  '2017-08-01',
  40000,
);
// Stored, but set aside by the calculation because it overlaps May and June
const FOOD_OVERLAPPING = period(
  'food-bad',
  'food',
  '2017-05-15',
  '2017-06-15',
  1000,
);
const FOOD_AUGUST = period(
  'food:2017-08-01',
  'food',
  '2017-08-01',
  '2017-09-01',
  40000,
);
let taxCarryover = 0;
let includeShortfall = false;
const TAX_2017 = period('tax-2017', 'tax', '2017-01-01', '2018-01-01', 150000);
const RENT_JANUARY = period(
  'rent-january',
  'rent',
  '2017-01-01',
  '2017-02-01',
  80000,
);

type Payment = {
  id: string;
  category: string;
  date: string;
  amount: number;
  payee: string;
};

const PAYMENTS: Payment[] = [
  {
    id: 'p-tax',
    category: 'tax',
    date: '2017-03-20',
    amount: -30000,
    payee: 'tax-office',
  },
  // April has no period
  {
    id: 'p-april',
    category: 'food',
    date: '2017-04-12',
    amount: -5000,
    payee: 'bakery',
  },
  {
    id: 'p-may',
    category: 'food',
    date: '2017-05-10',
    amount: -25000,
    payee: 'grocer',
  },
  // Counted in June by the user's choice
  {
    id: 'p-early',
    category: 'food',
    date: '2017-05-30',
    amount: -3000,
    payee: 'market',
  },
  {
    id: 'p-rent',
    category: 'rent',
    date: '2017-06-01',
    amount: -90000,
    payee: 'landlord',
  },
  {
    id: 'p-june',
    category: 'food',
    date: '2017-06-05',
    amount: -12000,
    payee: 'grocer',
  },
];

const CHARGES = [
  charge('sched-tax', 'tax', '2017-03-15', 'tax-2017', 30000, {
    status: 'paid',
    paymentId: 'p-tax',
    paymentDate: '2017-03-20',
  }),
  charge('sched-tax', 'tax', '2017-06-10', 'tax-2017', 30000),
  charge('sched-tax', 'tax', '2017-09-15', 'tax-2017', 21000),
  charge('sched-tax', 'tax', '2017-12-15', 'tax-2017', 30000, {
    status: 'skipped',
  }),
  charge('sched-tax', 'tax', '2018-03-15', null, 30000),
];

function transaction(
  id: string,
  date: string,
  amount: number,
  payee: string,
  account = 'checking',
  category = 'tax',
): TransactionEntity {
  return { id, date, amount, payee, account, category };
}

// What the accounts hold around the tax charge of the 15th of March, as the
// transactions the page can ask for
const LEDGER: TransactionEntity[] = [
  transaction('p-tax', '2017-03-20', -30000, 'tax-office'),
  // In another category
  transaction('t-food', '2017-03-10', -30500, 'grocer', 'checking', 'food'),
  // From an account that is not in the budget
  transaction('t-savings', '2017-03-18', -30000, 'tax-office', 'savings'),
  // Money that came in
  transaction('t-refund', '2017-03-12', 4000, 'tax-office'),
  // 31 days before and after the due day, and one day more
  transaction('t-day-32-before', '2017-02-11', -100, 'bakery'),
  transaction('t-day-31-before', '2017-02-12', -200, 'bakery'),
  transaction('t-day-31-after', '2017-04-15', -300, 'bakery'),
  transaction('t-day-32-after', '2017-04-16', -400, 'bakery'),
  // Long before the charge
  transaction('t-early', '2016-12-20', -30000, 'tax-office'),
  // A part that has itself as its split, and a part of that part: the
  // calculation leaves both out
  {
    ...transaction('t-part-alone', '2017-03-14', -700, 'bakery'),
    is_child: true,
    parent_id: 't-part-alone',
  },
  {
    ...transaction('t-part-of-part', '2017-03-13', -800, 'bakery'),
    is_child: true,
    parent_id: 't-part-alone',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBefore(value: unknown, bound: unknown): boolean {
  if (typeof value === 'string' && typeof bound === 'string') {
    return value < bound;
  }
  if (typeof value === 'number' && typeof bound === 'number') {
    return value < bound;
  }
  throw new Error('The ledger of the test cannot compare these values');
}

// Whether a transaction meets the conditions of a query, for the few kinds
// of condition the page uses
function meets(entry: TransactionEntity, conditions: unknown): boolean {
  if (!isRecord(conditions)) {
    throw new Error('The ledger of the test cannot read this filter');
  }
  const fields = new Map<string, unknown>(Object.entries(entry));
  return Object.entries(conditions).every(([name, condition]) => {
    if (name === '$and') {
      return (
        Array.isArray(condition) && condition.every(part => meets(entry, part))
      );
    }
    const value = fields.get(name);
    if (!isRecord(condition)) {
      return value === condition;
    }
    return Object.entries(condition).every(([operator, given]) => {
      // '$id' is the id of the same transaction
      const bound =
        typeof given === 'string' && given.startsWith('$')
          ? fields.get(given.slice(1))
          : given;
      if (operator === '$lt') {
        return isBefore(value, bound);
      }
      if (operator === '$gte') {
        return !isBefore(value, bound);
      }
      if (operator === '$lte') {
        return !isBefore(bound, value);
      }
      if (operator === '$ne') {
        return value !== bound;
      }
      if (operator === '$oneof') {
        return Array.isArray(bound) && bound.includes(value);
      }
      throw new Error(`The ledger of the test does not know ${operator}`);
    });
  });
}

const SET_ASIDE: SetAsideRow[] = [
  {
    table: 'period_budgets',
    id: 'food-bad',
    reason: 'overlap',
    detail: 'it overlaps another period',
  },
  {
    table: 'period_offsets',
    id: 'tx-gone',
    reason: 'offset-period-missing',
    detail: 'its period is gone',
  },
  {
    table: 'period_charge_overrides',
    id: 'sched-old:2016-01-15',
    reason: 'override-without-charge',
    detail: 'no charge is due on 2016-01-15',
  },
  {
    table: 'charges',
    id: 'sched-tax:2018-03-15',
    reason: 'charge-period-missing',
    detail: 'no period contains 2018-03-15',
  },
  {
    table: 'charges',
    id: 'sched-odd:2017-02-01',
    reason: 'invalid-charge',
    detail: 'its amount is not a number',
  },
  {
    table: 'transactions',
    id: 'tx-odd',
    reason: 'invalid-transaction',
    detail: 'its date is not a day',
  },
];

function schedule(id: string, name: string, payee: string): ScheduleEntity {
  return {
    id,
    name,
    rule: `rule-${id}`,
    next_date: '2017-06-10',
    completed: false,
    posts_transaction: false,
    tombstone: false,
    _payee: payee,
    _account: 'checking',
    _amount: -30000,
    _amountOp: 'is',
    _date: '2017-06-10',
    _conditions: [],
    _actions: [],
  };
}

const SCHEDULES = [
  schedule('sched-tax', 'Tax office', 'tax-office'),
  // The rules give its transactions the category Rent
  schedule('sched-rent', 'Landlord', 'landlord'),
  schedule('sched-gym', 'Gym', 'grocer'),
  { ...schedule('sched-loan', 'Old loan', 'grocer'), completed: true },
];

const write = vi.fn(
  async (_name: string, _args: unknown): Promise<WriteResult> => ({
    id: 'stored-id',
  }),
);
const calculateRequest = vi.fn<Handlers['period-budget/calculate']>();
let juneBudget = FOOD_JUNE.budget;
// July once the server has stored it, under the id and with the fields of the write
let storedJuly: BudgetPeriod | null = null;
let extraPayments: Payment[] = [];
let calculationError: string | null = null;
// A book in which nothing is set aside or left without a period
let isTidy = false;
// August follows from the cadence too, after July
let hasPlannedAugust = false;
// Rent had one period, and it was deleted
let hasDeletedRentPeriod = false;
// The transaction the user named as the payment of the tax charge of June
let namedJunePaymentId: string | null = null;
// More rows that the calculation set aside
let extraSetAside: SetAsideRow[] = [];
let hasUnshowableAllowance = false;
// What the answers about transactions wait for
let ledgerHold: Promise<void> | null = null;

function rows(): PeriodBudgetRows {
  return {
    ...NO_ROWS,
    cadences: [
      {
        id: 'food',
        anchor_date: '2017-05-01',
        months: 1,
        active: true,
        tombstone: false,
      },
    ],
    periods: [
      stored(FOOD_FEBRUARY, { tombstone: true }),
      stored(FOOD_MARCH),
      stored(FOOD_MAY),
      stored(
        { ...FOOD_JUNE, budget: juneBudget },
        { carried_from: 'food-may' },
      ),
      ...(isTidy ? [] : [stored(FOOD_OVERLAPPING)]),
      ...(hasUnshowableAllowance
        ? [
            stored(
              period('unshowable', 'food', '2018-06-01', '2018-07-01', 2 ** 51),
            ),
          ]
        : []),
      stored({ ...TAX_2017, carryover: taxCarryover }),
      ...(storedJuly ? [stored(storedJuly)] : []),
      ...(hasDeletedRentPeriod
        ? [stored(RENT_JANUARY, { tombstone: true })]
        : []),
    ],
    offsets: [{ id: 'p-early', period_id: 'food-june', tombstone: false }],
    scheduleLinks: [
      { id: 'sched-tax', category: 'tax', tombstone: false },
      // Was linked to Tax once
      { id: 'sched-gym', category: 'tax', tombstone: true },
    ],
    chargeOverrides: [
      {
        id: 'sched-tax:2017-09-15',
        amount: 21000,
        skipped: false,
        transaction_id: null,
        open_amount: null,
        tombstone: false,
      },
      {
        id: 'sched-tax:2017-12-15',
        amount: null,
        skipped: true,
        transaction_id: null,
        open_amount: null,
        tombstone: false,
      },
      ...(namedJunePaymentId === null
        ? []
        : [
            {
              id: 'sched-tax:2017-06-10',
              amount: null,
              skipped: false,
              transaction_id: namedJunePaymentId,
              open_amount: null,
              tombstone: false,
            },
          ]),
    ],
  };
}

function calculation(asOf: string): PeriodBudgetCalculation {
  const july = storedJuly ?? FOOD_JULY;
  const payments = [...PAYMENTS, ...extraPayments].filter(
    payment => !isTidy || payment.id !== 'p-april',
  );
  const movements = includeShortfall
    ? [
        {
          id: 'large-bill',
          account: 'checking',
          amount: -630000,
          date: '2017-07-02',
          dueDate: '2017-07-02',
          scheduleId: 'sched-tax',
          isTransfer: false,
          isApproximate: false,
          isPosted: false,
        },
      ]
    : [];
  const result = calculate({
    asOf,
    periods: [
      FOOD_MARCH,
      FOOD_MAY,
      { ...FOOD_JUNE, budget: juneBudget },
      july,
      ...(hasPlannedAugust ? [FOOD_AUGUST] : []),
      { ...TAX_2017, carryover: taxCarryover },
    ],
    postings: payments,
    offsets: [{ transactionId: 'p-early', periodId: 'food-june' }],
    occurrences: [
      {
        id: 'sched-tax:2017-06-10',
        periodId: 'tax-2017',
        date: '2017-06-10',
        amount: 30000,
        state: 'scheduled',
      },
      {
        id: 'sched-tax:2017-09-15',
        periodId: 'tax-2017',
        date: '2017-09-15',
        amount: 21000,
        state: 'scheduled',
      },
    ],
    fields: {
      plannedPeriodIds: [
        ...(storedJuly ? [] : [july.id]),
        ...(hasPlannedAugust ? [FOOD_AUGUST.id] : []),
      ],
      charges: isTidy
        ? CHARGES.filter(entry => entry.periodId !== null)
        : CHARGES,
      needsAttention: isTidy
        ? []
        : [
            ...SET_ASIDE,
            ...(hasUnshowableAllowance
              ? [setAside('period_budgets', 'unshowable', 'amounts-too-large')]
              : []),
            ...extraSetAside,
          ],
      unresolved: isTidy
        ? []
        : [
            {
              id: 'u1',
              account: 'checking',
              date: '2017-06-02',
              amount: -700,
              reason: 'uncategorized',
            },
          ],
      movements,
      cash: includeShortfall
        ? planCash({
            accounts: [
              { id: 'checking', balance: 620000 },
              { id: 'savings', balance: -120000 },
            ],
            selectedAccountIds: ['checking', 'savings'],
            movements,
            asOf,
            horizonEnd: '2017-12-31',
          })
        : {
            cashAvailable: 500000,
            inAccounts: 620000,
            owed: 120000,
            projectedCash: 449000,
            accounts: [],
          },
    },
  });
  return {
    ...result,
    payments: result.payments.map(payment => ({
      ...payment,
      payee: payments.find(entry => entry.id === payment.id)?.payee ?? null,
    })),
  };
}

function startServer() {
  calculateRequest.mockImplementation(async ({ asOf }) =>
    calculationError === null ? calculation(asOf) : { error: calculationError },
  );
  const handlers: Partial<Handlers> = {
    'accounts-get': async () => [CHECKING, SAVINGS],
    'payees-get': async () => PAYEES,
    'get-categories': async () => ({
      grouped: GROUPS,
      list: GROUPS.flatMap(group => group.categories ?? []),
    }),
    query: async query => {
      if (query.table !== 'transactions') {
        return { data: SCHEDULES, dependencies: [] };
      }
      await ledgerHold;
      const found = LEDGER.filter(entry =>
        query.filterExpressions.every(conditions => meets(entry, conditions)),
      );
      // Latest first, as the page asks
      found.sort((a, b) => (a.date < b.date ? 1 : -1));
      return { data: found, dependencies: [] };
    },
    'rules-run': async ({ transaction }) =>
      transaction.schedule === 'sched-rent'
        ? { ...transaction, category: 'rent' }
        : transaction,
    'period-budget/get-rows': async () => rows(),
    'period-budget/calculate': calculateRequest,
  };
  for (const name of WRITE_NAMES) {
    handlers[name] = args => write(name, args);
  }
  handlers['period-budget/create-period'] = async args => {
    const result = await write('period-budget/create-period', args);
    if ('id' in result && args.start.startsWith('2017-07')) {
      storedJuly = period(
        result.id,
        args.category,
        args.start,
        args.end,
        args.budget,
      );
    }
    return result;
  };
  handlers['period-budget/update-period'] = async args => {
    const result = await write('period-budget/update-period', args);
    if (
      'id' in result &&
      args.id === FOOD_JUNE.id &&
      args.budget !== undefined
    ) {
      juneBudget = args.budget;
    }
    return result;
  };
  initServer(handlers);
}

function SharedAccountsSubscriber() {
  useAccounts();
  return null;
}

function Location() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function createBook() {
  const queryClient = createTestQueryClient();
  // Seed the page lookups for tests that use the prepared book.
  queryClient.setQueryData(
    [...accountQueries.lists(), 'period-budget'],
    [CHECKING, SAVINGS],
  );
  queryClient.setQueryData(payeeQueries.list().queryKey, PAYEES);
  const store = configureTestAppStore({ queryClient });
  return { queryClient, store };
}

// The page on the 15th of June 2017, or on another day of that month
async function renderPage({
  asOf = '2017-06-15',
  isPrivate = false,
}: { asOf?: string; isPrivate?: boolean } = {}) {
  const { queryClient, store } = createBook();
  if (isPrivate) {
    store.dispatch(mergeSyncedPrefs({ isPrivacyEnabled: 'true' }));
  }
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter initialEntries={['/period-budget']}>
        <PeriodBudgetPage />
        <Location />
      </MemoryRouter>
    </TestProviders>,
  );
  fireEvent.change(await screen.findByLabelText('As of'), {
    target: { value: asOf },
  });
  await screen.findByRole('group', { name: 'Spent in June 2017' });
  return store;
}

function figure(name: string) {
  return screen.getByRole('group', { name });
}

function bar(category: string, periodName: string) {
  return screen.getByRole('button', {
    name: new RegExp(`^${category}, ${periodName},`),
  });
}

function dot(name: string) {
  return screen.getByRole('img', { name });
}

function rowOf(category: string) {
  const row = screen
    .getByRole('button', { name: category })
    .closest<HTMLElement>('[role="row"]');
  if (!row) {
    throw new Error(`No row for ${category}`);
  }
  return row;
}

function amountsOf(category: string) {
  return within(rowOf(category))
    .getAllByRole('cell')
    .slice(0, 4)
    .map(cell => cell.textContent);
}

async function openPeriod(category: string, periodName: string) {
  await userEvent.click(bar(category, periodName));
  return screen.getByRole('region', { name: `${category}, ${periodName}` });
}

async function openCategory(category: string) {
  await userEvent.click(screen.getByRole('button', { name: category }));
  return screen.getByRole('region', { name: category });
}

function section(panel: HTMLElement, name: string) {
  return within(panel).getByRole('group', { name });
}

async function choose(trigger: HTMLElement, option: string) {
  await userEvent.click(trigger);
  const menu = await screen.findByRole('menu');
  await userEvent.click(within(menu).getByRole('button', { name: option }));
}

function type(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } });
}

// A field of Actual takes Enter when the key comes up
function pressEnter(field: HTMLElement) {
  fireEvent.keyDown(field, { key: 'Enter' });
  fireEvent.keyUp(field, { key: 'Enter' });
}

function attentionItem(text: string) {
  const region = screen.getByRole('region', { name: 'Needs attention' });
  const item = within(region)
    .getAllByRole('listitem')
    .find(entry => entry.textContent?.includes(text));
  if (!item) {
    throw new Error(`Nothing needs attention with "${text}"`);
  }
  return item;
}

// The page where the app has it: under the settings, or at its own address
// when it is one of the entries of the sidebar
async function renderRoutedPage({ isInSidebar }: { isInSidebar: boolean }) {
  const { queryClient, store } = createBook();
  if (!isInSidebar) {
    store.dispatch(
      mergeSyncedPrefs({
        'sidebar-menu-items': JSON.stringify([
          { id: 'period-budget', hidden: true },
        ]),
      }),
    );
  }
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter initialEntries={['/period-budget']}>
        <Routes>
          <Route
            path="/period-budget"
            element={
              <SidebarMenuRoute id="period-budget">
                <PeriodBudgetPage />
              </SidebarMenuRoute>
            }
          />
          <Route
            path="/settings/period-budget"
            element={
              <SidebarMenuRoute id="period-budget" isInSettings>
                <PeriodBudgetPage />
              </SidebarMenuRoute>
            }
          />
        </Routes>
        <Location />
      </MemoryRouter>
    </TestProviders>,
  );
  await screen.findByRole('region', { name: 'Needs attention' });
}

// The options of the menu that a button opens
async function optionsOf(trigger: HTMLElement) {
  await userEvent.click(trigger);
  const menu = await screen.findByRole('menu');
  const options = within(menu)
    .getAllByRole('button')
    .map(option => option.textContent);
  await userEvent.keyboard('{Escape}');
  await waitFor(() =>
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
  );
  return options;
}

// Makes the server answer the next write only when the test says so
function holdNextWrite() {
  const waiting: Array<(result: WriteResult) => void> = [];
  write.mockImplementationOnce(
    () =>
      new Promise<WriteResult>(resolve => {
        waiting.push(resolve);
      }),
  );
  return () => {
    for (const answer of waiting) {
      answer({ id: 'stored-id' });
    }
  };
}

// Makes the server answer about transactions only when the test says so
function holdLedger() {
  const waiting: Array<() => void> = [];
  ledgerHold = new Promise<void>(resolve => {
    waiting.push(resolve);
  });
  return () => {
    for (const answer of waiting) {
      answer();
    }
  };
}

// A row that the calculation set aside, with a sentence the page must not
// show
function setAside(
  table: SetAsideRow['table'],
  id: string,
  reason: SetAsideRow['reason'],
  problem?: SetAsideRow['problem'],
): SetAsideRow {
  return { table, id, reason, detail: 'the sentence of the server', problem };
}

// Every write the page sent, in order
async function expectWrites(...expected: Array<[string, unknown]>) {
  await waitFor(() => expect(write.mock.calls).toEqual(expected));
}

describe('PeriodBudgetPage', () => {
  afterEach(() => onlineManager.setOnline(true));
  beforeEach(() => {
    write.mockClear();
    calculateRequest.mockClear();
    juneBudget = FOOD_JUNE.budget;
    taxCarryover = 0;
    includeShortfall = false;
    storedJuly = null;
    extraPayments = [];
    calculationError = null;
    isTidy = false;
    hasPlannedAugust = false;
    hasDeletedRentPeriod = false;
    namedJunePaymentId = null;
    extraSetAside = [];
    hasUnshowableAllowance = false;
    ledgerHold = null;
    responsive.isNarrowWidth = false;
    startServer();
  });

  describe('monthly Budget integration', () => {
    function renderBudgetPeriod(
      isMobile: boolean,
      month = '2017-06',
      isPrivate = false,
    ) {
      const { queryClient, store } = createBook();
      responsive.isNarrowWidth = isMobile;
      if (isPrivate) {
        store.dispatch(mergeSyncedPrefs({ isPrivacyEnabled: 'true' }));
      }
      render(
        <TestProviders store={store} queryClient={queryClient}>
          <MemoryRouter>
            <div style={{ width: isMobile ? 360 : 800 }}>
              <MonthsProvider
                startMonth={month}
                numMonths={1}
                monthBounds={{ start: '2017-01', end: '2017-12' }}
                type="envelope"
              >
                <BudgetPeriodsProvider visibleMonths={[month]}>
                  <BudgetCashStrip month={month} />
                  <BudgetPeriodTotals month={month} />
                  {isMobile ? (
                    <MobileBudgetPeriod month={month} categoryId="tax" />
                  ) : (
                    <BudgetPeriodRow categoryId="tax" />
                  )}
                </BudgetPeriodsProvider>
              </MonthsProvider>
            </div>
          </MemoryRouter>
        </TestProviders>,
      );
      return queryClient;
    }

    it('uses fixed calendar controls and quick-jumps within the multi-month bounds', async () => {
      const { queryClient, store } = createBook();
      const onSelect = vi.fn();
      render(
        <TestProviders store={store} queryClient={queryClient}>
          <MonthPicker
            startMonth="2017-06"
            numDisplayed={2}
            monthBounds={{ start: '2017-01', end: '2018-03' }}
            onSelect={onSelect}
          />
        </TestProviders>,
      );
      const [today, previous, next, headline] = screen.getAllByRole('button');
      expect(today).toHaveTextContent('Today');
      expect(previous).toHaveAccessibleName('Previous month');
      expect(next).toHaveAccessibleName('Next month');
      expect(headline).toHaveTextContent('June 2017');
      const displayed = screen.getAllByTestId('selected-budget-month');
      expect(displayed[0]).toBe(headline);
      expect(headline).toBeVisible();
      expect(displayed.map(element => element.dataset.month)).toEqual([
        '2017-06',
        '2017-07',
      ]);
      await userEvent.click(today);
      await userEvent.click(previous);
      await userEvent.click(next);
      expect(onSelect.mock.calls).toEqual([
        [months.currentMonth()],
        ['2017-05'],
        ['2017-07'],
      ]);
      await userEvent.click(headline);
      expect(screen.getByRole('button', { name: 'June 2017' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'July 2017' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
      expect(screen.getByRole('button', { name: 'March 2018' })).toBeDisabled();
      await userEvent.click(
        screen.getByRole('button', { name: 'February 2018' }),
      );
      expect(onSelect).toHaveBeenLastCalledWith('2018-02');
      expect(headline).toHaveAttribute('aria-expanded', 'false');
    });

    it('keeps period amounts separate, includes carryover and opens the inline graph and actions', async () => {
      taxCarryover = 25000;
      renderBudgetPeriod(false);
      const snapshot = await screen.findByRole('button', {
        name: 'Period details for Tax',
      });
      expect(snapshot).toHaveAccessibleDescription(
        'Budgeted 1,750.00, Spent 300.00, Balance 1,450.00',
      );
      expect(within(snapshot).getByText('Yearly')).toBeVisible();
      expect(
        within(snapshot).getByTestId('period-progress'),
      ).toBeInTheDocument();
      expect(within(snapshot).getByTestId('period-as-of')).toHaveAccessibleName(
        'As of 06/30/2017',
      );
      const totals = screen.getByRole('group', {
        name: 'Active multi-month period totals',
      });
      expect(totals).toHaveTextContent('Active multi-month periods (1)');
      expect(totals).toHaveTextContent('Budgeted 1,750.00');
      expect(totals).toHaveTextContent('Balance 1,450.00');
      expect(calculateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ asOf: '2017-06-30' }),
      );

      await userEvent.click(within(snapshot).getByText('Yearly'));
      expect(snapshot).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('group', { name: 'Graph of Tax, 2017' }),
      ).toBeVisible();
      expect(screen.getByRole('group', { name: 'Payments' })).toBeVisible();
      expect(
        screen.getByRole('group', { name: 'Scheduled charges' }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible();
      expect(
        screen.getByRole('link', { name: 'Open full Period Budget' }),
      ).toHaveAttribute(
        'href',
        '/period-budget?asOf=2017-06-30&category=tax&period=tax-2017&start=2017-01-01',
      );

      await userEvent.click(
        screen.getByRole('button', { name: 'Cadence and schedules' }),
      );
      expect(
        screen.queryByRole('group', { name: 'Graph of Tax, 2017' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Tax' })).toBeVisible();
    });

    it('clusters close payments and keeps each date, payee and full amount in the tooltip', async () => {
      extraPayments = [
        {
          id: 'a',
          category: 'tax',
          date: '2017-08-30',
          amount: -123456,
          payee: 'tax-office',
        },
        {
          id: 'b',
          category: 'tax',
          date: '2017-09-02',
          amount: -789123,
          payee: 'market',
        },
      ];
      renderBudgetPeriod(false, '2017-09');
      const snapshot = await screen.findByRole('button', {
        name: 'Period details for Tax',
      });
      const cluster = within(snapshot).getByTitle(
        /08\/30\/2017.*Tax office.*1,234\.56[\s\S]*09\/02\/2017.*Market.*7,891\.23/,
      );
      expect(cluster).toHaveTextContent('3');
      expect(cluster).toHaveAttribute(
        'title',
        expect.stringContaining(
          'Overdue charge of 09/15/2017: Tax office, 210.00',
        ),
      );
      expect(
        clusterTimelineMarkers(
          [
            { id: 'a', position: 0.66, label: 'August 30' },
            { id: 'b', position: 0.668, label: 'September 2' },
            { id: 'c', position: 0.8, label: 'October 19' },
          ],
          500,
        ).map(group => group.length),
      ).toEqual([2, 1]);
    });

    it('loads schedule suggestions only when schedule linking is available', async () => {
      const queryClient = renderBudgetPeriod(false);
      const suggestions = periodBudgetQueries.suggestedCategories().queryKey;
      const snapshot = await screen.findByRole('button', {
        name: 'Period details for Tax',
      });
      expect(queryClient.getQueryState(suggestions)).toBeUndefined();
      await userEvent.click(snapshot);
      expect(queryClient.getQueryState(suggestions)).toBeUndefined();
      await userEvent.click(
        screen.getByRole('button', { name: 'Cadence and schedules' }),
      );
      await waitFor(() =>
        expect(queryClient.getQueryState(suggestions)?.status).toBe('success'),
      );
    });

    it('lets the keyboard choose either period from a cluster across a boundary', async () => {
      const openMay = vi.fn();
      const openJune = vi.fn();
      render(
        <TimelineMarkers
          center={12}
          markers={[
            {
              id: 'may',
              position: 0.41,
              label: 'May 31 payment',
              onClick: openMay,
            },
            {
              id: 'june',
              position: 0.413,
              label: 'June 1 payment',
              onClick: openJune,
            },
          ]}
        />,
      );
      const cluster = screen.getByRole('button', {
        name: 'Timeline markers (2)',
      });
      cluster.focus();
      await userEvent.keyboard('{Enter}{ArrowDown}{ArrowDown}{Enter}');
      expect(openJune).toHaveBeenCalledOnce();
      expect(openMay).not.toHaveBeenCalled();
      cluster.focus();
      await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');
      expect(openMay).toHaveBeenCalledOnce();
    });

    it('opens an assigned period from a cluster that starts with an unassigned payment', async () => {
      const openAssigned = vi.fn();
      render(
        <TimelineMarkers
          center={30}
          markers={[
            { id: 'unassigned', position: 0.41, label: 'Unassigned payment' },
            {
              id: 'assigned',
              position: 0.413,
              label: 'Assigned payment',
              onClick: openAssigned,
            },
          ]}
        />,
      );
      screen.getByRole('button', { name: 'Timeline markers (2)' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(
        within(screen.getByRole('menu')).getByText('Unassigned payment'),
      ).toBeVisible();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(openAssigned).toHaveBeenCalledOnce();
    });

    it('expands the cash and attention strip', async () => {
      includeShortfall = true;
      renderBudgetPeriod(false);
      const strip = await screen.findByRole('button', {
        name: 'Cash and period budget alerts',
      });
      expect(strip).toHaveTextContent('In accounts 6,200.00');
      expect(strip).toHaveTextContent('Owed 1,200.00');
      expect(strip).toHaveTextContent('Shortfalls (1)');
      expect(strip).toHaveAccessibleDescription(
        /^In accounts 6,200.00, Owed 1,200.00, Shortfalls \(1\), Needs attention \(\d+\)$/,
      );
      expect(strip).toHaveTextContent(/Needs attention \(\d+\)/);
      expect(
        screen.queryByRole('region', { name: 'Needs attention' }),
      ).not.toBeInTheDocument();
      await userEvent.click(strip);
      expect(
        screen.getByText('Checking is short from 07/02/2017'),
      ).toBeVisible();
      expect(
        screen.getByRole('region', { name: 'Needs attention' }),
      ).toBeVisible();
      await userEvent.click(strip);
      expect(
        screen.queryByRole('region', { name: 'Needs attention' }),
      ).not.toBeInTheDocument();
    });

    it('keeps cash balances out of the accessible description in privacy mode', async () => {
      renderBudgetPeriod(false, '2017-06', true);
      const strip = await screen.findByRole('button', {
        name: 'Cash and period budget alerts',
      });
      expect(strip).toHaveAccessibleDescription(
        /^In accounts hidden amount, Owed hidden amount, Shortfalls \(0\), Needs attention \(\d+\)$/,
      );
    });

    it('opens period details in a narrow Budget sheet', async () => {
      renderBudgetPeriod(true);
      const snapshot = await screen.findByRole('button', {
        name: 'Period details for Tax',
      });
      for (const value of [
        'Budgeted',
        '1,500.00',
        'Spent',
        '300.00',
        'Balance',
        '1,200.00',
        'Yearly',
      ]) {
        expect(within(snapshot).getByText(value)).toBeVisible();
      }
      await userEvent.click(snapshot);
      const dialog = screen.getByRole('dialog', {
        name: 'Period details for Tax',
      });
      expect(
        within(dialog).getByRole('group', { name: 'Graph of Tax, 2017' }),
      ).toBeVisible();
      expect(
        within(dialog).getByRole('group', { name: 'Scheduled charges' }),
      ).toBeVisible();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the category and period named by a deep link', async () => {
      const { queryClient, store } = createBook();
      render(
        <TestProviders store={store} queryClient={queryClient}>
          <MemoryRouter
            initialEntries={[
              '/period-budget?asOf=2017-06-30&category=tax&period=tax-2017&start=2017-01-01',
            ]}
          >
            <PeriodBudgetPage />
          </MemoryRouter>
        </TestProviders>,
      );
      expect(
        await screen.findByRole('group', { name: 'Graph of Tax, 2017' }),
      ).toBeVisible();
      expect(screen.getByLabelText('As of')).toHaveValue('2017-06-30');
    });
  });

  describe('the figures', () => {
    it('recalculates when the as-of day changes offline', async () => {
      await renderPage();
      onlineManager.setOnline(false);
      await userEvent.click(
        screen.getByRole('button', { name: 'Previous month' }),
      );
      expect(calculateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ asOf: '2017-05-31' }),
      );
      const spent = await screen.findByRole('group', {
        name: 'Spent in May 2017',
      });
      expect(within(spent).getByText('280.00')).toBeVisible();
    });
    it('labels the cash, the spending of the month and what is left in the active periods', async () => {
      await renderPage();

      const cash = figure('Cash in selected accounts');
      expect(within(cash).getByText('5,000.00')).toBeInTheDocument();
      expect(cash).toHaveTextContent('In accounts 6,200.00 · Owed 1,200.00');

      const spent = figure('Spent in June 2017');
      // Food and Rent of June; the payment of the 30th of May is not of June
      expect(within(spent).getByText('1,020.00')).toBeInTheDocument();
      expect(spent).toHaveTextContent('By transaction date, up to 06/15/2017');

      const remaining = figure('Remaining in active periods');
      // June of Food and the year of Tax
      expect(within(remaining).getByText('1,550.00')).toBeInTheDocument();
      expect(remaining).toHaveTextContent(
        'Allowance left in the periods that contain 06/15/2017: 2',
      );

      const overspending = figure('Overspending in active periods');
      expect(within(overspending).getByText('0.00')).toBeInTheDocument();
      expect(overspending).not.toHaveTextContent('Overspent periods');

      expect(document.body).not.toHaveTextContent(/monthly limit/i);
    });

    it('shows overspending on its own line and in the period', async () => {
      extraPayments = [
        {
          id: 'p-feast',
          category: 'food',
          date: '2017-06-12',
          amount: -40000,
          payee: 'market',
        },
      ];
      await renderPage();

      const overspending = figure('Overspending in active periods');
      expect(within(overspending).getByText('50.00')).toBeInTheDocument();
      expect(overspending).toHaveTextContent('Overspent periods: 1');
      expect(
        screen.getByRole('button', {
          name: 'Food, June 2017, spent 550.00 of 500.00, overspent by 50.00, active',
        }),
      ).toBeInTheDocument();

      const panel = await openPeriod('Food', 'June 2017');
      expect(section(panel, 'Overspent')).toHaveTextContent('50.00');
      expect(section(panel, 'Remaining')).toHaveTextContent('-50.00');
    });

    it('follows the as-of day', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Previous month' }),
      );

      // Another month is looked at on its last day
      expect(screen.getByLabelText('As of')).toHaveValue('2017-05-31');
      const spent = await screen.findByRole('group', {
        name: 'Spent in May 2017',
      });
      expect(within(spent).getByText('280.00')).toBeInTheDocument();
      expect(amountsOf('Food')).toEqual([
        '400.00',
        '250.00',
        '150.00',
        '150.00',
      ]);

      await userEvent.click(screen.getByRole('button', { name: 'Today' }));

      expect(screen.getByLabelText('As of')).toHaveValue('2017-01-01');
      await screen.findByRole('group', { name: 'Spent in January 2017' });
      expect(within(rowOf('Food')).getByText('No active period')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
    });

    it('says when the calculation failed', async () => {
      calculationError = 'the book is locked';
      render(
        <TestProviders>
          <MemoryRouter>
            <PeriodBudgetPage />
          </MemoryRouter>
        </TestProviders>,
      );

      // In the user's language, with what the server said after it
      const alert = await screen.findByRole('alert');
      expect(Array.from(alert.children).map(line => line.textContent)).toEqual([
        'The period budget could not be calculated.',
        'the book is locked',
      ]);
    });
  });

  describe('the timeline', () => {
    it('shows each category with the amounts of its active period', async () => {
      await renderPage();

      expect(
        screen.getAllByRole('columnheader').map(header => header.textContent),
      ).toEqual(
        expect.arrayContaining([
          'Category',
          'Allowance',
          'Spent',
          'Remaining',
          'Expected remaining',
        ]),
      );
      expect(
        screen.getByRole('columnheader', {
          name: 'Periods from January 2017 to December 2017',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('rowheader', { name: 'Usual expenses' }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Salary')).not.toBeInTheDocument();

      // The allowance of June has the balance carried from May in it
      expect(amountsOf('Food')).toEqual([
        '500.00',
        '150.00',
        '350.00',
        '350.00',
      ]);
      // Two charges of the tax office are still expected
      expect(amountsOf('Tax')).toEqual([
        '1,500.00',
        '300.00',
        '1,200.00',
        '690.00',
      ]);
      expect(
        within(rowOf('Rent')).queryByText('No periods yet'),
      ).not.toBeInTheDocument();
    });

    it('says in words what each bar shows', async () => {
      await renderPage();

      const names = [
        'Food, March 2017, spent 0.00 of 400.00, remaining 400.00',
        'Food, May 2017, spent 250.00 of 400.00, remaining 150.00',
        'Food, June 2017, spent 150.00 of 500.00, remaining 350.00, active',
        'Food, July 2017, spent 0.00 of 400.00, remaining 400.00, planned',
        'Tax, 2017, spent 300.00 of 1,500.00, remaining 1,200.00, active',
      ];
      for (const name of names) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      }
      expect(
        within(screen.getByRole('table')).getAllByRole('button', {
          name: /spent .* of /,
        }),
      ).toHaveLength(names.length);
    });

    it('draws each bar over the days of its period, filled by what is spent', async () => {
      await renderPage();

      // May is days 121 to 151 of the 365 on the axis; 250.00 of 400.00
      const may = bar('Food', 'May 2017');
      expect(may.style.left).toBe('32.877%');
      expect(may.style.width).toBe('calc(8.493% - 2px)');
      expect(within(may).getByTestId('period-spent').style.width).toBe('62.5%');
      // 300.00 of 1,500.00
      const tax = bar('Tax', '2017');
      expect(tax.style.left).toBe('0%');
      expect(tax.style.width).toBe('calc(100% - 2px)');
      expect(within(tax).getByTestId('period-spent').style.width).toBe('20%');
    });

    it('says in words what each dot shows, at the day it is on', async () => {
      await renderPage();

      const names = [
        'Payment on 05/10/2017: Grocer, -250.00',
        'Payment on 06/05/2017: Grocer, -120.00',
        'Payment on 05/30/2017, early for June 2017: Market, -30.00',
        'Payment on 04/12/2017, in no period: Bakery, -50.00',
        'Payment on 03/20/2017: Tax office, -300.00',
        'Overdue charge of 06/10/2017: Tax office, 300.00',
        'Expected charge on 09/15/2017: Tax office, 210.00',
      ];
      for (const name of names) {
        expect(dot(name)).toBeInTheDocument();
      }
      // The charge that is paid and the one that is skipped have no dot, and
      // the one of March 2018 is not in this year
      expect(screen.getAllByRole('img')).toHaveLength(names.length);

      // The middle of the 10th of May, the 130th of the 365 days
      expect(
        parseFloat(
          getComputedStyle(dot('Payment on 05/10/2017: Grocer, -250.00')).left,
        ),
      ).toBeCloseTo(35.479, 2);
      const lines = screen.getAllByTestId('as-of-line');
      expect(lines).toHaveLength(3);
      // The middle of the 15th of June, the 166th day
      expect(parseFloat(lines[0].style.left)).toBeCloseTo(45.342, 2);

      // The early payment is joined to the first day of its period
      const link = within(rowOf('Food')).getByTestId('payment-link');
      expect(parseFloat(link.style.left)).toBeCloseTo(40.959, 2);
      expect(parseFloat(link.style.width)).toBeCloseTo(0.548, 2);
      expect(
        within(rowOf('Tax')).queryByTestId('payment-link'),
      ).not.toBeInTheDocument();
    });

    it('opens a period from its payment marker and shows the full amount on hover', async () => {
      await renderPage();

      const mark = dot('Payment on 03/20/2017: Tax office, -300.00');
      expect(mark).toHaveAttribute(
        'title',
        'Payment on 03/20/2017: Tax office, -300.00',
      );
      await userEvent.click(mark);
      expect(screen.getByRole('region', { name: 'Tax, 2017' })).toBeVisible();
    });

    it('moves and zooms the months it shows', async () => {
      await renderPage();

      await userEvent.click(screen.getByRole('button', { name: '3 months' }));

      expect(screen.getByRole('button', { name: '3 months' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(
        screen.getByRole('columnheader', {
          name: 'Periods from May 2017 to July 2017',
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^Food, March 2017,/ }),
      ).not.toBeInTheDocument();
      expect(bar('Food', 'June 2017')).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Show later months' }),
      );

      expect(
        screen.getByRole('columnheader', {
          name: 'Periods from June 2017 to August 2017',
        }),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: '12 months' }));
      await userEvent.click(
        screen.getByRole('button', { name: 'Show later months' }),
      );

      expect(
        screen.getByRole('columnheader', {
          name: 'Periods from January 2018 to December 2018',
        }),
      ).toBeInTheDocument();
      expect(
        dot('Expected charge on 03/15/2018, in no period: Tax office, 300.00'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('as-of-line')).not.toBeInTheDocument();
    });

    it('does not give amounts in the words of bars and dots in privacy mode', async () => {
      await renderPage({ isPrivate: true });

      expect(
        screen.getByRole('button', {
          name: 'Food, June 2017, spent hidden amount of hidden amount, remaining hidden amount, active',
        }),
      ).toBeInTheDocument();
      expect(
        dot('Payment on 06/05/2017: Grocer, hidden amount'),
      ).toBeInTheDocument();
    });
  });

  describe('an opened period', () => {
    it('loads and edits a stored period on its first offline visit', async () => {
      isTidy = true;
      onlineManager.setOnline(false);
      const queryClient = createTestQueryClient();
      const store = configureTestAppStore({ queryClient });
      render(
        <TestProviders store={store} queryClient={queryClient}>
          <SharedAccountsSubscriber />
          <MemoryRouter initialEntries={['/period-budget']}>
            <PeriodBudgetPage />
          </MemoryRouter>
        </TestProviders>,
      );
      fireEvent.change(await screen.findByLabelText('As of'), {
        target: { value: '2017-06-15' },
      });
      expect(
        await screen.findByRole('button', { name: 'Food' }),
      ).toBeInTheDocument();
      const panel = await openPeriod('Food', 'June 2017');
      expect((await within(panel).findAllByText('Checking'))[0]).toBeVisible();
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '450');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );
      await expectWrites([
        'period-budget/update-period',
        { id: 'food-june', budget: 45000 },
      ]);
    });
    it('saves an allowance change offline', async () => {
      isTidy = true;
      await renderPage();
      onlineManager.setOnline(false);
      const panel = await openPeriod('Food', 'June 2017');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '450');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );
      await expectWrites([
        'period-budget/update-period',
        { id: 'food-june', budget: 45000 },
      ]);
      expect(
        await within(panel).findByRole('button', { name: 'Edit' }),
      ).toBeInTheDocument();
      expect(section(panel, 'Allowance')).toHaveTextContent('550.00');
    });
    it('opens under its row with its figures, payments and actions, and closes again', async () => {
      await renderPage();

      const panel = await openPeriod('Food', 'June 2017');

      expect(bar('Food', 'June 2017')).toHaveAttribute('aria-expanded', 'true');
      expect(panel).toHaveTextContent(
        'This period is active on the as-of day.',
      );
      expect(section(panel, 'Allowance')).toHaveTextContent('500.00');
      expect(section(panel, 'Spent')).toHaveTextContent('150.00');
      expect(section(panel, 'Remaining')).toHaveTextContent('350.00');
      expect(section(panel, 'Charges still expected')).toHaveTextContent(
        '0.00',
      );
      expect(section(panel, 'Expected remaining')).toHaveTextContent('350.00');
      expect(
        within(panel).queryByRole('group', { name: 'Overspent' }),
      ).not.toBeInTheDocument();

      const payments = within(section(panel, 'Payments')).getAllByRole(
        'listitem',
      );
      expect(payments).toHaveLength(2);
      expect(payments[0]).toHaveTextContent(
        '05/30/2017earlyMarketChecking-30.00Counted here by your choice',
      );
      expect(payments[1]).toHaveTextContent('06/05/2017GrocerChecking-120.00');
      expect(section(panel, 'Scheduled charges')).toHaveTextContent(
        'No scheduled charge is due in this period.',
      );
      for (const name of ['Edit', 'Cadence and schedules', 'Delete']) {
        expect(within(panel).getByRole('button', { name })).toBeEnabled();
      }

      // Another bar opens its own period in the place of this one
      await userEvent.click(bar('Food', 'May 2017'));
      expect(
        screen.getByRole('region', { name: 'Food, May 2017' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Food, June 2017' }),
      ).not.toBeInTheDocument();

      // The same bar again closes it
      await userEvent.click(bar('Food', 'May 2017'));
      expect(
        screen.queryByRole('region', { name: 'Food, May 2017' }),
      ).not.toBeInTheDocument();

      const reopened = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(reopened).getByRole('button', { name: 'Close' }),
      );
      expect(
        screen.queryByRole('region', { name: 'Tax, 2017' }),
      ).not.toBeInTheDocument();
    });

    it('lists the scheduled charges with their state', async () => {
      await renderPage();

      const panel = await openPeriod('Tax', '2017');

      expect(section(panel, 'Charges still expected')).toHaveTextContent(
        '510.00',
      );
      expect(section(panel, 'Expected remaining')).toHaveTextContent('690.00');
      const charges = within(section(panel, 'Scheduled charges')).getAllByRole(
        'listitem',
      );
      expect(charges).toHaveLength(4);
      expect(charges[0]).toHaveTextContent(
        '03/15/2017Tax office300.00paid on 03/20/2017',
      );
      expect(charges[1]).toHaveTextContent('06/10/2017Tax office300.00overdue');
      expect(charges[2]).toHaveTextContent(
        '09/15/2017Tax office210.00expected',
      );
      expect(charges[3]).toHaveTextContent('12/15/2017Tax office300.00skipped');
    });

    it('changes the days and the allowance of a stored period', async () => {
      isTidy = true;
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      expect(within(panel).getByLabelText('First day')).toHaveValue(
        '2017-06-01',
      );
      expect(within(panel).getByLabelText('Last day')).toHaveValue(
        '2017-06-30',
      );
      // Without the carried balance
      const allowance = within(panel).getByRole('textbox', {
        name: 'Allowance',
      });
      expect(allowance).toHaveValue('400.00');
      type(within(panel).getByLabelText('Last day'), '2017-06-29');
      type(allowance, '450');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      // Only what changed, and the day after the last day
      await expectWrites([
        'period-budget/update-period',
        { id: 'food-june', end: '2017-06-30', budget: 45000 },
      ]);
      expect(
        await within(panel).findByRole('button', { name: 'Edit' }),
      ).toBeInTheDocument();
    });

    it('does not save a period with days or an allowance that cannot be', async () => {
      isTidy = true;
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      const save = within(panel).getByRole('button', { name: 'Save' });

      type(within(panel).getByLabelText('First day'), '');
      await userEvent.click(save);
      expect(within(panel).getByRole('alert')).toHaveTextContent(
        'Enter the first and the last day of the period.',
      );

      type(within(panel).getByLabelText('First day'), '2017-07-01');
      await userEvent.click(save);
      expect(within(panel).getByRole('alert')).toHaveTextContent(
        'The last day is before the first day.',
      );

      type(within(panel).getByLabelText('First day'), '2017-06-01');
      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '-5');
      await userEvent.click(save);
      expect(within(panel).getByRole('alert')).toHaveTextContent(
        'Enter an allowance that is not below zero.',
      );

      // Nothing changed: the form closes and nothing is written
      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '400');
      await userEvent.click(save);
      expect(within(panel).getByRole('button', { name: 'Edit' })).toBeVisible();
      expect(write).not.toHaveBeenCalled();
    });

    it('does not save days that another period of the category has', async () => {
      await renderPage();
      // A stored period from the 15th of May to the 14th of June is set aside
      const panel = await openPeriod('Food', 'June 2017');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );

      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '450');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      expect(within(panel).getByRole('alert')).toHaveTextContent(
        'These days overlap the period 05/15/2017 to 06/14/2017.',
      );
      expect(write).not.toHaveBeenCalled();
    });

    it('sends a change of a period once, whatever is pressed while it is saved', async () => {
      isTidy = true;
      const answer = holdNextWrite();
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      const allowance = within(panel).getByRole('textbox', {
        name: 'Allowance',
      });
      type(allowance, '450');
      const save = within(panel).getByRole('button', { name: 'Save' });
      await userEvent.click(save);
      await waitFor(() => expect(save).toBeDisabled());

      await userEvent.click(save);
      pressEnter(allowance);

      answer();
      expect(
        await within(panel).findByRole('button', { name: 'Edit' }),
      ).toBeInTheDocument();
      await expectWrites([
        'period-budget/update-period',
        { id: 'food-june', budget: 45000 },
      ]);
    });

    it('stores a planned period when it is changed, and keeps it open', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'July 2017');

      expect(panel).toHaveTextContent(
        'This period follows from the repeating periods. It is stored when you change it.',
      );
      expect(
        within(panel).queryByRole('button', { name: 'Delete' }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      type(within(panel).getByLabelText('First day'), '2017-07-02');
      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '420');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/create-period',
        {
          category: 'food',
          start: '2017-07-02',
          end: '2017-08-01',
          budget: 42000,
        },
      ]);
      // It has another id and another first day now, and is still the opened
      // row
      const storedPanel = await screen.findByRole('region', {
        name: 'Food, 07/02/2017 to 07/31/2017',
      });
      expect(section(storedPanel, 'Allowance')).toHaveTextContent('420.00');
      expect(
        within(storedPanel).getByRole('button', { name: 'Delete' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Food' }),
      ).not.toBeInTheDocument();
    });

    it('closes the form after storing a planned period', async () => {
      write.mockResolvedValueOnce({ id: FOOD_JULY.id });
      await renderPage();
      const panel = await openPeriod('Food', 'July 2017');

      expect(panel).toHaveTextContent(
        'This period follows from the repeating periods. It is stored when you change it.',
      );
      expect(
        within(panel).queryByRole('button', { name: 'Delete' }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      type(within(panel).getByRole('textbox', { name: 'Allowance' }), '420');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/create-period',
        {
          category: 'food',
          start: '2017-07-01',
          end: '2017-08-01',
          budget: 42000,
        },
      ]);
      expect(
        await screen.findByRole('button', {
          name: 'Food, July 2017, spent 0.00 of 420.00, remaining 420.00',
        }),
      ).toBeInTheDocument();
      expect(
        within(panel).queryByRole('textbox', { name: 'Allowance' }),
      ).not.toBeInTheDocument();
      expect(
        within(panel).getByRole('button', { name: 'Edit' }),
      ).toBeInTheDocument();
      expect(section(panel, 'Allowance')).toHaveTextContent('420.00');
      expect(
        screen.queryByRole('region', { name: 'Food' }),
      ).not.toBeInTheDocument();
    });

    it('keeps a planned period form open when the write is refused', async () => {
      write.mockResolvedValueOnce({ error: 'the periods overlap' });
      await renderPage();
      const panel = await openPeriod('Food', 'July 2017');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Edit' }),
      );
      const allowance = within(panel).getByRole('textbox', {
        name: 'Allowance',
      });
      type(allowance, '420');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );
      await expectWrites([
        'period-budget/create-period',
        {
          category: 'food',
          start: '2017-07-01',
          end: '2017-08-01',
          budget: 42000,
        },
      ]);
      expect(
        within(panel).getByRole('textbox', { name: 'Allowance' }),
      ).toHaveValue('420');
    });

    it('deletes a period and opens its category', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Delete' }),
      );

      await expectWrites(['period-budget/delete-period', { id: 'food-june' }]);
      expect(
        await screen.findByRole('region', { name: 'Food' }),
      ).toBeInTheDocument();
    });

    it('carries the balance again when the period it came from changed', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      expect(panel).toHaveTextContent('carried 100.00 from May 2017');
      expect(panel).toHaveTextContent('The balance of May 2017 is now 150.00.');
      // May is where the balance came from already
      expect(
        within(panel).queryByRole('button', {
          name: 'Carry balance from the previous period',
        }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Carry again' }),
      );

      await expectWrites([
        'period-budget/carry',
        { id: 'food-june', fromPeriodId: 'food-may', amount: 15000 },
      ]);
    });

    it('removes a carried balance', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Remove the carried balance',
        }),
      );

      await expectWrites([
        'period-budget/carry',
        { id: 'food-june', fromPeriodId: null, amount: 0 },
      ]);
    });

    it('carries the balance of the period before it', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'May 2017');

      expect(panel).not.toHaveTextContent('carried');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Carry balance from the previous period',
        }),
      );

      await expectWrites([
        'period-budget/carry',
        { id: 'food-may', fromPeriodId: 'food-march', amount: 40000 },
      ]);
    });

    it('does not offer the balance of a period that is not stored yet', async () => {
      hasPlannedAugust = true;
      await renderPage();
      const panel = await openPeriod('Food', 'August 2017');

      // July, the period before it, only follows from the cadence
      expect(within(panel).getByRole('button', { name: 'Edit' })).toBeVisible();
      expect(
        within(panel).queryByRole('button', {
          name: 'Carry balance from the previous period',
        }),
      ).not.toBeInTheDocument();
    });

    it('stores a planned period before a balance is carried to it', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'July 2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Carry balance from the previous period',
        }),
      );

      await expectWrites(
        [
          'period-budget/create-period',
          {
            category: 'food',
            start: '2017-07-01',
            end: '2017-08-01',
            budget: 40000,
          },
        ],
        [
          'period-budget/carry',
          { id: 'stored-id', fromPeriodId: 'food-june', amount: 35000 },
        ],
      );
    });

    it('names a transfer by the account it goes to', async () => {
      extraPayments = [
        {
          id: 'p-transfer',
          category: 'food',
          date: '2017-06-07',
          amount: -1000,
          payee: 'to-checking',
        },
      ];
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      expect(
        within(section(panel, 'Payments'))
          .getAllByRole('listitem')
          .map(item => item.textContent),
      ).toContainEqual(expect.stringContaining('Transfer: Checking'));
    });

    it('counts a payment in another period', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'May 2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Count Grocer of 05/10/2017 in another period',
        }),
      );
      await choose(
        within(panel).getByRole('button', { name: 'Choose the period' }),
        'June 2017',
      );

      await expectWrites([
        'period-budget/set-offset',
        { transactionId: 'p-may', periodId: 'food-june' },
      ]);
      await waitFor(() =>
        expect(
          within(panel).queryByRole('button', { name: 'Choose the period' }),
        ).not.toBeInTheDocument(),
      );
    });

    it('stores a planned period before a payment is counted in it', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'May 2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Count Grocer of 05/10/2017 in another period',
        }),
      );
      await choose(
        within(panel).getByRole('button', { name: 'Choose the period' }),
        'July 2017',
      );

      await expectWrites(
        [
          'period-budget/create-period',
          {
            category: 'food',
            start: '2017-07-01',
            end: '2017-08-01',
            budget: 40000,
          },
        ],
        [
          'period-budget/set-offset',
          { transactionId: 'p-may', periodId: 'stored-id' },
        ],
      );
    });

    it('counts a payment by its date again', async () => {
      await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      // Only the payment that the user moved has the action
      expect(
        within(panel).queryByRole('button', {
          name: 'Count Grocer of 06/05/2017 by its date',
        }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Count Market of 05/30/2017 by its date',
        }),
      );

      await expectWrites([
        'period-budget/clear-offset',
        { transactionId: 'p-early' },
      ]);
    });

    it('skips an expected charge', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Skip Tax office of 06/10/2017',
        }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-06-10', skipped: true },
      ]);
    });

    it('expects a skipped charge again', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Do not skip Tax office of 12/15/2017',
        }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-12-15', skipped: false },
      ]);
    });

    it('changes the amount of a charge', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 09/15/2017',
        }),
      );
      const amount = within(panel).getByLabelText('Expected amount');
      expect(amount).toHaveValue('210.00');
      type(amount, '250');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-09-15', amount: 25000 },
      ]);
    });

    it('names the payment of a charge and what is still expected after it', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');

      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 03/15/2017',
        }),
      );
      type(
        within(panel).getByLabelText('Still expected after a part payment'),
        '50',
      );
      await choose(
        within(panel).getByRole('button', {
          name: 'The payment that matches the schedule',
        }),
        '03/20/2017, Tax office, Checking, -300.00',
      );
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        {
          scheduleId: 'sched-tax',
          dueDate: '2017-03-15',
          openAmount: 5000,
          transactionId: 'p-tax',
        },
      ]);
    });

    it('offers the money that left any account around the due day, and of other days when asked', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 03/15/2017',
        }),
      );
      const paidBy = within(panel).getByRole('button', {
        name: 'The payment that matches the schedule',
      });

      expect(within(panel).getByLabelText('Payments from')).toHaveValue(
        '2017-02-12',
      );
      expect(within(panel).getByLabelText('Payments until')).toHaveValue(
        '2017-04-15',
      );
      // Latest first; of any category and account, and not what came in
      await waitFor(async () =>
        expect(await optionsOf(paidBy)).toEqual([
          'The payment that matches the schedule',
          '04/15/2017, Bakery, Checking, -3.00',
          '03/20/2017, Tax office, Checking, -300.00',
          '03/18/2017, Tax office, Savings, -300.00',
          '03/10/2017, Grocer, Checking, -305.00',
          '02/12/2017, Bakery, Checking, -2.00',
        ]),
      );

      type(within(panel).getByLabelText('Payments from'), '2016-12-20');
      type(within(panel).getByLabelText('Payments until'), '2017-03-10');
      await waitFor(async () =>
        expect(await optionsOf(paidBy)).toEqual([
          'The payment that matches the schedule',
          '03/10/2017, Grocer, Checking, -305.00',
          '02/12/2017, Bakery, Checking, -2.00',
          '02/11/2017, Bakery, Checking, -1.00',
          '12/20/2016, Tax office, Checking, -300.00',
        ]),
      );
      await choose(paidBy, '12/20/2016, Tax office, Checking, -300.00');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        {
          scheduleId: 'sched-tax',
          dueDate: '2017-03-15',
          transactionId: 't-early',
        },
      ]);
    });

    it('keeps the payment that is named in the list, whatever its day', async () => {
      namedJunePaymentId = 't-early';
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 06/10/2017',
        }),
      );

      // No other payment is in the 31 days around the 10th of June
      const paidBy = await within(panel).findByRole('button', {
        name: '12/20/2016, Tax office, Checking, -300.00',
      });
      expect(await optionsOf(paidBy)).toEqual([
        'The payment that matches the schedule',
        '12/20/2016, Tax office, Checking, -300.00',
      ]);
      await choose(paidBy, 'The payment that matches the schedule');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-06-10', transactionId: null },
      ]);
    });

    it('keeps a payment that is chosen in the list when other days are asked for', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 03/15/2017',
        }),
      );
      const chosen = '03/20/2017, Tax office, Checking, -300.00';
      await choose(
        await within(panel).findByRole('button', {
          name: 'The payment that matches the schedule',
        }),
        chosen,
      );

      // The 20th of March is not one of these days
      type(within(panel).getByLabelText('Payments until'), '2017-03-10');

      await waitFor(async () =>
        expect(
          await optionsOf(within(panel).getByRole('button', { name: chosen })),
        ).toEqual([
          'The payment that matches the schedule',
          chosen,
          '03/10/2017, Grocer, Checking, -305.00',
          '02/12/2017, Bakery, Checking, -2.00',
        ]),
      );
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );
      await expectWrites([
        'period-budget/set-charge-override',
        {
          scheduleId: 'sched-tax',
          dueDate: '2017-03-15',
          transactionId: 'p-tax',
        },
      ]);
    });

    it('lists a payment that is chosen once while its day is one of the days', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 03/15/2017',
        }),
      );
      const chosen = '03/20/2017, Tax office, Checking, -300.00';
      await choose(
        await within(panel).findByRole('button', {
          name: 'The payment that matches the schedule',
        }),
        chosen,
      );

      expect(
        await optionsOf(within(panel).getByRole('button', { name: chosen })),
      ).toEqual([
        'The payment that matches the schedule',
        '04/15/2017, Bakery, Checking, -3.00',
        chosen,
        '03/18/2017, Tax office, Savings, -300.00',
        '03/10/2017, Grocer, Checking, -305.00',
        '02/12/2017, Bakery, Checking, -2.00',
      ]);
    });

    it('lets a chosen payment go from the list when the schedule match is chosen again', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 03/15/2017',
        }),
      );
      const match = 'The payment that matches the schedule';
      const chosen = '03/20/2017, Tax office, Checking, -300.00';
      await choose(
        await within(panel).findByRole('button', { name: match }),
        chosen,
      );
      await choose(within(panel).getByRole('button', { name: chosen }), match);

      // The 20th of March is not one of these days
      type(within(panel).getByLabelText('Payments until'), '2017-03-10');

      await waitFor(async () =>
        expect(
          await optionsOf(within(panel).getByRole('button', { name: match })),
        ).toEqual([
          match,
          '03/10/2017, Grocer, Checking, -305.00',
          '02/12/2017, Bakery, Checking, -2.00',
        ]),
      );
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );
      // Nothing was changed: the form closes without a write
      await waitFor(() =>
        expect(
          within(panel).queryByRole('button', { name: 'Save' }),
        ).toBeNull(),
      );
      expect(write).not.toHaveBeenCalled();
    });

    it('says when the payment that is named does not exist any more, and lets it go', async () => {
      namedJunePaymentId = 't-deleted';
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 06/10/2017',
        }),
      );

      const paidBy = await within(panel).findByRole('button', {
        name: 'A payment that does not exist any more',
      });
      expect(await optionsOf(paidBy)).toEqual([
        'The payment that matches the schedule',
        'A payment that does not exist any more',
      ]);
      await choose(paidBy, 'The payment that matches the schedule');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-06-10', transactionId: null },
      ]);
    });

    it('does not say that the named payment is gone before the payments are known', async () => {
      namedJunePaymentId = 't-early';
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      const answer = holdLedger();
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 06/10/2017',
        }),
      );

      expect(within(panel).getByLabelText('Payments until')).toBeVisible();
      expect(
        within(panel).queryByRole('button', {
          name: 'A payment that does not exist any more',
        }),
      ).toBeNull();

      answer();
      expect(
        await within(panel).findByRole('button', {
          name: '12/20/2016, Tax office, Checking, -300.00',
        }),
      ).toBeVisible();
    });

    it('does not give amounts in the list of payments in privacy mode', async () => {
      await renderPage({ isPrivate: true });
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 03/15/2017',
        }),
      );
      const paidBy = within(panel).getByRole('button', {
        name: 'The payment that matches the schedule',
      });

      await waitFor(async () =>
        expect(await optionsOf(paidBy)).toEqual([
          'The payment that matches the schedule',
          '04/15/2017, Bakery, Checking',
          '03/20/2017, Tax office, Checking',
          '03/18/2017, Tax office, Savings',
          '03/10/2017, Grocer, Checking',
          '02/12/2017, Bakery, Checking',
        ]),
      );
    });

    it('sends a change of a charge once, whatever is pressed while it is saved', async () => {
      const answer = holdNextWrite();
      await renderPage();
      const panel = await openPeriod('Tax', '2017');
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Change Tax office of 09/15/2017',
        }),
      );
      const amount = within(panel).getByLabelText('Expected amount');
      type(amount, '250');
      const save = within(panel).getByRole('button', { name: 'Save' });
      await userEvent.click(save);
      await waitFor(() => expect(save).toBeDisabled());

      await userEvent.click(save);
      pressEnter(amount);
      pressEnter(
        within(panel).getByLabelText('Still expected after a part payment'),
      );

      answer();
      await waitFor(() =>
        expect(
          within(panel).queryByLabelText('Expected amount'),
        ).not.toBeInTheDocument(),
      );
      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-09-15', amount: 25000 },
      ]);
    });

    it('removes the changes to a charge', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');

      // Only the charges that were changed have the action
      expect(
        within(panel).getAllByRole('button', {
          name: /^Remove the changes to/,
        }),
      ).toHaveLength(2);
      await userEvent.click(
        within(panel).getByRole('button', {
          name: 'Remove the changes to Tax office of 09/15/2017',
        }),
      );

      await expectWrites([
        'period-budget/clear-charge-override',
        { id: 'sched-tax:2017-09-15' },
      ]);
    });

    it('says when a change was not saved', async () => {
      write.mockResolvedValueOnce({ error: 'the periods overlap' });
      const store = await renderPage();
      const panel = await openPeriod('Food', 'June 2017');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Delete' }),
      );

      await waitFor(() =>
        expect(store.getState().notifications.notifications).toEqual([
          expect.objectContaining({
            type: 'error',
            message: 'The change to the period budget was not saved.',
            pre: 'the periods overlap',
          }),
        ]),
      );
      // The period is still the opened row
      expect(
        screen.getByRole('region', { name: 'Food, June 2017' }),
      ).toBeInTheDocument();
    });
  });

  describe('an opened category', () => {
    it('opens from its name and closes again', async () => {
      await renderPage();

      const panel = await openCategory('Food');

      expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(section(panel, 'Repeating periods')).toHaveTextContent(
        'A new period starts every month, counted from 05/01/2017.',
      );
      expect(section(panel, 'Deleted periods')).toHaveTextContent(
        'February 2017Allowance380.00',
      );
      expect(section(panel, 'Spending in no period')).toHaveTextContent(
        '04/12/2017Bakery-50.00',
      );

      await userEvent.click(screen.getByRole('button', { name: 'Food' }));
      expect(
        screen.queryByRole('region', { name: 'Food' }),
      ).not.toBeInTheDocument();
    });

    it('opens from a period, to link schedules', async () => {
      await renderPage();
      const panel = await openPeriod('Tax', '2017');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Cadence and schedules' }),
      );

      const category = screen.getByRole('region', { name: 'Tax' });
      expect(section(category, 'Scheduled charges')).toHaveTextContent(
        'Tax office',
      );
      expect(section(category, 'Charges due in no period')).toHaveTextContent(
        '03/15/2018Tax office300.00',
      );
    });

    it('starts repeating periods, with the allowance of the first one', async () => {
      await renderPage();
      const panel = await openCategory('Rent');
      const repeating = section(panel, 'Repeating periods');

      // The first day of the month of the as-of day, and a month long
      expect(
        within(repeating).getByLabelText('First day of the first period'),
      ).toHaveValue('2017-06-01');
      expect(within(repeating).getByLabelText('Length in months')).toHaveValue(
        1,
      );
      const start = within(repeating).getByRole('button', {
        name: 'Start repeating',
      });
      await userEvent.click(start);
      expect(within(repeating).getByRole('alert')).toHaveTextContent(
        'Enter an allowance that is not below zero.',
      );
      expect(write).not.toHaveBeenCalled();

      type(within(repeating).getByLabelText('Allowance of each period'), '900');
      await userEvent.click(start);

      await expectWrites([
        'period-budget/set-cadence',
        {
          category: 'rent',
          anchorDate: '2017-06-01',
          months: 1,
          budget: 90000,
        },
      ]);
    });

    it('starts repeating periods once, whatever is pressed while it is saved', async () => {
      const answer = holdNextWrite();
      await renderPage();
      const panel = await openCategory('Rent');
      const repeating = section(panel, 'Repeating periods');
      const allowance = within(repeating).getByLabelText(
        'Allowance of each period',
      );
      type(allowance, '900');
      const start = within(repeating).getByRole('button', {
        name: 'Start repeating',
      });
      await userEvent.click(start);
      await waitFor(() => expect(start).toBeDisabled());

      await userEvent.click(start);
      pressEnter(allowance);
      pressEnter(within(repeating).getByLabelText('Length in months'));

      answer();
      await waitFor(() => expect(start).toBeEnabled());
      await expectWrites([
        'period-budget/set-cadence',
        {
          category: 'rent',
          anchorDate: '2017-06-01',
          months: 1,
          budget: 90000,
        },
      ]);
    });

    it('changes how the periods repeat', async () => {
      await renderPage();
      const panel = await openCategory('Food');
      const repeating = section(panel, 'Repeating periods');

      await userEvent.click(
        within(repeating).getByRole('button', { name: 'Change' }),
      );
      // Food has periods: they keep their allowances
      expect(
        within(repeating).queryByLabelText('Allowance of each period'),
      ).not.toBeInTheDocument();
      // The longest length there is
      type(within(repeating).getByLabelText('Length in months'), '120');
      await userEvent.click(
        within(repeating).getByRole('button', { name: 'Save' }),
      );

      await expectWrites([
        'period-budget/set-cadence',
        { category: 'food', anchorDate: '2017-05-01', months: 120 },
      ]);
      // Saved: the form is closed again
      expect(
        await within(repeating).findByRole('button', { name: 'Change' }),
      ).toBeVisible();
    });

    it('starts repeating periods without an allowance when the category had a period', async () => {
      hasDeletedRentPeriod = true;
      await renderPage();
      const panel = await openCategory('Rent');
      const repeating = section(panel, 'Repeating periods');

      // The server takes an allowance only for a category that never had one
      expect(
        within(repeating).queryByLabelText('Allowance of each period'),
      ).not.toBeInTheDocument();
      await userEvent.click(
        within(repeating).getByRole('button', { name: 'Start repeating' }),
      );

      await expectWrites([
        'period-budget/set-cadence',
        { category: 'rent', anchorDate: '2017-06-01', months: 1 },
      ]);
    });

    it.each(['0', '121', '1.5'])(
      'does not save a length of %s months',
      async length => {
        await renderPage();
        const panel = await openCategory('Food');
        const repeating = section(panel, 'Repeating periods');
        await userEvent.click(
          within(repeating).getByRole('button', { name: 'Change' }),
        );

        type(within(repeating).getByLabelText('Length in months'), length);
        await userEvent.click(
          within(repeating).getByRole('button', { name: 'Save' }),
        );

        expect(within(repeating).getByRole('alert')).toHaveTextContent(
          'Enter a length from 1 to 120 months.',
        );
        expect(write).not.toHaveBeenCalled();
      },
    );

    it('stops repeating periods', async () => {
      await renderPage();
      const panel = await openCategory('Food');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Stop repeating' }),
      );

      await expectWrites(['period-budget/stop-cadence', { category: 'food' }]);
    });

    it('adds one period', async () => {
      await renderPage();
      const panel = await openCategory('Rent');
      const adding = section(panel, 'Add one period');

      // The month of the as-of day
      expect(within(adding).getByLabelText('First day')).toHaveValue(
        '2017-06-01',
      );
      expect(within(adding).getByLabelText('Last day')).toHaveValue(
        '2017-06-30',
      );
      type(within(adding).getByLabelText('Last day'), '2017-08-31');
      type(within(adding).getByRole('textbox', { name: 'Allowance' }), '900');
      await userEvent.click(
        within(adding).getByRole('button', { name: 'Add the period' }),
      );

      await expectWrites([
        'period-budget/create-period',
        {
          category: 'rent',
          start: '2017-06-01',
          end: '2017-09-01',
          budget: 90000,
        },
      ]);
    });

    it('does not add a period on days that another period of the category has', async () => {
      await renderPage();
      const panel = await openCategory('Food');
      const adding = section(panel, 'Add one period');

      type(within(adding).getByLabelText('First day'), '2017-03-31');
      type(within(adding).getByLabelText('Last day'), '2017-04-30');
      await userEvent.click(
        within(adding).getByRole('button', { name: 'Add the period' }),
      );

      expect(within(adding).getByRole('alert')).toHaveTextContent(
        'These days overlap the period March 2017.',
      );
      expect(write).not.toHaveBeenCalled();

      // The day after the last day of March is free
      type(within(adding).getByLabelText('First day'), '2017-04-01');
      await userEvent.click(
        within(adding).getByRole('button', { name: 'Add the period' }),
      );

      await expectWrites([
        'period-budget/create-period',
        {
          category: 'food',
          start: '2017-04-01',
          end: '2017-05-01',
          budget: 40000,
        },
      ]);
    });

    it('adds a period of one day', async () => {
      await renderPage();
      const panel = await openCategory('Rent');
      const adding = section(panel, 'Add one period');

      type(within(adding).getByLabelText('Last day'), '2017-06-01');
      type(within(adding).getByRole('textbox', { name: 'Allowance' }), '10');
      await userEvent.click(
        within(adding).getByRole('button', { name: 'Add the period' }),
      );

      await expectWrites([
        'period-budget/create-period',
        {
          category: 'rent',
          start: '2017-06-01',
          end: '2017-06-02',
          budget: 1000,
        },
      ]);
    });

    it('offers the next period after the last stored one', async () => {
      await renderPage();
      const panel = await openCategory('Food');
      const adding = section(panel, 'Add one period');

      expect(within(adding).getByLabelText('First day')).toHaveValue(
        '2017-07-01',
      );
      expect(within(adding).getByLabelText('Last day')).toHaveValue(
        '2017-07-31',
      );
      expect(
        within(adding).getByRole('textbox', { name: 'Allowance' }),
      ).toHaveValue('400.00');
    });

    it('restores a deleted period', async () => {
      await renderPage();
      const panel = await openCategory('Food');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Restore February 2017' }),
      );

      await expectWrites(['period-budget/restore-period', { id: 'food-feb' }]);
    });

    it('links the schedule that the rules give its category', async () => {
      await renderPage();
      const panel = await openCategory('Rent');

      expect(panel).toHaveTextContent(
        'Landlord gets this category from the rules.',
      );
      await userEvent.click(
        await within(panel).findByRole('button', { name: 'Link Landlord' }),
      );

      await expectWrites([
        'period-budget/link-schedule',
        { scheduleId: 'sched-rent', category: 'rent' },
      ]);
    });

    it('links another schedule', async () => {
      await renderPage();
      const panel = await openCategory('Rent');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Link another schedule' }),
      );
      const menu = await screen.findByRole('menu');
      // Not the schedule that is linked to Tax, and not the suggested one
      expect(
        within(menu)
          .getAllByRole('button')
          .map(option => option.textContent),
      ).toEqual(['Gym']);
      await userEvent.click(within(menu).getByRole('button', { name: 'Gym' }));

      await expectWrites([
        'period-budget/link-schedule',
        { scheduleId: 'sched-gym', category: 'rent' },
      ]);
    });

    it('unlinks a schedule', async () => {
      await renderPage();
      const panel = await openCategory('Tax');

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Unlink Tax office' }),
      );

      await expectWrites([
        'period-budget/unlink-schedule',
        { scheduleId: 'sched-tax' },
      ]);
    });
  });

  describe('what needs attention', () => {
    it('sets aside and deletes a period with an unshowable allowance', async () => {
      hasUnshowableAllowance = true;
      await renderPage();
      const region = screen.getByRole('region', { name: 'Needs attention' });
      expect(region).toHaveTextContent('amounts are too large to be added up');
      const item = within(region)
        .getAllByRole('listitem')
        .find(
          element =>
            element.textContent?.includes('A period of Food is not counted') &&
            element.textContent.includes(
              'amounts are too large to be added up',
            ),
        );
      if (!item) {
        throw new Error('Missing oversized period in Needs attention');
      }
      await userEvent.click(
        within(item).getByRole('button', {
          name: 'Delete the period',
        }),
      );
      await expectWrites(['period-budget/delete-period', { id: 'unshowable' }]);
    });

    it('lists what the calculation left out or could not place', async () => {
      await renderPage();

      const region = screen.getByRole('region', { name: 'Needs attention' });
      expect(region).toHaveTextContent('Needs attention (8)');
      expect(
        within(region)
          .getAllByRole('listitem')
          .map(item => item.textContent),
      ).toEqual([
        'A period of Food is not counted (it overlaps another period of its category)Delete the periodOpen Food',
        'The period chosen for a payment is not used (the period is deleted or is not counted)Remove the choice',
        'A change to Deleted schedule is stored for 01/15/2016, and no charge is due on that dayRemove the change',
        'A scheduled charge is not counted (its day or its amount cannot be used)Open the schedules',
        'A transaction is not counted (its day or its amount cannot be used)Open the transactions',
        'Charges of Tax office are due on days with no period of Tax (1, the first on 03/15/2018)Add a period to TaxUnlink Tax office',
        'Spending of Food that is in no period (1) 50.00Add a period to Food',
        'Spending without a category (1) 7.00Categorize the transactions',
      ]);
    });

    it('says in the language of the user why a row is not counted', async () => {
      extraSetAside = [
        setAside('period_budgets', 'p1', 'duplicate-id'),
        setAside('period_budgets', 'p2', 'invalid-period'),
        setAside('period_budgets', 'p3', 'amounts-too-large'),
        setAside('period_offsets', 'o1', 'offset-category-mismatch'),
        setAside('charges', 'c1', 'charge-period-missing'),
        // A reason that is not one of a transaction
        setAside('transactions', 't1', 'invalid-override'),
      ];
      await renderPage();

      const region = screen.getByRole('region', { name: 'Needs attention' });
      expect(region).not.toHaveTextContent('the sentence of the server');
      expect(
        within(region)
          .getAllByRole('listitem')
          .slice(5, 11)
          .map(item => item.textContent),
      ).toEqual([
        'A period is not counted (it is stored more than once)Delete the period',
        'A period is not counted (its days or its allowance cannot be used)Delete the period',
        'A period is not counted (the amounts are too large to be added up)Delete the period',
        'The period chosen for a payment is not used (the payment has another category than the period)Remove the choice',
        // A charge that the calculation does not list
        'A scheduled charge is not counted (no period that is counted has its day)Open the schedules',
        'A transaction is not counted (it cannot be used)Open the transactions',
      ]);
    });

    it('says what is wrong with a change to a charge, and offers what fixes it', async () => {
      const table = 'period_charge_overrides';
      const reason = 'invalid-override';
      extraSetAside = [
        setAside(table, 'sched-tax:2017-06-10', reason, 'payment-missing'),
        setAside(table, 'sched-tax:2017-09-15', reason, 'payment-taken'),
        setAside(table, 'sched-rent:2017-06-01', reason, 'amount'),
        setAside(table, 'sched-rent:2017-07-01', reason, 'open-amount'),
        setAside(table, 'sched-gym:2017-07-01', reason),
        setAside(table, 'not a charge', reason, 'amount'),
        // The 30th of February is no day
        setAside(table, 'sched-tax:2017-02-30', reason),
      ];
      await renderPage();

      const region = screen.getByRole('region', { name: 'Needs attention' });
      expect(region).not.toHaveTextContent('the sentence of the server');
      expect(
        within(region)
          .getAllByRole('listitem')
          .slice(5, 12)
          .map(item => item.textContent),
      ).toEqual([
        'The payment that is named for Tax office of 06/10/2017 does not exist any moreUse the payment that matches the scheduleRemove the change',
        'The payment that is named for Tax office of 09/15/2017 pays an earlier charge alreadyUse the payment that matches the scheduleRemove the change',
        'The expected amount that is stored for Landlord of 06/01/2017 cannot be usedRemove the change',
        'The still expected amount that is stored for Landlord of 07/01/2017 cannot be usedRemove the change',
        'A change to Gym of 07/01/2017 cannot be usedRemove the change',
        'A change to a scheduled charge cannot be readRemove the change',
        'A change to a scheduled charge cannot be readRemove the change',
      ]);

      await userEvent.click(
        within(attentionItem('does not exist any more')).getByRole('button', {
          name: 'Use the payment that matches the schedule',
        }),
      );
      await expectWrites([
        'period-budget/set-charge-override',
        { scheduleId: 'sched-tax', dueDate: '2017-06-10', transactionId: null },
      ]);
      write.mockClear();

      await userEvent.click(
        within(attentionItem('pays an earlier charge')).getByRole('button', {
          name: 'Remove the change',
        }),
      );
      await expectWrites([
        'period-budget/clear-charge-override',
        { id: 'sched-tax:2017-09-15' },
      ]);
    });

    it('deletes a period that is not counted', async () => {
      await renderPage();

      await userEvent.click(
        within(attentionItem('A period of Food')).getByRole('button', {
          name: 'Delete the period',
        }),
      );

      await expectWrites(['period-budget/delete-period', { id: 'food-bad' }]);
    });

    it('opens the category of a period that is not counted', async () => {
      await renderPage();

      await userEvent.click(
        within(attentionItem('A period of Food')).getByRole('button', {
          name: 'Open Food',
        }),
      );

      expect(screen.getByRole('region', { name: 'Food' })).toBeInTheDocument();
    });

    it('removes the choice of a period that is gone', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Remove the choice' }),
      );

      await expectWrites([
        'period-budget/clear-offset',
        { transactionId: 'tx-gone' },
      ]);
    });

    it('removes a change that has no charge', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Remove the change' }),
      );

      await expectWrites([
        'period-budget/clear-charge-override',
        { id: 'sched-old:2016-01-15' },
      ]);
    });

    it('opens the category for spending and charges that are in no period', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Add a period to Food' }),
      );
      expect(screen.getByRole('region', { name: 'Food' })).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Add a period to Tax' }),
      );
      expect(screen.getByRole('region', { name: 'Tax' })).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Food' }),
      ).not.toBeInTheDocument();
    });

    it('unlinks the schedule whose charges are in no period', async () => {
      await renderPage();

      await userEvent.click(
        within(attentionItem('Charges of Tax office')).getByRole('button', {
          name: 'Unlink Tax office',
        }),
      );

      await expectWrites([
        'period-budget/unlink-schedule',
        { scheduleId: 'sched-tax' },
      ]);
    });

    it.each([
      ['Categorize the transactions', '/accounts/uncategorized'],
      ['Open the schedules', '/schedules'],
      ['Open the transactions', '/accounts'],
    ])('goes from "%s" to %s', async (name, path) => {
      await renderPage();

      await userEvent.click(screen.getByRole('button', { name }));

      expect(screen.getByTestId('location')).toHaveTextContent(path);
    });

    it('says when nothing needs attention', async () => {
      isTidy = true;
      await renderPage();

      const region = screen.getByRole('region', { name: 'Needs attention' });
      expect(region).toHaveTextContent('Needs attention (0)');
      expect(region).toHaveTextContent('Nothing needs attention.');
    });
  });

  describe('on a phone', () => {
    beforeEach(() => {
      responsive.isNarrowWidth = true;
    });

    it('has the figures and the payments of the month on "Month"', async () => {
      await renderPage();

      expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(
        within(figure('Remaining in active periods')).getByText('1,550.00'),
      ).toBeInTheDocument();
      expect(
        within(figure('Cash in selected accounts')).getByText('5,000.00'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'Needs attention' }),
      ).toHaveTextContent('Needs attention (8)');

      // Latest first
      expect(
        within(figure('Payments in June 2017'))
          .getAllByRole('listitem')
          .map(item => item.textContent),
      ).toEqual([
        '06/05/2017GrocerFood-120.00',
        '06/01/2017LandlordRent-900.00',
      ]);
    });

    it('has a bar for each category on "Periods", and opens a period in place', async () => {
      await renderPage();

      await userEvent.click(screen.getByRole('tab', { name: 'Periods' }));

      const group = screen.getByRole('group', { name: 'Usual expenses' });
      const [food, tax, rent] = within(group).getAllByRole('button');
      expect(food).toHaveTextContent('FoodJune 2017');
      expect(
        within(food).getByRole('group', { name: 'Remaining' }),
      ).toHaveTextContent('350.00');
      expect(
        within(food).getByRole('group', { name: 'Expected remaining' }),
      ).toHaveTextContent('350.00');
      // The 15th of the 30 days of June
      expect(
        within(food).getByRole('img', {
          name: 'Spent 150.00 of 500.00, 50% of the period has passed',
        }),
      ).toBeInTheDocument();
      expect(within(food).getByTestId('period-progress').style.left).toBe(
        '50%',
      );
      expect(within(food).getByTestId('period-spent').style.width).toBe('30%');
      expect(tax).toHaveTextContent('Tax2017');
      expect(
        within(tax).getByRole('img', {
          name: 'Spent 300.00 of 1,500.00, 45% of the period has passed',
        }),
      ).toBeInTheDocument();
      // The 166th of the 365 days of 2017
      expect(within(tax).getByTestId('period-progress').style.left).toBe(
        '45.479%',
      );
      expect(within(tax).getByTestId('period-spent').style.width).toBe('20%');
      expect(
        within(tax).getByRole('group', { name: 'Expected remaining' }),
      ).toHaveTextContent('690.00');
      expect(rent).toHaveTextContent(/^Rent$/);

      await userEvent.click(food);

      const panel = screen.getByRole('region', { name: 'Food, June 2017' });
      expect(
        within(section(panel, 'Payments')).getAllByRole('listitem'),
      ).toHaveLength(2);
      expect(
        screen.queryByRole('group', { name: 'Usual expenses' }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Close' }),
      );
      expect(
        screen.getByRole('group', { name: 'Usual expenses' }),
      ).toBeInTheDocument();
    });

    it('opens a category that has no active period', async () => {
      await renderPage();
      await userEvent.click(screen.getByRole('tab', { name: 'Periods' }));

      await userEvent.click(
        within(
          screen.getByRole('group', { name: 'Usual expenses' }),
        ).getAllByRole('button')[2],
      );

      const panel = screen.getByRole('region', { name: 'Rent' });
      await userEvent.click(
        await within(panel).findByRole('button', { name: 'Link Landlord' }),
      );
      await expectWrites([
        'period-budget/link-schedule',
        { scheduleId: 'sched-rent', category: 'rent' },
      ]);
    });

    it('goes from what needs attention to the category on "Periods"', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Add a period to Food' }),
      );

      expect(screen.getByRole('tab', { name: 'Periods' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('region', { name: 'Food' })).toBeInTheDocument();
    });

    it('gives the amounts in words in privacy mode, which covers no amount on a phone', async () => {
      await renderPage({ isPrivate: true });
      await userEvent.click(screen.getByRole('tab', { name: 'Periods' }));

      expect(
        screen.getByRole('img', {
          name: 'Spent 150.00 of 500.00, 50% of the period has passed',
        }),
      ).toBeInTheDocument();
    });

    it('goes to the uncategorized transactions of the phone', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Categorize the transactions' }),
      );

      expect(screen.getByTestId('location')).toHaveTextContent(
        '/categories/uncategorized',
      );
    });
  });

  describe('where the app has it', () => {
    it('is under settings when hidden from the sidebar', async () => {
      await renderRoutedPage({ isInSidebar: false });

      expect(screen.getByTestId('location')).toHaveTextContent(
        '/settings/period-budget',
      );
      // The frame and the title are those of the settings
      expect(screen.queryByRole('main')).not.toBeInTheDocument();
      expect(screen.queryByText('Period Budget')).not.toBeInTheDocument();
    });

    it('has one frame and one title in the sidebar by default', async () => {
      await renderRoutedPage({ isInSidebar: true });

      expect(screen.getByTestId('location')).toHaveTextContent(
        /^\/period-budget$/,
      );
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.getAllByText('Period Budget')).toHaveLength(1);
    });

    it('has one frame and one title on a phone, under the settings', async () => {
      responsive.isNarrowWidth = true;
      await renderRoutedPage({ isInSidebar: true });

      expect(screen.getByTestId('location')).toHaveTextContent(
        '/settings/period-budget',
      );
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.getAllByText('Period Budget')).toHaveLength(1);
    });
  });
});
