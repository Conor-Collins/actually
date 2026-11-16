---
id: TASK-19
title: >-
  Period Budget page: a change made while the browser is offline is not stored
  until it is online again
status: To Do
assignee: []
created_date: '2026-11-16T14:52:00Z'
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
- [ ] #1 With the browser offline, a change made on the Period Budget page (an allowance, a new period, a payment counted in another period) is stored in the file and shown on the page at once
- [ ] #2 A test fails on main before the fix and passes after it: a browser test that sets the context offline, or a page test that reports no network to TanStack Query
- [ ] #3 The page's figures are also calculated again while the browser is offline, for example after the as-of day is changed
<!-- AC:END -->
