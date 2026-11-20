---
id: TASK-22
title: 'Period Budget page: a first visit while offline shows no category rows'
status: In Progress
assignee: []
created_date: '2026-11-20T02:51:00Z'
updated_date: '2026-11-20T03:37:00Z'
labels:
  - bug
dependencies: []
priority: low
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the independent review of TASK-19 on 2026-11-20. TASK-19 lets the page's own queries and writes run offline. The page also uses Actual's shared category, payee and account queries (usePeriodBudgetData.ts: useCategories, usePayees, useAccounts), which keep TanStack Query's default network mode. On a first visit while the browser is offline, with nothing in the query cache, those queries are paused: the figures can be calculated, but the period table builds its rows from the category groups and so has no row to open or edit, and account and payee names are missing. Suggested by the reviewer: use the three shared query definitions with networkMode always at the Period Budget call sites, and a test that starts offline with a fresh query client. Created by the orchestrator on its own judgement as a follow-up of TASK-19; no ticket's scope is changed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With the browser offline and an empty query cache, the Period Budget page shows its category rows, and a stored period can be opened and edited
- [ ] #2 A page test starts offline with a fresh query client, holds the first criterion, and fails on main
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20T03:37Z Orchestrator: started on err-narel at rung 3 (gpt-6-luna, low), as the owner asked for lingering tasks; base is main d23f5523f (sent as a bundle). Review and landing on oak-paryl.
<!-- SECTION:NOTES:END -->
