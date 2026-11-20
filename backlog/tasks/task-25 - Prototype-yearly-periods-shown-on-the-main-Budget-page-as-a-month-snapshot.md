---
id: TASK-25
title: 'Prototype: yearly periods shown on the main Budget page as a month snapshot'
status: Review
assignee: []
created_date: '2026-11-20T19:28:00Z'
updated_date: '2026-11-20T20:39:00Z'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20: owner chose to start these prototype tickets at rung 4 (Sol low), cloud, no GPU. Code thread on oak-paryl, worktree task-25-*, brief /var/lib/t3/actually-orch/briefs/task-25-brief.md. Prototype branch: not landed on main until the owner has given notes.

2026-11-20 19:40Z: r1 candidate 3fb4ab341 (Sol low), gate passed. Astra high r1 REQUEST CHANGES: (1) blocking, snapshot allowance omits carryover, disagrees with Period Budget; (2) blocking, 3-line snapshot overflows the 32 px row. Round 2 sent.

2026-11-20 19:47Z: r2 candidate 583dc9a78 (carryover in allowance, one-line snapshot), gate passed (/var/lib/t3/actually-orch/gate-task-25-r2.log). Astra high r2 APPROVE 583dc9a78f9f3469d85f8037ef71c663907c3ef8; note: tooltip omits amount when truncated. Not landed: goes into the prototype branch for the owner's notes; real-browser layout check pending.

2026-11-20 20:40Z: prototype branch prototype-notes-1 at 0bcf53c8b (main 58789a957 + TASK-25 583dc9a78 + TASK-24 incl. TASK-23 f2c4251f7, integration commits 0dbaedaa2 and 65e4346ad); full gate passed (gate-prototype-2.log); Astra high integration review r2 APPROVE 0bcf53c8b412e15baad63681090090e21b6935e5. Served for the owner on 127.0.0.1:5107 from a fresh snapshot copy, Insurance 2026 schedule and period created through the new flow (cleanup skipped). Waiting for the owner's notes; not landed.
<!-- SECTION:NOTES:END -->
