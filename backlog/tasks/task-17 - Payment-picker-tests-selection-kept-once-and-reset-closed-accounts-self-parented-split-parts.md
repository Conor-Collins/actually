---
id: TASK-17
title: >-
  Payment picker tests: selection kept once and reset, closed accounts,
  self-parented split parts
status: To Do
assignee: []
created_date: '2026-11-16T03:09:00Z'
labels:
  - testing
dependencies: []
priority: low
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the TASK-11 round-3 review (approved at c2a5c2591, landed as 7afe35c91; non-blocking). Three mutations of the landed code survive its tests, and one malformed-data case differs between the payment picker and the calculation. (1) packages/desktop-client/src/components/period-budget/ChargeForm.tsx: always prepending the remembered choice to the list is not caught; keeping the remembered choice after the user goes back to 'The payment that matches the schedule' is not caught. (2) packages/loot-core/src/shared/period-payment-queries.ts: leaving out payments of closed accounts is not caught. (3) A split part whose parent_id is its own id is offered by nameablePaymentsQuery (AQL inline splits admit it), while the calculation leaves that transaction out, so naming it gives payment-missing under Needs attention. The reviewer's probes were in /tmp/actually-review-11-r3 (may be gone).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A page test in PeriodBudgetPage.test.tsx chooses a payment whose day is inside the asked days and asserts that the list has it once; it fails when the remembered choice is always prepended.
- [ ] #2 A page test chooses a payment, goes back to the schedule match, changes the days so that the payment is outside them, and asserts that the payment is no longer listed; it fails when the remembered choice is not cleared.
- [ ] #3 A test in payment-queries.test.ts asserts that a payment of a closed account is given by nameablePaymentsQuery; it fails when closed accounts are left out.
- [ ] #4 A part of a split whose parent is itself is not offered by nameablePaymentsQuery, by the same rule the calculation uses for a valid parent, with a real-database test.
<!-- AC:END -->
