---
id: TASK-25
title: 'Prototype: yearly periods shown on the main Budget page as a month snapshot'
status: To Do
assignee: []
created_date: '2026-11-20T19:28:00Z'
labels:
  - prototype
dependencies: []
priority: medium
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Conor, 2026-11-20: "My understanding was that this actually version would be able to build and show the yearly schedules in budget". His choice (same day): show yearly items on Actual's main monthly Budget page too, as each month's snapshot, keeping the Period Budget page for the full-year view. Prototype for his notes on a prototype branch, not landed on main until he has given notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On Actual's monthly Budget page, a category that has a period longer than a month covering the shown month is marked as yearly (or its cadence) and shows that month's snapshot of the period: the period's allowance, spent in the period so far (to the end of the shown month), and what is left, instead of a monthly envelope amount
- [ ] #2 The snapshot uses the same calculation as the Period Budget page (period-budget/calculate or the shared functions), so both pages agree for the same day
- [ ] #3 From the snapshot one can open that period on the Period Budget page; monthly categories without such a period are unchanged
- [ ] #4 The month totals of the Budget page say how yearly periods are counted in them (e.g. a separate line), so money is not counted twice
- [ ] #5 Page tests cover a yearly category on two months and a monthly category unchanged; the gate passes
<!-- AC:END -->
