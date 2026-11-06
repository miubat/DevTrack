# DevTrack

Agile Project & Issue Management System. Requirements are in the SRS.

| Folder                | What it is           | Runs on               |
| --------------------- | -------------------- | --------------------- |
| [backend](backend/)   | NestJS API           | http://localhost:3000 |
| [frontend](frontend/) | React + Vite web app | http://localhost:5173 |

## Prerequisites

- Node.js 20 or newer (`node -v`)
- npm 10 or newer (`npm -v`)
- Git (`git --version`)

A database is not needed yet.

## Setup

Clone the repository:

```bash
git clone https://github.com/miubat/DevTrack.git DevTrack
cd DevTrack
```

Open two terminals.

**Terminal 1: backend**

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

**Terminal 2: frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The default values in `.env.example` work as they are. You do not need to edit your `.env` files.

## Check it works

- http://localhost:5173 shows the DevTrack home page.
- http://localhost:5173/anything shows the "not found" page.
- http://localhost:3000 shows `Hello World!`.

The backend may print a `WARN` about empty `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET`. This is safe to ignore.

## Before you open a pull request

Run these in each folder and make sure they pass.

Backend (`backend/`):

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Frontend (`frontend/`):

```bash
npm run lint
npm run format:check
npm run build
```

The frontend has no tests yet, so it has no `npm test`.

## Branches

Work on a branch named `feature/AGL-xx-short-name`, then open a pull request to `master`.

## Troubleshooting

| Problem                                       | Fix                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `node -v` is below 20                         | Install the current LTS from https://nodejs.org and reopen the terminal.     |
| `EADDRINUSE` / port already in use            | Stop the other program using the port, or change the port: set `PORT` in `backend/.env` (for example `PORT=3001`) and set `VITE_API_URL` in `frontend/.env` to the same port (`http://localhost:3001`). Restart both. |
| `npm install` fails                           | Delete the `node_modules` folder and run `npm install` again.                |
| Changed `.env` but nothing changed            | Stop the dev server (Ctrl+C) and start it again.                             |