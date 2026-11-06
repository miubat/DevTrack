# Setup Check (AGL-04.3)

Every intern runs this on their own laptop. Done when everyone has run migrate and seed.

## How to run

From the repo root:

```bash
git checkout main
git pull
node scripts/check-setup.mjs
```

Each line shows `[PASS]`, `[FAIL]` or `[SKIP]`. A `[FAIL]` line tells you what to run.
`[SKIP]` means that part of the setup (AGL-04) is not in `main` yet.

## Fixes for common failures

| Check                      | Fix                                                                 |
| -------------------------- | ------------------------------------------------------------------- |
| Node.js 20+                | Install the LTS from https://nodejs.org and reopen the terminal     |
| Docker running             | Install Docker Desktop and open it, then wait until it says Running |
| npm install                | `cd <folder>` then `npm install`                                    |
| .env file                  | `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)  |
| Database container running | `cd devtrack-db` then `npm run db:setup`                            |
| Migrations applied         | `cd devtrack-db` then `npm run db:migrate`                          |
| Seed data loaded           | Run the seed command from the database README once it is added      |

## Results

Paste each person's `Result:` line here and in ClickUp AGL-04.3.

| Intern               | Date | Result |
| -------------------- | ---- | ------ |
| Sanzida Khan Mitu    |      |        |
| Kazi Abu Jafor Arif  |      |        |
| Mashrur Safir Shabab |      |        |
| Shah Md. Zahid Newaz |      |        |
| Ashib Adnan          |      |        |
