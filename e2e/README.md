# e2e: Playwright tests

End-to-end tests for DevTrack (AGL-33).

## Setup (once)

```bash
cd e2e
npm install
npx playwright install chromium
cp .env.example .env
```

## Run

| Command | What it does |
| --- | --- |
| `npm test` | Runs all tests against local. Starts the frontend if it is not already running. |
| `npm run test:smoke` | Runs only tests tagged `@smoke` |
| `npm run test:staging` | Runs against `STAGING_URL` from `.env`. Starts nothing. |
| `npm run test:headed` | Opens a visible browser |
| `npm run report` | Opens the last HTML report |
| `npm run lint` / `npm run format:check` | Type check and formatting |

## Folders

| Folder | Holds |
| --- | --- |
| `tests/` | Test files. Name tests after their manual case ID, e.g. `TC-AGL-05.4-01 …` |
| `utils/` | Shared helpers (`env.ts` loads `.env`) |

## Notes

- No retries: login tests count against the account lockout and the login rate limit (FR-AUTH-04, NFR-SEC-07).
- Only Chrome for now. Add Firefox, Edge and Safari projects in `playwright.config.ts` when needed (SRS §5.4).
