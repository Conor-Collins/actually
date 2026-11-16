---
id: TASK-12
title: Period graph and account forecast on the Period Budget page
status: In Progress
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-16T03:09:00Z'
labels:
  - ui
dependencies:
  - TASK-10
  - TASK-11
priority: low
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC sections 6 and 7 and section 10 step 5. Per period: an allowance line, a cumulative spending line, selectable payment markers, hollow markers and a dashed projection for scheduled charges, and the as-of date. Per account: upcoming payments, expected income, transfers needed and projected shortfalls.

Outline only. Waits on the owner's decisions (SPEC section 10): how offset payments outside the period's dates and irregular multi-month periods are drawn; how expected income is configured and forecast uncertainty shown; credit-card treatment and forecast horizon controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The full graph in the opened row follows the conventions of spec section 7; a payment outside its period is drawn at its real date with the connector, and the payment list says so in words.
- [ ] #2 Account rows on the shared axis show what S5 lists, with the "in accounts" and "owed" split of B5.
- [ ] #3 The horizon control of S5 changes the forecast and is remembered.
- [ ] #4 The phone "Accounts" tab shows the same figures.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.

2026-11-16 03:12Z: started after TASK-11 landed (7afe35c91). Pyramid-loop rung 1; the orchestrator prototypes the reference and tests in a scratch worktree as for TASK-11.
<!-- SECTION:NOTES:END -->
