---
id: TASK-10
title: 'Schedule adapter: Actual schedules to charge occurrences and cash movements'
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T23:08:00Z'
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

Review round 2 (rung 1, candidate acb61858c): REQUEST CHANGES. Blocking: 6 (a named payment of a charge outside the range changed matching with the as-of day), 7 (one-step transfer rule changed combined cash), 8 (an early entered payment of an unlinked schedule counted twice); keep the is_child guard and test it. Round 3 (last at rung 1) in preparation: named due dates count on every as-of day and horizon; transfers are followed to every leg; payments of unlinked schedules settle their nearest due date; parts of splits pay the schedules they carry; randomized same-answer tests added.

Round 3 (rung 1, last round at this rung), 2026-11-15 21:19Z: candidate 16abde4ab05b590852218ccc018c831747bcddda (one commit after acb61858c). Fixes for review findings 6, 7, 8 and the is_child guard, a rule for parts of splits, and a randomized test file (calculate.random.test.ts). Focused tests 720 passed (11 files); full gate exit 0 (/tmp/actually-orch/t10/gate-r3.log). Orchestrator mutation run: pure 70 of 70 killed; server run of 85 in progress, five survivors expected and judged without visible effect. Code and tests written by the orchestrator, applied and committed by the rung-1 coder. Round-3 review started on gpt-6.1-sol xhigh.

Review round 3 (2026-11-15 21:28Z) on 16abde4ab05b590852218ccc018c831747bcddda: REQUEST CHANGES. Findings 6, 7, 8 and the is_child guard closed. New: 9 blocking (a part's own charge period overwritten by its split's), 10 blocking (a named split settles an unlinked schedule through a part that carries the same schedule), 11 should-fix (a part without its split still counted as budget spending). Rung 1 has used its three reviewed rounds; round 4 runs at rung 2 (opencode studio/flash-next). Work held 21:29Z to 22:30Z for a Paradox quiet window on the shared machine.

Round 4 (rung 2, opencode studio/flash-next): candidate d579ca7b864c8b44bbef6bd7b1d649980c6e1cfe, 730 focused tests, gate exit 0 at 22:56Z (/tmp/actually-orch/t10/gate-r4.log); mutation run pure 77 of 77 killed, server 82 of 87 killed (5 judged equivalent, unchanged from round 3). Sent to review round 4 at 22:57Z.

Review round 4 (rung 2, round 1 of 3), 23:05Z: REQUEST CHANGES on d579ca7b8. Findings 9, 10, 11 closed. New finding 12 (blocking): account balances in calculate.ts are added without checking intermediate sums, so amounts that cancel can give a rounded cash balance (-MAX_SAFE_INTEGER, 2, MAX_SAFE_INTEGER gives 1, not 2). Round 5 follows at rung 2.
<!-- SECTION:NOTES:END -->
