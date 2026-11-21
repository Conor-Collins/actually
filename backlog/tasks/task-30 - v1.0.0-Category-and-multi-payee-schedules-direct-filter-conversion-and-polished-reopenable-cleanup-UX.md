---
id: TASK-30
title: >-
  v1.0.0: Category and multi-payee schedules, direct filter conversion, and
  polished reopenable cleanup UX
status: In Progress
assignee: []
created_date: '2026-11-21T21:16:00Z'
updated_date: '2026-11-21T22:32:00Z'
labels:
  - v1.0.0
  - ui
  - schedules
dependencies:
  - TASK-29
priority: high
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Part of v1.0.0 umbrella TASK-27.

Replaces rough prototype TASK-24 (approved candidate 65e4346ad + integration fix 0dbaedaa2, reference only) with polished v1.0.0 UX fixing every audited Schedule and Cleanup peculiarity.

Preserves all TASK-24 data-safety invariants (category is + payee oneOf matching/posting, stale-range race fix, transfer counterpart link preservation, exact-year period reuse without overwriting multi-year allowances, undoable writes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Schedules support category (category is X) and multi-payee (payee oneOf) conditions across server matching/posting, desktop editor, and mobile schedule views
- [ ] #2 Schedule from this filter is surfaced directly on the active account filter bar (not buried only in the overflow menu), waits for the current range query, and prefills category, payees, yearly cadence, net amount, account, and matching transactions
- [ ] #3 Saving creates or safely reuses a linked yearly period and cadence on Period Budget without triggering a spurious Needs attention warning for next year's repeating occurrence
- [ ] #4 Cleanup dialog renders checkboxes inline beside labels, collapses uniform monthly amounts into an expandable summary line, hides zero-count actions completely, formats amounts cleanly with FinancialText (no raw signed numbers), applies undoably only on confirmation, and can be reopened later from any category/multi-payee schedule
- [ ] #5 Server and component tests cover category/multi-payee matching, direct filter-bar conversion and range race, polished/reopenable cleanup, and absence of false Needs attention warnings
<!-- AC:END -->
