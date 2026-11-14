# Actually

## 1. Project brief and document status

Complete working specification from the project conversation
Prepared November 11, 2026
Updated November 13, 2026 for Actual v26.11.0 (sections 1, 9, 10 and 11 only)

Actually is a planned fork of Actual Budget that brings monthly expenses, longer budget periods, and account cash needs into one view.

The user's goal: "The goal is to be able to act out what the month needs, what the year needs and what your accounts needs from a single view."

This document consolidates the agreed requirements, the proposed interface and architecture, the first implementation milestone, and the remaining decisions. It is a working specification, not a claim that the application is complete.

Recovery note: automated workspace maintenance removed the original local checkout and documents. This specification has been reconstructed from the conversation, including the earlier README, ACTUALLY.md design, code descriptions, and recorded test results. It is not a source-code backup or a byte-for-byte recovery of those files.

Status labels used below:

- Agreed: explicitly requested or corrected by the user in the discussion.
- Proposed: an implementation or interaction detail suggested during design and still open to iteration.
- Previously implemented: code recorded in the October 29 milestone, before workspace maintenance. Its prior test results have not been rerun for this document.
- Checked in v26.11.0: a statement about Actual's own code, checked against the v26.11.0 source on November 13, 2026, with the file it comes from.

The project name is Actually. The original project is Actual Budget at https://github.com/actualbudget/actual. Original attribution and license notices must be retained.

## 2. Product requirements

Agreed: one budget must support categories with different time periods. Rent, groceries, and entertainment can use monthly periods. Insurance and other periodic payments use the period appropriate to that expense.

Each period has one budget value of its own. Copying the preceding value is convenient, but creates an independent value. Changing a later period must not rewrite earlier periods. A carried balance must be distinguishable from copying a target.

An actual payment remains visibly accounted for throughout the period it belongs to. An insurance payment made in March remains part of that year's insurance budget when viewing April, August, or December. It does not become artificial monthly spending or disappear from the annual result.

Actual spending must remain visible in the month when the transaction occurred. Budget attribution and bank timing are separate facts. Early or late payments are handled using budget offsets.

The view must expose:

- What has actually been spent in the selected month.
- What remains in each applicable budget period, including negative remaining amounts.
- What known upcoming charges imply for those budgets.
- Cash in the selected accounts, and which accounts need action before a charge arrives.

Knowing when recurring bills are charged should make them visible before payment. The user should be able to plan the month and year without remembering invisible rollover history.

Proposed: setting money aside can be an optional funding measure. It must have its own label and must not replace actual spending. Transfers between included accounts change where cash sits, without becoming budget expenses merely because the receiving account is intended for an annual bill.

## 3. Budget period data model

Proposed record shape, implemented in the first calculation milestone:

- id: the unique identity of this period.
- category: the category to which it belongs.
- start: the first included calendar date.
- end: the first excluded calendar date.
- budget: this period's independent, nonnegative allowance.
- carryover: an explicit, signed opening adjustment.

For example, an annual period can start on 2027-01-01 and end on 2028-01-01. A payment on the end date belongs to the next period unless an explicit offset says otherwise. Periods need not follow calendar years; their dates define their boundaries.

Agreed: a new period owns its value. Proposed: copying a period copies its allowance by value and defaults its carryover to zero. Carrying a balance is a separate explicit operation. A copied period must receive a new ID.

Proposed invariants:

- A period has valid calendar dates and a strictly positive duration.
- The allowance is nonnegative. Carry adjustments can be positive or negative.
- A category cannot have overlapping periods. Adjacent periods are allowed.
- Gaps are allowed, but spending that has no period must be surfaced.
- IDs must be unique. Duplicate records cannot silently inflate totals.

Money uses integer minor currency units, consistent with the first implementation's use of Actual's IntegerAmount type. Values and calculated sums must remain within safe integer bounds. The first version assumes one common currency; currency conversion is not specified.

Period allowances, payment offsets, and scheduled-occurrence associations need durable storage. The proposed integration uses dedicated records under Actual's migration and synchronization conventions, rather than saving the entire budget in one shared preference value.

## 4. Payment dates, offsets, and transaction rules

Agreed: budget offsets handle early and late payments. Proposed implementation: an offset links a transaction ID to a particular period ID in the same category. It does not edit the transaction's bank date.

Early-payment example: a payment on December 20, 2026 can be assigned to the 2027 insurance period. It counts in December 2026 actual spending and in the 2027 insurance budget. It does not count as a second January cash payment.

Late-payment example: a January 2028 payment can be assigned to the completed 2027 insurance period. January actual spending includes it; the historical insurance period reflects its attribution.

Without an offset, the default is the same category's period containing the transaction date. The first calculation model rejects duplicate offsets, nonexistent targets, and offsets crossing categories. Each transaction is attributed once.

Actual's ledger sign convention is retained: expenses are negative amounts and refunds are positive. Budget spending is the negative of the signed transaction sum. A refund reduces spending without removing the original payment. Net spending can therefore be negative in a refund month.

The future ledger adapter must:

- Exclude deleted transactions, starting balances, income, and split parents from expense postings.
- Count split children once and preserve the category of each child.
- Exclude transfers between included budget accounts from spending.
- Classify transfers to off-budget accounts consistently with Actual's expense behavior.
- Surface uncategorized or otherwise unresolved expenses instead of silently dropping them.

The first calculation API accepted normalized, categorized expense postings. It was not a completed adapter for arbitrary raw bank transactions.

## 5. Calculations and scheduled charges

For an individual period:

Net spending = negative of the sum of its attributed posted transaction amounts.

Budget remaining = allowance + explicit carry adjustment - net spending.

Overspending = the greater of zero and negative budget remaining.

Monthly actual spending is calculated by the real transaction date through the selected as-of date. A transaction after that date is not historical spending. Applying a budget offset must not change monthly actual spending.

Combined active budget remaining sums each active period exactly once. An annual allowance is not added again in every month. A period is active when start <= as-of date < end. This combined figure spans different time periods; it must not be labeled as a monthly spending limit or as cash available.

The combined total can conceal individual overspending, so the view must also show overspent categories and the sum of their overspending separately.

Proposed scheduled-charge model:

- Each individual expected occurrence has an ID, period ID, date, and nonnegative expected charge amount.
- Its state is scheduled, or posted with a linked transaction ID.
- Matching uses an occurrence, not merely the recurring schedule's ID.
- A posted actual replaces the corresponding expectation in the calculation, even when its actual amount differs from the estimate.
- A later occurrence remains projected after an earlier one is matched.

Expected remaining = current budget remaining - outstanding expected charges.

Scheduled charges affect the projection immediately, but do not consume actual budget remaining before posting. When viewing an earlier as-of date, an occurrence whose matching actual is still in the future remains projected. Overdue unpaid charges remain commitments; their expected cash payment date needs explicit treatment in the cash forecast.

## 6. Cash and account planning

Agreed: each month should show cash available as the sum of the accounts selected for that purpose, alongside budget remaining. These are distinct measures with different meanings.

Proposed cash model uses account balance snapshots that already include actual transactions through an as-of date. Future cash movements have an ID, account, expected date, and signed amount. Income increases the projection; payments reduce it.

Cash available = sum of selected account snapshot balances.

Projected account cash = that account's snapshot balance + future movements within the forecast horizon.

Do not replay movements already reflected in the starting snapshot. Do not include movements after the forecast horizon or in accounts outside the selected set.

A planned transfer between selected accounts has two legs. It changes the individual account projections but leaves combined cash unchanged. Transfers must not also become budget spending.

Account forecasts must expose a temporary shortfall even if later income makes the ending balance positive. The first implementation returned each account's current balance, projected ending balance, minimum daily closing balance, and first shortfall date.

Proposed initial convention: group movements by date and calculate daily closing balances. Their order within a day does not change the result. This is not a guarantee about the bank's intraday posting order.

Example: checking has $700 and savings has $3,500. Combined cash is $4,200. A scheduled $900 checking-account payment leaves that account $200 short even though combined cash is sufficient. A $200 savings-to-checking transfer before payment resolves the shortfall. Combined cash after the bill is $3,300 either way.

Account selection, credit-card treatment, overdue-payment timing, and forecast horizon controls still need interface decisions.

## 7. Proposed unified view and period graphs

Agreed direction: the main screen must make the month, the relevant longer periods, and the accounts actionable together. The graph should show the period and where payments occurred within it.

Proposed screen structure:

- Month and as-of date navigation.
- Cash in selected accounts, actual spending in the selected month, and combined active-period budget remaining.
- Separate, persistent visibility for overspending.
- Rows showing category, period dates, allowance, actual period spending, remaining, and expected remaining after known charges.
- A selectable period graph and drill-down to its payments.
- Account actions for upcoming payments, expected income, transfers needed, and projected shortfalls.

Proposed graph conventions:

- A horizontal allowance line represents the value for that specific period.
- A cumulative spending line rises on actual expense payments and can fall on refunds.
- Selectable actual-payment markers reveal date and amount.
- Hollow markers distinguish scheduled charges; a dashed projection can show their expected effect.
- The selected as-of date is visible.

An offset payment outside the period's dates needs an explicit annotation at the boundary or an equivalent accessible detail. Its bank date must not be fabricated to fit the graph.

If optional funding is introduced, it needs its own clearly labeled measure. A payment to an insurer is spending; a transfer to a savings account is cash movement; an allocation or reservation is funding. The interface must not count these as three expenses.

An earlier illustrative sketch included category rows and selectable insurance/tax graphs. It was a discussion mockup with invented data, not a running integrated Actual feature. Mobile layout, navigation behavior, and the final visual design remain open to iteration.

## 8. Worked example and acceptance scenarios

Illustrative view: April 20, 2027. All amounts below are dollars.

Rent, April: allowance 1,500; spent 1,500; remaining 0.

Groceries, April: allowance 600; spent 680; remaining -80.

Entertainment, April: allowance 200; spent 50; remaining 150.

Insurance, January through December: allowance 1,200; paid March 15; period spending 1,200; remaining 0.

Taxes, April through June: allowance 900; actual spending 0; remaining 900; known charge of 900 expected April 28.

Results: April actual spending is 2,230. Combined active budget remaining is 970. Separate overspending is 80. Tax expected remaining after the scheduled charge is 0. With checking at 700 and savings at 3,500, cash is 4,200 and the tax-paying account needs a transfer of at least 200 before payment.

Acceptance scenarios for the feature:

- The March insurance payment remains accounted for in April, August, and December without being counted again as monthly spending.
- A boundary-date payment belongs to exactly one adjacent period.
- Editing May's allowance leaves April's allowance intact.
- Early and late offsets change budget attribution but preserve cash dates.
- Refunds reduce net spending while keeping the original payment visible.
- Unassigned spending remains in monthly actuals and is flagged for resolution.
- Duplicate IDs, overlapping periods, invalid dates, fractional minor-unit amounts, and unsafe monetary sums are rejected.
- A known charge affects expected remaining, then is matched once when posted.
- Combined positive cash does not hide a shortfall in the account paying a bill.
- A transfer fixes the account shortfall without creating new spending or cash.
- Later income does not erase an earlier projected shortfall warning.

## 9. Architecture and prior implementation milestone

The chosen direction was an integrated fork of Actual, reusing its accounts, transaction ledger, categorization, imports, and synchronization. An external API application was considered but would require a second interface. Encoding the new model as monthly rollover values would retain the monthly interpretation the user wanted to replace.

Proposed data flow: validate stored periods; adapt ledger transactions; calculate period and monthly actuals; match and project schedule occurrences; independently project account cash; render the measures and their dates in one view.

Previously implemented calculation API:

- createBudgetPeriod: validates and constructs one independent period.
- copyBudgetPeriod: creates a new ID and allowance value, with explicit carry adjustment.
- summarizePeriodBudgets: validates period collections and offsets, attributes payments, and returns all periods, active periods, monthly spending, remaining, overspending, and unassigned transaction IDs.
- projectPeriodCharges: calculates expected spending and remaining from outstanding occurrences.
- projectCashBalances: calculates cash totals and individual account shortfalls.

Recorded source locations:

- packages/loot-core/src/shared/period-budget.ts
- packages/loot-core/src/shared/period-budget.test.ts
- packages/loot-core/vitest.period.config.ts
- README.md and ACTUALLY.md

The first milestone also changed the root project name, browser title, and installable web-app name to Actually. Internal workspace package names and upstream assets retained their existing identities. A future rename pass was not completed.

Historical checkpoint, October 29: local branch actually/mixed-period-budget; local commit 1af44e0; 31 focused tests passed, strict checking of the new files passed, and a JavaScript TypeScript compiler build across the repository passed. Native type-aware tools were blocked by the environment's missing /proc/self/exe. Native dependency builds and a full application run were not completed.

At that checkpoint the new calculation layer was not connected to the budget screen or database. The conversation did not confirm creation or publication of a GitHub fork. The local checkout was later removed by workspace maintenance; the recorded commit is not a verified remote recovery point.

### Current base (updated November 13, 2026)

The Actually repository is a local repository based on Actual v26.11.0, released November 1, 2026 (tag commit 1766241e3). Actual's repository is its upstream remote and is used only to fetch releases. No GitHub fork has been published. The code of the October 29 milestone (commit 1af44e0) is in no existing clone, so the calculation API above is rebuilt from this specification.

Proposed: the rebuilt period-budget tests run in the normal loot-core test run, under the project's test gate. packages/loot-core/vitest.period.config.ts and the yarn test:period-budget command are not re-created.

Checked in v26.11.0, where this design meets Actual's code:

- Schedule dates: getScheduleDates(date, { start, end, count }) in packages/loot-core/src/server/schedules/occurrences.ts, new in v26.11.0 and also offered as the API method getScheduleDates (packages/api/methods.ts), expands a schedule's date or recurrence into the dates it falls on. It supplies the dates of section 5's expected occurrences. It does not give an occurrence an identity: a transaction records only its schedule's ID (the schedule column added in packages/loot-core/migrations/1618975177358_schedules.sql) and Actual stores one next date per schedule (the schedules_next_date table, same file). The occurrence IDs and links of section 5 still need the storage described in section 3.
- Account forecast: the experimental Balance Forecast report (feature flag balanceForecastReport, off by default, packages/desktop-client/src/hooks/useFeatureFlag.ts; server code in packages/loot-core/src/server/forecast/; already present in v26.10.0) projects balances in two ways. From schedules it gives each selected account a balance point for every day, with the scheduled movements of that day attached. From the tracking budget it gives one combined balance of the on-budget accounts at each month end, without account selection and without movements (forecast-tracking-budget.ts in that folder). Each balance point has a date, an account and a balance, and the result names one lowest balance (ForecastResult in packages/loot-core/src/types/models/forecast.ts); in the schedule mode that is the lowest combined balance of the selected accounts. Only the schedule mode can supply future cash movements for section 6. Neither mode states each account's minimum daily closing balance or first shortfall date, which section 6 requires; in the schedule mode both can be derived from the daily points.
- Sidebar pages: since v26.11.0 users can show, hide and reorder sidebar pages and choose the start page. The pages are a fixed list of IDs (SIDEBAR_MENU_ITEM_IDS in packages/desktop-client/src/components/sidebar/sidebarMenu.ts; settings screen in packages/desktop-client/src/components/settings/SidebarSettings.tsx). Proposed: the opt-in Period Budget page of roadmap step 4 is added to that list, hidden by default.
- Transfers: since v26.11.0 a transfer between an on-budget and an off-budget account keeps its category (upstream change 9205 in the v26.11.0 release notes). This is the expense behavior of Actual that section 4's ledger adapter follows for transfers to off-budget accounts.
- Budgeting modes: a budget file is an envelope budget or a tracking budget (budgetType in packages/loot-core/src/server/budget/base.ts, envelope when unset). These are the existing modes that roadmap step 4 keeps available.
- Money: the IntegerAmount type of section 3 is in packages/loot-core/src/shared/util.ts.

## 10. Roadmap and open decisions

Proposed next milestone:

1. Re-create the source checkout on Actual v26.11.0 (done November 13, 2026, as a local repository), rebuild the calculation API of section 9 with its tests (not done), and publish an Actually fork under the user's GitHub account (not done).
2. Add dedicated storage for period records, offsets, and occurrence associations using Actual's migration and synchronization conventions.
3. Implement and test the ledger and schedule adapters, including split transactions, refunds, internal transfers, off-budget transfers, and uncategorized expenses.
4. Add an opt-in Period Budget page with independent period editing and payment drill-down. Preserve access to the existing budgeting modes during development.
5. Add the period graph and account forecast to that same page.
6. Exercise the full flow against demo data and then a copied budget, including synchronization conflicts and historical edits.

Open decisions for iteration:

- How a user creates a period, copies an allowance, and explicitly carries a balance.
- Whether offsets are manually assigned, derived from schedule associations, or support both.
- Rules for historical edits and late refunds after a period closes.
- How overdue charges, partial payments, cancellations, and multiple payments for one bill are matched.
- How users select cash accounts and view credit-card liabilities.
- How expected income is configured and how forecast uncertainty is shown.
- How to depict offset payments outside graph boundaries and irregular multi-month periods.
- How to keep cash available, budget remaining, and expected remaining distinguishable on a phone.
- Whether optional funding/reservation tracking belongs in the first interface.

## 11. Local development handoff

Current setup (updated November 13, 2026): Actual v26.11.0 names Node.js 24.22.1 in .nvmrc, requires Node.js 22.18.0 or later, and bundles Yarn 4.17.1 at .yarn/releases/yarn-4.17.1.cjs; these are the versions the original milestone used. From the repository root, install with node .yarn/releases/yarn-4.17.1.cjs install, and check a change with the test gate: node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test. Work is done on task branches from main; there is no actually/mixed-period-budget branch and no yarn test:period-budget command. The rest of this section is the historical handoff for the removed checkout.

Once a repository with these changes has been restored and pushed: clone the user's Actually repository, switch to actually/mixed-period-budget, install dependencies, run the period tests and type checks, and start the app. The original milestone used Node.js 24.22.1 and bundled Yarn 4.17.1. Commands from the repository root were yarn install --immutable, yarn test:period-budget, yarn typecheck, and yarn start.

The direct focused test command was: node node_modules/vitest/vitest.mjs run --root packages/loot-core --config vitest.period.config.ts --maxWorkers 1. The fallback compiler command was: node node_modules/typescript/bin/tsc -b.

The upstream development app used http://localhost:3001, with "Don't use a server" and "View demo" for sample data. These are historical setup notes for the recorded base, not a fresh verification of a current checkout.

This document is the working specification. It does not contain the removed local commit, an application installer, or a completed new budgeting mode.
