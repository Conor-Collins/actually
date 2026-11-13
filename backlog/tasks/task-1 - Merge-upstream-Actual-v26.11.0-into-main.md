---
id: TASK-1
title: Merge upstream Actual v26.11.0 into main
status: To Do
assignee: []
created_date: '2026-11-13T16:07:00Z'
labels:
  - base
  - upstream
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the fork up to Actual Budget's newest release, v26.11.0 (tag commit 1766241e3, upstream remote already fetched; main is 91c23d976, based on v26.10.0). The release is 4 commits, about 1,830 files. A trial merge is clean: `git merge-tree --write-tree main v26.11.0` exits 0 with tree 974be966ae035575b17c74e4c20399d9b90d0443.

Do exactly this on the task branch: `git merge --no-ff v26.11.0` (no hand edits), then `node .yarn/releases/yarn-4.17.1.cjs install`, then the test gate. Do not fetch, push or change remotes.

Rule-file exception for this task only: the merge brings upstream's one-line change to AGENTS.md (the .nvmrc version it mentions, v24.18.1 to v24.22.1). Keep that line as merged. Change nothing else in AGENTS.md, CLAUDE.md, .claude/, t3.json, land.conf, backlog/ or docs/.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The task branch has exactly one new commit: a merge whose first parent is main's tip (91c23d976) and whose second parent is tag v26.11.0 (1766241e3).
- [ ] #2 The merge commit's tree is 974be966ae035575b17c74e4c20399d9b90d0443, the tree of a clean merge of main and v26.11.0 (no hand edits, no extra files).
- [ ] #3 `git diff main..HEAD --stat -- backlog docs land.conf .claude CLAUDE.md t3.json` is empty, and AGENTS.md differs from main only in upstream's one .nvmrc version line.
- [ ] #4 After `node .yarn/releases/yarn-4.17.1.cjs install`, the gate `node .yarn/releases/yarn-4.17.1.cjs typecheck && node .yarn/releases/yarn-4.17.1.cjs lint && node .yarn/releases/yarn-4.17.1.cjs test` passes on the merge commit, and yarn.lock is unchanged by the install.
<!-- AC:END -->
