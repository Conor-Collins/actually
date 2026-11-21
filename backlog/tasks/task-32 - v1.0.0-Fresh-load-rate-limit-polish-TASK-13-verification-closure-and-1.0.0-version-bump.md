---
id: TASK-32
title: >-
  v1.0.0: Fresh-load rate-limit polish, TASK-13 verification closure, and 1.0.0
  version bump
status: To Do
assignee: []
created_date: '2026-11-21T21:16:00Z'
labels:
  - v1.0.0
  - verification
  - release
dependencies:
  - TASK-28
  - TASK-29
  - TASK-30
  - TASK-31
priority: high
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Part of v1.0.0 umbrella TASK-27.

Final v1.0.0 verification and release-readiness slice. Smooths fresh-load request bursts against the sync server 500 req/min limiter, closes TASK-13 verification on the v1.0.0 codebase per owner's 2026-11-21 decisions (demo export accepted for AC #2, unit-test coverage accepted for scenario 7 duplicate IDs, load-time exclusion accepted for unsafe sums, Plan B S5 schedules-only forecast kept; pre-first-period spending behavior verified and documented for owner review), runs desktop/mobile E2E checks across all v1.0.0 views, and bumps version to 1.0.0.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fresh page loads and multi-view navigation do not trip the sync server 500 req/min rate limiter, backed by an automated test
- [ ] #2 TASK-13 Playwright verification specs and docs/verification/period-budget.md are rebased and passing against v1.0.0 with owner's 2026-11-21 decisions recorded
- [ ] #3 Desktop and mobile E2E tests verify the unified visual monthly Budget view, Account range histogram and footer, Schedule-from-filter and reopenable Cleanup, and permanent 5-tab mobile bottom nav
- [ ] #4 Package version is bumped to 1.0.0 and the full repository gate (typecheck, lint, test) passes cleanly
<!-- AC:END -->
