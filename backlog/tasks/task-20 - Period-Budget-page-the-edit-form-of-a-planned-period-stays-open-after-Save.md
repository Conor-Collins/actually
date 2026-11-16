---
id: TASK-20
title: 'Period Budget page: the edit form of a planned period stays open after Save'
status: To Do
assignee: []
created_date: '2026-11-16T14:52:00Z'
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
