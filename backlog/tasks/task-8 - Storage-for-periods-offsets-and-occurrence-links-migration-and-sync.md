---
id: TASK-8
title: Storage for periods, offsets and occurrence links (migration and sync)
status: Done
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T18:40:00Z'
labels:
  - integration
dependencies:
  - TASK-6
modified_files:
  - packages/loot-core/migrations/1794787200000_add_period_budget_tables.sql
  - packages/loot-core/src/server/aql/schema/index.ts
  - packages/loot-core/src/server/main.ts
  - packages/loot-core/src/server/period-budget/app.ts
  - packages/loot-core/src/server/period-budget/links.test.ts
  - packages/loot-core/src/server/period-budget/periods.test.ts
  - packages/loot-core/src/server/period-budget/rollover.test.ts
  - packages/loot-core/src/server/period-budget/two-devices.test.ts
  - packages/loot-core/src/shared/period-loader.test.ts
  - packages/loot-core/src/shared/period-loader.ts
  - packages/loot-core/src/shared/period-store.test.ts
  - packages/loot-core/src/shared/period-store.ts
  - packages/loot-core/src/types/handlers.ts
  - packages/loot-core/src/types/models/index.ts
  - packages/loot-core/src/types/models/period-budget.ts
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 3 (last paragraph) and section 10 step 2: dedicated, synchronized records for period allowances, payment offsets and scheduled-occurrence associations, following Actual's migration and CRDT sync conventions; not one shared preference value.

Outline only. Needs a plan in docs/plans/ from the owner before it is started: table and field definitions, how an occurrence is identified (Actual stores only a schedule id on a transaction and one next date per schedule), and the behaviour on conflicting edits from two devices.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One additive migration creates the six tables of B1; each is in the query schema and has a model type.
- [x] #2 Handlers exist, each undoable: set and switch off a cadence; create, edit, delete, restore and carry a period; set and clear an offset; link and unlink a schedule; set and clear a charge override; exclude and include an account.
- [x] #3 Storing the next period follows B2: after a successful sync or on a file without a server, with the fixed id, the allowance copied as its own value, no carry, and never over an existing id. Tests cover a deleted id and a moved period.
- [x] #4 Planned rows are derived for any date range and carry the id they will get.
- [x] #5 A handler refuses a write that is invalid on its own device (overlap, end not after start, offset to another category) and says why.
- [x] #6 The loader turns any stored rows into input the landed calculation accepts, and returns the set-aside rows with reasons. Each rule of S2 has a test.
- [x] #7 Each row of B7 has a test that applies two devices' changes in both orders and gets the stated result both times.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.

2026-11-15: started. Pyramid-loop rung 1 (opencode studio/qwen3.8-27b high), branch task-8-period-storage, staged in steps with a commit after each. Reviewer: codex gpt-6.1-sol xhigh.

2026-11-15: rung 1, round 1 candidate c3d471dc6 (steps 1 to 7: 46d219e3a, 2e195a66b, 7746d42ee, 563ffedc9, b8edbf728, 89b4a99f8, bcd5bf2fa, format c3d471dc6). Gate passed in the worktree (typecheck, lint, test). The orchestrator wrote the step files and, for the server handlers, the four test files and a reference used to check the brief; the coder wrote the production code from rule lists. Sent to independent review (codex gpt-6.1-sol xhigh), brief /tmp/actually-orch/task-8-review-brief.md. GPU slot released.

Round 1 review (codex gpt-6.1-sol xhigh) of c3d471dc6: REQUEST CHANGES, 7 findings. Blocking: (1) set-cadence always sent start date, length and active, so a length change undid another device's start-date change; (2) inserts send no message for null fields (override amount back to none, rollover's empty carry source); (4) a deleted period with a :2 id was planned again as :3; (5) B7 rows 2 and 11 were not really replayed in both orders / used no real schedule edit. Should-fix: (3) new set-style rows sent no tombstone message; (6) budget plus carryover can exceed the safe range; (7) planner stopped silently after 1000 periods. Reviewer killed 8 of 10 mutants. Round 2 (rung 1) started: orchestrator prototyped fixes and tests, coder applies them in three steps (/tmp/actually-orch/task-8-fix1..3.md).

Round 2 (rung 1) candidate 0f81a4b26: fix commits d4e1ff345 (planner suffix walk, no 1000 cap, budget plus carryover check in store and loader), 1793f7fe8 (inserts send null fields, new set-style rows send tombstone false, carry refuses an unsafe sum), 0f81a4b26 (set-cadence sends only changed fields; two-device tests for rows 2 and 11 strengthened). All 7 round-1 findings and both surviving mutants addressed. Full gate passed (typecheck, lint, test: exit 0). 188 focused tests. Authorship: the orchestrator prototyped the production fixes and wrote the tests; the coder applied them; the reviewer is independent. Sent for review round 2.

Round 2 (rung 1, local coder; reviewer gpt-6.1-sol xhigh): candidate 0f81a4b26, gate passed, verdict REQUEST CHANGES. All 7 round-1 findings closed. New: finding 8 (should-fix, AC #6): the loader returns rows that are each valid but whose amounts together make the calculation refuse; finding 9 (should-fix, AC #4): a planned period can end on 10000-01-01 and storing it fails. Mutation: 12 run, 10 killed, 2 survived (cadence always re-sends active; period insert revives a deleted period). Round 3 (last reviewed round at rung 1) started: the orchestrator prototyped fixes and tests (209 focused tests, 25 mutants killed); the coder applies them.

Round 3 candidate 057ad61ec81cc2a1fb786b03685dc27e9553eb52 (rung 1): full gate passed (typecheck, lint, test). Authorship: the orchestrator wrote the round-3 code and tests in a scratch worktree (209 focused tests, 25 mutants killed); the local coder copied the eight files in and committed them, and wrote no code itself. The files on the branch are byte-identical to the prototype. Sent to the independent reviewer (gpt-6.1-sol xhigh) as round 3.

Landed as c521c4143 (candidate 057ad61ec81cc2a1fb786b03685dc27e9553eb52). Ledger, rung 1 (local coder studio/qwen3.8-27b; reviewer codex gpt-6.1-sol xhigh): round 1 c3d471dc6 REQUEST CHANGES (7 findings, 4 blocking); round 2 0f81a4b26 REQUEST CHANGES (findings 8, 9; 2 surviving mutants); round 3 057ad61ec APPROVE (findings 8, 9 and both survivors closed; all 7 acceptance criteria met, #4 within representable dates; reviewer mutation run 19 of 20 killed; 20,000 projections checked against exact arithmetic). Open note, finding 10 (non-blocking): no test covers a payment set aside only by the size rule while a posted charge names it; the code is correct; the test is filed as a follow-up. Choices made inside plan B that the owner should know: cadence length limited to 1 to 120 months; no period past the year 9999; the loader also checks transactions and returns postings (callers must give the calculation loaded.postings); amounts too large together are set aside smallest-kept-first; a cadence edit sends only changed fields. Authorship: from round 1's fixes on, the orchestrator wrote code and tests and the coder applied them.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Landed task-8-period-storage as c521c4143 on 2026-11-15.
<!-- SECTION:FINAL_SUMMARY:END -->
