CREATE TYPE system_role AS ENUM ('ADMIN','PROJECT_MANAGER','TEAM_MEMBER');
CREATE TYPE issue_type AS ENUM ('STORY','TASK','BUG');
CREATE TYPE issue_status AS ENUM ('TO_DO','IN_PROGRESS','IN_REVIEW','DONE');
CREATE TYPE priority AS ENUM ('LOWEST','LOW','MEDIUM','HIGH','HIGHEST');
CREATE TYPE severity AS ENUM ('MINOR','MAJOR','CRITICAL','BLOCKER');
CREATE TYPE sprint_status AS ENUM ('PLANNED','ACTIVE','CLOSED');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role system_role NOT NULL DEFAULT 'TEAM_MEMBER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_reset_pw BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(10) NOT NULL CHECK (key ~ '^[A-Z]{2,10}$'),
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  manager_id BIGINT NOT NULL REFERENCES users(id),
  next_issue_number INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX projects_key_ci ON projects (upper(key));

CREATE TABLE project_members (
  project_id BIGINT NOT NULL REFERENCES projects(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE issues (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  number INTEGER NOT NULL,
  type issue_type NOT NULL,
  title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  status issue_status NOT NULL DEFAULT 'TO_DO',
  priority priority NOT NULL DEFAULT 'MEDIUM',
  story_points SMALLINT NULL CHECK (story_points IN (1,2,3,5,8,13,21)),
  assignee_id BIGINT NULL REFERENCES users(id),
  reporter_id BIGINT NOT NULL REFERENCES users(id),
  backlog_rank NUMERIC(20,10) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  done_at TIMESTAMPTZ NULL,
  UNIQUE (project_id, number)
);
CREATE INDEX issues_filter ON issues (project_id, status, type, priority, assignee_id);
CREATE INDEX issues_rank ON issues (project_id, backlog_rank);
CREATE INDEX issues_title ON issues USING gin (to_tsvector('simple', title));

CREATE TABLE bug_details (
  issue_id BIGINT PRIMARY KEY REFERENCES issues(id),
  environment VARCHAR(255) NOT NULL,
  steps_to_reproduce TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  severity severity NOT NULL
);

CREATE TABLE issue_links (
  bug_id BIGINT NOT NULL REFERENCES issues(id),
  story_id BIGINT NOT NULL REFERENCES issues(id),
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bug_id, story_id)
);

CREATE TABLE sprints (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  name VARCHAR(80) NOT NULL,
  goal VARCHAR(255) NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status sprint_status NOT NULL DEFAULT 'PLANNED',
  committed_points INTEGER NULL,
  completed_points INTEGER NULL,
  started_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  CHECK (end_date = start_date + 13)
);
CREATE UNIQUE INDEX one_active_sprint ON sprints (project_id) WHERE status = 'ACTIVE';

CREATE TABLE sprint_issues (
  sprint_id BIGINT NOT NULL REFERENCES sprints(id),
  issue_id BIGINT NOT NULL REFERENCES issues(id),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  added_after_start BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ NULL,
  PRIMARY KEY (sprint_id, issue_id)
);
CREATE UNIQUE INDEX one_open_sprint_per_issue ON sprint_issues (issue_id) WHERE is_open AND removed_at IS NULL;

CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  issue_id BIGINT NOT NULL REFERENCES issues(id),
  author_id BIGINT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ NULL
);

CREATE TABLE activities (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('ISSUE','SPRINT','PROJECT','COMMENT')),
  entity_id BIGINT NOT NULL,
  actor_id BIGINT NOT NULL REFERENCES users(id),
  action VARCHAR(40) NOT NULL,
  field VARCHAR(40) NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activities_entity ON activities (entity_type, entity_id, created_at);
CREATE INDEX activities_burndown ON activities (project_id, field, created_at) WHERE field = 'status';
