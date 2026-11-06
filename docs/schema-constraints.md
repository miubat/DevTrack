# DevTrack Schema: Keys, Unique Indexes, CHECKs and Foreign Keys

Source: SRS v0.1, section 5.2 (the PostgreSQL DDL). Task: AGL-02.2. Version 2 (after Dev 2 review).

## 1. Rules for each table (from SRS section 5.2)

| Table | Primary key | Unique rules and indexes | CHECK rules | Foreign keys |
|---|---|---|---|---|
| users | `id` | `email` must be unique | none | none |
| projects | `id` | `key` must be unique (index `projects_key_ci` on `upper(key)`) | `key` is 2 to 10 capital letters; `end_date >= start_date` | `manager_id` -> users |
| project_members | (`project_id`, `user_id`) | none | none | `project_id` -> projects; `user_id` -> users |
| issues | `id` | (`project_id`, `number`) must be unique; indexes `issues_filter`, `issues_rank`, `issues_title` (text search) | title is not empty; `story_points` is 1, 2, 3, 5, 8, 13 or 21 (or empty) | `project_id` -> projects; `assignee_id` -> users; `reporter_id` -> users |
| bug_details | `issue_id` | none | none | `issue_id` -> issues |
| issue_links | (`bug_id`, `story_id`) | none | none | `bug_id` -> issues; `story_id` -> issues; `created_by` -> users |
| sprints | `id` | `one_active_sprint`: only one ACTIVE sprint per project (see the partial index list below) | `end_date = start_date + 13` | `project_id` -> projects |
| sprint_issues | (`sprint_id`, `issue_id`) | `one_open_sprint_per_issue`: an issue can be in only one open sprint (see the partial index list below) | none | `sprint_id` -> sprints (no ON DELETE CASCADE); `issue_id` -> issues |
| comments | `id` | none | body length is 1 to 5000 characters | `issue_id` -> issues; `author_id` -> users |
| activities | `id` | indexes `activities_entity` and `activities_burndown` (see the partial index list below) | `entity_type` is ISSUE, SPRINT, PROJECT or COMMENT | `project_id` -> projects; `actor_id` -> users. No foreign key on `entity_id`, because it can point to different tables |

Permission rule: the app user cannot UPDATE or DELETE rows in `activities`. This keeps the history safe (BR-12).

### Partial indexes (an index that only covers some rows)

| Index | Table and column | WHERE condition | What it does |
|---|---|---|---|
| `one_active_sprint` (unique) | `sprints (project_id)` | `WHERE status = 'ACTIVE'` | A project can have only one ACTIVE sprint (BR-01) |
| `one_open_sprint_per_issue` (unique) | `sprint_issues (issue_id)` | `WHERE is_open AND removed_at IS NULL` | An issue can be in only one open sprint (BR-11) |
| `activities_burndown` | `activities (project_id, field, created_at)` | `WHERE field = 'status'` | Makes the burndown report faster. It only covers status changes |

## 2. Business rules that the database enforces

| Rule | How |
|---|---|
| BR-01: one ACTIVE sprint per project | `one_active_sprint` index |
| BR-05: issue keys are unique and in order | Unique (`project_id`, `number`), and `projects.next_issue_number` is locked when it is increased |
| BR-07: story points use the allowed numbers | CHECK on `story_points` |
| BR-11: an issue is in only one open sprint | `one_open_sprint_per_issue` index |
| BR-12: activity history is never changed or deleted | The app user has no UPDATE or DELETE permission |
| BR-14 (part): project key format and uniqueness | CHECK on `key` and the `projects_key_ci` index. See section 3 for the rest of BR-14 |

## 3. Rules that the database does NOT enforce

The database cannot check these rules by itself. The API must check them.

- **BR-14, "the key is fixed after creation":** the database only checks the format and the uniqueness of the key. It does not stop someone from changing the key later. The API must reject any key change with 422 `FIELD_IMMUTABLE` (FR-PRJ-02).
- **BR-06 (the assignee must be a project member):** `assignee_id` is only a link to `users`. It does not check project membership. The API must check it.
- **BR-13 (a bug can link only to a Story in the same project):** a CHECK can only look at one row, and this rule needs two issues. It needs a trigger or an API check.
- **Deleting a PLANNED sprint:** SRS section 4.2 allows it, but `sprint_issues.sprint_id` has no ON DELETE CASCADE. The delete fails while `sprint_issues` rows still exist. The API must delete the `sprint_issues` rows first, in the same transaction, and then delete the sprint. (The issues go back to the backlog.)
- **Project key in lowercase:** the CHECK rejects lowercase keys. The API must change the key to capital letters before saving. If not, "ecom" gives a CHECK error and not the expected 409 `PROJECT_KEY_TAKEN`.
- **Email in different cases:** the `email` unique rule is case-sensitive, so `Karim@x.com` and `karim@x.com` can both exist. See the suggestion in section 4.

### Other rules that the API enforces (all in one place)

| Rule | What the API does |
|---|---|
| BR-02 | Status changes only follow the transition table (SRS 4.1). Other changes return 422 `INVALID_TRANSITION` |
| BR-03 | Non-admin users can only use projects they belong to. Non-members get 404. A membership check runs on every route and query |
| BR-04 | Every issue update carries the version it is based on (`WHERE version = $expected`). An old version returns 409 `VERSION_CONFLICT` |
| BR-08 | Completed points count only issues that are in Done now. The report queries read the current status and the activity history |
| BR-09 | `committed_points` is set when the sprint starts. Issues added later are reported as scope change |
| BR-10 | When a sprint closes, every issue not in Done goes back to the backlog, in one transaction. Done issues stay in the closed sprint |
| BR-15 | Archived projects and closed sprints are read-only. The API returns 409 `PROJECT_ARCHIVED` or `SPRINT_CLOSED` |

## 4. Extra suggestions (not in the SRS)

These are only suggestions. They are not SRS rules. Dev 2 agreed with all five. The BA needs to confirm them.

| Suggestion | Why |
|---|---|
| `CREATE UNIQUE INDEX users_email_ci ON users (lower(email));` | Stops two accounts with the same email in different cases |
| `CHECK (committed_points >= 0)` and `CHECK (completed_points >= 0)` on sprints | Points cannot be negative |
| `CHECK (version >= 1)` on issues | Version starts at 1 |
| `CHECK (next_issue_number >= 1)` on projects | The counter starts at 1 |
| `CHECK (bug_id <> story_id)` on issue_links | An issue cannot link to itself |

## 5. Open questions for the BA

Dev 2 agrees with both points. The BA needs to confirm them.

- We need a `refresh_tokens` table (SRS NFR-SEC-02: tokens are stored hashed and can be removed). It is not in the 10 tables.
- We need a place to count failed logins for the lockout (FR-AUTH-04). It is not in the 10 tables.
- The AGL-02 task mentions `created_by` and `updated_at`. In the DDL, `updated_at` is only on `issues`, and `created_by` is only on `issue_links`. Please confirm what is needed.
