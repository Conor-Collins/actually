---
id: TASK-31
title: >-
  v1.0.0: Unified visual monthly Budget view with inline period graphs, cash
  strip, and mobile parity
status: Review
assignee: []
created_date: '2026-11-21T21:16:00Z'
updated_date: '2026-11-22T00:03:00Z'
labels:
  - v1.0.0
  - ui
  - budget
dependencies: []
priority: high
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Part of v1.0.0 umbrella TASK-27.

Replaces rough prototype TASK-25 (approved candidate 583dc9a78, reference only) to deliver Conor's v1.0.0 core goal: reworked period-budget backend surfaced directly in the monthly Budget view combining spreadsheet rows and graphed information on desktop and mobile, with Period Budget promoted out of hidden Settings.

Design reference for month header: /var/lib/t3/actually-orch/design-refs/month-nav-ref.png.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Monthly Budget view header adopts the calendar-style navigation pattern (Today pill, adjacent fixed-position previous/next chevrons, clean headline month label with quick jump) while keeping multi-month controls working
- [ ] #2 Categories with multi-month periods display aligned Budgeted/Spent/Balance figures (matching Period Budget calculation including carryover) paired with an inline visual period bar showing progress fill, as-of marker, non-colliding payment dots (clustered/offset when dates are close), upcoming scheduled-charge markers, and hover tooltips that always include full formatted amounts
- [ ] #3 Clicking a period row or bar expands an inline detail/graph view inside Budget showing PeriodGraph (cumulative spend vs allowance), payments, upcoming charges, and period actions (edit, carry, offset, cadence, link schedule) without navigating away to Settings
- [ ] #4 Budget view surfaces a compact collapsible cash/shortfall and Needs attention strip (in accounts vs owed, shortfall warnings, attention count), removes the cramped column-header disclaimer in favor of clean separate period totals that avoid silent double-counting when monthly amounts remain, promotes period-budget out of hidden-by-default Settings in sidebarMenu.ts, and cleans up No periods yet noise for monthly-only categories on Period Budget
- [ ] #5 Mobile Budget displays a compact inline visual period bar with allowance, spent, and remaining for multi-month categories and allows tapping to view the period graph/details at 360px width; component tests cover desktop and mobile rows, marker de-collision, inline graph expansion, totals separation, and parity with period-budget/calculate
<!-- AC:END -->
