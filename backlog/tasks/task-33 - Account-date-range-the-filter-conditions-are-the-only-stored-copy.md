---
id: TASK-33
title: 'Account date range: the filter conditions are the only stored copy'
status: To Do
assignee: []
created_date: '2026-11-22T06:13:00Z'
labels:
  - refactor
  - v1.1
dependencies: []
priority: medium
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up from the v1.0.0 correct check (2026-11-22, owner approved). TASK-29 took six review rounds because the account date-range control kept its own copy of the date conditions next to the filter expression (8 findings: Any/All switching, saved filters, reconciliation suspend, second bounds). Make the filter expression's date conditions the single owner and turn the range control into a read/write view over them, deleting the parallel range state in packages/desktop-client/src/components/accounts/Account.tsx, Header.tsx and AccountDateRange.tsx.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The range header, the histogram popover and saved/URL filters read and write the date through the filter conditions only; no separate range state remains
- [ ] #2 Existing behaviour from TASK-29 (Any/All filters with dates, saved filters, reconciliation, URL date conditions) is kept, with page tests through the real Account page
- [ ] #3 Focused tests, typecheck and lint pass
<!-- AC:END -->
