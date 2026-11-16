---
id: TASK-12
title: Period graph and account forecast on the Period Budget page
status: Done
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-16T05:27:00Z'
labels:
  - ui
dependencies:
  - TASK-10
  - TASK-11
modified_files:
  - packages/desktop-client/src/components/period-budget/AccountChoice.tsx
  - packages/desktop-client/src/components/period-budget/AccountPanel.tsx
  - packages/desktop-client/src/components/period-budget/AccountRow.tsx
  - packages/desktop-client/src/components/period-budget/AccountTrack.tsx
  - packages/desktop-client/src/components/period-budget/AccountsForecast.tsx
  - packages/desktop-client/src/components/period-budget/AxisHeader.tsx
  - packages/desktop-client/src/components/period-budget/CashTotals.tsx
  - packages/desktop-client/src/components/period-budget/ForecastSummary.tsx
  - packages/desktop-client/src/components/period-budget/GraphLine.tsx
  - packages/desktop-client/src/components/period-budget/GraphMark.tsx
  - packages/desktop-client/src/components/period-budget/HorizonControl.tsx
  - packages/desktop-client/src/components/period-budget/MobileAccounts.tsx
  - packages/desktop-client/src/components/period-budget/MobilePeriodBudget.tsx
  - packages/desktop-client/src/components/period-budget/OpenedRow.tsx
  - >-
    packages/desktop-client/src/components/period-budget/PeriodBudgetForecast.test.tsx
  - packages/desktop-client/src/components/period-budget/PeriodGraph.tsx
  - packages/desktop-client/src/components/period-budget/PeriodPanel.tsx
  - packages/desktop-client/src/components/period-budget/Timeline.tsx
  - packages/desktop-client/src/components/period-budget/TimelineTrack.tsx
  - packages/desktop-client/src/components/period-budget/useCashForecast.ts
  - packages/desktop-client/src/components/period-budget/useMarkLabels.ts
  - packages/desktop-client/src/components/period-budget/usePeriodBudgetData.ts
  - packages/desktop-client/src/period-budget/forecast.test.ts
  - packages/desktop-client/src/period-budget/forecast.ts
  - packages/desktop-client/src/period-budget/graph.test.ts
  - packages/desktop-client/src/period-budget/graph.ts
  - packages/desktop-client/src/period-budget/horizon.test.ts
  - packages/desktop-client/src/period-budget/horizon.ts
  - packages/desktop-client/src/period-budget/index.ts
  - packages/loot-core/src/types/prefs.ts
priority: low
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC sections 6 and 7 and section 10 step 5. Per period: an allowance line, a cumulative spending line, selectable payment markers, hollow markers and a dashed projection for scheduled charges, and the as-of date. Per account: upcoming payments, expected income, transfers needed and projected shortfalls.

Outline only. Waits on the owner's decisions (SPEC section 10): how offset payments outside the period's dates and irregular multi-month periods are drawn; how expected income is configured and forecast uncertainty shown; credit-card treatment and forecast horizon controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The full graph in the opened row follows the conventions of spec section 7; a payment outside its period is drawn at its real date with the connector, and the payment list says so in words.
- [x] #2 Account rows on the shared axis show what S5 lists, with the "in accounts" and "owed" split of B5.
- [x] #3 The horizon control of S5 changes the forecast and is remembered.
- [x] #4 The phone "Accounts" tab shows the same figures.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.

2026-11-16 03:12Z: started after TASK-11 landed (7afe35c91). Pyramid-loop rung 1; the orchestrator prototypes the reference and tests in a scratch worktree as for TASK-11.

2026-11-16 04:42Z: rung 1 round 1 candidate 7ae146edc on task-12-graph-and-forecast (one commit on 68a5c7a74; the orchestrator's patch applied by the local coder, patch-id verified). Gate running; review next.

2026-11-16 05:18Z: review of 7ae146edc (round 1): REQUEST CHANGES. One blocking finding (an early payment of a period that has not begun had no connector), one should-fix (two lint suppressions for index keys), two notes (relative sibling imports: kept as the repository does; screen-reader text under the shared PrivacyFilter: inherited, follow-up), one surviving mutant (warning colour of a negative lowest balance). Round 2 candidate f97424508 (second commit on 7ae146edc; the orchestrator's patch applied by the local coder, patch-id verified). Gate running; review next.

2026-11-16 05:25Z: review of f97424508 (round 2, codex gpt-6.1-sol xhigh): APPROVE. All four criteria met; round-1 findings 1 and 2 resolved, 3 accepted as triaged, 4 a follow-up. One note (a test that fails on React duplicate-key warnings in the graph) goes to a follow-up. Orchestrator's gate on f97424508: exit 0 at 05:20Z. Landing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-12-graph-and-forecast as ccf85668b on 2026-11-15.
<!-- SECTION:FINAL_SUMMARY:END -->
