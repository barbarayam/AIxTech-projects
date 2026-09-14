---
title: Commands & scripts
description: npm scripts, the helper scripts behind them, and the pre-commit hook.
sidebar:
  order: 3
---

All scripts are defined in the root `package.json`. Run them from the repository root.

## npm scripts

| Command                | What it runs                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | `node scripts/dev.mjs` (Portless + `tsx watch`)                 |
| `npm run build`        | `npm run build -w frontend && tsc -p backend/tsconfig.json`     |
| `npm run start`        | `node scripts/start.mjs` (compiled server in production mode)   |
| `npm run doctor`       | `node scripts/doctor.mjs` (smoke test against a running server) |
| `npm run reset`        | `node scripts/reset.mjs` (delete the SQLite database)           |
| `npm test`             | `vitest run` (backend API tests)                                |
| `npm run test:watch`   | `vitest` in watch mode                                          |
| `npm run lint`         | `eslint .`                                                      |
| `npm run lint:fix`     | `eslint . --fix`                                                |
| `npm run format`       | `prettier --write .`                                            |
| `npm run format:check` | `prettier --check .`                                            |
| `npm run db:generate`  | `drizzle-kit generate` (SQL migration from `schema.ts`)         |
| `npm run db:migrate`   | `drizzle-kit migrate`                                           |
| `npm run docs`         | `astro dev` in the `docs` workspace                             |

The `frontend` build runs `tsc -p tsconfig.json && vite build`, so frontend type errors fail the build.

## Helper scripts

### `scripts/dev.mjs`

Spawns `portless run --name weather-starter tsx watch backend/src/server.ts`. Before spawning it:

- appends `--disable-warning=ExperimentalWarning` (hides the `node:sqlite` warning) and `--use-system-ca` to `NODE_OPTIONS`
- sets `PORTLESS_HTTPS` (default `0`) and `PORTLESS_PORT` (default `1355`)

When the child process exits, the script exits with the same code or signal.

### `scripts/start.mjs`

Runs `node backend/dist/server.js` with `NODE_ENV=production` and the same `ExperimentalWarning` suppression. It does not add `--use-system-ca`.

### `scripts/doctor.mjs`

Sends `GET /health` and `GET /api/locations` to `WEATHER_STARTER_URL` (default `http://127.0.0.1:3000`) and throws if either returns a non-2xx response.

:::note
The default URL matches `npm run start`. Against the dev server, whose port is chosen by Portless, point it at the dev URL, e.g. `WEATHER_STARTER_URL=http://weather-starter.localhost:1355 npm run doctor`.
:::

### `scripts/reset.mjs`

Deletes the database file plus its `-shm` and `-wal` companions. It uses `DATABASE_PATH` when set, otherwise `backend/weather.db`. Stop the server first. A fresh schema is created automatically the next time the server starts.

## Pre-commit hook

Husky runs `.husky/pre-commit` on every commit:

```bash
npm run lint
npm test
```

A lint error or failing test blocks the commit.
