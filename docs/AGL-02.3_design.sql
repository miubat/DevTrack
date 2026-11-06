CREATE TYPE sprint_status AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

CREATE TABLE projects (
    id                BIGSERIAL    PRIMARY KEY,
    key               VARCHAR(10)  NOT NULL CHECK (key ~ '^[A-Z]{2,10}$'),
    name              VARCHAR(120) NOT NULL,
    next_issue_number INTEGER      NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX projects_key_ci ON projects (upper(key));

CREATE TABLE issues (
    id          BIGSERIAL    PRIMARY KEY,
    project_id  BIGINT       NOT NULL REFERENCES projects(id),
    number      INTEGER      NOT NULL,
    title       VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    version     INTEGER      NOT NULL DEFAULT 1,
    UNIQUE (project_id, number)
);

CREATE TABLE sprints (
    id          BIGSERIAL     PRIMARY KEY,
    project_id  BIGINT        NOT NULL REFERENCES projects(id),
    name        VARCHAR(80)   NOT NULL,
    status      sprint_status NOT NULL DEFAULT 'PLANNED'
);
CREATE UNIQUE INDEX one_active_sprint ON sprints (project_id) WHERE status = 'ACTIVE';

UPDATE issues SET title = $2, version = version + 1 WHERE id = $1 AND version = $3;

BEGIN;
WITH n AS (
    UPDATE projects SET next_issue_number = next_issue_number + 1
    WHERE id = $1
    RETURNING next_issue_number - 1 AS num
)
INSERT INTO issues (project_id, number, title)
SELECT $1, num, $2 FROM n;
COMMIT;
