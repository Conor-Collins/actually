---
id: TASK-30
title: >-
  v1.0.0: Category and multi-payee schedules, direct filter conversion, and
  polished reopenable cleanup UX
status: Done
assignee: []
created_date: '2026-11-21T21:16:00Z'
updated_date: '2026-11-22T00:08:00Z'
labels:
  - v1.0.0
  - ui
  - schedules
dependencies:
  - TASK-29
modified_files:
  - packages/desktop-client/src/components/Modals.tsx
  - packages/desktop-client/src/components/accounts/Account.tsx
  - >-
    packages/desktop-client/src/components/accounts/AccountScheduleFromFilter.test.tsx
  - packages/desktop-client/src/components/accounts/Header.tsx
  - packages/desktop-client/src/components/filters/FiltersStack.tsx
  - >-
    packages/desktop-client/src/components/mobile/schedules/MobileScheduleEditPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/schedules/MobileSchedulesPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/schedules/SchedulesListItem.tsx
  - packages/desktop-client/src/components/schedules/ScheduleCleanup.test.tsx
  - packages/desktop-client/src/components/schedules/ScheduleCleanup.tsx
  - packages/desktop-client/src/components/schedules/ScheduleEditForm.test.tsx
  - packages/desktop-client/src/components/schedules/ScheduleEditForm.tsx
  - packages/desktop-client/src/components/schedules/ScheduleEditModal.tsx
  - packages/desktop-client/src/components/schedules/SchedulePayees.tsx
  - packages/desktop-client/src/components/schedules/SchedulesTable.tsx
  - packages/desktop-client/src/components/schedules/filtered-schedule.test.ts
  - packages/desktop-client/src/components/schedules/index.tsx
  - packages/desktop-client/src/components/schedules/schedule-edit-utils.ts
  - packages/desktop-client/src/components/util/GenericInput.tsx
  - packages/desktop-client/src/hooks/useScheduleEdit.ts
  - packages/desktop-client/src/modals/modalsSlice.ts
  - packages/loot-core/src/server/period-budget/app.ts
  - packages/loot-core/src/server/schedules/app.test.ts
  - packages/loot-core/src/server/schedules/app.ts
  - packages/loot-core/src/server/schedules/filtered-schedule.test.ts
  - packages/loot-core/src/server/schedules/filtered-schedule.ts
  - packages/loot-core/src/shared/period-store.ts
  - packages/loot-core/src/shared/schedules.ts
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
- [x] #1 Schedules support category (category is X) and multi-payee (payee oneOf) conditions across server matching/posting, desktop editor, and mobile schedule views
- [x] #2 Schedule from this filter is surfaced directly on the active account filter bar (not buried only in the overflow menu), waits for the current range query, and prefills category, payees, yearly cadence, net amount, account, and matching transactions
- [x] #3 Saving creates or safely reuses a linked yearly period and cadence on Period Budget without triggering a spurious Needs attention warning for next year's repeating occurrence
- [x] #4 Cleanup dialog renders checkboxes inline beside labels, collapses uniform monthly amounts into an expandable summary line, hides zero-count actions completely, formats amounts cleanly with FinancialText (no raw signed numbers), applies undoably only on confirmation, and can be reopened later from any category/multi-payee schedule
- [x] #5 Server and component tests cover category/multi-payee matching, direct filter-bar conversion and range race, polished/reopenable cleanup, and absence of false Needs attention warnings
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-30-category-schedules as 9729318b4 on 2026-11-21.
<!-- SECTION:FINAL_SUMMARY:END -->
