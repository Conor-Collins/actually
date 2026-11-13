---
id: TASK-8
title: Storage for periods, offsets and occurrence links (migration and sync)
status: To Do
assignee: []
created_date: '2026-11-13T16:09:00Z'
labels:
  - integration
  - needs-decision
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
- [ ] #1 Acceptance criteria are set from the owner's plan before this task is started.
<!-- AC:END -->
