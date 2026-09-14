---
title: System overview
description: Runtime modes, module boundaries, and the Express request pipeline.
sidebar:
  order: 1
---

Weather Starter is a TypeScript monorepo with three npm workspaces:

| Workspace   | Stack                                                     | Output                               |
| ----------- | --------------------------------------------------------- | ------------------------------------ |
| `backend/`  | Node 24, Express 4, Drizzle ORM, `node:sqlite`, Pino      | `backend/dist` (compiled with `tsc`) |
| `frontend/` | React 18, Vite 7, Tailwind CSS 3, Leaflet / React Leaflet | `frontend/dist` (Vite build)         |
| `docs/`     | Astro + Starlight                                         | This site                            |

## Runtime modes

The backend and frontend always run as **one Node process**. What changes between modes is how the frontend reaches the browser.

### Development

```mermaid
flowchart LR
  Cmd["npm run dev<br/>scripts/dev.mjs"] --> Portless["portless run<br/>--name weather-starter"]
  Portless -- "starts, sets PORT" --> Tsx["tsx watch<br/>backend/src/server.ts"]

  Browser["Browser"] -- "weather-starter.localhost:1355" --> Proxy["Portless proxy"]
  Proxy --> Express["Express<br/>127.0.0.1:PORT"]
  Express -- "/health, /api/*" --> Api["API handlers"]
  Express -- "everything else" --> Vite["Vite middleware<br/>root: frontend/ · HMR"]
```

- `createApp()` calls Vite's `createServer({ server: { middlewareMode: true }, appType: 'spa' })` and mounts `vite.middlewares`.
- `tsx watch` restarts the backend when backend files change, and Vite hot-reloads frontend changes.
- Dev-only frontend tooling: `react-grab` is loaded from `index.html` when `import.meta.env.DEV` is true, and `frontend/vite.config.ts` registers the `@frontman-ai/vite` plugin.

### Production

```mermaid
flowchart LR
  Build["npm run build"] --> FeDist["frontend/dist"]
  Build --> BeDist["backend/dist"]
  Start["npm run start<br/>NODE_ENV=production"] --> Server["node backend/dist/server.js<br/>127.0.0.1:PORT (default 3000)"]
  Browser["Browser"] --> Server
  Server -- "express.static" --> FeDist
  Server -- "GET * → index.html" --> FeDist
```

### Test

With `NODE_ENV=test` (set by `vitest.config.ts`), `createApp()` skips frontend serving and request logging, and the logger is silent. Tests also inject a stub weather client. See [Testing](/guides/testing/).

## Backend module map

```mermaid
flowchart TD
  Server["server.ts<br/>createApp(options)"] --> Routes["routes/locations.ts<br/>createLocationsRouter()"]
  Server --> Logger["logger.ts<br/>Pino"]
  Routes --> Db["db.ts<br/>CRUD helpers + migrations"]
  Routes --> Weather["weather.ts<br/>SingaporeWeatherClient"]
  Routes --> Logger
  Db --> Schema["schema.ts<br/>locations table + WeatherSnapshot"]
  Weather --> Gov[("data.gov.sg")]
  Db --> Sqlite[("SQLite file")]
```

| Module                | Responsibility                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `server.ts`           | Builds the Express app, wires middleware, and starts listening when run directly.                                      |
| `routes/locations.ts` | Validates input, handles the location lifecycle, and maps errors to status codes.                                      |
| `weather.ts`          | Calls every data.gov.sg endpoint, picks the nearest station, area, or region, retries on 429, and builds the snapshot. |
| `db.ts`               | Opens SQLite, runs migrations when imported, and converts between table rows and API records.                          |
| `schema.ts`           | Drizzle table definition and the stored `WeatherSnapshot` type.                                                        |
| `logger.ts`           | Shared Pino logger writing to stdout and `backend/logs/app.log`.                                                       |

The router depends on a small `WeatherClient` interface (`getCurrentWeather(lat, lon)`) rather than on the concrete class, so tests can pass in a stub through `createApp({ weatherClient })`.

## Express request pipeline

Middleware is registered in this order in `createApp()`:

```mermaid
flowchart TD
  Req(["Incoming request"]) --> Pino["pino-http request logging<br/>skipped in test"]
  Pino --> Json["express.json()<br/>skipped for /frontman*"]
  Json --> Health{"GET /health?"}
  Health -- yes --> HealthRes["200 status: healthy"]
  Health -- no --> Logs{"POST /api/logs?"}
  Logs -- yes --> LogsRes["validate event → logger.info → 204"]
  Logs -- no --> Api{"/api/* route?"}
  Api -- yes --> Router["Locations router"]
  Api -- no --> Front["Vite middleware (dev)<br/>static + SPA fallback (prod)"]
  Router -. "thrown error" .-> Err["Error handler<br/>500 detail: Internal server error"]
```

## Frontend layering

```mermaid
flowchart TD
  Main["main.tsx"] --> App["App.tsx"]
  App --> ThemeP["ThemeProvider<br/>state/theme.tsx"]
  ThemeP --> StoreP["StoreProvider<br/>state/store.tsx"]
  StoreP --> Layout["Layout"]
  Layout --> Sidebar & Hero & ThemeSelector
  StoreP -- "calls" --> ApiTs["api.ts"]
  ThemeP -- "logInteraction" --> ApiTs
  ApiTs -- "fetch /api/*" --> Backend[("Express")]
```

Components never call `fetch` directly. They use the store's actions, which call `api.ts`. More detail in [Frontend overview](/frontend/overview/).

## Key design decisions

| Decision                               | Why it matters                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Single process for API and UI          | No CORS, no proxy config. The frontend uses relative `/api` URLs in every mode.                                       |
| Cache-first reads                      | Page loads never wait on data.gov.sg. Upstream calls happen only on create or refresh.                                |
| Latest snapshot only                   | Weather is stored in columns of the `locations` row and overwritten on refresh. Simple, but there's no history.       |
| Serialised station requests            | Keeps unauthenticated usage under data.gov.sg rate limits. See [Refresh data flow](/architecture/refresh-data-flow/). |
| Injected weather client                | API tests run fully offline against a real SQLite file.                                                               |
| Built-in `node:sqlite` + Drizzle proxy | No native SQLite dependency to compile. Needs Node 24 and suppresses its experimental warning.                        |
