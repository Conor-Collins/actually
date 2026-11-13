---
id: TASK-14
title: 'Lint gate fails on main: studio setup files are not format-clean'
status: In Progress
assignee: []
created_date: '2026-11-13T16:14:00Z'
labels:
  - base
  - gate
dependencies: []
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The test gate's lint step (`oxfmt --check .`) fails on main: it reports AGENTS.md, CLAUDE.md, groma/config.json and groma/index.md, all written by the studio setup commit 91c23d976. While it fails nothing can land (found by TASK-1's coder, confirmed on main by the orchestrator).

Fix it in .oxfmtrc.json only, by extending the existing ignore list from ["backlog/**"] to ["backlog/**", "groma/**", "/AGENTS.md", "/CLAUDE.md"]. groma/ is written by the groma CLI and AGENTS.md and CLAUDE.md are the owner's rule files, so none of the four files is edited. The leading slash keeps the pattern to the repository root (checked: a nested AGENTS.md is still format-checked).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Only .oxfmtrc.json changes: its ignorePatterns line reads ["backlog/**", "groma/**", "/AGENTS.md", "/CLAUDE.md"]; AGENTS.md, CLAUDE.md and groma/ are byte-identical to main.
- [ ] #2 `node .yarn/releases/yarn-4.17.1.cjs lint` passes.
- [ ] #3 The whole gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes.
<!-- AC:END -->
