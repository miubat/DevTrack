# DevTrack

Agile Project & Issue Management System (Group 4). Requirements are in the SRS.

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
git clone <repository-url> DevTrack
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

## Troubleshooting

| Problem                                       | Fix                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `node -v` is below 20                         | Install the current LTS from https://nodejs.org and reopen the terminal.     |
| `EADDRINUSE` / port already in use            | Stop the other program using that port, then run the command again.          |
| `npm install` fails                           | Delete the `node_modules` folder and run `npm install` again.                |
| Changed `.env` but nothing changed            | Stop the dev server (Ctrl+C) and start it again.                             |
