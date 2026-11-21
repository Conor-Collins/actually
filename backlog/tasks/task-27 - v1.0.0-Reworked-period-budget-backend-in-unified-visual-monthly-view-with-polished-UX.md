---
id: TASK-27
title: >-
  v1.0.0: Reworked period-budget backend in unified visual monthly view with
  polished UX
status: To Do
assignee: []
created_date: '2026-11-21T21:14:00Z'
updated_date: '2026-11-21T21:16:00Z'
labels:
  - v1.0.0
  - release
  - ui
dependencies:
  - TASK-28
  - TASK-29
  - TASK-30
  - TASK-31
  - TASK-32
priority: high
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner-approved v1.0.0 release umbrella (2026-11-21). Surfaces Actually's reworked period-budget backend directly inside the monthly Budget view with both spreadsheet figures and inline graphed information, addresses every UX peculiarity audited from prototype-notes-1 across desktop and mobile, closes TASK-13 verification, and bumps the release version to 1.0.0.

Replaces landing the rough prototype branches (TASK-23, TASK-24, TASK-25) directly. Starting coder rung: Sol low (rung 4, cloud, no GPU) per owner approval. TASK-26 (v2.0.0 clean-sheet rebuild) remains parked in To Do under owner-approval.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Monthly Budget view unifies spreadsheet rows with inline period graphs, payment/charge markers, expandable cumulative spend chart, cash/shortfall strip, calendar-style header (month-nav-ref.png), and mobile parity (TASK-31)
- [ ] #2 Account view provides calendar-style date range navigation, viewport-safe interactive monthly histogram popover, aligned single-line Payment/Deposit/Net footer, and direct filter-bar schedule conversion hook (TASK-29)
- [ ] #3 Category and multi-payee schedules convert directly from active filters with polished, reopenable Cleanup UX and no spurious Needs attention warnings on new repeating schedules (TASK-30)
- [ ] #4 Mobile app renders an always-on single-row 5-tab bottom bar (Accounts, Transactions, Budget centered, Schedules, Reports; Settings in top header) with zero hidden-bar cul-de-sacs (TASK-28)
- [ ] #5 Fresh-load rate-limit bursts are resolved, TASK-13 verification is closed on the v1.0.0 codebase, desktop/mobile E2E and full gate pass, and version is bumped to 1.0.0 (TASK-32)
<!-- AC:END -->
