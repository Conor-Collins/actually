# Actually

Actually is a fork of [Actual Budget](https://github.com/actualbudget/actual) that brings monthly expenses, longer budget periods, and account cash needs into one view.

`docs/SPEC.md` is the working specification for the project. Where this file and it disagree, the spec wins. The spec marks each part of the design: some parts are agreed, explicitly requested or corrected in the project discussion, and some parts are proposals still open to change.

## Why

One budget supports categories with different time periods. Rent, groceries, and entertainment can use monthly periods; insurance and other periodic payments use the period appropriate to that expense.

Each period has one budget value of its own. Copying the preceding value is convenient, but it creates an independent value. Changing a later period does not rewrite earlier periods.

An actual payment remains visibly accounted for throughout the period it belongs to. An insurance payment made in March remains part of that year's insurance budget when viewing April, August, or December. It does not become artificial monthly spending or disappear from the annual result.

Actual spending remains visible in the month when the transaction occurred. Budget attribution and bank timing are separate facts, and early or late payments are handled with budget offsets. The user plans the month and year without remembering invisible rollover history.

## Budget periods

A period record has six fields:

- `id`: the unique identity of this period.
- `category`: the category to which it belongs.
- `start`: the first included calendar date.
- `end`: the first excluded calendar date.
- `budget`: this period's independent, nonnegative allowance.
- `carryover`: an explicit, signed opening adjustment.

Copying a period creates a new period with a new id, the same allowance and zero carryover. Carrying a balance is a separate explicit operation.

Periods of one category cannot overlap. Adjacent periods are allowed. Gaps are allowed, but spending that has no period must be surfaced.

Money uses integer minor currency units, consistent with Actual's IntegerAmount type. The first version assumes one common currency; currency conversion is not specified.

## Payments and offsets

By default, a transaction belongs to its category's period that contains its date. An offset links a transaction to another period of the same category. It does not change the transaction's bank date.

Early-payment example: a payment on December 20, 2026 can be assigned to the 2027 insurance period. It counts in December 2026 actual spending and in the 2027 insurance budget. It does not count as a second January cash payment.

Actual's ledger sign convention is retained: expenses are negative amounts and refunds are positive. Each transaction is attributed once.

## Scheduled charges

Each expected occurrence has an ID, period ID, date, and nonnegative expected charge amount. Its state is scheduled, or posted with a linked transaction ID. A posted actual replaces the corresponding expectation in the calculation, even when its actual amount differs from the estimate.

Expected remaining = current budget remaining - outstanding expected charges.

Scheduled charges change the projection immediately, but they do not use up actual budget remaining before they post.

## Cash and accounts

Cash available is the sum of the selected accounts' snapshot balances. These snapshots already include actual transactions through an as-of date.

Projected account cash is that account's snapshot balance plus future movements within the forecast horizon. Movements after the forecast horizon, and movements in accounts outside the selected set, are not included.

A planned transfer between selected accounts has two legs. It changes the individual account projections but leaves combined cash unchanged. Transfers do not also become budget spending.

Account forecasts must show a temporary shortfall even when later income makes the ending balance positive.

Example: checking has $700 and savings has $3,500. Combined cash is $4,200. A scheduled $900 checking-account payment leaves that account $200 short even though combined cash is sufficient. A $200 savings-to-checking transfer before payment resolves the shortfall. Combined cash after the bill is $3,300 either way.

## Status

The calculation layer is being rebuilt as pure functions in `packages/loot-core/src/shared/period-budget.ts`, with tests in the normal loot-core test run. It is not yet connected to stored data or to the budget screen. Storage, the ledger and schedule adapters, and the Period Budget page are not built. The open decisions are listed in section 10 of `docs/SPEC.md`.

## Attribution

Actually is based on [Actual Budget](https://github.com/actualbudget/actual). It keeps Actual Budget's attribution and MIT license; see `LICENSE.txt`. Internal workspace packages keep their `@actual-app` names.
