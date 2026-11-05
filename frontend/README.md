# DevTrack Frontend

React + Vite single-page app for DevTrack, the Agile Project & Issue Management System (Group 4).
See the SRS for requirements.

## Requirements

- Node.js 20 or newer (`node -v`)
- npm 10 or newer
- The backend running for API calls (see the backend README)

## Setup

```bash
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run dev
```

The app runs on http://localhost:5173.

## Scripts

| Command                | What it does                      |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Run with hot reload               |
| `npm run build`        | Type-check and build to `dist/`   |
| `npm run preview`      | Serve the production build        |
| `npm run lint`         | Lint with oxlint                  |
| `npm run format`       | Format code with Prettier         |
| `npm run format:check` | Check formatting without changing |

Run `npm run lint`, `npm run format:check` and `npm run build` before opening a pull request.

## Environment variables

| Variable       | Example                 | Use              |
| -------------- | ----------------------- | ---------------- |
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL |

Never commit `.env`.

## Folder structure

```
src/
  main.tsx       App entry, router setup
  App.tsx        Route list
  pages/         One component per page
  index.css      Global styles
```
