---
id: TASK-20
title: 'Period Budget page: the edit form of a planned period stays open after Save'
status: In Progress
assignee: []
created_date: '2026-11-16T14:52:00Z'
updated_date: '2026-11-20T02:43:00Z'
labels:
  - bug
dependencies: []
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-13 on 2026-11-16 (docs/verification/period-budget.md, finding 1) and seen again by the independent review. A period that only follows from the repeating periods (planned, not stored yet) is edited in its panel and saved: the change is stored, but the form does not close as it does for a stored period. After a sync that brings another value for the same period the open form still shows the value that was typed while the bar shows the value that won. Cause: in packages/desktop-client/src/components/period-budget/PeriodPanel.tsx the planned branch of save() calls storing.mutate without onSuccess: () => setIsEditing(false), which the stored branch has. Created by the orchestrator on its own judgement as a defect of landed work (TASK-11); no ticket's scope is changed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After Save on a planned period the form closes once the page shows the change, as for a stored period; when the write is refused the form stays open with what was typed
- [ ] #2 A page test holds both cases and fails on main before the fix
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-20T02:43Z Orchestrator: started on err-narel at rung 3 (gpt-6-luna, low) by the owner's instructions (send lingering tasks to max-ecru and err-narel; start at rung 3 there). Branch task-20-planned-form-closes; candidate comes back as a bundle; review and landing on oak-paryl.
<!-- SECTION:NOTES:END -->
