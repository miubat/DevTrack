# Requirements Traceability Matrix (RTM) · DevTrack · AGL-10.3

Maps every functional requirement in SRS §3 (36 FRs) to the BRD success criteria (SRS §8.1), the demo scenarios (SRS §8.2) and the test cases that cover it. Test cases come from AGL-02.5 (data-integrity cases) and AGL-10.4 (k6 scenarios).

Test Status: **Not run** = test cases exist and cover the FR. **Not run (partial)** = test cases cover only some of the FR's scenarios. **No test case yet** = no test case covers the FR so far.

| FR ID | Requirement | Priority | BRD Success Criterion (§8.1) | BRD Demo Scenario (§8.2) | Test Case ID | Test Status |
|---|---|---|---|---|---|---|
| FR-AUTH-01 | Login and logout | MUST |  |  |  | No test case yet |
| FR-AUTH-02 | User administration | MUST |  |  |  | No test case yet |
| FR-AUTH-03 | Profile and password | MUST |  |  |  | No test case yet |
| FR-AUTH-04 | Failed-login lockout | SHOULD |  |  |  | No test case yet |
| FR-PRJ-01 | Create a project | MUST |  | Rahim creates project ECOM and adds 4 members | AGL-02.5 TC-020; AGL-02.5 TC-021; AGL-02.5 TC-023 | Not run (partial) |
| FR-PRJ-02 | Edit and archive a project | MUST |  |  | AGL-02.5 TC-022; AGL-02.5 TC-024 | Not run |
| FR-PRJ-03 | Manage members | MUST |  | Rahim creates project ECOM and adds 4 members |  | No test case yet |
| FR-PRJ-04 | Project-level access | MUST | Authorization |  | AGL-02.5 TC-004; AGL-02.5 TC-006 | Not run |
| FR-ISS-01 | Create an issue | MUST |  | Rahim creates ECOM-101 and a task | AGL-02.5 TC-007; AGL-02.5 TC-008 | Not run (partial) |
| FR-ISS-02 | Edit an issue safely | MUST | No lost updates |  | AGL-10.4 TC-004; AGL-10.4 TC-005; AGL-10.4 TC-006 | Not run |
| FR-ISS-03 | Rank the backlog | MUST |  |  |  | No test case yet |
| FR-ISS-04 | Single assignee and reassignment history | MUST |  |  | AGL-02.5 TC-009 | Not run (partial) |
| FR-ISS-05 | Story points | MUST |  |  | AGL-02.5 TC-010; AGL-02.5 TC-011 | Not run |
| FR-ISS-06 | Search, filter and paginate | MUST | Search and filters |  | AGL-02.5 TC-005 | Not run (partial) |
| FR-ISS-07 | Issue detail | MUST |  |  |  | No test case yet |
| FR-BUG-01 | Report a bug | MUST |  | Hasan logs a bug and links it to the story |  | No test case yet |
| FR-BUG-02 | Link a bug to a story | MUST |  | Hasan logs a bug and links it to the story | AGL-02.5 TC-019 | Not run |
| FR-BUG-03 | Defect lifecycle and verification | MUST |  | Hasan logs a bug and links it to the story |  | No test case yet |
| FR-SPR-01 | Create a sprint | MUST |  |  | AGL-02.5 TC-027; AGL-02.5 TC-028 | Not run (partial) |
| FR-SPR-02 | Plan sprint content | MUST |  | Rahim plans and starts Sprint 1 | AGL-02.5 TC-015; AGL-02.5 TC-016; AGL-02.5 TC-027 | Not run (partial) |
| FR-SPR-03 | Start a sprint, one active per project | MUST | One active sprint | Rahim plans and starts Sprint 1; Two managers start different sprints at once | AGL-10.4 TC-001; AGL-10.4 TC-002; AGL-10.4 TC-003; AGL-02.5 TC-001; AGL-02.5 TC-002; AGL-02.5 TC-026; AGL-02.5 TC-027 | Not run |
| FR-SPR-04 | Close a sprint | MUST |  | Sprint closes with unfinished work | AGL-02.5 TC-014; AGL-10.4 TC-013; AGL-02.5 TC-027 | Not run |
| FR-SPR-05 | Sprint history | MUST |  | Sprint closes with unfinished work | AGL-02.5 TC-025; AGL-02.5 TC-014 | Not run (partial) |
| FR-SPR-06 | Scope change during a sprint | SHOULD |  |  | AGL-02.5 TC-013 | Not run (partial) |
| FR-BRD-01 | Board view | MUST |  |  |  | No test case yet |
| FR-BRD-02 | Validated transitions | MUST | Workflow integrity | Karim moves ECOM-101; invalid jump blocked | AGL-02.5 TC-003; AGL-10.4 TC-009; AGL-10.4 TC-010; AGL-10.4 TC-011 | Not run (partial) |
| FR-BRD-03 | Board filters | MUST |  |  |  | No test case yet |
| FR-COL-01 | Comments | MUST |  |  | AGL-02.5 TC-004 | Not run (partial) |
| FR-COL-02 | Edit own comment | MUST |  |  |  | No test case yet |
| FR-ACT-01 | Record every key change | MUST | Traceability | Rahim opens the history of a changed priority | AGL-10.4 TC-004; AGL-10.4 TC-006; AGL-10.4 TC-009 | Not run |
| FR-ACT-02 | Immutable history | MUST | Traceability |  | AGL-02.5 TC-017; AGL-02.5 TC-018 | Not run |
| FR-RPT-01 | Burndown chart | MUST | Burndown accuracy |  | AGL-10.4 TC-009; AGL-10.4 TC-011; AGL-10.4 TC-012; AGL-10.4 TC-008; AGL-02.5 TC-012 | Not run |
| FR-RPT-02 | Sprint report | MUST | Reporting |  | AGL-02.5 TC-013 | Not run (partial) |
| FR-RPT-03 | Management dashboard | MUST | Reporting |  |  | No test case yet |
| FR-RPT-04 | Dashboard filters | MUST | Reporting |  |  | No test case yet |
| FR-RPT-05 | Workload per member | MUST | Reporting |  |  | No test case yet |

Summary: 36 of 36 FRs have a row. 10 are covered, 11 are partly covered and 15 have no test case yet. The Performance and Delivery criteria in SRS §8.1 map only to NFRs (NFR-PERF, NFR-OPS), so they do not appear in this FR matrix.
