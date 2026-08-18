# Data Schema

## Database (SQLite via Drizzle)

Schema is defined in `backend/src/schema.ts`. Migrations live in `backend/drizzle/`.

- **`locations`** — saved coordinates (`id`, `latitude`, `longitude`)
- **`weather`** (or similar) — one snapshot row per location, overwritten on each refresh (`location_id` FK, JSON blob, timestamp)

Run `npm run db:generate` after changing `schema.ts`, then `npm run db:migrate` to apply.

## Snapshot shape (`WeatherSnapshot`)

Defined in `frontend/src/types.ts`. One object per location, written atomically on refresh:

| Field | Source endpoint | Notes |
|---|---|---|
| `condition` | `two-hr-forecast` | Forecast text for nearest area |
| `area` | `two-hr-forecast` | Area name |
| `valid_period_text` | `two-hr-forecast` | e.g. "6pm to 8pm" |
| `temperature_c` | `air-temperature` | Nearest station |
| `humidity_percent` | `relative-humidity` | Nearest station |
| `rainfall_mm` | `rainfall` | Nearest station |
| `wind_speed_knots` | `wind-speed` | Nearest station |
| `wind_direction_degrees` | `wind-direction` | Nearest station |
| `uv_index` | `uv` | Nationwide, 7am–7pm only |
| `psi_twenty_four_hourly` | `psi` | Nearest region |
| `pm25_one_hourly` | `pm25` | Nearest region |
| `forecast_low_c` / `forecast_high_c` | `twenty-four-hr-forecast` | Today's temps |
| `forecast_periods` | `twenty-four-hr-forecast` | 6-hourly condition periods |
| `daily_forecast[]` | `4-day-weather-forecast` | 4-day outlook |

## data.gov.sg API

Base URL: `https://api-open.data.gov.sg` (v2) · `https://api.data.gov.sg` (v1, used for 4-day forecast)

All endpoints are free. An optional `x-api-key` header (from `WEATHER_API_KEY` in `.env`) raises rate limits.

Station endpoints are fetched **serially**; all others run in **parallel**. Region-based endpoints (PSI, PM2.5) select the nearest region by Euclidean distance from the saved coordinates.

## Refresh data flow

```
POST /api/locations/:id/refresh
  → SingaporeWeatherClient.getCurrentWeather(lat, lon)
  → fans out to 10 endpoints (serial + parallel, see above)
  → aggregates into WeatherSnapshot
  → updateWeather(id, snapshot) → SQLite
  → returns LocationRecord (location + snapshot)
  → frontend store: setWeather(id, snapshot) → UI re-renders
```
