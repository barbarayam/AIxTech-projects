# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A full-stack Singapore weather dashboard: Node/Express backend, React/Vite frontend, SQLite cache — fetching live data from data.gov.sg on demand.

## Commands

```bash
npm run dev          # Start dev server (Express + Vite + Portless proxy)
npm run build        # Build frontend + compile backend TypeScript
npm run start        # Run compiled production server
npm test             # Run backend API tests (single run)
npm run test:watch   # Run backend API tests in watch mode
npm run doctor       # Verify /health and /api/locations are responding
npm run reset        # Delete backend/weather.db (local SQLite database)
npm run db:generate  # Regenerate Drizzle migrations after schema changes
npm run db:migrate   # Apply pending Drizzle migrations
```

Dev server URL: `http://weather-starter.localhost:1355` (or fallback `http://127.0.0.1:<PORT>` — check terminal output).

## Invariants

**Snapshot pattern** — All weather data for a location is a single JSON blob written atomically on each refresh. There are no individual metric rows.

**Rate limiting** — Station endpoints (temperature, humidity, rainfall, wind) are fetched serially. HTTP 429 is retried up to 3× with 1s/2s/3s backoff.

**Windows TLS** — The dev script passes `--use-system-ca` to Node 24 to verify data.gov.sg's TLS cert against the Windows certificate store. Don't remove this flag.

## Progressive Disclosure

Read only what is needed for the current task:

- [Techstack](memory/agent-guides/techstack.md)
- [Data Schema](memory/agent-guides/data-schema.md)
- [Repository Structure](memory/agent-guides/repository-structure.md)
