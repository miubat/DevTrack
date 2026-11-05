# DevTrack database (AGL-04.1)

Local PostgreSQL 16 in Docker Compose and migrations for all 10 tables.

## Requirements

- Docker Desktop (running)
- Node.js 20 or newer

## Run

```bash
cp .env.example .env
npm install
npm run db:setup
```

`db:setup` starts PostgreSQL and applies the migrations. `db:reset` wipes the volume and rebuilds everything from zero.

## What is in it

| Path | Purpose |
|---|---|
| `docker-compose.yml` | PostgreSQL 16 with a health check |
| `prisma/schema.prisma` | Prisma models for the 10 tables (SRS section 5.2) |
| `prisma/migrations/..._init_schema` | Tables, enums, CHECKs, partial unique indexes (`one_active_sprint`, `one_open_sprint_per_issue`) |
| `prisma/migrations/..._roles_and_grants` | `devtrack_app` role; UPDATE and DELETE on `activities` revoked |

## Notes

- Use `prisma migrate deploy` (`npm run db:migrate`). The migrations contain partial indexes and CHECKs that Prisma does not model, so avoid `prisma migrate dev` against this database.
- The `devtrack_app` password in the roles migration is for local development only. The application should connect with `DATABASE_URL_APP`; migrations use `DATABASE_URL`.
