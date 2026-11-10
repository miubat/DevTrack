# DevTrack database (AGL-04)

Local PostgreSQL 16 in Docker Compose, migrations for all 10 tables, and seed data.

## Run

```bash
cp .env.example .env
npm install
npm run db:setup
```

`db:setup` starts PostgreSQL, applies the migrations, then seeds. `db:reset` wipes the volume and rebuilds everything from zero.

## What is in it

| Path | Purpose |
|---|---|
| `docker-compose.yml` | PostgreSQL 16 with a health check |
| `prisma/schema.prisma` | Prisma models for the 10 tables (SRS section 5.2) |
| `prisma/migrations/..._init_schema` | Tables, enums, CHECKs, partial unique indexes (`one_active_sprint`, `one_open_sprint_per_issue`) |
| `prisma/migrations/..._roles_and_grants` | `devtrack_app` role; UPDATE and DELETE on `activities` revoked |
| `prisma/seed-data.ts` | Generates the seed rows (fixed random seed, same data every run) |
| `prisma/seed.ts` | Writes the rows to the database; passwords hashed with Argon2id |

## Seed contents

- 1 admin, 2 project managers (Rahim, Sadia), 8 team members
- 2 projects: ECOM (80 issues) and HRMS (70 issues), 150 in total
- Per project: Sprint 1 CLOSED, Sprint 2 ACTIVE, Sprint 3 PLANNED, plus a backlog
- Includes a reopened issue, a mid-sprint addition, carried-over issues, an unestimated issue, bugs linked to stories, comments and activity history
- Hasan is not a member of HRMS; Karim is a member of both projects

All seed users share the password `Passw0rd1` (change it with `SEED_PASSWORD`) and do not need a password reset.

## Rolling back migrations

- `npm run db:migrate:down` undoes the latest migration.
- `npm run db:migrate:down:all` undoes every migration.
- Run `npm run db:migrate` to apply them again.
- Each migration folder in `prisma/migrations` needs a matching `prisma/down/<same folder name>/down.sql`.
- Down migrations delete the data in the tables they drop. They are for local development only.

## Notes

- Use `prisma migrate deploy` (`npm run db:migrate`). The migrations contain partial indexes and CHECKs that Prisma does not model, so avoid `prisma migrate dev` against this database.
- The `devtrack_app` password in the roles migration is for local development only. The application should connect with `DATABASE_URL_APP`; migrations and seed use `DATABASE_URL`.
- The seed refuses to run when `NODE_ENV=production`.
