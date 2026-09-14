---
title: Caveats & known gaps
description: Sharp edges and mismatches found while documenting the source.
sidebar:
  order: 2
---

These notes describe the code as written. They're useful when debugging, and as a list of possible cleanups.

## Runtime

**Run from the repository root.** `db.ts` (database file and migrations folder) and `logger.ts` (log file) build their default paths from `process.cwd()`. Starting the server from another directory creates a new, empty database and fails to find `backend/drizzle`. All npm scripts already run from the root.

**`npm run doctor` targets port 3000 by default.** That matches `npm run start`, but in development the port is chosen by Portless. Set `WEATHER_STARTER_URL`, e.g. `http://weather-starter.localhost:1355`.

**Production start doesn't add `--use-system-ca`.** Only `scripts/dev.mjs` does. On Windows, production mode can hit TLS verification errors against data.gov.sg.

## Data and API behaviour

**Most upstream failures are silent.** `getCurrentWeather()` catches errors per endpoint and returns `null` fields, so a refresh during a data.gov.sg outage usually returns `200` with `condition: "Unavailable"`. A `502` only happens when the 2-hour forecast payload is invalid (a non-zero `code`, or no items or area forecasts).

**Only the latest snapshot is kept.** Each refresh overwrites the weather columns. There's no history to chart.

**`created_at` has no timezone suffix.** It's UTC, written as `YYYY-MM-DDTHH:MM:SS`, so JavaScript `Date` parses it as local time.

**Duplicate detection is exact.** `1.35` and `1.350001` count as different locations.

**24-hour forecast regions are hard-coded.** `defaultRegions()` in `weather.ts` has fixed centroids, while PSI and PM2.5 use region coordinates from the API response.

## Frontend behaviour

**"Home" is the newest location.** The list is sorted by `created_at` descending and "Home" is `locations[0]`, so adding a location makes it Home.

**Refresh and delete errors aren't displayed.** They're stored in the store's `error` field, but no component reads it. Create errors do appear, in `AddLocationForm`.

**Delete isn't optimistic.** The card stays (with a spinner) until the server confirms the delete.

**"Now" is always the first hourly period.** `HourlyStrip` labels column 0 as "Now" whatever time the period covers.

## Type duplication

`WeatherSnapshot` is declared in three places: `backend/src/schema.ts`, `backend/src/weather.ts`, and `frontend/src/types.ts`. They're kept in sync by hand and differ slightly in nullability.

## Where other docs don't match the code

| Source                               | Claim                                                       | Actual code                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`, `README.md`             | Weather is stored as a "single JSON blob"                   | One typed column per metric. Only `forecast_periods` and `daily_forecast` are JSON. The write is still a single atomic `UPDATE`. |
| `memory/agent-guides/data-schema.md` | A separate `weather` table with a `location_id` foreign key | Only a `locations` table exists                                                                                                  |
| `README.md` (task 1)                 | Delete uses optimistic UI                                   | The store waits for the `DELETE` response                                                                                        |
| `README.md` (task 4)                 | Geolocation is still to do                                  | `AddLocationForm` already has **Use my location**                                                                                |
| `README.md` (API table)              | Lists six endpoints                                         | `POST /api/logs` also exists                                                                                                     |
| `frontend/.env.local.example`        | `VITE_BACKEND_PORT` / `VITE_API_TARGET` configure the API   | Nothing reads them. The frontend uses relative `/api`                                                                            |
