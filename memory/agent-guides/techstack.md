# Techstack

## Languages & Runtimes

- **TypeScript 5.7** — backend and frontend
- **Node.js 24** — runtime (with `--use-system-ca` on Windows for TLS)

## Backend

| Tool | Role |
|---|---|
| Express | HTTP server + API router |
| Drizzle ORM | Type-safe SQLite queries and migrations |
| Pino / pino-http | Structured JSON logger |
| tsx | TypeScript runner for dev (no compile step) |
| dotenv | `.env` loading (`WEATHER_API_KEY` for data.gov.sg) |

## Frontend

| Tool | Role |
|---|---|
| React 18 | UI framework |
| Vite 7 | Dev server + bundler (served through Express middleware) |
| Tailwind CSS 3 | Utility-first styling |
| Leaflet / React Leaflet | Interactive map card |

## Dev tooling

| Tool | Role |
|---|---|
| Portless | Named `.localhost` dev URL proxy |
| Vitest | Test runner (backend only) |
| Supertest | HTTP assertions in tests |
| Husky | Git pre-commit hooks |
| Prettier + ESLint | Formatting and linting |
| drizzle-kit | Migration generator/runner |

## Workspace layout

Root `package.json` defines all npm scripts and shared dependencies. `frontend/` and `backend/` are npm workspaces with their own `package.json` files. Run all commands from the root.
