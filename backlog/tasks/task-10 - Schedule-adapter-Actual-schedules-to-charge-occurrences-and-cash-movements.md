---
id: TASK-10
title: 'Schedule adapter: Actual schedules to charge occurrences and cash movements'
status: To Do
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T14:31:00Z'
labels:
  - integration
  - needs-decision
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
- [ ] #1 Acceptance criteria are set from the owner's decisions before this task is started.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.
<!-- SECTION:NOTES:END -->
