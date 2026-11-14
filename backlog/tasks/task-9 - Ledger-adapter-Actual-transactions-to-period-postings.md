---
id: TASK-9
title: 'Ledger adapter: Actual transactions to period postings'
status: Done
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T06:38:00Z'
labels:
  - integration
dependencies:
  - TASK-4
modified_files:
  - packages/loot-core/src/shared/period-ledger.test.ts
  - packages/loot-core/src/shared/period-ledger.ts
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 4 ('The future ledger adapter must') and section 10 step 3. Turns Actual's transactions into the normalized expense postings summarizePeriodBudgets takes. In v26.11.0 a transfer between an on-budget and an off-budget account keeps its category (upstream change 9205), which is the behaviour to follow for off-budget transfers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deleted transactions, starting balances, income and split parents are excluded from expense postings.
- [x] #2 Split children are counted once, each with its own category.
- [x] #3 Transfers between included (on-budget) accounts are not spending; transfers to off-budget accounts are classified as Actual classifies them.
- [x] #4 Uncategorized or otherwise unresolved expenses are returned for resolution, not dropped.
- [x] #5 Tests cover splits, refunds, internal transfers, off-budget transfers and uncategorized expenses, and the gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started 2026-11-13 at rung 1 (local coder). Shape chosen by the orchestrator for the brief: a pure function toPeriodPostings({transactions, accounts, categories, payees}) in packages/loot-core/src/shared/period-ledger.ts returning {postings, unresolved}; it follows Actual v26.11.0 (budget/base.ts sums categorized transactions of on-budget accounts; queries/index.ts uncategorizedTransactions treats a transfer to an off-budget account as needing a category). Brief: /tmp/actually-orch/task-9-brief.md.

Round 1 (rung 1, local coder): candidate af3947ad2, gate passed, 53 focused tests. Independent review (GPT Sol xhigh): APPROVE af3947ad2. No blocking or should-fix findings; 87 hand mutants, 77 killed, 4 equivalent, 6 survivors that only append text to error messages (toThrow(string) matches a substring; not a ticket requirement, recorded as a follow-up). Reviewer agreed with the orchestrator's choices a to j (pure function, transfer via payee.transfer_acct, internal transfers excluded even when categorized, off-budget rows excluded, uncategorized deposits surfaced, unknown category unresolved, child with absent parent kept, unknown accounts and duplicate ids throw, no date/amount validation, skips before lookups). Caller contract for later integration: flat schema-normalized rows, parent liveness checked by the caller, complete account/category/payee lists.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-9-ledger-adapter as 79f77b921 on 2026-11-13.
<!-- SECTION:FINAL_SUMMARY:END -->
