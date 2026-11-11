# AGL-10.1 · Test plan

## Scope

**In scope** (SRS §2.4)

- Users, roles, projects, membership
- Product backlog with ranking
- Issues: Story, Task, Bug with keys
- Bug reports linked to stories
- Sprint planning, start, close, history
- Scrum board with validated transitions
- Single assignee with reassignment history
- Comments, activity history
- Search, filters, pagination
- Burndown, sprint report, management dashboard

**Out of scope** (SRS §2.4)

- Custom workflows, custom fields
- Gantt charts, epics, subtasks
- Time tracking
- Git, Slack and other integrations
- Notifications, automation rules
- File attachments
- JQL or advanced query language
- Billing, multi-organization
- Mobile app

**Test obligations stated in the SRS**

| Source | Obligation |
| --- | --- |
| §3 | 36 functional requirements, each with Gherkin acceptance criteria that QA automates as API or Playwright tests |
| §4 | 15 business rules, at least one negative test per rule |
| §6 | 22 non-functional requirements, each with a threshold and a verification method (§6.1 Performance and capacity, §6.2 Security, §6.3 Availability, reliability and data integrity, §6.4 Operability and maintainability, which also holds NFR-USE-01); they are placed under Test Levels |

## Test Levels

Tools and methods are those the SRS names; level names group them.

| Level | Tool or method named in the SRS | NFRs verified |
| --- | --- | --- |
| Unit | Jest (§2.1) (inferred); unit tests, review | NFR-SEC-01, NFR-OPS-03 |
| API | Jest + Supertest (§2.1); API tests (tool-to-level pairing inferred) | NFR-SEC-02, NFR-SEC-07 |
| API, role and membership matrix | Generated API test matrix | NFR-SEC-03 |
| API, object-level access | ID-tampering tests | NFR-SEC-04 |
| API, lost updates | Parallel update test | NFR-REL-02 |
| API, report timing | API timing | NFR-PERF-06 |
| API, documentation contract | Contract test; demo | NFR-OPS-04 |
| UI / end to end | Playwright (§2.1); Playwright timing, Playwright smoke tests | NFR-PERF-01, NFR-OPS-01 |
| Load and concurrency | k6 (§2.1); k6 10-minute run, k6 ramp test, k6 + SQL check | NFR-PERF-01, NFR-PERF-02, NFR-PERF-03, NFR-PERF-04 (error rate under 1%, business 409 and 422 responses excluded), NFR-PERF-05 |
| Security scan | OWASP ZAP baseline | NFR-SEC-06 |
| Transport check | Header check | NFR-SEC-05 |
| Integrity checks | SQL and report checks after every CI run | NFR-REL-03 (and the SQL part of NFR-PERF-05) |
| Availability monitoring | Uptime Kuma, 1-minute checks | NFR-REL-01 |
| Recovery | Restore drill log | NFR-REL-04 |
| CI gates | GitHub Actions; CI coverage gate | NFR-OPS-01, NFR-OPS-03 |
| Logging | Log review | NFR-OPS-02 |
| Usability | Hallway test in Sprint 8 | NFR-USE-01 |

## Environments

| Environment | What the SRS states | Not established |
| --- | --- | --- |
| Staging | Server with 2 vCPU and 4 GB RAM; BRD seed data plus 10 generated projects of 1,000 issues each; all §6 thresholds are measured here; main deploys here in 15 minutes or less (NFR-OPS-01) | Staging URL: TBD. Test accounts and access: TBD. Whether a separate machine or environment runs k6 load: TBD. Which environment the nightly k6 suite (NFR-OPS-01) targets: TBD |
| Local / developer | Docker Compose, one-command setup (§2.1); README setup in 15 minutes or less (NFR-OPS-04); evidence: the fresh-clone README test (AGL-03.1, AGL-03.2) and the setup check `node scripts/check-setup.mjs` (AGL-04.3, PR #10) | None |
| CI | GitHub Actions; every pull request runs lint, unit, API and Playwright smoke tests (NFR-OPS-01) | Database used in CI: TBD |
| Seed data | 1 admin, 2 project managers, about 8 team members, 2 projects, about 150 issues across sprints (§2.5, BRD §9) | None |
| Software | PostgreSQL 16; current Chrome, Firefox, Edge and Safari; responsive 768–1920 px (§5.4) | None |
| Rate limits during load runs | Login 10/min per IP; writes 120/min per user; reads 600/min per user (NFR-SEC-07); NFR-PERF-02 requires 50 requests/s | How rate limits and test accounts are handled in load runs: TBD |
| Backup and restore | Nightly pg_dump, one restore drill before the final demo (NFR-REL-04) | Environment for the restore drill: TBD |

## Entry and Exit Criteria

Thresholds and facts are from the SRS; using them as entry or exit gates is proposed. Items marked (proposed) are not in the SRS at all.

**Entry criteria**

| Criterion | Source |
| --- | --- |
| Section 7 answered by the BA before sign-off (§7, §8.3); until then SRS defaults are used, in particular for Q1 and Q3, the two the SRS flags as high risk | §7, §8.3 |
| Seed data loaded as in §2.5 | §2.5 |
| Staging has the 2 vCPU / 4 GB RAM server and the 10 generated projects of 1,000 issues each before any threshold run | §6 |
| Hand-calculated burndown values exist for the seed sprints | NFR-REL-03 |
| Build deployed to the target environment and the pull-request checks (lint, unit, API, Playwright smoke) are green before load or integrity runs | NFR-OPS-01 (the use as an entry gate is proposed) |
| OpenAPI document available at `/api/docs` before API tests are written against it | §2.1 (the use as an entry gate is proposed) |

**Exit criteria**

| Criterion | Source |
| --- | --- |
| Every NFR threshold in §6 is met, each on the "Verified by" method listed there | §6 |
| At least one negative test exists for each of the 15 business rules | §4 |
| Every BRD success criterion and demo scenario has at least one requirement and one automated test, and those tests have run (proposed) | §8, §8.1, §8.2 |
| After every CI run: 0 projects with more than one ACTIVE sprint, 0 duplicate issue keys, and burndown for the seed sprints equals the hand-calculated values | NFR-REL-03 |
| All MUST requirements' acceptance scenarios pass (proposed) | (proposed) |
| No open BLOCKER or CRITICAL defect (proposed) | (proposed) |
| Every open MAJOR or MINOR defect is listed and accepted by the business analyst (proposed) | (proposed) |

## Severity

The scale is the SRS's own `severity` enum (§5.2), used for defects logged as Bugs (FR-BUG-01). Definitions are not in the SRS; all definitions below are (proposed).

| Severity | Definition (proposed) |
| --- | --- |
| BLOCKER | Testing or use of the system cannot continue |
| CRITICAL | A business rule, data-integrity rule or access rule is broken, or data is lost or exposed |
| MAJOR | A required function gives a wrong result, data is not corrupted, and a workaround exists |
| MINOR | A small defect with no effect on rules, data or required results |

Severity is a separate field from `priority` (LOWEST, LOW, MEDIUM, HIGH, HIGHEST, §5.2); priority is not part of this scale.
