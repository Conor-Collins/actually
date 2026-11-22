---
id: TASK-35
title: 'Lint: turn on the missing jsx-a11y interaction and label rules'
status: To Do
assignee: []
created_date: '2026-11-22T06:13:00Z'
labels:
  - lint
  - a11y
  - v1.1
dependencies: []
priority: low
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the v1.0.0 correct check (2026-11-22, owner approved). Four keyboard/screen-reader findings in TASK-30 and TASK-31 (unlabelled inputs, a clickable dot not reachable by keyboard). .oxlintrc.json loads jsx-a11y but not click-events-have-key-events, no-static-element-interactions or label-has-associated-control.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The three rules are enabled in .oxlintrc.json; existing violations are fixed or carry an inline reason
- [ ] #2 The change is proven to catch the TASK-31 S6 timeline-dot mistake and the TASK-30 S5 unlabelled input (checked by reverting those fixes on a scratch branch)
- [ ] #3 yarn lint passes on main
<!-- AC:END -->
