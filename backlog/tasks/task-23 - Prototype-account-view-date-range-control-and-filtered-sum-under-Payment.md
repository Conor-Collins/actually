---
id: TASK-23
title: 'Prototype: account view date range control and filtered sum under Payment'
status: In Progress
assignee: []
created_date: '2026-11-20T18:41:00Z'
updated_date: '2026-11-20T19:44:00Z'
labels:
  - prototype
dependencies: []
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Conor, 2026-11-20, on the running copy of his server: "the time filter should read less like a filter and more like a range identifier. default to monthly with left and right arrows, to quickly look at months back and forth. you can go deeper and set a specific range using graph that shows a small bar chart for all transactions currently filtered minus the date ( since that is what we are narrowing in this view)." and "the filtered balance should be under the payments as a clearly identified temp sum." Prototype for his notes: built on a prototype branch, not landed on main until he has given notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 In an account or All Accounts view, the date is shown as a range identifier above the table, not as a filter chip: it defaults to the current month and has left and right arrows that move one month back or forward
- [ ] #2 Opening the range control shows a small bar chart of the transactions matching all other filters (every filter except the date), one bar per month, where a range of months (or a custom start and end date) can be chosen; the table then shows that range
- [ ] #3 The sum of the transactions shown is displayed under the Payment and Deposit columns, labelled as the sum of the shown transactions, replacing the Filtered balance badge in the header
- [ ] #4 Existing date filters (month is, year is, date between) saved in filters or URLs still work and show in the range control; other filters are unchanged
- [ ] #5 Page tests cover the arrows, the chart ignoring the date, and the sum; the gate passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20: owner chose to start these prototype tickets at rung 4 (Sol low), cloud, no GPU. Code thread on oak-paryl, worktree task-23-*, brief /var/lib/t3/actually-orch/briefs/task-23-brief.md. Prototype branch: not landed on main until the owner has given notes.

2026-11-20 19:44Z: r1 candidate 564f4c12f (Sol low), gate passed. Astra high r1 REQUEST CHANGES: blocking split sums/chart disagree with register; blocking saved Any filters narrow; should-fix running balance and scheduled rows hidden by month default; should-fix scoped links (tag activity, uncategorized) get the month default; weak footer assertion. Round 2 sent.
<!-- SECTION:NOTES:END -->
