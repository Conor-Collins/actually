---
id: TASK-5
title: 'projectPeriodCharges: scheduled-charge occurrences and expected remaining'
status: In Progress
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T04:40:00Z'
labels:
  - calculation
dependencies:
  - TASK-4
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Third part of the calculation layer (SPEC sections 5 and 8). An occurrence is { id, periodId, date, amount (nonnegative expected charge), state }, where state is scheduled, or posted with a linked transaction id. Expected remaining = current budget remaining - outstanding expected charges. The function takes the period summaries from summarizePeriodBudgets (or its inputs), the occurrences and the as-of date.

Code goes in packages/loot-core/src/shared/period-budget.ts, tests in packages/loot-core/src/shared/period-budget.test.ts (the normal loot-core test run picks them up; add no separate vitest config and no package script). Pure functions, no classes, no database or UI access. Dates are 'YYYY-MM-DD' strings as elsewhere in Actual. Money is IntegerAmount (packages/loot-core/src/shared/util.ts), in minor units. 'Rejected' means the function throws an Error whose message names the offending record.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A scheduled occurrence is outstanding and reduces expected remaining for its period, without changing budget remaining. An overdue scheduled occurrence (date before as-of, not posted) stays outstanding.
- [ ] #2 A posted occurrence whose linked posting is dated on or before as-of is not outstanding, even when the actual amount differs from the estimate; a posted occurrence whose linked posting is dated after as-of remains outstanding.
- [ ] #3 After one occurrence is matched, a later occurrence of the same bill in the same period remains outstanding.
- [ ] #4 Rejected: duplicate occurrence ids; a period id that does not exist; a negative, fractional or unsafe amount; a posted occurrence without a transaction id; one transaction linked to two occurrences; a linked transaction id that is not among the postings.
- [ ] #5 A test reproduces SPEC section 8: the taxes period (2027-04-01 to 2027-07-01, allowance 900.00) with a 900.00 charge scheduled for 2027-04-28 has remaining 900.00 and expected remaining 0.00 at 2027-04-20.
- [ ] #6 The gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator: started 2026-11-13 at rung 1 (qwen3.8-27b), reviewer GPT Sol xhigh.
<!-- SECTION:NOTES:END -->
