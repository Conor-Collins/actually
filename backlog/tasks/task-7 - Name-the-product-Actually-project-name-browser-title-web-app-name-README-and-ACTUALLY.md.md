---
id: TASK-7
title: >-
  Name the product Actually: project name, browser title, web-app name, README
  and ACTUALLY.md
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-14T06:02:00Z'
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
<!-- SECTION:NOTES:END -->
