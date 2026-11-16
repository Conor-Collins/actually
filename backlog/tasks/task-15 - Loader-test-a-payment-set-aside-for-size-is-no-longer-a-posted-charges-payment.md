---
id: TASK-15
title: >-
  Loader test: a payment set aside for size is no longer a posted charge's
  payment
status: Review
assignee: []
created_date: '2026-11-15T18:40:00Z'
updated_date: '2026-11-16T05:56:00Z'
labels:
  - testing
dependencies: []
priority: low
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the TASK-8 round-3 review (finding 10, non-blocking). In packages/loot-core/src/shared/period-loader.ts the payment lookup is built from the postings that passed the size rule, which is correct, but no test fails when it is built from the postings before that rule. Add the one missing test to period-loader.test.ts. No production change. The reviewer's version of the test is /tmp/task8-review-r3-kxg2tgnw/src/shared/reviewer-r3-survivor.test.ts: a zero-allowance period, payments of -MAX_SAFE_INTEGER and -1, and a zero-amount posted charge that names the large payment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A test in period-loader.test.ts has a posted charge whose payment is set aside only by the size rule and asserts: the payment is not in the returned postings, the charge is in paidOutsideBudget, no returned occurrence names the payment, and projectPeriodCharges accepts the result.
- [ ] #2 The test fails when the payment lookup is built from the postings before the size rule, and passes on the landed code.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-16 05:45Z orchestrator: started. Pyramid-loop rung 1; test and patch prepared by the orchestrator, applied by the coder, reviewed independently.

Round 1 (rung 1, local coder applied the orchestrator's patch): candidate 63ae37d25, one test added to period-loader.test.ts, no production change. Orchestrator's gate exit 0 at 05:53Z. Independent review (gpt-6.1-sol xhigh) APPROVE at 05:55Z: both criteria met; the reviewer's own mutation (postingById built from validPostings) fails exactly the new test. No findings.
<!-- SECTION:NOTES:END -->
