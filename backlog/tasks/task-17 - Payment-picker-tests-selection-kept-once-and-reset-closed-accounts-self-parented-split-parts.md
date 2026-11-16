---
id: TASK-17
title: >-
  Payment picker tests: selection kept once and reset, closed accounts,
  self-parented split parts
status: In Progress
assignee: []
created_date: '2026-11-16T03:09:00Z'
updated_date: '2026-11-16T06:14:00Z'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-16 05:45Z orchestrator: started. Pyramid-loop rung 1; test and patch prepared by the orchestrator, applied by the coder, reviewed independently.

Round 1 (rung 1, local coder applied the orchestrator's patch): candidate 7d60a7695, gate exit 0 at 06:01Z. Independent review (gpt-6.1-sol xhigh) REQUEST CHANGES at 06:06Z: criteria 1 to 3 met; criterion 4 'not met literally' (the rule was in listNameablePayments, the query alone still gave the part); should-fix: a quote in the id of a split made the list fail ($oneof puts ids into SQL unescaped); note: two reviewer mutants survived (split restricted to the asked days, splits of closed accounts left out). Round 2 (same rung): candidate 683e2660a: $oneof doubles quotes (aql/compiler.ts, as the reviewer proposed), nameablePaymentsQuery itself leaves out a part that is its own split (criterion 4 as written, no ticket text change), three more real-database tests and one compiler test; orchestrator's mutants 15 of 15 killed.
<!-- SECTION:NOTES:END -->
