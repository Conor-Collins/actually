---
id: TASK-4
title: >-
  summarizePeriodBudgets: attribution, offsets, monthly actuals, remaining and
  overspending
status: Done
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T04:38:00Z'
labels:
  - calculation
dependencies:
  - TASK-3
modified_files:
  - packages/loot-core/src/shared/period-budget.test.ts
  - packages/loot-core/src/shared/period-budget.ts
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
- [x] #1 Attribution: without an offset a posting belongs to the same category's period with start <= date < end, so a posting on a period's end date belongs to the next period; an offset attributes it to the named period instead; each posting is attributed exactly once.
- [x] #2 Rejected: periods failing the collection check; duplicate posting ids; two offsets for one transaction; an offset naming a period that does not exist; an offset whose period is in a different category from the posting; fractional or unsafe amounts; any sum that leaves the safe-integer range.
- [x] #3 Per period it returns net spending (the negative of the sum of attributed amounts, negative when refunds exceed payments), remaining (budget + carryover - net spending) and overspending (the greater of 0 and -remaining).
- [x] #4 It returns all periods, the active periods (start <= as-of < end), combined active remaining with each active period counted once, the overspent active periods with their total overspending, and monthly actual spending for the as-of date's month through the as-of date by real transaction date.
- [x] #5 An offset changes which period a posting counts in but not monthly actual spending. A posting with no period (and no offset) still counts in monthly actual spending and its id is returned as unassigned.
- [x] #6 A test reproduces SPEC section 8 at 2027-04-20: monthly actual 2,230.00, combined active remaining 970.00, overspending 80.00; the March 15 insurance payment stays in the insurance period's spending when viewed at 2027-04-20, 2027-08-15 and 2027-12-31 and is not in those months' actual spending. Tests also cover an early offset (2026-12-20 into the 2027 period) and a late offset (January 2028 into the 2027 period).
- [x] #7 The gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator: started 2026-11-13 at rung 1 (qwen3.8-27b), reviewer GPT Sol xhigh. Brief also asks for the zero-allowance test left over from TASK-3 review round 3.

Round 1 (rung 1): candidate 23789b0f9 REQUEST CHANGES by GPT Sol xhigh. Implementation passed all direct probes but 14 of 37 mutations survive the tests. Blocking: no tests for unsafe amounts and sum overflow (AC2); refund-only negative net spending unprotected (AC3); active end boundary, inactive overspending and overspending total unprotected (AC4); AC6 viewing dates 2027-08-15 and 2027-12-31 and the cross-year early/late offsets missing. Should-fix: no frozen-input test; remaining can be -0. Back to the coder for round 2.

Round 2 (rung 1): candidate 217966a50 REQUEST CHANGES by GPT Sol xhigh. Round-1 findings 2-6 resolved; 42 of 48 mutations caught, 40/40 direct probes pass. Blocking: the budget+carryover and remaining overflow tests pass for the wrong reason (a later check throws with the same id; the test designs came from the orchestrator's brief), and overflow is not tested in the positive attributed-sum direction or the negative remaining direction. Back to the coder for round 3 (tests only).

Round 3 (rung 1): candidate 38159667b APPROVED by GPT Sol xhigh. 105 tests; 47 of 48 mutations caught (the survivor is an equivalent mutation); 40/40 direct probes; gate exit 0. Interpretations in the code that the ticket does not state: an offset whose transaction is not among the postings is ignored; an invalid as-of or posting date is rejected; a running total that leaves the safe range is rejected even if it would later cancel.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-4-summarize-period-budgets as c2fc356d6 on 2026-11-13.
<!-- SECTION:FINAL_SUMMARY:END -->
