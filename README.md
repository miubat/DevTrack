# DevTrack

Agile Project & Issue Management System (Group 4). See the SRS for requirements.

## Folders

| Folder                 | What                     |
| ---------------------- | ------------------------ |
| [backend](backend/)    | NestJS API (PostgreSQL)  |
| [frontend](frontend/)  | React + Vite web app     |

Each folder has its own README with setup steps.

## Quick start

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Backend: http://localhost:3000 · Frontend: http://localhost:5173

## Branches

- `master`: all task work is merged here first.
- `main`: stable code only. `master` is merged into `main` after the team checks it.

Start every task from `master`:

```bash
git checkout master
git pull
git checkout -b feature/AGL-xx-short-name
```

Open the pull request to `master`, not `main`.
