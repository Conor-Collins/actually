---
id: TASK-26
title: >-
  v2.0.0: Rebuild entire interface — modern mobile-friendly control and dense
  desktop power-user UI with mixed info diagrams
status: To Do
assignee: []
created_date: '2026-11-21T03:17:00Z'
labels:
  - v2.0.0
  - semver-major
  - ui
  - owner-approval
dependencies: []
priority: medium
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Conor, 2026-11-20: "Add a major version semver2 ticket to rebuild the entire interface as modern, mobile friendly but sophisticated control and desktop for power user. Mixed info diagrams and information density is the ethic."

Major-version (SemVer 2.0.0) clean-sheet rebuild of the entire Actually user interface, replacing the inherited Actual Budget v1 UI surfaces while preserving local-first storage, CRDT sync, ledger integrity, and the period-budget calculation/storage guarantees in docs/SPEC.md (with clean v1-to-v2 data compatibility).

Core design ethic and dual-surface goals:
- Mixed info diagrams and information density: pair crisp financial tables and tabular numerals with inline, purposeful diagrams (period timelines and allowance lines, date-range histograms, cumulative spending curves, scheduled-charge markers, account cash-flow and shortfall tracks) directly where decisions are made, with high signal-to-noise ratio and minimal chrome.
- Desktop for power users: high information density, keyboard-first navigation and editing, fast multi-period and multi-account inspection, and inline controls across all core views.
- Mobile-friendly with sophisticated control: modern touch-ergonomic layout and responsive navigation that retain full control (editing, filtering, period and schedule management, compact diagrams) rather than a stripped-down read-only companion, while keeping cash available, monthly actuals, period remaining, overspending, and expected remaining unmistakably distinct.
- Unified Actually experience across all core surfaces: Budget and Period Budget, Accounts and transaction register, Schedules, Reports and cash forecasts, and Settings.

Gating: major-version umbrella ticket. Requires owner UI specification, design sign-off, and decomposition into vertical-slice tickets before implementation begins. Does not block or interrupt current v1 or prototype-notes work (TASK-13, TASK-23, TASK-24, TASK-25).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Owner-approved v2.0.0 UI specification and architecture plan covering the design system, responsive breakpoints, desktop keyboard-first and mobile touch interaction models, information-density rules, and mixed info-diagram components, decomposed into dependency-ordered vertical-slice tickets
- [ ] #2 All core surfaces (unified Budget and Period Budget, Accounts and transaction register, Schedules, Reports and cash forecast, Settings) are rebuilt on the v2.0.0 interface with existing local-first storage, CRDT sync, and period-budget calculation invariants intact
- [ ] #3 Desktop delivers a high-density power-user interface with keyboard-first navigation and editing plus inline mixed info diagrams (period timelines, filter range histograms, cumulative spend vs. allowance plots, scheduled-charge markers, and account cash-shortfall tracks) integrated alongside tabular financial figures
- [ ] #4 Mobile delivers a modern, touch-friendly interface with sophisticated control — full editing, filtering, period and schedule management, and compact diagrams that keep cash available, monthly actuals, period remaining, overspending, and expected remaining unmistakably distinct
- [ ] #5 SemVer major version is bumped to 2.0.0 (breaking UI changes documented and existing v1 budgets/sync state load cleanly without data loss), and full verification passes: typecheck, lint, unit/integration tests, desktop and mobile E2E suites, light/dark themes, and WCAG 2.1 AA contrast and keyboard checks
<!-- AC:END -->
