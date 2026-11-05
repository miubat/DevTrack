# DevTrack ER Diagram (10 tables, all columns)

Source: SRS v0.1, sections 5.1 and 5.2. Task: AGL-02.1. Version 2 (after Dev 2 review).

```mermaid
erDiagram
    users ||--o{ project_members : "joins"
    projects ||--o{ project_members : "has"
    users ||--o{ projects : "manages (manager_id)"
    projects ||--o{ issues : "contains"
    users |o--o{ issues : "assignee (nullable)"
    users ||--o{ issues : "reporter"
    issues ||--o| bug_details : "bug fields"
    issues ||--o{ issue_links : "bug"
    issues ||--o{ issue_links : "story"
    users ||--o{ issue_links : "created_by"
    projects ||--o{ sprints : "has"
    sprints ||--o{ sprint_issues : "plans"
    issues ||--o{ sprint_issues : "in sprint"
    issues ||--o{ comments : "has"
    users ||--o{ comments : "author"
    projects ||--o{ activities : "logs"
    users ||--o{ activities : "actor"

    users {
        bigint id PK
        varchar full_name
        varchar email UK
        text password_hash
        system_role role
        boolean is_active
        boolean must_reset_pw
        timestamptz created_at
    }
    projects {
        bigint id PK
        varchar key UK "unique on upper(key), BR-14"
        varchar name
        text description
        text objectives
        date start_date
        date end_date
        bigint manager_id FK
        int next_issue_number
        boolean is_archived
        timestamptz created_at
    }
    project_members {
        bigint project_id PK,FK
        bigint user_id PK,FK
        timestamptz added_at
    }
    issues {
        bigint id PK
        bigint project_id FK
        int number UK "UNIQUE (project_id, number), BR-05"
        issue_type type
        varchar title
        text description
        issue_status status
        priority priority
        smallint story_points
        bigint assignee_id FK "nullable"
        bigint reporter_id FK
        numeric backlog_rank
        int version
        timestamptz created_at
        timestamptz updated_at
        timestamptz done_at
    }
    bug_details {
        bigint issue_id PK,FK
        varchar environment
        text steps_to_reproduce
        text expected_result
        text actual_result
        severity severity
    }
    issue_links {
        bigint bug_id PK,FK
        bigint story_id PK,FK
        bigint created_by FK
        timestamptz created_at
    }
    sprints {
        bigint id PK
        bigint project_id FK
        varchar name
        varchar goal
        date start_date
        date end_date
        sprint_status status
        int committed_points
        int completed_points
        timestamptz started_at
        timestamptz closed_at
    }
    sprint_issues {
        bigint sprint_id PK,FK
        bigint issue_id PK,FK
        boolean is_open
        boolean added_after_start
        timestamptz added_at
        timestamptz removed_at
    }
    comments {
        bigint id PK
        bigint issue_id FK
        bigint author_id FK
        text body
        timestamptz created_at
        timestamptz edited_at
    }
    activities {
        bigint id PK
        bigint project_id FK
        varchar entity_type
        bigint entity_id
        bigint actor_id FK
        varchar action
        varchar field
        text old_value
        text new_value
        timestamptz created_at
    }
```

## Notes
- **BR-05:** `UNIQUE (project_id, number)` on `issues` makes issue keys unique per project (e.g. ECOM-101). The number comes from `projects.next_issue_number`, incremented under a row lock. Mermaid cannot draw a composite unique key, so `number` is marked UK with this note.
- **Assignee is optional:** `issues.assignee_id` is nullable, so the users side of "assignee" is zero-or-one. `reporter_id` is NOT NULL, so every issue has exactly one reporter.
- `activities.entity_id` has no foreign key: it points to an issue, sprint, project or comment depending on `entity_type`.
- `activities` is append-only (UPDATE and DELETE are revoked from the app user, BR-12).
- Assignment history is stored in `activities` (field = `assignee`), not in its own table.
- `projects.key` is unique case-insensitively through the index on `upper(key)` (BR-14).
