import { MemoryRouter } from 'react-router';

import { theme } from '@actual-app/components/theme';
import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  PeriodBudgetCalculation,
  ScheduledCashMovement,
} from '@actual-app/core/server/period-budget/calculate';
import { planCash } from '@actual-app/core/shared/period-charges';
import type { Handlers } from '@actual-app/core/types/handlers';
import type {
  AccountEntity,
  CategoryGroupEntity,
  PayeeEntity,
  PeriodBudgetRows,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { accountQueries } from '#accounts';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { payeeQueries } from '#payees';
import { outstandingOf } from '#period-budget';
import {
  calculate,
  charge,
  NO_ROWS,
  period,
  stored,
} from '#period-budget/fixtures';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { PeriodBudgetPage } from './PeriodBudgetPage';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// The prefs of the app were loaded by the test setup before the connection
// mock above, so a pref that is saved through them never gets an answer in a
// test. This keeps the pref in the store, as the app does once it is saved,
// and notes what the app would save.
const savePref = vi.hoisted(() =>
  vi.fn<(name: string, value: string | undefined) => void>(),
);
vi.mock('#hooks/useSyncedPref', async () => {
  const { mergeSyncedPrefs } = await import('#prefs/prefsSlice');
  const { useDispatch, useSelector } = await import('#redux');
  return {
    useSyncedPref: (name: keyof SyncedPrefs) => {
      const dispatch = useDispatch();
      const value = useSelector(state => state.prefs.synced[name]);
      return [
        value,
        (next: string | undefined) => {
          savePref(name, next);
          dispatch(mergeSyncedPrefs({ [name]: next }));
        },
      ];
    },
  };
});

const responsive = vi.hoisted(() => ({ isNarrowWidth: false }));
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => responsive,
}));

// The book: Food has a period for June with an allowance of 500.00. Checking
// and Savings have money in them, Card owes, Holiday is left out of the
// forecast, Pension is not an account of the budget and Old is closed.
const GROUPS: CategoryGroupEntity[] = [
  {
    id: 'usual',
    name: 'Usual expenses',
    categories: [{ id: 'food', name: 'Food', group: 'usual' }],
  },
];

const PAYEES: PayeeEntity[] = [
  { id: 'grocer', name: 'Grocer' },
  { id: 'market', name: 'Market' },
  { id: 'bakery', name: 'Bakery' },
];

const CHECKING = { ...generateAccount('Checking'), id: 'checking' };
const SAVINGS = { ...generateAccount('Savings'), id: 'savings' };
const CARD = { ...generateAccount('Card'), id: 'card' };
const HOLIDAY = { ...generateAccount('Holiday'), id: 'holiday' };
const PENSION = { ...generateAccount('Pension', false, true), id: 'pension' };
const OLD: AccountEntity = { ...generateAccount('Old'), id: 'old', closed: 1 };

const BALANCES = [
  { id: 'checking', balance: 100000 },
  { id: 'savings', balance: 300000 },
  { id: 'card', balance: -25000 },
  { id: 'holiday', balance: 5000 },
];

const FOOD_JUNE = period(
  'food-june',
  'food',
  '2017-06-01',
  '2017-07-01',
  40000,
  10000,
);

type Payment = {
  id: string;
  category: string;
  date: string;
  amount: number;
  payee: string;
};

const PAYMENTS: Payment[] = [
  // Counted in June by the user's choice
  {
    id: 'p-early',
    category: 'food',
    date: '2017-05-30',
    amount: -3000,
    payee: 'grocer',
  },
  {
    id: 'p1',
    category: 'food',
    date: '2017-06-05',
    amount: -12000,
    payee: 'market',
  },
  {
    id: 'refund',
    category: 'food',
    date: '2017-06-10',
    amount: 2000,
    payee: 'market',
  },
];

// Counted in June by the user's choice, when the book has it
const LATE_PAYMENT: Payment = {
  id: 'p-late',
  category: 'food',
  date: '2017-07-02',
  amount: -4000,
  payee: 'bakery',
};

// The payments that count in June by the user's choice
const OFFSET_IDS = ['p-early', 'p-late'];

const CHARGES = [
  charge('sched-gym', 'food', '2017-06-12', 'food-june', 5000),
  charge('sched-club', 'food', '2017-06-20', 'food-june', 7000),
];

function schedule(id: string, name: string): ScheduleEntity {
  return {
    id,
    name,
    rule: `rule-${id}`,
    next_date: '2017-06-10',
    completed: false,
    posts_transaction: false,
    tombstone: false,
    _payee: 'grocer',
    _account: 'checking',
    _amount: -30000,
    _amountOp: 'is',
    _date: '2017-06-10',
    _conditions: [],
    _actions: [],
  };
}

const SCHEDULES = [
  schedule('sched-gym', 'Gym'),
  schedule('sched-club', 'Club'),
  schedule('sched-rent', 'Rent'),
  schedule('sched-water', 'Water'),
  schedule('sched-pay', 'Salary'),
  schedule('sched-save', 'To savings'),
  schedule('sched-card', 'Card bill'),
  schedule('sched-tax', 'Tax'),
];

function move(
  id: string,
  account: string,
  dueDate: string,
  amount: number,
  scheduleId: string,
  fields: Partial<ScheduledCashMovement> = {},
): ScheduledCashMovement {
  return {
    id,
    account,
    date: dueDate,
    amount,
    dueDate,
    scheduleId,
    isTransfer: false,
    isApproximate: false,
    isPosted: false,
    ...fields,
  };
}

// What the schedules move. The closing balance of Checking, from 1,000.00:
// 950.00 on the 15th of June, -250.00 on the 20th, -280.00 on the 28th,
// 1,720.00 on the 1st of July, 1,220.00 on the 5th, 970.00 on the 10th,
// -230.00 on the 20th, 1,770.00 on the 25th, 570.00 on the 20th of August
// and 470.00 on the 15th of January.
const MOVEMENTS = [
  move('gym-june', 'checking', '2017-06-12', -5000, 'sched-gym'),
  move('rent-june', 'checking', '2017-06-20', -120000, 'sched-rent'),
  move('water-june', 'checking', '2017-06-28', -3000, 'sched-water', {
    isPosted: true,
  }),
  move('pay-july', 'checking', '2017-07-01', 200000, 'sched-pay', {
    isApproximate: true,
  }),
  move('save-out', 'checking', '2017-07-05', -50000, 'sched-save', {
    isTransfer: true,
  }),
  move('save-in', 'savings', '2017-07-05', 50000, 'sched-save', {
    isTransfer: true,
  }),
  move('card-out', 'checking', '2017-07-10', -25000, 'sched-card', {
    isTransfer: true,
  }),
  move('card-in', 'card', '2017-07-10', 25000, 'sched-card', {
    isTransfer: true,
  }),
  move('rent-july', 'checking', '2017-07-20', -120000, 'sched-rent'),
  move('pay-late-july', 'checking', '2017-07-25', 200000, 'sched-pay', {
    isApproximate: true,
  }),
  move('rent-august', 'checking', '2017-08-20', -120000, 'sched-rent'),
  move('tax-january', 'checking', '2018-01-15', -10000, 'sched-tax'),
];

type WriteResult = { id: string } | { error: string };

const write = vi.fn(
  async (_name: string, _args: unknown): Promise<WriteResult> => ({
    id: 'stored-id',
  }),
);
// The accounts the user left out
let leftOutIds: string[] = ['holiday'];
// The payments of the book
let payments: Payment[] = PAYMENTS;
// The charges of the book
let charges = CHARGES;
// The balance of an account that is counted cannot be used
let hasUnusableBalance = false;

function rows(): PeriodBudgetRows {
  return {
    ...NO_ROWS,
    periods: [stored(FOOD_JUNE)],
    offsets: payments
      .filter(payment => OFFSET_IDS.includes(payment.id))
      .map(payment => ({
        id: payment.id,
        period_id: 'food-june',
        tombstone: false,
      })),
    scheduleLinks: [
      { id: 'sched-gym', category: 'food', tombstone: false },
      { id: 'sched-club', category: 'food', tombstone: false },
    ],
    accounts: [
      ...leftOutIds.map(id => ({ id, excluded: true, tombstone: false })),
      // Rows that leave no account out: one that is deleted, and one of an
      // account that was taken in again
      ...[
        { id: 'savings', excluded: true, tombstone: true },
        { id: 'card', excluded: false, tombstone: false },
      ].filter(row => !leftOutIds.includes(row.id)),
    ],
  };
}

function calculation(
  asOf: string,
  horizonEnd: string,
): PeriodBudgetCalculation {
  const selected = BALANCES.filter(entry => !leftOutIds.includes(entry.id));
  const selectedAccountIds = selected.map(entry => entry.id);
  // As the calculation gives them: what was due before the as-of day is
  // planned on that day
  const movements = MOVEMENTS.filter(movement =>
    selectedAccountIds.includes(movement.account),
  )
    .map(movement => ({
      ...movement,
      date: movement.dueDate < asOf ? asOf : movement.dueDate,
    }))
    .filter(movement => movement.date <= horizonEnd)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const result = calculate({
    asOf,
    periods: [FOOD_JUNE],
    postings: payments,
    offsets: payments
      .filter(payment => OFFSET_IDS.includes(payment.id))
      .map(payment => ({ transactionId: payment.id, periodId: 'food-june' })),
    occurrences: charges.map(entry => ({
      id: entry.id,
      periodId: 'food-june',
      date: entry.dueDate,
      amount: outstandingOf(entry),
      state: 'scheduled',
    })),
    fields: {
      horizonEnd,
      charges,
      movements,
      cash: hasUnusableBalance
        ? null
        : planCash({
            accounts: selected,
            selectedAccountIds,
            movements,
            asOf,
            horizonEnd,
          }),
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
  const handlers: Partial<Handlers> = {
    'get-categories': async () => ({
      grouped: GROUPS,
      list: GROUPS.flatMap(group => group.categories ?? []),
    }),
    query: async query => ({
      data: query.table === 'transactions' ? [] : SCHEDULES,
      dependencies: [],
    }),
    'rules-run': async ({ transaction }) => transaction,
    'period-budget/get-rows': async () => rows(),
    'period-budget/calculate': async ({ asOf, horizonEnd }) =>
      calculation(asOf, horizonEnd),
    'period-budget/exclude-account': async args => {
      const result = await write('period-budget/exclude-account', args);
      leftOutIds = [...leftOutIds, args.accountId];
      return result;
    },
    'period-budget/include-account': async args => {
      const result = await write('period-budget/include-account', args);
      leftOutIds = leftOutIds.filter(id => id !== args.accountId);
      return result;
    },
  };
  initServer(handlers);
}

const MONTH_NAMES: Record<string, string> = {
  '05': 'May',
  '06': 'June',
  '07': 'July',
};

type PageOptions = {
  asOf?: string;
  isPrivate?: boolean;
  // What is stored as the last day the forecast looks at
  horizon?: string;
};

// The page on the 15th of June 2017, or on another day
async function renderPage({
  asOf = '2017-06-15',
  isPrivate = false,
  horizon,
}: PageOptions = {}) {
  const queryClient = createTestQueryClient();
  // The app's own queries for these were loaded before the connection mock
  queryClient.setQueryData(
    [...accountQueries.lists(), 'period-budget'],
    [CHECKING, SAVINGS, CARD, HOLIDAY, PENSION, OLD],
  );
  queryClient.setQueryData(payeeQueries.list().queryKey, PAYEES);
  const store = configureTestAppStore({ queryClient });
  if (isPrivate) {
    store.dispatch(mergeSyncedPrefs({ isPrivacyEnabled: 'true' }));
  }
  if (horizon !== undefined) {
    store.dispatch(mergeSyncedPrefs({ 'period-budget-horizon': horizon }));
  }
  render(
    <TestProviders store={store} queryClient={queryClient}>
      <MemoryRouter initialEntries={['/period-budget']}>
        <PeriodBudgetPage />
      </MemoryRouter>
    </TestProviders>,
  );
  fireEvent.change(await screen.findByLabelText('As of'), {
    target: { value: asOf },
  });
  await screen.findByRole('group', {
    name: `Spent in ${MONTH_NAMES[asOf.slice(5, 7)]} 2017`,
  });
}

function group(name: string, container: HTMLElement = document.body) {
  return within(container).getByRole('group', { name });
}

function styleOf(element: Element) {
  return element.getAttribute('style') ?? '';
}

function placeOf(element: HTMLElement) {
  const { left, width, top } = element.style;
  return { left, width, top };
}

function items(container: HTMLElement) {
  return within(container)
    .getAllByRole('listitem')
    .map(item => item.textContent);
}

async function openJune() {
  await userEvent.click(
    screen.getByRole('button', { name: /^Food, June 2017,/ }),
  );
  const panel = screen.getByRole('region', { name: 'Food, June 2017' });
  return { panel, graph: group('Graph of Food, June 2017', panel) };
}

function accountsTable() {
  return screen.getByRole('table', { name: 'Accounts in the forecast' });
}

function accountRow(name: string) {
  const row = within(accountsTable())
    .getByRole('button', { name })
    .closest<HTMLElement>('[role="row"]');
  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

function cellsOf(name: string) {
  return within(accountRow(name))
    .getAllByRole('cell')
    .map(cell => cell.textContent);
}

async function openAccount(name: string) {
  await userEvent.click(within(accountsTable()).getByRole('button', { name }));
  return screen.getByRole('region', { name });
}

function trackOf(name: string) {
  return within(accountRow(name)).getByRole('img');
}

// The card of an account on a phone
function cardOf(name: string) {
  const card = screen
    .getByRole('button', { name })
    .closest<HTMLElement>('[role="listitem"]');
  if (!card) {
    throw new Error(`No card for ${name}`);
  }
  return card;
}

function horizonButton(name: string) {
  return within(group('Forecast until')).getByRole('button', { name });
}

const CHECKING_PAYMENTS = [
  '06/12/2017overdueGym-50.00',
  '06/20/2017Rent-1,200.00',
  '06/28/2017Waterentered already-30.00',
  '07/20/2017Rent-1,200.00',
];
const CHECKING_INCOME = [
  '07/01/2017Salary≈2,000.00',
  '07/25/2017Salary≈2,000.00',
];
const CHECKING_TRANSFERS = [
  '07/05/2017To savings-500.00',
  '07/10/2017Card bill-250.00',
];

// An amount under zero is in this colour
const WARNING = { color: theme.errorText };

function amountsIn(container: HTMLElement, amount: string) {
  return within(container).getAllByText(amount);
}

function expectCheckingPanel(panel: HTMLElement) {
  expect(group('Balance on 06/15/2017', panel)).toHaveTextContent('1,000.00');
  expect(group('Lowest balance', panel)).toHaveTextContent('-280.00');
  expect(group('Balance on 07/31/2017', panel)).toHaveTextContent('1,770.00');
  expect(group('Transfer needed', panel)).toHaveTextContent('280.00');
  expect(within(panel).getByRole('alert')).toHaveTextContent(
    'This account falls short on 06/20/2017. The transfer needed is the smallest amount that keeps it at zero or above until 07/31/2017.',
  );
  expect(panel).not.toHaveTextContent('does not fall short');
  expect(panel).not.toHaveTextContent('counts as owed');
  expect(items(group('Upcoming payments', panel))).toEqual(CHECKING_PAYMENTS);
  expect(items(group('Expected income', panel))).toEqual(CHECKING_INCOME);
  expect(items(group('Transfers', panel))).toEqual(CHECKING_TRANSFERS);
}

describe('the forecast of the period budget', () => {
  beforeEach(() => {
    write.mockClear();
    savePref.mockClear();
    leftOutIds = ['holiday'];
    payments = PAYMENTS;
    charges = CHARGES;
    hasUnusableBalance = false;
    responsive.isNarrowWidth = false;
    startServer();
  });

  describe('the graph of an opened period', () => {
    it('has the allowance over the days of the period, and the as-of day', async () => {
      await renderPage();
      const { graph } = await openJune();

      // The 30th of May to the 30th of June are shown: 32 days, of which
      // the last 30 are the period's
      expect(placeOf(within(graph).getByTestId('graph-period'))).toMatchObject({
        left: '6.25%',
        width: '93.75%',
      });
      // The allowance of 500.00 is the highest amount of the graph
      expect(placeOf(within(graph).getByTestId('graph-allowance'))).toEqual({
        left: '6.25%',
        width: '93.75%',
        top: '0%',
      });
      expect(within(graph).getByTestId('graph-as-of').style.left).toBe(
        '51.563%',
      );
      expect(graph).toHaveTextContent('05/30/2017As of 06/15/201706/30/2017');
      // Nothing is below zero
      expect(within(graph).queryByTestId('graph-zero')).not.toBeInTheDocument();
    });

    it('has a line that goes up at each payment and down at a refund', async () => {
      await renderPage();
      const { graph } = await openJune();

      expect(within(graph).getAllByTestId('graph-spent').map(placeOf)).toEqual([
        { left: '6.25%', width: '14.063%', top: '94%' },
        { left: '20.313%', width: '15.625%', top: '70%' },
        { left: '35.938%', width: '15.625%', top: '74%' },
      ]);
      expect(
        within(graph)
          .getAllByTestId('graph-spent-step')
          .map(step => [step.style.left, step.style.top, step.style.height]),
      ).toEqual([
        ['1.563%', '94%', '6%'],
        ['20.313%', '70%', '24%'],
        ['35.938%', '70%', '4%'],
      ]);
      for (const run of within(graph).getAllByTestId('graph-spent')) {
        expect(styleOf(run)).toContain('solid');
      }
    });

    it('has a mark for each payment, at its date and at what is spent with it', async () => {
      await renderPage();
      const { graph } = await openJune();

      const marks = [
        'Payment on 05/30/2017, early for June 2017: Grocer, -30.00',
        'Payment on 06/05/2017: Market, -120.00',
        'Payment on 06/10/2017: Market, 20.00',
      ].map(name => within(graph).getByRole('button', { name }));
      expect(marks.map(mark => [mark.style.left, mark.style.top])).toEqual([
        ['1.563%', '94%'],
        ['20.313%', '70%'],
        ['35.938%', '74%'],
      ]);
      for (const mark of marks) {
        // Solid
        expect(styleOf(mark.children[0])).not.toContain('border: 2px solid');
      }
    });

    it('has hollow marks on a dashed line for the charges that are still expected', async () => {
      await renderPage();
      const { graph } = await openJune();

      // The overdue charge is expected on the as-of day
      const overdue = within(graph).getByRole('button', {
        name: 'Overdue charge of 06/12/2017: Gym, 50.00',
      });
      const expected = within(graph).getByRole('button', {
        name: 'Expected charge on 06/20/2017: Club, 70.00',
      });
      expect(
        [overdue, expected].map(mark => [mark.style.left, mark.style.top]),
      ).toEqual([
        ['51.563%', '64%'],
        ['67.188%', '50%'],
      ]);
      for (const mark of [overdue, expected]) {
        expect(styleOf(mark.children[0])).toContain('border: 2px solid');
      }

      const runs = within(graph).getAllByTestId('graph-expected');
      expect(runs.map(placeOf)).toEqual([
        { left: '51.563%', width: '15.625%', top: '64%' },
        { left: '67.188%', width: '32.813%', top: '50%' },
      ]);
      const steps = within(graph).getAllByTestId('graph-expected-step');
      expect(
        steps.map(step => [step.style.left, step.style.top, step.style.height]),
      ).toEqual([
        ['51.563%', '64%', '10%'],
        ['67.188%', '50%', '14%'],
      ]);
      for (const line of [...runs, ...steps]) {
        expect(styleOf(line)).toContain('dashed');
      }
    });

    it('has what is still expected of a charge that is paid in part', async () => {
      charges = [
        charge('sched-gym', 'food', '2017-06-12', 'food-june', 5000, {
          status: 'paid',
          paymentId: 'p1',
          paymentDate: '2017-06-05',
          openAmount: 2000,
        }),
        CHARGES[1],
      ];
      await renderPage();
      const { graph } = await openJune();

      const gym = within(graph).getByRole('button', {
        name: 'Expected charge on 06/12/2017: Gym, 20.00',
      });
      const club = within(graph).getByRole('button', {
        name: 'Expected charge on 06/20/2017: Club, 70.00',
      });
      // 130.00 is spent: 150.00 with the rest of Gym, 220.00 with Club
      expect(
        [gym, club].map(mark => [mark.style.left, mark.style.top]),
      ).toEqual([
        ['51.563%', '70%'],
        ['67.188%', '56%'],
      ]);

      await userEvent.click(gym);
      expect(group('Chosen in the graph', graph).textContent).toBe(
        'Due on 06/12/2017Gymstill expected20.00Spent and expected with this charge150.00',
      );
    });

    it('tells the date and the amount of the mark that is chosen', async () => {
      await renderPage();
      const { graph } = await openJune();
      const chosen = group('Chosen in the graph', graph);
      const payment = within(graph).getByRole('button', {
        name: 'Payment on 06/05/2017: Market, -120.00',
      });
      const overdue = within(graph).getByRole('button', {
        name: 'Overdue charge of 06/12/2017: Gym, 50.00',
      });

      expect(chosen).toHaveTextContent(
        'Choose a mark to read its date and amount. Solid marks are payments, hollow marks are scheduled charges that are still expected.',
      );
      expect(payment).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(payment);
      expect(chosen.textContent).toBe(
        '06/05/2017MarketChecking-120.00Spent with this payment150.00',
      );
      expect(payment).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(overdue);
      expect(chosen.textContent).toBe(
        'Due on 06/12/2017overdueGymstill expected50.00Spent and expected with this charge180.00',
      );
      expect(payment).toHaveAttribute('aria-pressed', 'false');
      expect(overdue).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(
        within(graph).getByRole('button', {
          name: 'Expected charge on 06/20/2017: Club, 70.00',
        }),
      );
      expect(chosen.textContent).toBe(
        'Due on 06/20/2017Clubstill expected70.00Spent and expected with this charge250.00',
      );

      await userEvent.click(
        within(graph).getByRole('button', {
          name: 'Payment on 06/10/2017: Market, 20.00',
        }),
      );
      expect(chosen.textContent).toBe(
        '06/10/2017MarketChecking20.00Spent with this payment130.00',
      );

      // Chosen again, it is not chosen any more
      await userEvent.click(
        within(graph).getByRole('button', {
          name: 'Payment on 06/10/2017: Market, 20.00',
        }),
      );
      expect(chosen).toHaveTextContent('Choose a mark');
    });

    it('has an early payment at its real date, joined to the period, and says so in words', async () => {
      await renderPage();
      const { panel, graph } = await openJune();

      // Left of the band of the period, which begins at 6.25%
      const early = within(graph).getByRole('button', {
        name: 'Payment on 05/30/2017, early for June 2017: Grocer, -30.00',
      });
      expect(early.style.left).toBe('1.563%');
      // The thin line from the payment to the first day of the period
      expect(
        within(graph).getAllByTestId('graph-early-link').map(placeOf),
      ).toEqual([
        { left: '0%', width: '1.563%', top: '100%' },
        { left: '1.563%', width: '4.688%', top: '94%' },
      ]);
      expect(within(graph).queryByTestId('graph-late-link')).toBeNull();
      expect(graph).toHaveTextContent(
        'A payment left of the band is early: it is dated before June 2017 and counts in it.',
      );
      expect(graph).not.toHaveTextContent('A payment right of the band');

      await userEvent.click(early);
      expect(group('Chosen in the graph', graph).textContent).toBe(
        '05/30/2017earlyGrocerChecking-30.00Spent with this payment30.00',
      );

      expect(
        items(group('Payments', panel)).filter(text =>
          text?.startsWith('05/30/2017'),
        ),
      ).toEqual([expect.stringMatching(/^05\/30\/2017earlyGrocerChecking/)]);
    });

    it('joins an early payment to a period that has not begun', async () => {
      charges = [];
      await renderPage({ asOf: '2017-05-31' });
      const { graph } = await openJune();

      // The as-of day is the day before the band, which begins at 6.25%
      expect(within(graph).getByTestId('graph-as-of').style.left).toBe(
        '4.688%',
      );
      // The thin line goes on past it, to the first day of the period
      expect(
        within(graph).getAllByTestId('graph-early-link').map(placeOf),
      ).toEqual([
        { left: '0%', width: '1.563%', top: '100%' },
        { left: '1.563%', width: '4.688%', top: '94%' },
      ]);
      // Nothing is spent in the days of the period yet, and nothing expected
      expect(within(graph).queryByTestId('graph-spent')).toBeNull();
      expect(within(graph).queryByTestId('graph-expected')).toBeNull();
    });

    it('has a late payment at its real date, joined to the period, and says so in words', async () => {
      payments = [...PAYMENTS, LATE_PAYMENT];
      await renderPage({ asOf: '2017-07-10' });
      const { panel, graph } = await openJune();

      // The 30th of May to the 2nd of July are shown: 34 days. The band of
      // the period ends at 94.118%
      expect(placeOf(within(graph).getByTestId('graph-period'))).toMatchObject({
        left: '5.882%',
        width: '88.235%',
      });
      const late = within(graph).getByRole('button', {
        name: 'Payment on 07/02/2017, late for June 2017: Bakery, -40.00',
      });
      expect(late.style.left).toBe('98.529%');
      expect(
        within(graph)
          .getAllByTestId('graph-late-link')
          .map(run => run.style.left),
      ).toEqual(['94.118%', '98.529%']);
      expect(graph).toHaveTextContent(
        'A payment left of the band is early: it is dated before June 2017 and counts in it. A payment right of the band is late: it is dated after June 2017 and counts in it.',
      );
      // The as-of day is not one of the days shown
      expect(within(graph).queryByTestId('graph-as-of')).toBeNull();
      expect(graph).toHaveTextContent('As of 07/10/2017, after the days shown');

      await userEvent.click(late);
      expect(group('Chosen in the graph', graph).textContent).toBe(
        '07/02/2017lateBakeryChecking-40.00Spent with this payment170.00',
      );

      expect(
        items(group('Payments', panel)).filter(text =>
          text?.startsWith('07/02/2017'),
        ),
      ).toEqual([expect.stringMatching(/^07\/02\/2017lateBakeryChecking/)]);
    });

    it('does not give an amount in the name of a mark while amounts are hidden', async () => {
      await renderPage({ isPrivate: true });
      const { graph } = await openJune();

      expect(
        within(graph).getByRole('button', {
          name: 'Payment on 06/05/2017: Market, hidden amount',
        }),
      ).toBeInTheDocument();
      expect(
        within(graph).getByRole('button', {
          name: 'Expected charge on 06/20/2017: Club, hidden amount',
        }),
      ).toBeInTheDocument();
    });

    it('says so when the as-of day is before the days shown, and has no line of what is spent', async () => {
      await renderPage({ asOf: '2017-05-20' });
      const { graph } = await openJune();

      expect(graph).toHaveTextContent(
        'As of 05/20/2017, before the days shown',
      );
      expect(within(graph).queryByTestId('graph-as-of')).toBeNull();
      expect(within(graph).queryByTestId('graph-spent')).toBeNull();
      expect(within(graph).queryByTestId('graph-spent-step')).toBeNull();
      // No payment is known yet: the days of the period are the days shown,
      // and what is expected goes on from the first of them
      expect(placeOf(within(graph).getByTestId('graph-period'))).toMatchObject({
        left: '0%',
        width: '100%',
      });
      expect(within(graph).queryByTestId('graph-early-link')).toBeNull();
      expect(
        within(graph).getAllByTestId('graph-expected').map(placeOf),
      ).toEqual([
        { left: '0%', width: '38.333%', top: '100%' },
        { left: '38.333%', width: '26.667%', top: '90%' },
        { left: '65%', width: '35%', top: '76%' },
      ]);
      // Not due yet on this day
      expect(
        within(graph).getByRole('button', {
          name: 'Expected charge on 06/12/2017: Gym, 50.00',
        }).style.left,
      ).toBe('38.333%');
    });

    it('has the level of zero when a refund brings what is spent under it, and no words about an early payment without one', async () => {
      payments = PAYMENTS.filter(payment => payment.id === 'refund');
      await renderPage();
      const { graph } = await openJune();

      // The days of the period are the days shown
      expect(placeOf(within(graph).getByTestId('graph-period'))).toMatchObject({
        left: '0%',
        width: '100%',
      });
      // Between 500.00 and -20.00
      expect(placeOf(within(graph).getByTestId('graph-zero'))).toEqual({
        left: '0%',
        width: '100%',
        top: '96.154%',
      });
      expect(within(graph).getAllByTestId('graph-spent').map(placeOf)).toEqual([
        { left: '0%', width: '31.667%', top: '96.154%' },
        { left: '31.667%', width: '16.667%', top: '100%' },
      ]);
      expect(within(graph).queryByTestId('graph-early-link')).toBeNull();
      expect(graph).not.toHaveTextContent('A payment left of the band');

      await userEvent.click(
        within(graph).getByRole('button', {
          name: 'Payment on 06/10/2017: Market, 20.00',
        }),
      );
      expect(group('Chosen in the graph', graph).textContent).toBe(
        '06/10/2017MarketChecking20.00Spent with this payment-20.00',
      );
    });
  });

  describe('the accounts under the timeline', () => {
    it('has the accounts with money and those that owe, each group with its sum', async () => {
      await renderPage();

      const table = accountsTable();
      expect(
        within(table)
          .getAllByRole('columnheader')
          .slice(0, 5)
          .map(header => header.textContent),
      ).toEqual([
        'Account',
        'Balance',
        'Lowest balance',
        'Transfer needed',
        'At the end',
      ]);
      expect(
        within(table).getByRole('columnheader', {
          name: 'Closing balances from 06/15/2017 to 07/31/2017',
        }),
      ).toHaveTextContent('JanFebMarAprMayJunJulAugSepOctNovDec');
      // Holiday is left out and Pension is not an account of the budget
      expect(
        within(table)
          .getAllByRole('rowheader')
          .map(header => header.textContent),
      ).toEqual([
        'In accounts4,000.00',
        'Checking',
        'Savings',
        'Owed250.00',
        'Card',
      ]);
      expect(group('Accounts')).not.toHaveTextContent(
        'No account is counted in the forecast.',
      );
    });

    it('has the balance, the lowest balance, the transfer needed and the balance at the end', async () => {
      await renderPage();

      expect(cellsOf('Checking')).toEqual([
        '1,000.00',
        '-280.00',
        '280.00by 06/20/2017',
        '1,770.00',
        '',
      ]);
      expect(cellsOf('Savings')).toEqual([
        '3,000.00',
        '3,000.00',
        '0.00',
        '3,500.00',
        '',
      ]);
      // No shortfall is forecast for an account that owes
      expect(cellsOf('Card')).toEqual([
        '-250.00',
        '-250.00',
        'not forecast',
        '0.00',
        '',
      ]);

      const totals = group('Cash in the forecast');
      expect(group('Balances together', totals)).toHaveTextContent('3,750.00');
      expect(group('Expected on 07/31/2017', totals)).toHaveTextContent(
        '5,270.00',
      );
    });

    it('has a balance under zero, and a transfer that is needed, in the colour of a warning', async () => {
      await renderPage();

      const checking = accountRow('Checking');
      expect(amountsIn(checking, '1,000.00')[0]).not.toHaveStyle(WARNING);
      expect(amountsIn(checking, '-280.00')[0]).toHaveStyle(WARNING);
      expect(amountsIn(checking, '1,770.00')[0]).not.toHaveStyle(WARNING);
      const card = accountRow('Card');
      // Its balance and its lowest balance
      expect(amountsIn(card, '-250.00')).toHaveLength(2);
      for (const amount of amountsIn(card, '-250.00')) {
        expect(amount).toHaveStyle(WARNING);
      }
      expect(amountsIn(card, '0.00')[0]).not.toHaveStyle(WARNING);
      // The balance of Savings and its lowest balance
      const savings = accountRow('Savings');
      expect(amountsIn(savings, '3,000.00')).toHaveLength(2);
      for (const amount of amountsIn(savings, '3,000.00')) {
        expect(amount).not.toHaveStyle(WARNING);
      }

      const totals = group('Cash in the forecast');
      expect(amountsIn(totals, '3,750.00')[0]).not.toHaveStyle(WARNING);
      expect(amountsIn(totals, '5,270.00')[0]).not.toHaveStyle(WARNING);

      const panel = await openAccount('Checking');
      expect(
        amountsIn(group('Balance on 06/15/2017', panel), '1,000.00')[0],
      ).not.toHaveStyle(WARNING);
      expect(
        amountsIn(group('Lowest balance', panel), '-280.00')[0],
      ).toHaveStyle(WARNING);
      expect(
        amountsIn(group('Balance on 07/31/2017', panel), '1,770.00')[0],
      ).not.toHaveStyle(WARNING);
      expect(
        amountsIn(group('Transfer needed', panel), '280.00')[0],
      ).toHaveStyle(WARNING);

      const savingsPanel = await openAccount('Savings');
      expect(
        amountsIn(group('Lowest balance', savingsPanel), '3,000.00')[0],
      ).not.toHaveStyle(WARNING);
    });

    it('has what is owed in the colour of a warning, in the row, the opened account and the sums', async () => {
      // Only Card is counted, and its bill is paid after the end of June
      leftOutIds = ['checking', 'savings', 'holiday'];
      await renderPage({ horizon: 'this-month' });

      expect(cellsOf('Card')).toEqual([
        '-250.00',
        '-250.00',
        'not forecast',
        '-250.00',
        '',
      ]);
      for (const amount of amountsIn(accountRow('Card'), '-250.00')) {
        expect(amount).toHaveStyle(WARNING);
      }
      const totals = group('Cash in the forecast');
      expect(
        amountsIn(group('Balances together', totals), '-250.00')[0],
      ).toHaveStyle(WARNING);
      expect(
        amountsIn(group('Expected on 06/30/2017', totals), '-250.00')[0],
      ).toHaveStyle(WARNING);

      const panel = await openAccount('Card');
      for (const name of [
        'Balance on 06/15/2017',
        'Lowest balance',
        'Balance on 06/30/2017',
      ]) {
        expect(amountsIn(group(name, panel), '-250.00')[0]).toHaveStyle(
          WARNING,
        );
      }
    });

    it('draws the closing balance on the axis of the periods, with the days an account is short', async () => {
      await renderPage();

      const checking = trackOf('Checking');
      expect(checking).toHaveAccessibleName(
        'Balance of Checking from 06/15/2017 to 07/31/2017, lowest -280.00, at the end 1,770.00, short from 06/20/2017, a transfer of 280.00 covers it',
      );
      // The axis is the year 2017: 365 days. Short from the middle of the
      // 20th of June to the middle of the 1st of July, and from the 20th to
      // the 25th of July
      expect(
        within(checking)
          .getAllByTestId('shortfall')
          .map(band => [band.style.left, band.style.width]),
      ).toEqual([
        ['46.712%', '3.014%'],
        ['54.932%', '1.37%'],
      ]);
      // From the as-of day to the end of the last day of the forecast
      expect(within(checking).getByTestId('forecast-as-of').style.left).toBe(
        '45.342%',
      );
      expect(within(checking).getByTestId('forecast-end').style.left).toBe(
        '58.082%',
      );
      // One level for each day with a movement, and the as-of day
      const levels = within(checking).getAllByTestId('balance-line');
      expect(levels.map(level => level.style.left)).toEqual([
        '45.342%',
        '46.712%',
        '48.904%',
        '49.726%',
        '50.822%',
        '52.192%',
        '54.932%',
        '56.301%',
      ]);
      // Between 1,770.00 and -280.00: 950.00 first, 1,770.00 at the end
      expect(levels[0].style.top).toBe('40%');
      expect(levels[7].style.top).toBe('0%');
      expect(levels[2].style.top).toBe('100%');
      expect(within(checking).getAllByTestId('balance-step')).toHaveLength(7);
      expect(placeOf(within(checking).getByTestId('balance-zero'))).toEqual({
        left: '45.342%',
        width: '12.74%',
        top: '86.341%',
      });

      expect(trackOf('Savings')).toHaveAccessibleName(
        'Balance of Savings from 06/15/2017 to 07/31/2017, lowest 3,000.00, at the end 3,500.00, not short',
      );
      expect(within(trackOf('Savings')).queryByTestId('shortfall')).toBeNull();
      expect(trackOf('Card')).toHaveAccessibleName(
        'Balance of Card from 06/15/2017 to 07/31/2017, lowest -250.00, at the end 0.00, shortfalls are not forecast',
      );
      expect(within(trackOf('Card')).queryByTestId('shortfall')).toBeNull();
    });

    it('lists the payments, the income and the transfers of an opened account', async () => {
      await renderPage();
      const toggle = within(accountsTable()).getByRole('button', {
        name: 'Checking',
      });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      const panel = await openAccount('Checking');

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expectCheckingPanel(panel);

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Close' }),
      );
      expect(
        screen.queryByRole('region', { name: 'Checking' }),
      ).not.toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('says that an account is not short, or that no shortfall is forecast for it', async () => {
      await renderPage();

      const savings = await openAccount('Savings');
      expect(savings).toHaveTextContent(
        'This account does not fall short before 07/31/2017.',
      );
      expect(savings).not.toHaveTextContent('counts as owed');
      expect(within(savings).queryByRole('alert')).toBeNull();
      expect(
        within(savings).queryByRole('group', { name: 'Transfer needed' }),
      ).toBeNull();
      expect(group('Upcoming payments', savings)).toHaveTextContent(
        'No scheduled payment before 07/31/2017.',
      );
      expect(group('Expected income', savings)).toHaveTextContent(
        'No scheduled income before 07/31/2017.',
      );
      // A transfer that comes in is not income
      expect(items(group('Transfers', savings))).toEqual([
        '07/05/2017To savings500.00',
      ]);

      // One account is open at a time
      const card = await openAccount('Card');
      expect(
        screen.queryByRole('region', { name: 'Savings' }),
      ).not.toBeInTheDocument();
      expect(card).toHaveTextContent(
        'Shortfalls are forecast for accounts with a balance above zero on the as-of day. This account has none, so it counts as owed.',
      );
      expect(card).not.toHaveTextContent('does not fall short');
      expect(within(card).queryByRole('alert')).toBeNull();
      expect(group('Balance on 07/31/2017', card)).toHaveTextContent('0.00');
      expect(group('Transfers', card)).toHaveTextContent(
        '07/10/2017Card bill250.00',
      );
      expect(group('Transfers', card)).not.toHaveTextContent(
        'No scheduled transfer',
      );
      expect(group('Upcoming payments', card)).toHaveTextContent(
        'No scheduled payment before 07/31/2017.',
      );
    });

    it('leaves an account out of the forecast, and takes it in again', async () => {
      await renderPage();
      const accounts = group('Accounts');
      expect(items(group('Left out of the forecast', accounts))).toEqual([
        'HolidayInclude',
      ]);

      const panel = await openAccount('Checking');
      await userEvent.click(
        within(panel).getByRole('button', { name: 'Leave this account out' }),
      );

      await waitFor(() =>
        expect(
          within(accountsTable())
            .getAllByRole('rowheader')
            .map(header => header.textContent),
        ).toEqual(['In accounts3,000.00', 'Savings', 'Owed250.00', 'Card']),
      );
      expect(write.mock.calls).toEqual([
        ['period-budget/exclude-account', { accountId: 'checking' }],
      ]);
      expect(
        screen.queryByRole('region', { name: 'Checking' }),
      ).not.toBeInTheDocument();
      expect(group('Balances together')).toHaveTextContent('2,750.00');
      // What comes in from an account that is left out is still counted
      expect(cellsOf('Savings')[3]).toBe('3,500.00');
      expect(items(group('Left out of the forecast', accounts))).toEqual([
        'CheckingInclude',
        'HolidayInclude',
      ]);

      await userEvent.click(
        screen.getByRole('button', { name: 'Include Holiday' }),
      );

      await waitFor(() =>
        expect(
          within(accountsTable())
            .getAllByRole('rowheader')
            .map(header => header.textContent),
        ).toEqual([
          'In accounts3,050.00',
          'Savings',
          'Holiday',
          'Owed250.00',
          'Card',
        ]),
      );
      expect(write.mock.calls[1]).toEqual([
        'period-budget/include-account',
        { accountId: 'holiday' },
      ]);
      expect(cellsOf('Holiday')).toEqual([
        '50.00',
        '50.00',
        '0.00',
        '50.00',
        '',
      ]);
      expect(items(group('Left out of the forecast', accounts))).toEqual([
        'CheckingInclude',
      ]);
    });

    it('does not give an amount in the name of a balance while amounts are hidden', async () => {
      await renderPage({ isPrivate: true });

      expect(trackOf('Checking')).toHaveAccessibleName(
        'Balance of Checking from 06/15/2017 to 07/31/2017, lowest hidden amount, at the end hidden amount, short from 06/20/2017, a transfer of hidden amount covers it',
      );
    });

    it('says so when no account is counted', async () => {
      leftOutIds = ['checking', 'savings', 'card', 'holiday'];
      await renderPage();

      const accounts = group('Accounts');
      expect(accounts).toHaveTextContent(
        'No account is counted in the forecast.',
      );
      expect(
        screen.queryByRole('table', { name: 'Accounts in the forecast' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: 'Cash in the forecast' }),
      ).not.toBeInTheDocument();
      expect(items(group('Left out of the forecast', accounts))).toEqual([
        'CheckingInclude',
        'SavingsInclude',
        'CardInclude',
        'HolidayInclude',
      ]);
    });

    it('says so when there is no forecast, and offers to leave an account out', async () => {
      hasUnusableBalance = true;
      await renderPage();

      const accounts = group('Accounts');
      expect(accounts).toHaveTextContent(
        'There is no forecast: the balance of an account that is counted could not be used. Leave that account out to get a forecast of the others.',
      );
      expect(
        screen.queryByRole('table', { name: 'Accounts in the forecast' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: 'Cash in the forecast' }),
      ).not.toBeInTheDocument();
      expect(items(group('Counted in the forecast', accounts))).toEqual([
        'CheckingLeave out',
        'SavingsLeave out',
        'CardLeave out',
      ]);

      hasUnusableBalance = false;
      await userEvent.click(
        screen.getByRole('button', { name: 'Leave out Card' }),
      );

      await waitFor(() =>
        expect(
          within(accountsTable())
            .getAllByRole('rowheader')
            .map(header => header.textContent),
        ).toEqual(['In accounts4,000.00', 'Checking', 'Savings']),
      );
      expect(write.mock.calls).toEqual([
        ['period-budget/exclude-account', { accountId: 'card' }],
      ]);
      expect(
        screen.queryByRole('group', { name: 'Counted in the forecast' }),
      ).not.toBeInTheDocument();
    });

    it('draws each balance between its highest and its lowest, with zero among them', async () => {
      await renderPage();

      function levelsOf(name: string) {
        const track = trackOf(name);
        return {
          zero: within(track).getByTestId('balance-zero').style.top,
          lines: within(track)
            .getAllByTestId('balance-line')
            .map(line => line.style.top),
        };
      }

      // 3,000.00, then 3,500.00: zero is the lowest
      expect(levelsOf('Savings')).toEqual({
        zero: '100%',
        lines: ['14.286%', '0%'],
      });
      // -250.00, then 0.00: zero is the highest
      expect(levelsOf('Card')).toEqual({ zero: '0%', lines: ['100%', '0%'] });

      // Until the end of June the card stays at -250.00, under zero
      await userEvent.click(horizonButton('End of this month'));
      await waitFor(() =>
        expect(levelsOf('Card')).toEqual({ zero: '0%', lines: ['100%'] }),
      );
    });

    it('goes on from the left edge when the forecast began before the months shown', async () => {
      await renderPage({ horizon: '12-months' });

      // The year 2017: the forecast goes on after its last day
      const checking = trackOf('Checking');
      expect(within(checking).getAllByTestId('balance-line')).toHaveLength(9);
      expect(within(checking).getAllByTestId('balance-step')).toHaveLength(8);
      expect(within(checking).queryByTestId('forecast-end')).toBeNull();
      expect(within(checking).getByTestId('forecast-as-of').style.left).toBe(
        '45.342%',
      );

      await userEvent.click(
        screen.getByRole('button', { name: 'Show later months' }),
      );

      // The year 2018: the balance of August until the 15th of January, then
      // that of January until the end of the 15th of June
      await waitFor(() =>
        expect(
          within(trackOf('Checking'))
            .getAllByTestId('balance-line')
            .map(line => [line.style.left, line.style.width]),
        ).toEqual([
          ['0%', '3.973%'],
          ['3.973%', '41.507%'],
        ]),
      );
      const later = trackOf('Checking');
      expect(within(later).getAllByTestId('balance-step')).toHaveLength(1);
      expect(within(later).getByTestId('forecast-end').style.left).toBe(
        '45.479%',
      );
      expect(within(later).queryByTestId('forecast-as-of')).toBeNull();
      expect(within(later).queryByTestId('shortfall')).toBeNull();
      expect(later).toHaveAccessibleName(
        'Balance of Checking from 06/15/2017 to 06/15/2018, lowest -280.00, at the end 470.00, short from 06/20/2017, a transfer of 280.00 covers it',
      );
    });

    it('has nothing on the track when the forecast is not in the months shown', async () => {
      await renderPage();

      await userEvent.click(
        screen.getByRole('button', { name: 'Show earlier months' }),
      );

      await waitFor(() =>
        expect(
          within(trackOf('Checking')).queryByTestId('balance-line'),
        ).toBeNull(),
      );
      const checking = trackOf('Checking');
      for (const id of [
        'balance-zero',
        'balance-step',
        'shortfall',
        'forecast-end',
        'forecast-as-of',
      ]) {
        expect(within(checking).queryByTestId(id)).toBeNull();
      }
      expect(checking).toHaveAccessibleName(
        'Balance of Checking from 06/15/2017 to 07/31/2017, lowest -280.00, at the end 1,770.00, short from 06/20/2017, a transfer of 280.00 covers it',
      );
    });
  });

  describe('how far the forecast looks', () => {
    it('looks to the end of next month when nothing is chosen', async () => {
      await renderPage();

      const control = group('Forecast until');
      expect(
        within(control)
          .getAllByRole('button')
          .map(button => [
            button.textContent,
            button.getAttribute('aria-pressed'),
          ]),
      ).toEqual([
        ['End of this month', 'false'],
        ['End of next month', 'true'],
        ['In 90 days', 'false'],
        ['In 12 months', 'false'],
      ]);
      expect(control).toHaveTextContent('From 06/15/2017 to 07/31/2017');
      expect(savePref).not.toHaveBeenCalled();
    });

    it('changes the forecast with the choice, and stores the choice', async () => {
      await renderPage();

      await userEvent.click(horizonButton('In 90 days'));

      expect(
        await screen.findByRole('group', { name: 'Expected on 09/13/2017' }),
      ).toHaveTextContent('4,070.00');
      expect(savePref.mock.calls).toEqual([
        ['period-budget-horizon', '90-days'],
      ]);
      expect(horizonButton('In 90 days')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(horizonButton('End of next month')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(group('Forecast until')).toHaveTextContent(
        'From 06/15/2017 to 09/13/2017',
      );
      expect(cellsOf('Checking')).toEqual([
        '1,000.00',
        '-280.00',
        '280.00by 06/20/2017',
        '570.00',
        '',
      ]);
      expect(trackOf('Checking')).toHaveAccessibleName(
        'Balance of Checking from 06/15/2017 to 09/13/2017, lowest -280.00, at the end 570.00, short from 06/20/2017, a transfer of 280.00 covers it',
      );
      expect(
        within(accountsTable()).getByRole('columnheader', {
          name: 'Closing balances from 06/15/2017 to 09/13/2017',
        }),
      ).toBeInTheDocument();
      // The rent of August is counted now
      const panel = await openAccount('Checking');
      expect(items(group('Upcoming payments', panel))).toEqual([
        ...CHECKING_PAYMENTS,
        '08/20/2017Rent-1,200.00',
      ]);

      await userEvent.click(horizonButton('End of this month'));

      expect(
        await screen.findByRole('group', { name: 'Expected on 06/30/2017' }),
      ).toHaveTextContent('2,470.00');
      expect(savePref.mock.calls[1]).toEqual([
        'period-budget-horizon',
        'this-month',
      ]);
      // Short until the last day of the forecast
      expect(cellsOf('Checking')).toEqual([
        '1,000.00',
        '-280.00',
        '280.00by 06/20/2017',
        '-280.00',
        '',
      ]);
      expect(cellsOf('Savings')[3]).toBe('3,000.00');
      expect(cellsOf('Card')[3]).toBe('-250.00');
      expect(
        within(trackOf('Checking'))
          .getAllByTestId('shortfall')
          .map(band => [band.style.left, band.style.width]),
      ).toEqual([['46.712%', '2.877%']]);
      expect(items(group('Upcoming payments', panel))).toEqual(
        CHECKING_PAYMENTS.slice(0, 3),
      );
      expect(group('Expected income', panel)).toHaveTextContent(
        'No scheduled income before 06/30/2017.',
      );
      expect(group('Transfers', panel)).toHaveTextContent(
        'No scheduled transfer before 06/30/2017.',
      );

      await userEvent.click(horizonButton('In 12 months'));

      expect(
        await screen.findByRole('group', { name: 'Expected on 06/15/2018' }),
      ).toHaveTextContent('3,970.00');
      expect(savePref.mock.calls[2]).toEqual([
        'period-budget-horizon',
        '12-months',
      ]);
      expect(cellsOf('Checking')[3]).toBe('470.00');

      await userEvent.click(horizonButton('End of next month'));

      expect(
        await screen.findByRole('group', { name: 'Expected on 07/31/2017' }),
      ).toHaveTextContent('5,270.00');
      expect(savePref.mock.calls[3]).toEqual([
        'period-budget-horizon',
        'next-month',
      ]);
    });

    it('looks as far as was chosen before', async () => {
      await renderPage({ horizon: 'this-month' });

      expect(horizonButton('End of this month')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(horizonButton('End of next month')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(group('Expected on 06/30/2017')).toHaveTextContent('2,470.00');
      expect(cellsOf('Checking')[3]).toBe('-280.00');
      expect(savePref).not.toHaveBeenCalled();
    });

    it('looks to the end of next month when what is stored is not a choice', async () => {
      await renderPage({ horizon: 'next-year' });

      expect(horizonButton('End of next month')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(group('Expected on 07/31/2017')).toHaveTextContent('5,270.00');
    });
  });

  describe('on a phone', () => {
    beforeEach(() => {
      responsive.isNarrowWidth = true;
    });

    async function renderAccounts(options?: PageOptions) {
      await renderPage(options);
      await userEvent.click(screen.getByRole('tab', { name: 'Accounts' }));
    }

    it('has the figures of the accounts on "Accounts"', async () => {
      await renderPage();

      expect(screen.getByRole('tab', { name: 'Accounts' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
      expect(
        screen.queryByRole('group', { name: 'Forecast until' }),
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('tab', { name: 'Accounts' }));

      expect(screen.getByRole('tab', { name: 'Accounts' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      const totals = group('Cash in the forecast');
      expect(group('Balances together', totals)).toHaveTextContent('3,750.00');
      expect(group('Expected on 07/31/2017', totals)).toHaveTextContent(
        '5,270.00',
      );

      const inAccounts = group('In accounts');
      expect(inAccounts).toHaveTextContent(/^In accounts4,000.00/);
      expect(
        within(inAccounts)
          .getAllByRole('button')
          .map(button => button.textContent),
      ).toEqual(['Checking', 'Savings']);
      const owed = group('Owed');
      expect(owed).toHaveTextContent(/^Owed250.00/);
      expect(
        within(owed)
          .getAllByRole('button')
          .map(button => button.textContent),
      ).toEqual(['Card']);

      const checking = cardOf('Checking');
      expect(group('Balance', checking)).toHaveTextContent('1,000.00');
      expect(group('Lowest balance', checking)).toHaveTextContent('-280.00');
      expect(group('At the end', checking)).toHaveTextContent('1,770.00');
      expect(group('Transfer needed', checking)).toHaveTextContent('280.00');
      expect(checking).toHaveTextContent('Falls short on 06/20/2017');

      const savings = cardOf('Savings');
      expect(group('Balance', savings)).toHaveTextContent('3,000.00');
      expect(group('Lowest balance', savings)).toHaveTextContent('3,000.00');
      expect(group('At the end', savings)).toHaveTextContent('3,500.00');
      expect(
        within(savings).queryByRole('group', { name: 'Transfer needed' }),
      ).toBeNull();
      expect(savings).not.toHaveTextContent('Falls short');

      const card = cardOf('Card');
      expect(group('Balance', card)).toHaveTextContent('-250.00');
      expect(group('Lowest balance', card)).toHaveTextContent('-250.00');
      expect(group('At the end', card)).toHaveTextContent('0.00');
      expect(
        within(card).queryByRole('group', { name: 'Transfer needed' }),
      ).toBeNull();

      expect(items(group('Left out of the forecast'))).toEqual([
        'HolidayInclude',
      ]);
    });

    it('opens an account in place of the list', async () => {
      await renderAccounts();

      await userEvent.click(screen.getByRole('button', { name: 'Checking' }));

      const panel = screen.getByRole('region', { name: 'Checking' });
      expectCheckingPanel(panel);
      expect(
        screen.queryByRole('group', { name: 'In accounts' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: 'Forecast until' }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        within(panel).getByRole('button', { name: 'Close' }),
      );

      expect(
        screen.queryByRole('region', { name: 'Checking' }),
      ).not.toBeInTheDocument();
      expect(group('In accounts')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Savings' }));

      const savings = screen.getByRole('region', { name: 'Savings' });
      expect(group('Balance on 06/15/2017', savings)).toHaveTextContent(
        '3,000.00',
      );
      expect(items(group('Transfers', savings))).toEqual([
        '07/05/2017To savings500.00',
      ]);
    });

    it('changes the forecast with the choice, and stores the choice', async () => {
      await renderAccounts();

      await userEvent.click(horizonButton('End of this month'));

      expect(
        await screen.findByRole('group', { name: 'Expected on 06/30/2017' }),
      ).toHaveTextContent('2,470.00');
      expect(savePref.mock.calls).toEqual([
        ['period-budget-horizon', 'this-month'],
      ]);
      expect(group('At the end', cardOf('Checking'))).toHaveTextContent(
        '-280.00',
      );
      expect(group('At the end', cardOf('Savings'))).toHaveTextContent(
        '3,000.00',
      );
    });

    it('looks as far as was chosen before', async () => {
      await renderAccounts({ horizon: '90-days' });

      expect(horizonButton('In 90 days')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(group('Expected on 09/13/2017')).toHaveTextContent('4,070.00');
      expect(group('At the end', cardOf('Checking'))).toHaveTextContent(
        '570.00',
      );
    });

    it('leaves an account out of the forecast, and takes it in again', async () => {
      await renderAccounts();

      await userEvent.click(screen.getByRole('button', { name: 'Checking' }));
      await userEvent.click(
        screen.getByRole('button', { name: 'Leave this account out' }),
      );

      await waitFor(() =>
        expect(items(group('Left out of the forecast'))).toEqual([
          'CheckingInclude',
          'HolidayInclude',
        ]),
      );
      expect(write.mock.calls).toEqual([
        ['period-budget/exclude-account', { accountId: 'checking' }],
      ]);
      expect(
        screen.queryByRole('region', { name: 'Checking' }),
      ).not.toBeInTheDocument();
      expect(group('In accounts')).toHaveTextContent(/^In accounts3,000.00/);

      await userEvent.click(
        screen.getByRole('button', { name: 'Include Checking' }),
      );

      await waitFor(() =>
        expect(group('In accounts')).toHaveTextContent(/^In accounts4,000.00/),
      );
      expect(write.mock.calls[1]).toEqual([
        'period-budget/include-account',
        { accountId: 'checking' },
      ]);
      // The list is shown, not the account that was open before
      expect(
        screen.queryByRole('region', { name: 'Checking' }),
      ).not.toBeInTheDocument();
    });

    it('says so when there is no forecast, or no account is counted', async () => {
      hasUnusableBalance = true;
      await renderAccounts();

      expect(
        screen.getByText(
          'There is no forecast: the balance of an account that is counted could not be used. Leave that account out to get a forecast of the others.',
        ),
      ).toBeInTheDocument();
      expect(items(group('Counted in the forecast'))).toEqual([
        'CheckingLeave out',
        'SavingsLeave out',
        'CardLeave out',
      ]);
      expect(
        screen.queryByRole('group', { name: 'In accounts' }),
      ).not.toBeInTheDocument();
    });

    it('has the graph in an opened period', async () => {
      await renderPage();
      await userEvent.click(screen.getByRole('tab', { name: 'Periods' }));
      await userEvent.click(screen.getByRole('button', { name: /^Food/ }));

      const graph = group('Graph of Food, June 2017');
      expect(within(graph).getByTestId('graph-allowance')).toBeInTheDocument();
      expect(within(graph).getAllByTestId('graph-early-link')).toHaveLength(2);
      // On a phone the amounts are not hidden
      expect(
        within(graph).getByRole('button', {
          name: 'Payment on 05/30/2017, early for June 2017: Grocer, -30.00',
        }),
      ).toBeInTheDocument();
    });
  });
});
