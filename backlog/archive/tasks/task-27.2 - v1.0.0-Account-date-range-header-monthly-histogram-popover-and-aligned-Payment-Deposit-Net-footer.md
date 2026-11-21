---
id: TASK-27.2
title: >-
  v1.0.0: Account date range header, monthly histogram popover, and aligned
  Payment/Deposit/Net footer
status: To Do
assignee: []
created_date: '2026-11-21T21:14:00Z'
labels:
  - v1.0.0
  - ui
  - accounts
dependencies: []
parent_task_id: TASK-27
priority: high
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replaces rough prototype TASK-23 (approved candidate f2c4251f7, reference only) with production-quality v1.0.0 UX matching owner reference /var/lib/t3/actually-orch/design-refs/month-nav-ref.png and fixing all audited Account view peculiarities.

Preserves all TASK-23 correctness invariants (no split double-counting, saved Any filters intact, post-edit totals refresh, running balance and scheduled rows preserved, scoped links respected).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Account and All Accounts views show a calendar-style range header: outlined Today pill on the left, adjacent fixed-position previous/next chevrons, unboxed headline range label opening the range popover on click, and one-click All dates toggle (no date filter chip)
- [ ] #2 Range popover anchors cleanly inside the viewport (never overflowing over the left sidebar), uses styled date inputs consistent with Actual, and shows an interactive monthly bar chart (all non-date filters applied) with scale/value readouts, hover tooltips with correct singular/plural transaction counts, clean zero-month baseline, click for month, and shift-click/drag for span
- [ ] #3 Table footer renders on a single unclipped line aligned under Payment and Deposit, showing Payment, Deposit, and Net sums clearly labelled as the sum of shown posted transactions using FinancialText
- [ ] #4 Active filter bar exposes a clean action slot/button hook beside active filter chips for Schedule conversion (used by TASK-30) and preserves saved/URL date filters, split totals, post-edit refresh, and scoped links
- [ ] #5 Component and page tests cover calendar nav, popover viewport anchoring, histogram ignoring date filter with singular/plural labels, Payment/Deposit/Net footer updates after edits, and filter-bar hook; focused tests, typecheck, and lint pass
<!-- AC:END -->
