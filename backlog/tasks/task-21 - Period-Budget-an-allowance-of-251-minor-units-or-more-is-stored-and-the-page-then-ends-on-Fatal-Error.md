---
id: TASK-21
title: >-
  Period Budget: an allowance of 2^51 minor units or more is stored and the page
  then ends on Fatal Error
status: To Do
assignee: []
created_date: '2026-11-16T15:00:00Z'
updated_date: '2026-11-16T15:00:00Z'
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
<!-- SECTION:NOTES:END -->
