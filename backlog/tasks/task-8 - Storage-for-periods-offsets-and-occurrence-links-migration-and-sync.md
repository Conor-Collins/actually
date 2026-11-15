---
id: TASK-8
title: Storage for periods, offsets and occurrence links (migration and sync)
status: To Do
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-15T16:13:00Z'
labels:
  - integration
dependencies:
  - TASK-6
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
- [ ] #1 One additive migration creates the six tables of B1; each is in the query schema and has a model type.
- [ ] #2 Handlers exist, each undoable: set and switch off a cadence; create, edit, delete, restore and carry a period; set and clear an offset; link and unlink a schedule; set and clear a charge override; exclude and include an account.
- [ ] #3 Storing the next period follows B2: after a successful sync or on a file without a server, with the fixed id, the allowance copied as its own value, no carry, and never over an existing id. Tests cover a deleted id and a moved period.
- [ ] #4 Planned rows are derived for any date range and carry the id they will get.
- [ ] #5 A handler refuses a write that is invalid on its own device (overlap, end not after start, offset to another category) and says why.
- [ ] #6 The loader turns any stored rows into input the landed calculation accepts, and returns the set-aside rows with reasons. Each rule of S2 has a test.
- [ ] #7 Each row of B7 has a test that applies two devices' changes in both orders and gets the stated result both times.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15: two candidate plans (A stored records, B cadence and derivation) are in /data/t3-work/actually-approvals/plans-2026-11-15/ and wait for the owner's choice. Scope and acceptance criteria are unchanged until then.

2026-11-15: the owner approved plan B ("Plan B, all approved"). The plan is docs/plans/period-budget.md (commit 6f90e400f); section references in the acceptance criteria (B1 to B9, S1 to S8) are to that file. Acceptance criteria set from its section B9.
<!-- SECTION:NOTES:END -->
