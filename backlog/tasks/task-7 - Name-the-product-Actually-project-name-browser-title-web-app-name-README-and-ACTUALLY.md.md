---
id: TASK-7
title: >-
  Name the product Actually: project name, browser title, web-app name, README
  and ACTUALLY.md
status: In Progress
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T06:14:00Z'
labels:
  - naming
dependencies:
  - TASK-1
  - TASK-2
priority: low
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC sections 1 and 9: the first milestone named the root project, the browser title and the installable web-app Actually, and added README.md and ACTUALLY.md text. Internal workspace package names and upstream assets keep their identities. Actual Budget's attribution and license notices stay.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The root package name, the browser tab title and the installable web-app (manifest) name read Actually; workspace package names (@actual-app/...) are unchanged.
- [ ] #2 README.md states that Actually is a fork of Actual Budget (https://github.com/actualbudget/actual), keeps the MIT license notice and attribution, and links to ACTUALLY.md, which summarizes the period-budget design from docs/SPEC.md without contradicting it.
- [ ] #3 The gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator: rung 1 (qwen3.8-27b) round 1 started; branch task-7-name-actually. The branch changes yarn.lock (root workspace name), so landing needs the install state refreshed in the main checkout.

Review round 1 (rung 1, candidate 940ce66aa): REQUEST CHANGES. (1) blocking: .github/actions/release-notes/generate/action.yml line 23 still selects the root workspace as 'actual' and fails with 'Workspace not found (actual)'; (2) blocking: ACTUALLY.md states six proposed details as settled; (3) should-fix: README and ACTUALLY.md opening sentences read as if the period budget is already in the app. Criterion 1 and the gate passed. Fix list: /tmp/actually-orch/task-7-fixes-r1.md. Orchestrator note: the release-notes action is tooling that depends on the root project name, so correcting it is part of criterion 1, not a change of scope.
<!-- SECTION:NOTES:END -->
