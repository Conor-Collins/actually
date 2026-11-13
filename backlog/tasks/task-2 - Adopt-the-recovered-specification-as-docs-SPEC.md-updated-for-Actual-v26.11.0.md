---
id: TASK-2
title: Adopt the recovered specification as docs/SPEC.md, updated for Actual v26.11.0
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-13T18:11:00Z'
labels:
  - spec
  - owner-approval
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The product specification Conor supplied on 2026-11-11 (Actually-Specifications.md, 19,379 bytes, sha256 1bc6787e9d5a3d828fcd4f8902853d3500bfca9b3f1c6ef7be85a02a5075610d) is not in the repository. Put it at docs/SPEC.md, updated only where the move to Actual v26.11.0 and today's repository state require it. The owner's requirements, calculations, examples and open decisions stay as written; no open decision is resolved.

docs/SPEC.md is the owner's file and is protected in land.conf, so no task branch may carry it. The orchestrator prepares the exact candidate and an approval packet; the owner approves the exact bytes; the orchestrator then commits that file on main after re-checking hashes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An approval packet exists with APPROVE.md, the candidate SPEC.md, a diff against the supplied specification, and sha256 and byte counts of both.
- [ ] #2 Every change from the supplied specification is listed in APPROVE.md with its reason; sections 2 to 8 keep the owner's text unchanged.
- [ ] #3 Each statement about Actual v26.11.0 in the candidate is checked against the v26.11.0 source and cites the file it comes from.
- [ ] #4 The owner has approved the exact candidate (sha256 quoted in the approval).
- [ ] #5 docs/SPEC.md on main has the approved sha256, and AGENTS.md's 'not written yet' note is reported to the owner as stale.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-13: candidate sha256 57bc4055 approved by independent review (GPT Sol xhigh, round 2 of 2; round 1 asked for two corrections, both made). Waits for the owner's approval of the exact bytes (packet: /data/t3-work/actually-approvals/task-2/APPROVE.md) and for TASK-1 to be Done.

2026-11-13: owner approval given in the orchestrator thread. Asked to reply 'approve TASK-2 57bc4055' or say what to change, the owner replied: "2. I approve the spec". Applies to candidate sha256 57bc4055d97b9f05c4cceff700654e92efc936349b5889d389ca6e44d6cd8a49. To be committed as docs/SPEC.md once TASK-1 is Done, after re-checking the hash and that docs/SPEC.md is still absent on main.
<!-- SECTION:NOTES:END -->
