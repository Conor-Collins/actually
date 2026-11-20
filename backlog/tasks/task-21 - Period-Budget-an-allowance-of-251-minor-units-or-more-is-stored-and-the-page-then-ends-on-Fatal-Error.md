---
id: TASK-21
title: >-
  Period Budget: an allowance of 2^51 minor units or more is stored and the page
  then ends on Fatal Error
status: In Progress
assignee: []
created_date: '2026-11-16T15:00:00Z'
updated_date: '2026-11-20T02:51:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the independent review of TASK-13 on 2026-11-16 with 2^52 and reproduced by the orchestrator with 2^51 and 2^52 (docs/verification/period-budget.md, finding 12). The handlers period-budget/create-period and update-period take any whole number up to 2^53 - 1 as the allowance. Actual's number formatting takes amounts up to 2^51 - 1. With such a period stored the Period Budget page ends on the Fatal Error screen, also after the app is loaded again; an allowance of 2^50 is shown. It can be reached on the page itself: 22517998136852.48 typed as the allowance of a period and saved is stored (2251799813685248) and the page ends on Fatal Error at once (orchestrator's probe, 2026-11-16 15:03Z; the record of TASK-13 was committed before this probe and names only the handler). It can also arrive by sync or from another program. Whether the rest of the app still opens with such a period in the file was not looked at; if the page cannot be opened the period cannot be deleted on it. Created by the orchestrator on its own judgement as a defect of landed work (TASK-8 handlers, TASK-11 page); no ticket's scope is changed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A period whose allowance Actual cannot show does not stop the Period Budget page from opening: either the handlers refuse an allowance above 2^51 - 1 minor units, or the page sets such a period aside and lists it under Needs attention, or both. The choice is recorded on the ticket
- [ ] #2 A file that has such a period already (it arrived by sync) opens the page, and the period can be deleted there
- [ ] #3 Tests hold both criteria and fail on main before the fix
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-16T15:00Z Orchestrator: description corrected minutes after creation. The first text said the page's form refuses such an amount; a probe showed that it does not. Priority raised to high for that reason.

2026-11-20T02:18Z Orchestrator: started on err-narel by the owner's instruction to send lingering tasks to max-ecru and err-narel (max-ecru's availability switch reads unavailable, so err-narel only). Rung 3 (Luna, low) by the owner's choice: the local rungs 1 and 2 cannot run there. Branch task-21-… on err-narel, candidate comes back as a bundle in /mnt/fm/projects/actually-transfer; review (Astra, high) and landing on oak-paryl.

2026-11-20T02:29Z Orchestrator: rung 3 (gpt-6-luna, low) ended six turns in a row without a candidate, each after one or two minutes and despite explicit instructions to finish; I count that as rung 3 failed (no candidate to review) and moved the same Code thread to rung 4 (gpt-6.2-sol, low). No review ran yet.

2026-11-20T02:51Z Orchestrator: rung 4 round 1 candidate 9d9819d2d (gate exit 0 on oak-paryl 02:44Z and on err-narel). Review (gpt-6.2-astra, high) APPROVE at 02:46Z, with one should-fix in the page test fixture (it overlapped another period, so it was not what the server would set aside) and a note that one new loader test repeats an existing one; both test-only, sent back to the coder as round 2 without a new review round. Choice for criterion 1: the loader sets aside periods whose amounts are past Actual's display limit (2^51 - 1 minor units) and lists them under Needs attention, where they can be deleted; create and update still accept such amounts. The cash forecast uses the same limit.
<!-- SECTION:NOTES:END -->
