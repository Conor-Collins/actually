---
id: TASK-13
title: Exercise the full flow on demo data and a copied budget
status: In Progress
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-16T14:52:00Z'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator, 2026-11-16T13:35Z: started after TASK-18 landed (d2d4baa06). The scenarios of SPEC section 8 are written as Playwright specs in packages/desktop-client/e2e on a shared scenario module; the results record goes to docs/verification/period-budget.md on the task branch.

2026-11-16T14:52Z Orchestrator: round 1 (rung 1). Candidate dd8dbdadb on branch task-13-verification-in-the-app, gate exit 0 at 14:06Z. Independent review (gpt-6.1-sol, xhigh) at 14:28Z: REQUEST CHANGES. Blocking: (1) amounts were compared by a part of the text, so a wrong amount could pass (the reviewer left the scheduled charges out of expected remaining and all 12 tests still passed); (2) scenario 7 claimed the clauses duplicate IDs and unsafe sums without trying them. Should fix: the cash day of the late offset, the receiving client compared only at the end, the conflict test did not make sure the clients were unsynchronized, mkdir in the record, wording of the record. New defect found by the reviewer: an allowance of 2^52 minor units is stored and the page then ends on Fatal Error. Round 2 is being written.
<!-- SECTION:NOTES:END -->
