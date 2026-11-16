---
id: TASK-18
title: 'Period Budget page: sections are squeezed onto each other on a wide screen'
status: In Progress
assignee: []
created_date: '2026-11-16T06:35:00Z'
updated_date: '2026-11-16T06:36:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-13 on 2026-11-15, the first time the page ran in a real browser (Chromium, built bundle, demo file, 1280x720 and 1600x1000). On a wide screen the page scrolls inside its frame, and its sections (as-of controls, figures, Needs attention, the periods table with the accounts) are flex items of that scrolling block. Actual's View has min-height 0, so when the content is taller than the window every section is shrunk to fit and its content spills over the next one: text lies over text, and buttons are covered (the Start repeating button of a category's form is under the Scheduled charges heading and cannot be pressed). The jsdom tests of TASK-11 and TASK-12 cannot see layout. Phone layout is not affected. Created by the orchestrator on its own judgement as a defect of landed work; no ticket's scope is changed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On a wide screen, with the demo file in a 1280x720 window, no section of the Period Budget page is shorter than what is in it, the sections lie under each other, and the page scrolls down to the accounts. This holds when the page is opened in Settings and when it is opened from its sidebar entry.
- [ ] #2 A Playwright test in packages/desktop-client/e2e checks the first criterion and starts repeating periods for the last category of the demo file through its form. It fails on main before the fix and passes after it.
- [ ] #3 The phone layout and the existing page tests are unchanged and pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-15 06:50Z orchestrator: rung 1. Cause found with the built bundle in Chromium: the scrolling block's flex children shrink (View has min-height 0). Prototype by the orchestrator: one inner block with flex-shrink 0 in PeriodBudgetPage.tsx, and e2e/period-budget.test.ts (3 tests: 3 pass on the fix, 3 fail on main's bundle). Patch sha256 51e114e8.
<!-- SECTION:NOTES:END -->
