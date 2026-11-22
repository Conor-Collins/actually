---
id: TASK-34
title: 'Schedule conditions: one parser that tells absent, empty and populated apart'
status: To Do
assignee: []
created_date: '2026-11-22T06:13:00Z'
labels:
  - refactor
  - schedules
  - v1.1
dependencies: []
priority: medium
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the v1.0.0 correct check (2026-11-22, owner approved). TASK-30 took five review rounds because callers read payee/category conditions in different ways (`payee oneOf []` dropping the filter, `_payee` cache vs the stored condition, blank conditions lost on rename; 5 findings, 3 blockers). Add one parser in packages/loot-core/src/shared/schedules.ts returning a tagged union (absent / empty / values, single vs list) and route cleanup eligibility, the link query, save (server/schedules/app.ts) and the editor (schedule-edit-utils.ts, filtered-schedule.ts) through it with exhaustive switches.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One exported parser returns a discriminated union for payee and category conditions and every caller listed in the description uses it; no caller reads `_payee` or raw condition values directly
- [ ] #2 An exhaustive switch makes an unhandled case a type error
- [ ] #3 Server and editor tests cover absent, empty, whitespace and populated conditions for single and list forms; focused tests, typecheck and lint pass
<!-- AC:END -->
