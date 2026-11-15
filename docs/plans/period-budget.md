# Period budget plan B: cadence and derivation

Candidate plan for TASK-8, TASK-10, TASK-11 and TASK-12. Written 2026-11-15 against `docs/SPEC.md` and Actual v26.11.0. It answers the open decisions of spec section 10. Plan A is the alternative; the part headed "Decisions that are the same" is identical in both.

## The idea

The user states a rule once for each category ("insurance: every 12 months from 1 January, 1,200"). The app derives what follows from that rule and from Actual's schedules, and stores only the values that are the user's own: each period's allowance, and the exceptions. Periods continue by themselves, and a scheduled bill paid early or late lands in the right period without anyone assigning it.

What using it feels like: the user sets a cadence for each category once and links the insurance schedule to the insurance category. On 1 May the new monthly periods are simply there, each with April's allowance copied as its own value. When next year's premium is paid on 20 December, it is matched to the 1 January charge and counted in the 2028 period with no action. The user steps in only for exceptions: a skipped bill, a different amount, a wrong match.

## B1. Tables

| Table                     | Fields                                                                                             | Row id                       |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------- |
| `period_cadences`         | `anchor_date`, `months` (1, 3, 12 or another whole number), `active`, `tombstone`                  | the category's id            |
| `period_budgets`          | `category`, `start_date`, `end_date`, `budget`, `carryover`, `carried_from`, `tombstone`           | `<category id>:<start date>` |
| `period_offsets`          | `period_id`, `tombstone`                                                                           | the transaction's id         |
| `period_schedule_links`   | `category`, `tombstone`                                                                            | the schedule's id            |
| `period_charge_overrides` | `amount` (optional), `skipped`, `transaction_id` (optional), `open_amount` (optional), `tombstone` | `<schedule id>:<due date>`   |
| `period_accounts`         | `excluded`, `tombstone`                                                                            | the account's id             |

`period_budgets` is the spec's record (section 3) plus `carried_from`. Every id is built from what the row describes, so two devices that create "the same" row create one row.

## B2. Periods

- Create: the user sets a cadence on a category (start date and length in months) and the first allowance. The first period is stored.
- The next period: the app stores it when its start date arrives. It starts at the end of the latest stored period, lasts the cadence's length, and gets that period's allowance copied as its own value, with no carry (spec section 3: a copy is an independent value). Its id is fixed by category and start date, so two devices storing it make one row. To keep a device that is behind from overwriting newer edits, a device stores the next period only straight after a successful sync, or at once when the file has no sync server.
- A row's id never changes, also when its dates are edited later. The app never writes over an existing id: if the id for the next period belongs to a period the user deleted, the period stays deleted (its dates count as taken, the following period starts at its end, and the row offers "Restore"); if it belongs to a live period whose dates were moved, `:2` is added to the new id.
- Looking ahead: periods not yet stored are shown as planned rows, derived from the cadence and the latest allowance, and are calculated with the id they will get, so a charge or an early payment can already belong to one. Editing a planned row stores it.
- Edit: allowance and dates of any period. Only that row changes. Changing a period's end date moves where the next one starts. Changing the cadence affects only periods not yet stored.
- Stop: switching the cadence off stops new periods. Spending after the last one is flagged as unassigned (spec section 3).
- A category without a cadence can still have periods made one at a time with two dates.

## B3. Offsets

Both kinds (spec section 10, second decision).

- Derived: a payment matched to a scheduled charge (B4) counts in the period that contains the charge's due date. Nothing is stored. This is what places a 20 December payment of a 1 January bill in the new year's period. It applies when the payment's category is the schedule's linked category; a payment categorised elsewhere settles the charge but is spending of its own category and date (S2).
- Manual: "Count in another period" in a payment's detail stores a row in `period_offsets`. A manual offset always wins over a derived one.

## B4. Expected charges

- Expected charges are not stored. They are derived, each time the page is calculated, from the Actual schedules the user has linked to a category (`period_schedule_links`; the app suggests the category Actual's rules give that schedule's transactions). Only schedules with a negative amount become charges.
- Identity: `<schedule id>:<due date>`, with dates from `getScheduleDates`. Actual's own forecast names its simulated transactions the same way (`forecast-<schedule id>-<date>` in `forecast-schedules.ts`).
- Period: the linked category's period that contains the due date. A charge with no period is listed under "Needs attention".
- A bill with no schedule: the user adds a one-time schedule in Actual. There are no hand-made charges.
- Matching is calculated, not stored. For each schedule, the transactions that carry its id (Actual sets it when it posts or matches a scheduled transaction) are taken in date order, and each is matched to the charge whose due date is nearest, within half the schedule's interval; of two equally near, the earlier. The match does not depend on the as-of date; the landed calculation keeps a charge expected while its payment is dated after the as-of date (spec section 5).
- Amount differs: the payment replaces the expectation (spec section 5).
- Several payments for one bill: the first settles the charge. A further payment that is nearest to an already settled charge counts as spending in that charge's period and changes nothing else.
- Part payment: the first payment settles the charge. To keep the rest expected, the user sets "still expected" on the charge (`open_amount`), which stays expected until the user clears it.
- Exceptions, stored as overrides for one charge: a different expected amount; skipped (cancelled); matched to a transaction the user names, which wins over the calculated match.
- Cancelled for good: completing or deleting the schedule in Actual removes its future charges.
- Overdue: an unpaid, unskipped charge whose due date has passed stays expected and is labelled "overdue". In the cash forecast it leaves the account on the as-of date.
- If a schedule's dates are edited in Actual, future charges follow it at once. Overrides for dates that no longer exist are ignored and listed under "Needs attention".

## B5. Accounts and cards

- All open on-budget accounts are selected from the start. The user removes the ones that do not belong (`excluded`).
- There is no card setting. Cash available is the sum of all selected balances (spec section 6), and under it the figure is split by sign: "in accounts" (balances above zero) and "owed" (balances below zero, which is where cards show up).
- Shortfalls are forecast for every selected account whose balance is above zero now.

## B6. Page, graph and phone

- Layout: a timeline. All rows share one horizontal time axis, the calendar year of the selected month (it can be moved and zoomed), with a vertical line at the as-of date.
  - Header: month and as-of date; the three figures (cash in selected accounts, spent this month, remaining in active periods); overspending on its own line under them; "Needs attention".
  - One row for each category, grouped by Actual's category groups. On the left: category, allowance, spent, remaining and expected remaining of its active period. On the axis: a bar for each of its periods at its true dates and length, filled to show spent against allowance; a solid dot at each payment's bank date; a hollow dot at each expected charge.
  - Selecting a bar opens that row in place: the full graph (allowance line, cumulative spending line, markers, dashed projection) and the list of payments and charges, with the period's actions (carry, edit, link, skip).
  - Accounts: rows under the categories on the same axis, each a balance line across the horizon with shortfalls marked and the transfer that would cover them.
- Payments outside a period: because every row uses real dates on one axis, a payment counted in a period but dated outside it sits at its real date, outside the bar, joined to the bar by a line. Nothing is moved to fit. An irregular period is simply a bar of its real length.
- Phone: three tabs. "Month": the three figures with their labels, overspending, and this month's payments. "Periods": for each category a short bar showing how far through the period and the allowance it is, with remaining and expected remaining; tapping opens the full graph. "Accounts": balances, shortfall warnings and transfers needed.

## B7. Two devices changing the same thing

| What happens                                                                                                   | Result                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Both store the next period                                                                                     | One row (same id), same copied allowance.                                                                                                                                     |
| One edits a coming period ahead of time; the other would store it at rollover                                  | The second device syncs before storing (B2), sees the row and leaves it. With no connection it shows the planned row and stores nothing.                                      |
| The same, but the first device was offline when it edited and syncs only after the other has stored the period | The later write stays, which is the copied allowance: the offline edit is lost and has to be made again. This is the one case where the app's own write can replace a user's. |
| One deletes a period, the other edits it                                                                       | It stays deleted, and the app does not create it again (B2).                                                                                                                  |
| One changes an allowance, the other the end date                                                               | Both changes apply.                                                                                                                                                           |
| Both change the same allowance                                                                                 | The later change stays.                                                                                                                                                       |
| One changes a period's end date while the other stores the next period from the old end                        | An overlap or a gap. The loader keeps the earlier period (S2) and lists the other under "Needs attention"; a gap shows as unassigned spending.                                |
| Both change a cadence                                                                                          | The later value of each field stays; stored periods are not touched.                                                                                                          |
| Both offset one transaction to different periods                                                               | One offset row; the later choice stays.                                                                                                                                       |
| Both override the same charge                                                                                  | One override row; the later value of each field stays.                                                                                                                        |
| A schedule's dates are edited on one device                                                                    | Charges follow on every device after sync; overrides for vanished dates are listed under "Needs attention".                                                                   |

## B8. What it gives and what it costs

- Gives: set up once, then almost no upkeep; scheduled bills paid early or late land in the right period by themselves; few stored rows, and ids that make duplicate rows impossible; the whole year and the accounts on one time axis.
- Costs: it depends on Actual's schedules being right, and expected charges change when a schedule is edited. The calculated match can be wrong and then needs an override. A bill without a schedule needs one made in Actual. The app writes rows (the next period) without a user action. The adapter and the page are the larger pieces of work.

## B9. Work and proposed acceptance criteria by task

These replace "acceptance criteria are set from the owner's plan" on each ticket once this plan is chosen.

TASK-8 Storage

1. One additive migration creates the six tables of B1; each is in the query schema and has a model type.
2. Handlers exist, each undoable: set and switch off a cadence; create, edit, delete, restore and carry a period; set and clear an offset; link and unlink a schedule; set and clear a charge override; exclude and include an account.
3. Storing the next period follows B2: after a successful sync or on a file without a server, with the fixed id, the allowance copied as its own value, no carry, and never over an existing id. Tests cover a deleted id and a moved period.
4. Planned rows are derived for any date range and carry the id they will get.
5. A handler refuses a write that is invalid on its own device (overlap, end not after start, offset to another category) and says why.
6. The loader turns any stored rows into input the landed calculation accepts, and returns the set-aside rows with reasons. Each rule of S2 has a test.
7. Each row of B7 has a test that applies two devices' changes in both orders and gets the stated result both times.

TASK-10 Schedule adapter

1. For the linked schedules and a date range, it returns the charges of B4 with their ids, periods and amounts, with overrides applied.
2. The matching rule of B4 has tests for: paid early, paid late, a different amount, two payments for one charge, a part payment with "still expected", a skipped charge, a named match that differs from the calculated one, and a payment after the as-of date.
3. Derived offsets follow B3; a manual offset wins; monthly actual spending is the same with and without them.
4. Future cash movements for the selected accounts come from Actual's schedules inside the horizon: transfers have two legs, nothing already posted is repeated, an overdue charge is placed on the as-of date.
5. With the rows of the spec's worked example stored (section 8), the results are 2,230 spent in April, 970 remaining, 80 overspent, 0 expected remaining for taxes, 4,200 cash and a 200 transfer needed.

TASK-11 Page

1. The sidebar page of S7 exists, hidden by default; Actual's budget page is unchanged.
2. Header and category rows show what B6 lists, with period bars, payment dots and charge dots on the shared axis and the as-of line. Every money figure has a label; the combined remaining is never labelled as a monthly limit or as cash (spec section 5).
3. Selecting a bar opens the row with its payments, charges and actions, without the full graph. Each bar and dot has a text equivalent for keyboard and screen-reader use.
4. Cadence setup, schedule links, period edits, carry, offsets and overrides work from the page.
5. "Needs attention" lists set-aside rows, unassigned spending, charges without a period and overrides without a date, each with its fixing action.
6. The phone "Month" and "Periods" tabs of B6 work at 360 px width.

TASK-12 Graph and forecast

1. The full graph in the opened row follows the conventions of spec section 7; a payment outside its period is drawn at its real date with the connector, and the payment list says so in words.
2. Account rows on the shared axis show what S5 lists, with the "in accounts" and "owed" split of B5.
3. The horizon control of S5 changes the forecast and is remembered.
4. The phone "Accounts" tab shows the same figures.

## Decisions that are the same in Plan A and Plan B

These have one sensible answer, or the spec already fixes them. The text of this part is identical in both plans.

### S1. Storage rules

- New tables only. None of Actual's own tables gets a new column. One migration file in `packages/loot-core/migrations/`, additive only. (v26.11.0's migration check accepts additive migrations it does not know: `checkDatabaseValidity` in `packages/loot-core/src/server/migrate/migrations.ts`.)
- Every table has `id TEXT PRIMARY KEY` and `tombstone INTEGER DEFAULT 0`. Deleting sets the tombstone, as Actual does.
- Every write goes through loot-core's `db.insert`, `db.update` and `db.delete_`, so each field of each row is its own sync message. Two devices that change different fields of one row both keep their change; two that change the same field keep the later one. This is Actual's rule for all of its tables and is not changed.
- Server handlers live in `packages/loot-core/src/server/period-budget/app.ts`, each wrapped in `mutator(undoable(...))` the way `server/tags/app.ts` does, so edits can be undone. Tables are added to the query schema (`server/aql/schema/index.ts`); dates use its `date` type, as `transactions.date` does; money is an integer in minor units.

### S2. Reading stored data after a sync

The landed calculation functions reject invalid input (overlapping periods, an end date not after the start, an offset to a missing period or to another category). Two devices can each make a valid edit that is invalid once merged. Stored data must never make the page fail, so a loader sits between storage and the calculation:

- It checks every row. A row that breaks a rule is set aside, the calculation runs with the rest, and the page lists each set-aside row under "Needs attention" with the reason and an action that fixes it.
- For two overlapping periods of one category, every device sets aside the same one: the period with the earlier start is kept; with equal starts, the one whose id sorts first.
- Spending that falls in a set-aside period's dates is flagged as unassigned, exactly like spending in a gap (spec section 3).
- An offset or a charge that points at a deleted or set-aside period stops applying: the transaction counts in the period that contains its date.
- One payment settles at most one charge. If two charges name the same payment, the charge with the earlier due date keeps it and the other is expected again.
- A charge paid by a transaction that is not budget spending in the period's category (a transfer, a payment from an account outside the budget, a split whose parts went to other categories) counts as paid: it is no longer expected, and it adds no spending to the period.
- When a category is deleted in Actual, its periods are hidden with it. If Actual moves its transactions to another category, they follow that category's periods.

### S3. Carrying a balance

Carrying is always its own action, never automatic (spec section 2 and 3). "Carry balance from the previous period" on a period writes the previous period's remaining amount, as it is at that moment, into `carryover`, and records which period it came from in `carried_from`. The row shows it as its own line ("carried −80 from April"). It is a stored number, not a formula: if the earlier period changes later, the carry does not move, and the row shows a notice with the amount it would be now and an action to carry again. Copying an allowance never sets a carry.

### S4. Historical edits and late refunds

Periods never lock. Editing an old transaction recalculates the period it belongs to. A refund belongs to the period that contains its date; to count it against the period of the original payment, the user offsets it to that period, the same mechanism as a late payment (spec section 4). In a period's payment list and graph, any transaction dated outside the period's dates is marked "early" or "late" in words, with its real date. Offsets never change monthly actual spending or cash dates (spec sections 4 and 5).

### S5. Cash movements, income and horizon

- Future cash movements come from Actual's schedules only: payments, deposits and transfers on the selected accounts. The schedule mode of Actual's Balance Forecast (`packages/loot-core/src/server/forecast/forecast-schedules.ts`) already builds them, including transfers with two legs; they are passed to the landed `projectCashBalances`.
- Expected income is a schedule with a positive amount. There is no separate income setup.
- A schedule whose amount is "approximately" is shown with "≈". The first version shows no ranges or probabilities.
- Each account in the forecast lists its upcoming payments, expected income and transfers inside the horizon, its lowest daily closing balance, the first date it falls short, and the smallest transfer that would cover the shortfall (spec sections 6 and 7).
- Forecast horizon: a control with "end of this month", "end of next month" (default), "90 days" and "12 months".

### S6. Optional funding

Not in the first interface. Nothing is stored for it. (Spec section 2 marks it proposed and optional.)

### S7. The page is opt-in

A new sidebar page `period-budget`, hidden by default, added to `SIDEBAR_MENU_ITEM_IDS` in `packages/desktop-client/src/components/sidebar/sidebarMenu.ts`, at the route `/period-budget`. The user switches it on in Settings, where v26.11.0 lets sidebar pages be shown, hidden and reordered. Actual's budget page and both budgeting modes are not changed.

### S8. Outside this plan

- Publishing a GitHub fork: not yet (owner's decision, 2026-11-15).
- Currency conversion: not specified (spec section 3).
