---
id: TASK-4
title: >-
  summarizePeriodBudgets: attribution, offsets, monthly actuals, remaining and
  overspending
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T04:03:00Z'
labels:
  - calculation
dependencies:
  - TASK-3
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Second part of the calculation layer (SPEC sections 4, 5 and 8). Input: periods, normalized categorized expense postings { id, category, date, amount } using Actual's sign convention (expenses negative, refunds positive), offsets { transactionId, periodId }, and an as-of date. It is not the ledger adapter: it does not read raw transactions.

Postings dated after the as-of date are ignored by every figure (SPEC section 5: a transaction after that date is not historical spending).

Code goes in packages/loot-core/src/shared/period-budget.ts, tests in packages/loot-core/src/shared/period-budget.test.ts (the normal loot-core test run picks them up; add no separate vitest config and no package script). Pure functions, no classes, no database or UI access. Dates are 'YYYY-MM-DD' strings as elsewhere in Actual. Money is IntegerAmount (packages/loot-core/src/shared/util.ts), in minor units. 'Rejected' means the function throws an Error whose message names the offending record.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Attribution: without an offset a posting belongs to the same category's period with start <= date < end, so a posting on a period's end date belongs to the next period; an offset attributes it to the named period instead; each posting is attributed exactly once.
- [ ] #2 Rejected: periods failing the collection check; duplicate posting ids; two offsets for one transaction; an offset naming a period that does not exist; an offset whose period is in a different category from the posting; fractional or unsafe amounts; any sum that leaves the safe-integer range.
- [ ] #3 Per period it returns net spending (the negative of the sum of attributed amounts, negative when refunds exceed payments), remaining (budget + carryover - net spending) and overspending (the greater of 0 and -remaining).
- [ ] #4 It returns all periods, the active periods (start <= as-of < end), combined active remaining with each active period counted once, the overspent active periods with their total overspending, and monthly actual spending for the as-of date's month through the as-of date by real transaction date.
- [ ] #5 An offset changes which period a posting counts in but not monthly actual spending. A posting with no period (and no offset) still counts in monthly actual spending and its id is returned as unassigned.
- [ ] #6 A test reproduces SPEC section 8 at 2027-04-20: monthly actual 2,230.00, combined active remaining 970.00, overspending 80.00; the March 15 insurance payment stays in the insurance period's spending when viewed at 2027-04-20, 2027-08-15 and 2027-12-31 and is not in those months' actual spending. Tests also cover an early offset (2026-12-20 into the 2027 period) and a late offset (January 2028 into the 2027 period).
- [ ] #7 The gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator: started 2026-11-13 at rung 1 (qwen3.8-27b), reviewer GPT Sol xhigh. Brief also asks for the zero-allowance test left over from TASK-3 review round 3.
<!-- SECTION:NOTES:END -->
