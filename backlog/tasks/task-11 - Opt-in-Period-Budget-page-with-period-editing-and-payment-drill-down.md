---
id: TASK-11
title: Opt-in Period Budget page with period editing and payment drill-down
status: To Do
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T14:31:00Z'
labels:
  - ui
  - needs-decision
dependencies:
  - TASK-8
  - TASK-9
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 7 and section 10 step 4. A page showing month and as-of navigation, cash in selected accounts, actual spending in the month, combined active remaining, overspending, and a row per category period (dates, allowance, spent, remaining, expected remaining) with drill-down to its payments. The existing budgeting modes stay available. v26.11.0 lets users show, hide and reorder sidebar pages and choose the start page, which is where an opt-in page is switched on.

Outline only. Waits on the owner's decisions (SPEC section 10): how a user creates a period, copies an allowance and explicitly carries a balance (including who creates the next period when one ends); how cash accounts are selected; whether optional funding belongs in the first interface; the phone layout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Acceptance criteria are set from the owner's decisions before this task is started.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.
<!-- SECTION:NOTES:END -->
