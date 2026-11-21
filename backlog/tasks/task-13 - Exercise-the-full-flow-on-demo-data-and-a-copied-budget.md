---
id: TASK-13
title: Exercise the full flow on demo data and a copied budget
status: Review
assignee: []
created_date: '2026-11-13T16:09:00Z'
updated_date: '2026-11-21T21:16:00Z'
labels:
  - verification
dependencies:
  - TASK-12
priority: low
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SPEC section 10 step 6: run the whole feature against the demo budget and then a copy of a real budget, including synchronization conflicts and historical edits, and record what fails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each acceptance scenario in SPEC section 8 is exercised in the running app on demo data, with the result recorded.
- [ ] #2 The same scenarios are exercised on a copied budget synchronized between two clients, including a conflicting edit and an edit to a closed period, with the result recorded.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Orchestrator, 2026-11-16T13:35Z: started after TASK-18 landed (d2d4baa06). The scenarios of SPEC section 8 are written as Playwright specs in packages/desktop-client/e2e on a shared scenario module; the results record goes to docs/verification/period-budget.md on the task branch.

2026-11-16T14:52Z Orchestrator: round 1 (rung 1). Candidate dd8dbdadb on branch task-13-verification-in-the-app, gate exit 0 at 14:06Z. Independent review (gpt-6.1-sol, xhigh) at 14:28Z: REQUEST CHANGES. Blocking: (1) amounts were compared by a part of the text, so a wrong amount could pass (the reviewer left the scheduled charges out of expected remaining and all 12 tests still passed); (2) scenario 7 claimed the clauses duplicate IDs and unsafe sums without trying them. Should fix: the cash day of the late offset, the receiving client compared only at the end, the conflict test did not make sure the clients were unsynchronized, mkdir in the record, wording of the record. New defect found by the reviewer: an allowance of 2^52 minor units is stored and the page then ends on Fatal Error. Round 2 is being written.

2026-11-16T15:02Z Orchestrator: round 2 (rung 1). Candidate fa8aa4f88 on top of dd8dbdadb; gate exit 0 at 15:02Z. Changes: every amount compared as a whole; each scenario makes its changes on one client and is checked on the other; scenario 4 checks the cash day by day; scenario 7 tries unsafe sums (eight periods of 2^50: all stored, the last not counted and listed) and names duplicate IDs as not reachable in the running app (identity is category and first day; held by unit tests only; owner question); the conflict test keeps both clients from the server and asserts the stored rows. Runs: demo file 12 of 12 and shared file 14 of 14, in 2017 and in 2027, each twice. Three mutants of the code each fail the scenario they belong to. Defects found on the way are TASK-19 (changes wait while the browser is offline), TASK-20 (planned period's form stays open), TASK-21 (allowance of 2^51 or more ends on Fatal Error). Sent to the independent review at 15:04Z.

2026-11-16T15:22Z Orchestrator: independent review (gpt-6.1-sol, xhigh) APPROVED fa8aa4f88 at 15:18Z with three notes on the record (one test at a time on the shared file because of the server's limit of 500 requests a minute; the form route to the large allowance; identity wording). I made those edits to the record myself (markdown only, no coder, no GPU): candidate d55b5ea95, gate exit 0 at 15:21Z, re-check APPROVED d55b5ea95 at 15:21Z. Reviewer's table: the worked example and scenarios 1 to 5 and 8 to 11 hold the specification's sentence fully; 6 partly (spending before a category's first period is counted in its month and not listed); 7 partly (duplicate IDs cannot be made in the running app and are held by unit tests only; unsafe sums are set aside when read, not refused when written). Moved to Review. NOT landed and no criterion checked: waiting for the owner on (a) criterion 2 asks for a copy of a budget, the runs used the repository's demo export; (b) whether the duplicate-ID clause of scenario 7 is accepted as held by unit tests; (c) whether unsafe sums set aside at load meet 'rejected'; (d) whether spending before a category's first period has to be listed.

2026-11-21 Owner decision: 'Yes to 4&5. I might revise later after seeing.' Accepts demo export for AC #2, unit-test coverage alone for scenario 7 duplicate IDs, and load-time exclusion of unsafe sums; keeps Plan B S5 schedules-only forecast and flags pre-first-period spending behavior for owner review upon seeing it. Final rebase and verification closure move to TASK-32 after TASK-28..TASK-31 land.
<!-- SECTION:NOTES:END -->
