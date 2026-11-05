# DevTrack Backend

NestJS API for DevTrack, the Agile Project & Issue Management System (Group 4).
See the SRS for requirements and the API contract.

## Requirements

- Node.js 20 or newer (`node -v`)
- npm 10 or newer
- PostgreSQL 16 (needed from AGL-04 onward)

## Setup

```bash
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run start:dev
```

The API runs on http://localhost:3000 (or the `PORT` in `.env`).

## Scripts

| Command                | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run start:dev`    | Run with auto-reload                |
| `npm run build`        | Compile to `dist/`                  |
| `npm run lint`         | Lint `src/` and `test/` with oxlint |
| `npm run format`       | Format code with Prettier           |
| `npm run format:check` | Check formatting without changing   |
| `npm test`             | Unit tests (Vitest)                 |
| `npm run test:e2e`     | End-to-end tests                    |
| `npm run test:cov`     | Unit tests with coverage            |

Run `npm run lint`, `npm run format:check` and `npm test` before opening a pull request.

## Environment variables

All variables are listed with comments in [.env.example](.env.example).
Never commit `.env`.
