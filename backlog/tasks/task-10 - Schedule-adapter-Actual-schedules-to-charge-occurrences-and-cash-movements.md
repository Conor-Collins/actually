---
id: TASK-10
title: 'Schedule adapter: Actual schedules to charge occurrences and cash movements'
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T20:15:00Z'
labels:
  - integration
dependencies:
  - TASK-5
  - TASK-6
  - TASK-8
priority: medium
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 5 and section 10 step 3. Produces the individual expected occurrences projectPeriodCharges takes, and the future cash movements projectCashBalances takes, from Actual's schedules. v26.11.0 can list a schedule's dates (the getScheduleDates API method, server handler api/schedule-dates-get) and already projects account balances from schedules for the experimental Balance Forecast report (packages/loot-core/src/server/forecast/).

Outline only. Waits on the owner's decisions (SPEC section 10): whether offsets are manual, derived from schedule associations or both; how overdue charges, partial payments, cancellations and several payments for one bill are matched; when an overdue charge is expected to leave the account.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 For the linked schedules and a date range, it returns the charges of B4 with their ids, periods and amounts, with overrides applied.
- [ ] #2 The matching rule of B4 has tests for: paid early, paid late, a different amount, two payments for one charge, a part payment with "still expected", a skipped charge, a named match that differs from the calculated one, and a payment after the as-of date.
- [ ] #3 Derived offsets follow B3; a manual offset wins; monthly actual spending is the same with and without them.
- [ ] #4 Future cash movements for the selected accounts come from Actual's schedules inside the horizon: transfers have two legs, nothing already posted is repeated, an overdue charge is placed on the as-of date.
- [ ] #5 With the rows of the spec's worked example stored (section 8), the results are 2,230 spent in April, 970 remaining, 80 overspent, 0 expected remaining for taxes, 4,200 cash and a 200 transfer needed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.

2026-11-15: in progress. The orchestrator wrote the code and the tests (shared/period-charges.ts, server/period-budget/calculate.ts, handler period-budget/calculate) and delivers them as two patches; the rung-1 coder applies them, runs the checks and commits on branch task-10-schedule-adapter; an independent reviewer (codex gpt-6.1-sol xhigh) reviews the candidate. Briefs: /tmp/actually-orch/task-10-brief.md and task-10-review-brief.md.

Review round 1 (codex gpt-6.1-sol xhigh) on 2969346c6: REQUEST CHANGES. Blocking: matching changed with the as-of date (fixed 366-day look-back); an entered payment of an unlinked schedule dated after the as-of day vanished from the cash forecast; one unreadable rule rejected the whole calculation. Should-fix: isbetween coverage. Note: matching worse than linear. Round 2 candidate acb61858c (rung 1; orchestrator-written fix patch applied by the coder): real preceding due date, entered future-dated scheduled transactions planned on their own day (new isPosted flag), unreadable schedules left out, binary search and period index with a scaling test. Gate exit 0 (/tmp/actually-orch/t10/gate-r2.log). Review round 2 running.
<!-- SECTION:NOTES:END -->
