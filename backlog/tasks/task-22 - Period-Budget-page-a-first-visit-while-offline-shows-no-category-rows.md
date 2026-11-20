---
id: TASK-22
title: 'Period Budget page: a first visit while offline shows no category rows'
status: In Progress
assignee: []
created_date: '2026-11-20T02:51:00Z'
updated_date: '2026-11-20T06:05:00Z'
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

2026-11-20 05:55Z: rung 3 (Luna low) ended two turns without a candidate (source change only, then a failing test). Moved to rung 4 (Sol low) on the same Code thread now, judging from the same stall on TASK-19/20/21 rather than waiting for six turns.

2026-11-20 05:58Z: round 1 candidate d89745628 (rung 4 Sol low). Astra high review: REQUEST CHANGES, one should-fix: CommandBar/sidebar mount default-mode useAccounts() above the route, so offline the page joins a paused accounts query and shows 'Deleted account'. Round 2 sent: page-only keys under the shared lists() prefix, test with an earlier subscriber.

2026-11-20 06:05Z: round 2 candidate 8a6800b35 (page-only accounts key). Astra round 2: REQUEST CHANGES, blocking: PeriodBudgetForecast.test.tsx fixture seeds the old accounts key (26 failures in the oak-paryl gate); production key and invalidations verified correct. The round-1 gate failure (Food row missing) overlapped the reviewer's temporary mutant in the same worktree, so it says nothing about the candidate. Round 3 sent (test-only).
<!-- SECTION:NOTES:END -->
