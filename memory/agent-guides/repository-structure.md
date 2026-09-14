# Repository Structure

## Backend (`backend/src/`)

| File                       | Purpose                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `server.ts`                | Express app factory + Vite dev middleware. `createApp(options)` accepts an injected `weatherClient` for testing. |
| `routes/locations.ts`      | REST handlers: list, add, get, refresh, delete locations.                                                        |
| `routes/locations.test.ts` | Vitest + Supertest integration tests against a real SQLite DB.                                                   |
| `weather.ts`               | `SingaporeWeatherClient` — all data.gov.sg HTTP calls, retry logic, nearest-station/region logic.                |
| `db.ts`                    | SQLite connection + Drizzle helpers for location CRUD and weather snapshot upsert.                               |
| `schema.ts`                | Drizzle table definitions — edit here, then run `db:generate` + `db:migrate`.                                    |
| `logger.ts`                | Pino logger instance (silent in test env).                                                                       |

## Frontend (`frontend/src/`)

| File                             | Purpose                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `App.tsx`                        | Root: `ThemeProvider` → `StoreProvider` → `Layout`                                                       |
| `state/store.tsx`                | React Context store. Actions: `select(id)`, `upsert(location)`, `remove(id)`, `setWeather(id, snapshot)` |
| `state/theme.tsx`                | Theme Context. Persists to `localStorage`, sets `data-theme` on `<html>`.                                |
| `api.ts`                         | Fetch wrappers for all `/api/*` endpoints.                                                               |
| `types.ts`                       | Shared interfaces: `Location`, `WeatherSnapshot`, `LocationRecord`                                       |
| `components/Layout.tsx`          | App shell                                                                                                |
| `components/Sidebar.tsx`         | Location list panel                                                                                      |
| `components/SidebarCard.tsx`     | Per-location card; `×` delete button stops event propagation                                             |
| `components/Hero.tsx`            | Main weather display                                                                                     |
| `components/Tiles.tsx`           | Metric tile grid (Condition, Temp, Humidity, Precip, Wind, UV, AirQuality)                               |
| `components/HourlyStrip.tsx`     | 6-hourly forecast strip                                                                                  |
| `components/TenDayForecast.tsx`  | 4-day forecast list                                                                                      |
| `components/MapCard.tsx`         | Leaflet map (see below)                                                                                  |
| `components/ThemeSelector.tsx`   | Theme dropdown, top-right                                                                                |
| `components/AddLocationForm.tsx` | Lat/lon add form                                                                                         |
| `components/icons.tsx`           | SVG icon components                                                                                      |
| `components/format.ts`           | Date/temperature formatting helpers                                                                      |

## Map card

Custom `L.divIcon` temperature pills — avoids the default-marker-breaks-under-Vite issue. Clicking a pin calls `select(id)`. Card view has pan/zoom disabled; "Expand" opens a fullscreen `createPortal` overlay with full interaction.

## Theme system

Purely CSS-scoped — no component changes needed to add a theme:

1. Add entry to `THEMES` array in `state/theme.tsx`
2. Add `[data-theme="your-theme"] { ... }` block in `frontend/src/index.css`

## Testing

Tests live in `backend/src/**/*.test.ts`. Run with `npm test` (single) or `npm run test:watch`.

Vitest config (`vitest.config.ts`): pool `forks`, no file parallelism (prevents SQLite conflicts), `NODE_ENV=test` disables Vite middleware and request logging.

`createApp({ weatherClient })` accepts a stub client so tests never hit data.gov.sg.
