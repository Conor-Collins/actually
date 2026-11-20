---
id: TASK-19
title: >-
  Period Budget page: a change made while the browser is offline is not stored
  until it is online again
status: Review
assignee: []
created_date: '2026-11-16T14:52:00Z'
updated_date: '2026-11-20T02:51:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-13 on 2026-11-16 (docs/verification/period-budget.md, finding 13). With the browser offline (navigator.onLine false; in Playwright context.setOffline(true)) an allowance was changed on the page: after three seconds the mutation was pending and paused, the period in the file had the old allowance, Save was grey and the bar unchanged. Back online the change was stored. Cause: the page makes its writes with TanStack Query's useMutation (packages/desktop-client/src/period-budget/mutations.ts), and the QueryClient (packages/desktop-client/src/index.tsx) has the default network mode online, which pauses mutations and queries while the browser reports no network. Actual keeps its data on the device, so a write does not need the network; Actual's own screens store offline. Likely fix: networkMode always for the page's mutations and queries. Whether other parts of the app that use the same QueryClient have the same fault was not looked at. Created by the orchestrator on its own judgement as a defect of landed work (TASK-11); no ticket's scope is changed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With the browser offline, a change made on the Period Budget page (an allowance, a new period, a payment counted in another period) is stored in the file and shown on the page at once
- [x] #2 A test fails on main before the fix and passes after it: a browser test that sets the context offline, or a page test that reports no network to TanStack Query
- [x] #3 The page's figures are also calculated again while the browser is offline, for example after the as-of day is changed
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20T02:18Z Orchestrator: started on err-narel by the owner's instruction to send lingering tasks to max-ecru and err-narel (max-ecru's availability switch reads unavailable, so err-narel only). Rung 3 (Luna, low) by the owner's choice: the local rungs 1 and 2 cannot run there. Branch task-19-… on err-narel, candidate comes back as a bundle in /mnt/fm/projects/actually-transfer; review (Astra, high) and landing on oak-paryl.

2026-11-20T02:29Z Orchestrator: rung 3 (gpt-6-luna, low) ended six turns in a row without a candidate, each after one or two minutes and despite explicit instructions to finish; I count that as rung 3 failed (no candidate to review) and moved the same Code thread to rung 4 (gpt-6.2-sol, low). No review ran yet.

2026-11-20T02:51Z Orchestrator: rung 4 round 1 candidate 75b7576bd (gate exit 0 on oak-paryl 02:45Z and on err-narel). Review (gpt-6.2-astra, high) APPROVE at 02:47Z: confirmed in Chromium with the context offline (allowance changed twice, stored and shown before reconnecting); both new tests fail on the base code; creating a period and moving a payment go through the same mutation. Note: a first offline visit with an empty cache still waits on Actual's shared category, payee and account queries (filed as a follow-up ticket). Landing.
<!-- SECTION:NOTES:END -->
