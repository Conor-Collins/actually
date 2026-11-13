---
id: TASK-9
title: 'Ledger adapter: Actual transactions to period postings'
status: To Do
assignee: []
created_date: '2026-11-13T16:09:00Z'
labels:
  - integration
dependencies:
  - TASK-4
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 4 ('The future ledger adapter must') and section 10 step 3. Turns Actual's transactions into the normalized expense postings summarizePeriodBudgets takes. In v26.11.0 a transfer between an on-budget and an off-budget account keeps its category (upstream change 9205), which is the behaviour to follow for off-budget transfers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Deleted transactions, starting balances, income and split parents are excluded from expense postings.
- [ ] #2 Split children are counted once, each with its own category.
- [ ] #3 Transfers between included (on-budget) accounts are not spending; transfers to off-budget accounts are classified as Actual classifies them.
- [ ] #4 Uncategorized or otherwise unresolved expenses are returned for resolution, not dropped.
- [ ] #5 Tests cover splits, refunds, internal transfers, off-budget transfers and uncategorized expenses, and the gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->
