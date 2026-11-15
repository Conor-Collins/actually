---
id: TASK-11
title: Opt-in Period Budget page with period editing and payment drill-down
status: In Progress
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T23:38:00Z'
labels:
  - ui
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
- [ ] #1 The sidebar page of S7 exists, hidden by default; Actual's budget page is unchanged.
- [ ] #2 Header and category rows show what B6 lists, with period bars, payment dots and charge dots on the shared axis and the as-of line. Every money figure has a label; the combined remaining is never labelled as a monthly limit or as cash (spec section 5).
- [ ] #3 Selecting a bar opens the row with its payments, charges and actions, without the full graph. Each bar and dot has a text equivalent for keyboard and screen-reader use.
- [ ] #4 Cadence setup, schedule links, period edits, carry, offsets and overrides work from the page.
- [ ] #5 "Needs attention" lists set-aside rows, unassigned spending, charges without a period and overrides without a date, each with its fixing action.
- [ ] #6 The phone "Month" and "Periods" tabs of B6 work at 360 px width.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.

2026-11-15 23:38Z orchestrator: started. Plan: one branch task-11-period-budget-page; steps A (payments list in the calculation), B (sidebar id, routes, queries), C (wide page), D (actions), E (Needs attention), F (phone tabs). Sidebar follows plan S7 literally: hidden by default means listed under Settings until switched on.
<!-- SECTION:NOTES:END -->
