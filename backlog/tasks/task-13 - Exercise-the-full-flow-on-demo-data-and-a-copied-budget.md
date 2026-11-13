---
id: TASK-13
title: Exercise the full flow on demo data and a copied budget
status: To Do
assignee: []
created_date: '2026-11-13T16:09:00Z'
labels:
  - verification
dependencies:
  - TASK-12
priority: low
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 10 step 6: run the whole feature against the demo budget and then a copy of a real budget, including synchronization conflicts and historical edits, and record what fails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each acceptance scenario in SPEC section 8 is exercised in the running app on demo data, with the result recorded.
- [ ] #2 The same scenarios are exercised on a copied budget synchronized between two clients, including a conflicting edit and an edit to a closed period, with the result recorded.
<!-- AC:END -->
