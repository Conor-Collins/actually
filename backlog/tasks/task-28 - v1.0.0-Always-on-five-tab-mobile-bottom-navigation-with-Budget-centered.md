---
id: TASK-28
title: 'v1.0.0: Always-on five-tab mobile bottom navigation with Budget centered'
status: Done
assignee: []
created_date: '2026-11-21T21:16:00Z'
updated_date: '2026-11-21T23:24:00Z'
labels:
  - v1.0.0
  - ui
  - mobile
dependencies: []
modified_files:
  - packages/desktop-client/e2e/page-models/mobile-navigation.ts
  - packages/desktop-client/e2e/transactions.mobile.test.ts
  - packages/desktop-client/src/components/FinancesApp.tsx
  - packages/desktop-client/src/components/banksync/index.tsx
  - packages/desktop-client/src/components/mobile/MobileNavTabs.test.tsx
  - packages/desktop-client/src/components/mobile/MobileNavTabs.tsx
  - packages/desktop-client/src/components/mobile/MobileSettingsButton.tsx
  - packages/desktop-client/src/components/mobile/accounts/AccountPage.tsx
  - packages/desktop-client/src/components/mobile/accounts/AccountsPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/banksync/BankSyncAccountsList.tsx
  - packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx
  - packages/desktop-client/src/components/mobile/payees/MobilePayeeEditPage.tsx
  - packages/desktop-client/src/components/mobile/payees/PayeesList.tsx
  - packages/desktop-client/src/components/mobile/rules/RulesList.tsx
  - >-
    packages/desktop-client/src/components/mobile/schedules/MobileScheduleEditPage.tsx
  - >-
    packages/desktop-client/src/components/mobile/schedules/MobileSchedulesPage.tsx
  - packages/desktop-client/src/components/mobile/schedules/SchedulesList.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/CalculatorKeyboard.tsx
  - >-
    packages/desktop-client/src/components/mobile/transactions/TransactionEdit.tsx
  - packages/desktop-client/src/components/news/NotificationsPage.tsx
  - packages/desktop-client/src/components/reports/Overview.tsx
  - packages/desktop-client/src/components/settings/index.tsx
priority: high
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Part of v1.0.0 umbrella TASK-27.

Owner design reference: /var/lib/t3/actually-orch/design-refs/mobile-bottom-bar-ref.png (Monarch pattern) with owner choice Option A (2026-11-21): Accounts, Transactions, Budget (centered, slot 3 of 5), Schedules, Reports; Settings accessible from the top mobile header.

Eliminates mobile navigation cul-de-sacs caused by the 7-route allow-list in FinancesApp.tsx:578-590 and the scroll-hiding 2-row pull-up drawer in MobileNavTabs.tsx.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MobileNavTabs renders a permanent single-row 5-tab bottom bar in exact order: Accounts (/accounts), Transactions (/accounts/all), Budget (/budget, centered in slot 3), Schedules (/schedules), Reports (/reports), with top hairline border, solid theme surface, clear active state, and safe-area-inset-bottom clearance
- [x] #2 Bottom bar stays mounted on all mobile app routes (including account detail /accounts/:id, categories /categories/:id, transaction editor /transactions/:id, schedules /schedules/:id, settings /settings/*, payees, rules) and never hides on scroll or collapses into a 2-row pull-up drawer
- [x] #3 Settings (/settings) is directly reachable from the mobile top header across top-level mobile views, and Add Transaction (/transactions/new) remains reachable from mobile views
- [x] #4 Mobile page containers and sub-pages keep matching bottom clearance (MOBILE_NAV_HEIGHT + safe-area-inset-bottom) so content and action footers are not clipped behind the bar
- [x] #5 MobileNavigation E2E page model (e2e/page-models/mobile-navigation.ts) is updated for the 5-tab bar and header Settings access; component tests verify tab order, active states, persistence on sub-routes, no scroll hiding, and Settings access
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-28-mobile-bottom-nav as 047fdcd6f on 2026-11-21.
<!-- SECTION:FINAL_SUMMARY:END -->
