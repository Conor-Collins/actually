---
id: TASK-11
title: Opt-in Period Budget page with period editing and payment drill-down
status: Done
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-16T03:08:00Z'
labels:
  - ui
dependencies:
  - TASK-8
  - TASK-9
modified_files:
  - packages/desktop-client/package.json
  - packages/desktop-client/src/components/FinancesApp.tsx
  - packages/desktop-client/src/components/period-budget/AmountCell.tsx
  - packages/desktop-client/src/components/period-budget/AsOfControls.tsx
  - packages/desktop-client/src/components/period-budget/CadenceForm.tsx
  - packages/desktop-client/src/components/period-budget/CategoryPanel.tsx
  - packages/desktop-client/src/components/period-budget/CategoryRow.tsx
  - packages/desktop-client/src/components/period-budget/ChargeForm.tsx
  - packages/desktop-client/src/components/period-budget/Field.tsx
  - packages/desktop-client/src/components/period-budget/Figure.tsx
  - packages/desktop-client/src/components/period-budget/LabelledMoney.tsx
  - packages/desktop-client/src/components/period-budget/MobilePeriodBar.tsx
  - packages/desktop-client/src/components/period-budget/MobilePeriodBudget.tsx
  - packages/desktop-client/src/components/period-budget/Money.tsx
  - packages/desktop-client/src/components/period-budget/NeedsAttention.tsx
  - packages/desktop-client/src/components/period-budget/OpenedRow.tsx
  - packages/desktop-client/src/components/period-budget/PanelFrame.tsx
  - packages/desktop-client/src/components/period-budget/PanelSection.tsx
  - packages/desktop-client/src/components/period-budget/PeriodBar.tsx
  - packages/desktop-client/src/components/period-budget/PeriodBudgetFigures.tsx
  - >-
    packages/desktop-client/src/components/period-budget/PeriodBudgetPage.test.tsx
  - packages/desktop-client/src/components/period-budget/PeriodBudgetPage.tsx
  - packages/desktop-client/src/components/period-budget/PeriodCharges.tsx
  - packages/desktop-client/src/components/period-budget/PeriodForm.tsx
  - packages/desktop-client/src/components/period-budget/PeriodPanel.tsx
  - packages/desktop-client/src/components/period-budget/PeriodPayments.tsx
  - packages/desktop-client/src/components/period-budget/Timeline.tsx
  - packages/desktop-client/src/components/period-budget/TimelineDot.tsx
  - packages/desktop-client/src/components/period-budget/TimelineTrack.tsx
  - packages/desktop-client/src/components/period-budget/layout.ts
  - packages/desktop-client/src/components/period-budget/selection.ts
  - packages/desktop-client/src/components/period-budget/useAmountText.ts
  - packages/desktop-client/src/components/period-budget/usePeriodBudgetData.ts
  - >-
    packages/desktop-client/src/components/period-budget/usePeriodBudgetLabels.ts
  - packages/desktop-client/src/components/settings/SettingsNav.test.tsx
  - packages/desktop-client/src/components/sidebar/sidebarMenu.test.ts
  - packages/desktop-client/src/components/sidebar/sidebarMenu.ts
  - packages/desktop-client/src/components/sidebar/useSidebarMenuItemDetails.ts
  - packages/desktop-client/src/global-events.ts
  - packages/desktop-client/src/period-budget/fixtures.ts
  - packages/desktop-client/src/period-budget/index.ts
  - packages/desktop-client/src/period-budget/model.test.ts
  - packages/desktop-client/src/period-budget/model.ts
  - packages/desktop-client/src/period-budget/mutations.test.ts
  - packages/desktop-client/src/period-budget/mutations.ts
  - packages/desktop-client/src/period-budget/overlap.test.ts
  - packages/desktop-client/src/period-budget/overlap.ts
  - packages/desktop-client/src/period-budget/queries.test.ts
  - packages/desktop-client/src/period-budget/queries.ts
  - packages/desktop-client/src/sync-events.ts
  - packages/loot-core/src/server/period-budget/calculate.test.ts
  - packages/loot-core/src/server/period-budget/calculate.ts
  - packages/loot-core/src/server/period-budget/payment-queries.test.ts
  - packages/loot-core/src/shared/period-budget.test.ts
  - packages/loot-core/src/shared/period-budget.ts
  - packages/loot-core/src/shared/period-charges.test.ts
  - packages/loot-core/src/shared/period-charges.ts
  - packages/loot-core/src/shared/period-loader.ts
  - packages/loot-core/src/shared/period-payment-queries.ts
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 7 and section 10 step 4. A page showing month and as-of navigation, cash in selected accounts, actual spending in the month, combined active remaining, overspending, and a row per category period (dates, allowance, spent, remaining, expected remaining) with drill-down to its payments. The existing budgeting modes stay available. v26.11.0 lets users show, hide and reorder sidebar pages and choose the start page, which is where an opt-in page is switched on.

Outline only. Waits on the owner's decisions (SPEC section 10): how a user creates a period, copies an allowance and explicitly carries a balance (including who creates the next period when one ends); how cash accounts are selected; whether optional funding belongs in the first interface; the phone layout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The sidebar page of S7 exists, hidden by default; Actual's budget page is unchanged.
- [x] #2 Header and category rows show what B6 lists, with period bars, payment dots and charge dots on the shared axis and the as-of line. Every money figure has a label; the combined remaining is never labelled as a monthly limit or as cash (spec section 5).
- [x] #3 Selecting a bar opens the row with its payments, charges and actions, without the full graph. Each bar and dot has a text equivalent for keyboard and screen-reader use.
- [x] #4 Cadence setup, schedule links, period edits, carry, offsets and overrides work from the page.
- [x] #5 "Needs attention" lists set-aside rows, unassigned spending, charges without a period and overrides without a date, each with its fixing action.
- [x] #6 The phone "Month" and "Periods" tabs of B6 work at 360 px width.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.

2026-11-15 23:38Z orchestrator: started. Plan: one branch task-11-period-budget-page; steps A (payments list in the calculation), B (sidebar id, routes, queries), C (wide page), D (actions), E (Needs attention), F (phone tabs). Sidebar follows plan S7 literally: hidden by default means listed under Settings until switched on.

Rung 1 (local qwen3.8-27b applying orchestrator-written patches), 3 reviewed rounds. Round 1 471f99df9: REQUEST CHANGES (2 blocking, 6 should-fix). Round 2 da9330f44: REQUEST CHANGES (3 should-fix). Round 3 c2a5c2591: gate exit 0 at 03:01Z, reviewer (codex gpt-6.1-sol xhigh) APPROVE at 03:05Z, no blocking or should-fix findings; one note (a split part that names itself as its parent can be offered as a payment) and three reviewer test additions go to a follow-up ticket. Orchestrator mutation run on round 3: 26 of 26 killed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-11-period-budget-page as 7afe35c91 on 2026-11-15.
<!-- SECTION:FINAL_SUMMARY:END -->
