---
id: TASK-16
title: >-
  Calculate test: amounts beyond the safe range that cancel to a safe balance
  give no cash plan
status: In Progress
assignee: []
created_date: '2026-11-15T23:29:00Z'
updated_date: '2026-11-16T05:43:00Z'
labels:
  - testing
dependencies: []
priority: low
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the TASK-10 round-5 review (finding 13, non-blocking). In packages/loot-core/src/server/period-budget/calculate.ts the balance loop refuses an amount that is no safe whole number (isWholeNumber) before it is added. No test fails when that check is weakened to Number.isInteger. Add the one missing test to calculate.test.ts, in the describe 'cash movements'. No production change. The reviewer's case: transactions of -MAX_SAFE_INTEGER and MAX_SAFE_INTEGER + 1 in a selected account; the cash plan must be null.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A test in calculate.test.ts stores -Number.MAX_SAFE_INTEGER and Number.MAX_SAFE_INTEGER + 1 in a selected account and asserts that cash is null.
- [ ] #2 The test fails when the amount check in the balance loop uses Number.isInteger, and passes on the landed code.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-16 05:45Z orchestrator: started. Pyramid-loop rung 1; test and patch prepared by the orchestrator, applied by the coder, reviewed independently.
<!-- SECTION:NOTES:END -->
