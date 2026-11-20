---
id: TASK-22
title: 'Period Budget page: a first visit while offline shows no category rows'
status: Done
assignee: []
created_date: '2026-11-20T02:51:00Z'
updated_date: '2026-11-20T06:11:00Z'
labels:
  - bug
dependencies: []
modified_files:
  - >-
    packages/desktop-client/src/components/period-budget/PeriodBudgetForecast.test.tsx
  - >-
    packages/desktop-client/src/components/period-budget/PeriodBudgetPage.test.tsx
  - packages/desktop-client/src/components/period-budget/usePeriodBudgetData.ts
priority: low
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the independent review of TASK-19 on 2026-11-20. TASK-19 lets the page's own queries and writes run offline. The page also uses Actual's shared category, payee and account queries (usePeriodBudgetData.ts: useCategories, usePayees, useAccounts), which keep TanStack Query's default network mode. On a first visit while the browser is offline, with nothing in the query cache, those queries are paused: the figures can be calculated, but the period table builds its rows from the category groups and so has no row to open or edit, and account and payee names are missing. Suggested by the reviewer: use the three shared query definitions with networkMode always at the Period Budget call sites, and a test that starts offline with a fresh query client. Created by the orchestrator on its own judgement as a follow-up of TASK-19; no ticket's scope is changed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With the browser offline and an empty query cache, the Period Budget page shows its category rows, and a stored period can be opened and edited
- [x] #2 A page test starts offline with a fresh query client, holds the first criterion, and fails on main
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20T03:37Z Orchestrator: started on err-narel at rung 3 (gpt-6-luna, low), as the owner asked for lingering tasks; base is main d23f5523f (sent as a bundle). Review and landing on oak-paryl.

2026-11-20 05:55Z: rung 3 (Luna low) ended two turns without a candidate (source change only, then a failing test). Moved to rung 4 (Sol low) on the same Code thread now, judging from the same stall on TASK-19/20/21 rather than waiting for six turns.

2026-11-20 05:58Z: round 1 candidate d89745628 (rung 4 Sol low). Astra high review: REQUEST CHANGES, one should-fix: CommandBar/sidebar mount default-mode useAccounts() above the route, so offline the page joins a paused accounts query and shows 'Deleted account'. Round 2 sent: page-only keys under the shared lists() prefix, test with an earlier subscriber.

2026-11-20 06:05Z: round 2 candidate 8a6800b35 (page-only accounts key). Astra round 2: REQUEST CHANGES, blocking: PeriodBudgetForecast.test.tsx fixture seeds the old accounts key (26 failures in the oak-paryl gate); production key and invalidations verified correct. The round-1 gate failure (Food row missing) overlapped the reviewer's temporary mutant in the same worktree, so it says nothing about the candidate. Round 3 sent (test-only).

2026-11-20 06:10Z: round 3 candidate f013a6724 (test-only: fixtures seed the page's accounts key). Full gate on oak-paryl passed on this SHA (/tmp/actually-orch/gate-task-22-r3.log). Astra high round 3: APPROVE f013a6724d7ed5f45596ff39736fcc461b92761d; both criteria met; the base hook fails the test at the Food row and the round-1 key fails it at Checking. Ledger: rung 3 Luna low 2 turns without candidate, rung 4 Sol low rounds 1-3.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-22-offline-first-visit as 9c05c73e2 on 2026-11-19.
<!-- SECTION:FINAL_SUMMARY:END -->
