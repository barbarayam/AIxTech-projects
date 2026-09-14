---
title: Configuration
description: Environment variables read by the backend, scripts, and tooling.
sidebar:
  order: 2
---

The backend loads `.env` from the working directory via `import 'dotenv/config'` at the top of `backend/src/server.ts`. Copy `.env.example` to get started.

## Environment variables

| Variable              | Default                      | Read by                                   | Purpose                                                                                                                     |
| --------------------- | ---------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `WEATHER_API_KEY`     | _(unset)_                    | `routes/locations.ts`                     | Sent as the `x-api-key` header to data.gov.sg for higher rate limits.                                                       |
| `PORT`                | `3000`                       | `server.ts`                               | Port to listen on. The server always binds to `127.0.0.1`. In development Portless supplies this.                           |
| `NODE_ENV`            | _(unset)_                    | `server.ts`, `logger.ts`                  | `production` serves `frontend/dist`. `test` turns off frontend serving and request logging and silences the logger.         |
| `DATABASE_PATH`       | `<cwd>/backend/weather.db`   | `db.ts`, `drizzle.config.ts`, `reset.mjs` | SQLite file location. Parent directories are created automatically.                                                         |
| `LOG_LEVEL`           | `info` (`silent` in test)    | `logger.ts`                               | Pino log level.                                                                                                             |
| `LOG_FILE_PATH`       | `<cwd>/backend/logs/app.log` | `logger.ts`                               | File that receives a copy of every log line (in addition to stdout).                                                        |
| `PORTLESS_PORT`       | `1355`                       | `scripts/dev.mjs`                         | Port of the Portless proxy that serves `http://weather-starter.localhost:<port>`.                                           |
| `PORTLESS_HTTPS`      | `0`                          | `scripts/dev.mjs`                         | Set to `1` to have Portless serve HTTPS.                                                                                    |
| `WEATHER_STARTER_URL` | `http://127.0.0.1:3000`      | `scripts/doctor.mjs`                      | Base URL that `npm run doctor` checks.                                                                                      |
| `NODE_OPTIONS`        | _(inherited)_                | `scripts/dev.mjs`, `scripts/start.mjs`    | Scripts append `--disable-warning=ExperimentalWarning` (both) and `--use-system-ca` (dev only) to whatever you already set. |

## Windows TLS

`scripts/dev.mjs` adds `--use-system-ca` to `NODE_OPTIONS` so Node 24 checks data.gov.sg's TLS certificate against the Windows certificate store. Without it, every upstream request can fail with a certificate error. Don't remove this flag.

`scripts/start.mjs` does **not** add the flag. If you hit TLS errors in production mode on Windows, set it yourself:

```bash
NODE_OPTIONS=--use-system-ca npm run start
```

## Frontend configuration

The frontend has no runtime configuration. It calls relative `/api/*` URLs, which always reach the same Express process that served the page.

`frontend/.env.local.example` mentions `VITE_BACKEND_PORT` and `VITE_API_TARGET`, but nothing in `frontend/vite.config.ts` or `frontend/src` reads them.
