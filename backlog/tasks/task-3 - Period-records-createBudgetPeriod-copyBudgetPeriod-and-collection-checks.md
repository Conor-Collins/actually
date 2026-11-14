---
id: TASK-3
title: 'Period records: createBudgetPeriod, copyBudgetPeriod and collection checks'
status: In Progress
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T03:22:00Z'
labels:
  - calculation
dependencies:
  - TASK-1
  - TASK-2
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
First part of the calculation layer (SPEC sections 3 and 8). A budget period is { id, category, start, end, budget, carryover }: start is the first included date, end the first excluded date, budget a nonnegative allowance, carryover a signed opening adjustment.

Code goes in packages/loot-core/src/shared/period-budget.ts, tests in packages/loot-core/src/shared/period-budget.test.ts (the normal loot-core test run picks them up; add no separate vitest config and no package script). Pure functions, no classes, no database or UI access. Dates are 'YYYY-MM-DD' strings as elsewhere in Actual. Money is IntegerAmount (packages/loot-core/src/shared/util.ts), in minor units. 'Rejected' means the function throws an Error whose message names the offending record.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 createBudgetPeriod({ id, category, start, end, budget, carryover? }) returns the period with carryover defaulting to 0, and rejects: empty id or category; a start or end that is not a real calendar date in YYYY-MM-DD form (for example 2027-02-30); end on or before start; a negative budget; a budget or carryover that is fractional or not a safe integer. A negative carryover is accepted.
- [ ] #2 copyBudgetPeriod(source, { id, start, end, carryover? }) returns a new period in the same category with the allowance copied by value and carryover defaulting to 0 (not the source's carryover); it rejects an id equal to the source's; the source object is not modified, and changing the copy's budget afterwards leaves the source's budget intact.
- [ ] #3 An exported collection check (validateBudgetPeriods(periods)) rejects duplicate ids and two periods of one category that overlap; it accepts adjacent periods (one's end equals the next one's start), gaps, and overlapping dates in different categories.
- [ ] #4 Tests cover every rule above, including an annual period 2027-01-01 to 2028-01-01 and a period that does not follow the calendar year.
- [ ] #5 The new files are type-strict (no @ts-strict-ignore) and the gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-13: round 1 (rung 1) candidate b77e930ff reviewed by GPT Sol xhigh: REQUEST CHANGES. Two blocking findings: tests do not catch four broken behaviours (unsafe carryover, explicit copy carryover, source modification, overlap in reverse order), and valid dates before year 0100 are rejected. Back to the coder for round 2.
<!-- SECTION:NOTES:END -->
