# Requirements Traceability Matrix (RTM) · DevTrack · AGL-10.3

Maps every functional requirement in SRS §3 (36 FRs) to the BRD success criteria (SRS §8.1), the demo scenarios (SRS §8.2) and the test cases that cover it. Test cases come from AGL-02.5 (data-integrity cases), AGL-10.4 (k6 scenarios) and TC-AGL-02.3-01 and TC-AGL-02.3-02 (sample cases in AGL-10.2.test-case-template.md).

Test Status: **Not run** = test cases exist and cover the FR. **Not run (partial)** = test cases cover only some of the FR's scenarios. **No test case yet** = no test case covers the FR so far. **(passed)** after a test case ID means that case was run and passed (database level, build b39cc64); the other cases of the row are still not run. **(weak fit)** after a test case ID means the case mainly covers another requirement and only touches this FR.

| FR ID | Requirement | Priority | BRD Success Criterion (§8.1) | BRD Demo Scenario (§8.2) | Test Case ID | Test Status |
|---|---|---|---|---|---|---|
| FR-AUTH-01 | Login and logout | MUST |  |  |  | No test case yet |
| FR-AUTH-02 | User administration | MUST |  |  |  | No test case yet |
| FR-AUTH-03 | Profile and password | MUST |  |  |  | No test case yet |
| FR-AUTH-04 | Failed-login lockout | SHOULD |  |  |  | No test case yet |
| FR-PRJ-01 | Create a project | MUST |  | Rahim creates project ECOM and adds 4 members | TC-AGL-02.5-20; TC-AGL-02.5-21; TC-AGL-02.5-23 | Not run (partial) |
| FR-PRJ-02 | Edit and archive a project | MUST |  |  | TC-AGL-02.5-22; TC-AGL-02.5-24 | Not run |
| FR-PRJ-03 | Manage members | MUST |  | Rahim creates project ECOM and adds 4 members |  | No test case yet |
| FR-PRJ-04 | Project-level access | MUST | Authorization |  | TC-AGL-02.5-04; TC-AGL-02.5-06 | Not run |
| FR-ISS-01 | Create an issue | MUST |  | Rahim creates ECOM-101 and a task | TC-AGL-02.5-07; TC-AGL-02.5-08 | Not run (partial) |
| FR-ISS-02 | Edit an issue safely | MUST | No lost updates |  | TC-AGL-02.3-02 (passed); TC-AGL-10.4-04; TC-AGL-10.4-05; TC-AGL-10.4-06; TC-AGL-02.5-29; TC-AGL-02.5-30; TC-AGL-02.5-31; TC-AGL-02.5-32 | Not run |
| FR-ISS-03 | Rank the backlog | MUST |  |  |  | No test case yet |
| FR-ISS-04 | Single assignee and reassignment history | MUST |  |  | TC-AGL-02.5-09; TC-AGL-02.5-42; TC-AGL-02.5-43; TC-AGL-02.5-44 | Not run |
| FR-ISS-05 | Story points | MUST |  |  | TC-AGL-02.5-10; TC-AGL-02.5-11 | Not run |
| FR-ISS-06 | Search, filter and paginate | MUST | Search and filters |  | TC-AGL-02.5-05 | Not run (partial) |
| FR-ISS-07 | Issue detail | MUST |  |  |  | No test case yet |
| FR-BUG-01 | Report a bug | MUST |  | Hasan logs a bug and links it to the story |  | No test case yet |
| FR-BUG-02 | Link a bug to a story | MUST |  | Hasan logs a bug and links it to the story | TC-AGL-02.5-19 | Not run |
| FR-BUG-03 | Defect lifecycle and verification | MUST |  | Hasan logs a bug and links it to the story |  | No test case yet |
| FR-SPR-01 | Create a sprint | MUST |  |  | TC-AGL-02.5-27; TC-AGL-02.5-28; TC-AGL-02.5-36 | Not run |
| FR-SPR-02 | Plan sprint content | MUST |  | Rahim plans and starts Sprint 1 | TC-AGL-02.5-15; TC-AGL-02.5-16; TC-AGL-02.5-27 | Not run (partial) |
| FR-SPR-03 | Start a sprint, one active per project | MUST | One active sprint | Rahim plans and starts Sprint 1; Two managers start different sprints at once | TC-AGL-02.3-01 (passed); TC-AGL-10.4-01; TC-AGL-10.4-02; TC-AGL-10.4-03; TC-AGL-02.5-01; TC-AGL-02.5-02; TC-AGL-02.5-26; TC-AGL-02.5-27; TC-AGL-02.5-37 | Not run |
| FR-SPR-04 | Close a sprint | MUST |  | Sprint closes with unfinished work | TC-AGL-02.5-14; TC-AGL-10.4-13; TC-AGL-02.5-27; TC-AGL-02.5-38 | Not run |
| FR-SPR-05 | Sprint history | MUST |  | Sprint closes with unfinished work | TC-AGL-02.5-25 (weak fit); TC-AGL-02.5-14 | Not run (partial) |
| FR-SPR-06 | Scope change during a sprint | SHOULD |  |  | TC-AGL-02.5-13 | Not run (partial) |
| FR-BRD-01 | Board view | MUST |  |  |  | No test case yet |
| FR-BRD-02 | Validated transitions | MUST | Workflow integrity | Karim moves ECOM-101; invalid jump blocked | TC-AGL-02.5-03; TC-AGL-10.4-09; TC-AGL-10.4-10; TC-AGL-10.4-11; TC-AGL-02.5-33; TC-AGL-02.5-34 | Not run (partial) |
| FR-BRD-03 | Board filters | MUST |  |  |  | No test case yet |
| FR-COL-01 | Comments | MUST |  |  | TC-AGL-02.5-04 | Not run (partial) |
| FR-COL-02 | Edit own comment | MUST |  |  |  | No test case yet |
| FR-ACT-01 | Record every key change | MUST | Traceability | Rahim opens the history of a changed priority | TC-AGL-10.4-04; TC-AGL-10.4-06; TC-AGL-10.4-09; TC-AGL-02.5-29; TC-AGL-02.5-33; TC-AGL-02.5-43 | Not run (partial) |
| FR-ACT-02 | Immutable history | MUST | Traceability |  | TC-AGL-02.5-17; TC-AGL-02.5-18 | Not run |
| FR-RPT-01 | Burndown chart | MUST | Burndown accuracy |  | TC-AGL-10.4-09; TC-AGL-10.4-11; TC-AGL-10.4-12; TC-AGL-10.4-08 (weak fit); TC-AGL-02.5-12; TC-AGL-02.5-35 | Not run (partial) |
| FR-RPT-02 | Sprint report | MUST | Reporting |  | TC-AGL-02.5-13 | Not run (partial) |
| FR-RPT-03 | Management dashboard | MUST | Reporting |  |  | No test case yet |
| FR-RPT-04 | Dashboard filters | MUST | Reporting |  |  | No test case yet |
| FR-RPT-05 | Workload per member | MUST | Reporting |  |  | No test case yet |

Sprint delete cases TC-AGL-02.5-39, 40, 41 cover SRS §4.2 only; no FR covers sprint deletion.

Summary: 36 of 36 FRs have a row. 10 are covered, 11 are partly covered and 15 have no test case yet. The Performance and Delivery criteria in SRS §8.1 map only to NFRs (NFR-PERF, NFR-OPS), so they do not appear in this FR matrix.
