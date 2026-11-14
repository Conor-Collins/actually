---
id: TASK-6
title: 'projectCashBalances: selected-account cash, projections and shortfalls'
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T05:55:00Z'
labels:
  - calculation
dependencies:
  - TASK-5
priority: medium
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fourth part of the calculation layer (SPEC sections 6 and 8). Input: account snapshots { id, balance } that already include actual transactions through the as-of date, the selected account ids, future movements { id, account, date, amount (signed) }, the as-of date and the forecast horizon end date. It is independent of the period functions.

Code goes in packages/loot-core/src/shared/period-budget.ts, tests in packages/loot-core/src/shared/period-budget.test.ts (the normal loot-core test run picks them up; add no separate vitest config and no package script). Pure functions, no classes, no database or UI access. Dates are 'YYYY-MM-DD' strings as elsewhere in Actual. Money is IntegerAmount (packages/loot-core/src/shared/util.ts), in minor units. 'Rejected' means the function throws an Error whose message names the offending record.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 It returns cash available (the sum of the selected accounts' snapshot balances) and, per selected account, the current balance, projected ending balance, minimum daily closing balance over the forecast, and the first shortfall date (the first date whose closing balance is below zero, or none).
- [ ] #2 Movements dated on or before as-of, movements after the horizon and movements in accounts outside the selected set are not applied. Movements are grouped by date; their order within a day does not change the result.
- [ ] #3 Rejected: duplicate account ids or movement ids; a selected account with no snapshot; fractional or unsafe amounts; any sum that leaves the safe-integer range; a horizon before as-of.
- [ ] #4 A test reproduces SPEC section 6: checking 700.00 and savings 3,500.00 give cash 4,200.00; a 900.00 payment from checking on 2027-04-28 gives checking a minimum of -200.00 and first shortfall 2027-04-28 while combined projected cash stays positive; adding a 200.00 savings-to-checking transfer (two legs) before the payment removes the shortfall; combined projected cash is 3,300.00 in both cases.
- [ ] #5 A test shows that income arriving after a shortfall leaves the first shortfall date and the negative minimum reported even though the ending balance is positive.
- [ ] #6 The gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator: rung 1 (qwen3.8-27b) round 1 started; branch task-6-project-cash-balances. Brief fixes: output shape {cashAvailable, projectedCash, accounts[]}, validation order, per-day inflow/outflow totals so same-day order cannot change the result.
<!-- SECTION:NOTES:END -->
