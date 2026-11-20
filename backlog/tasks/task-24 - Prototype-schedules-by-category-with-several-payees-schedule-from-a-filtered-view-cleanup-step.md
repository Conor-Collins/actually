---
id: TASK-24
title: >-
  Prototype: schedules by category with several payees, schedule from a filtered
  view, cleanup step
status: In Progress
assignee: []
created_date: '2026-11-20T18:41:00Z'
updated_date: '2026-11-20T19:47:00Z'
labels:
  - prototype
dependencies: []
priority: medium
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Conor, 2026-11-20: "I should also be able to convert a filtered view to a schedule, that I will presume to fit inside the yearly budget view, or show the graph state in monthly ( month snapshot view of a yearly schedule)" and "most schedules will have multiple payees, and could more easily be input into the schedule by their categorical string. Placing items in a schedule like this should have a second cleanup step that asks to remove those from any budget they are in already and cleanup the details associated with the move." His choices (same day): the conversion creates both an Actual schedule and a linked yearly period on the Period Budget page; the cleanup step offers, each as a checkbox confirmed before any change: clearing the monthly budget amounts the yearly schedule now covers, removing old single-payee schedules it replaces, linking the matched transactions to the new schedule, and moving same-payee transactions filed under another category. Prototype for his notes on a prototype branch, not landed on main until he has given notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A schedule can match by category (category is X) and by several payees (payee is one of …), in the schedule editor and in schedule matching and posting
- [ ] #2 In an account view with filters, a 'Schedule from this filter' action opens the schedule editor prefilled from the filters: category, the payees found, a yearly repeat, and the amount from the filtered total, listing the matching transactions
- [ ] #3 Saving it also creates (or reuses) a yearly period for that category on the Period Budget page with that allowance, linked to the schedule; the page shows it as the year bar and in the month view as that month's snapshot of the yearly period
- [ ] #4 After saving, a cleanup step lists four checkboxes with exactly what each will change: clear the monthly budget amounts of the category in the covered months, remove the old single-payee schedules it replaces, link the matched transactions to the new schedule, move same-payee transactions in other categories to this category; nothing changes until confirmed, and the changes can be undone with Actual's undo
- [ ] #5 Tests cover the category and multi-payee matching, the prefill, the linked period and each cleanup action; the gate passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20: owner chose to start these prototype tickets at rung 4 (Sol low), cloud, no GPU. Code thread on oak-paryl, worktree task-24-*, brief /var/lib/t3/actually-orch/briefs/task-24-brief.md. Prototype branch: not landed on main until the owner has given notes.

2026-11-20 19:48Z: r1 candidate adcb030f4 (Sol low), gate passed. Astra high r1 REQUEST CHANGES: blocking transfer counterpart link erased; blocking isNot-category schedule offered for deletion; blocking partial conversion on link failure; should-fix one-payee oneOf posting and single-payee compatibility; should-fix multi-year total; weak cleanup checkbox tests. Round 2 sent.
<!-- SECTION:NOTES:END -->
