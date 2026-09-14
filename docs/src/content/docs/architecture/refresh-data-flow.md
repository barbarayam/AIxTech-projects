---
title: Refresh data flow
description: How creating or refreshing a location fans out to data.gov.sg and lands in SQLite.
sidebar:
  order: 2
---

Weather is fetched from data.gov.sg in exactly two situations:

1. `POST /api/locations`: right after a new location row is inserted.
2. `POST /api/locations/:id/refresh`: when the user clicks **Refresh**.

Every other read comes from SQLite.

## Refresh sequence

```mermaid
sequenceDiagram
  actor User
  participant Hero as Hero.tsx
  participant Store as StoreProvider
  participant Api as api.ts
  participant Router as Locations router
  participant Db as db.ts
  participant Client as SingaporeWeatherClient
  participant Gov as data.gov.sg

  User->>Hero: Click Refresh
  Hero->>Store: refresh(id)
  Note over Store: refreshingId = id (spinner)
  Store->>Api: refreshLocation(id)
  Api->>Router: POST /api/locations/:id/refresh
  Router->>Db: getLocation(id)
  alt id not a number
    Router-->>Api: 422
  else location missing
    Router-->>Api: 404
  end
  Router->>Client: getCurrentWeather(lat, lon)
  Client->>Gov: 11 requests (parallel groups + serial station reads)
  Gov-->>Client: JSON payloads
  Client-->>Router: WeatherSnapshot
  Router->>Db: updateWeather(id, snapshot)
  Db-->>Router: LocationRecord
  Router-->>Api: 200 LocationRecord
  Store->>Api: listLocations()
  Api->>Router: GET /api/locations
  Router-->>Store: locations[]
  Note over Store: refreshingId = null, UI re-renders
```

The store ignores the refresh response body and reloads the whole list, so every card and the map stay consistent.

## Create sequence

```mermaid
sequenceDiagram
  participant Form as AddLocationForm
  participant Store as StoreProvider
  participant Router as Locations router
  participant Db as db.ts
  participant Client as SingaporeWeatherClient

  Form->>Store: create({ latitude, longitude })
  Store->>Router: POST /api/locations
  Router->>Router: validate numbers + Singapore bounds
  Router->>Db: createLocation(lat, lon)
  alt exact duplicate coordinates
    Db-->>Router: DuplicateLocationError
    Router-->>Store: 409
  end
  Db-->>Router: row with default snapshot "Not refreshed"
  Router->>Client: getCurrentWeather(lat, lon)
  alt WeatherProviderError
    Router-->>Store: 201 with unrefreshed location
  else success
    Router->>Db: updateWeather(id, snapshot)
    Router-->>Store: 201 with refreshed location
  end
  Store->>Router: GET /api/locations
  Note over Store: select created id, close form
```

## Upstream fan-out

`SingaporeWeatherClient.getCurrentWeather()` runs six groups at once with `Promise.all`. The five station endpoints run **one after another** inside their group to avoid HTTP 429 on the unauthenticated tier.

```mermaid
flowchart TD
  Start["getCurrentWeather(lat, lon)"] --> All{{"Promise.all"}}

  All --> Two["v2 two-hr-forecast"]
  All --> TwentyFour["v2 twenty-four-hr-forecast"]
  All --> FourDay["v1 4-day-weather-forecast"]
  All --> Uv["v2 uv"]
  All --> Aq["fetchAirQuality"]
  Aq --> Psi["v2 psi"]
  Aq --> Pm["v2 pm25"]
  All --> Seq["fetchStationReadingsSequential"]

  subgraph Serial["Serial station reads"]
    direction TB
    T["air-temperature"] --> H["relative-humidity"] --> R["rainfall"] --> WS["wind-speed"] --> WD["wind-direction"]
  end
  Seq --> T

  Two --> Merge["Merge into WeatherSnapshot"]
  TwentyFour --> Merge
  FourDay --> Merge
  Uv --> Merge
  Psi --> Merge
  Pm --> Merge
  WD --> Merge
  Merge --> Update["updateWeather(id, snapshot)<br/>single UPDATE on locations row"]
```

### Field mapping

| Snapshot field(s)                                                 | Endpoint                                | Selection                                                                                |
| ----------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `condition`, `area`, `valid_period_text`, `observed_at`, `source` | `two-hr-forecast`                       | Nearest `area_metadata` label; falls back to the first forecast entry.                   |
| `forecast_low_c`, `forecast_high_c`                               | `twenty-four-hr-forecast`               | National `general.temperature` low/high.                                                 |
| `forecast_periods[]`                                              | `twenty-four-hr-forecast`               | Per period, the text for the nearest of five built-in regions (falls back to `central`). |
| `daily_forecast[]`                                                | `v1/environment/4-day-weather-forecast` | All days in the latest item.                                                             |
| `uv_index`                                                        | `uv`                                    | First (latest) hourly index value, nationwide.                                           |
| `psi_twenty_four_hourly`, `pm25_one_hourly`, `air_quality_region` | `psi`, `pm25`                           | Nearest region from the PSI response's `regionMetadata`.                                 |
| `temperature_c`                                                   | `air-temperature`                       | Nearest station that has a numeric reading.                                              |
| `humidity_percent`                                                | `relative-humidity`                     | Nearest station with a reading.                                                          |
| `rainfall_mm`                                                     | `rainfall`                              | Nearest station with a reading.                                                          |
| `wind_speed_knots`                                                | `wind-speed`                            | Nearest station with a reading. Stored in knots, shown in km/h.                          |
| `wind_direction_degrees`                                          | `wind-direction`                        | Nearest station with a reading.                                                          |

"Nearest" means the smallest squared difference in latitude and longitude, in degrees. That's accurate enough for comparisons across a city the size of Singapore.

## Retries and timeouts

Every request goes through the private `fetchJson()`:

```mermaid
flowchart TD
  Fetch["fetch(url)<br/>8 s AbortController timeout"] --> Ok{"response.ok?"}
  Ok -- yes --> Json["return parsed JSON"]
  Ok -- no --> Is429{"HTTP 429?"}
  Is429 -- "yes, attempt ≤ 3" --> Wait["wait attempt × 1 s<br/>(1 s, 2 s, 3 s)"] --> Fetch
  Is429 -- "yes, attempt 4" --> RateErr["WeatherProviderError<br/>rate limit reached"]
  Is429 -- no --> Auth{"401 or 403?"}
  Auth -- yes --> KeyErr["WeatherProviderError<br/>check API key"]
  Auth -- no --> HttpErr["WeatherProviderError<br/>HTTP status"]
  Fetch -. "network error / timeout" .-> NetErr["WeatherProviderError<br/>Unable to reach weather provider"]
```

Requests send `Accept: application/json`, a `User-Agent` of `weather-starter/0.1 (educational project)`, and `x-api-key` when `WEATHER_API_KEY` is set.

## Failure behaviour

Each fan-out group has its own `.catch()`, so one failing endpoint doesn't break the refresh. Its fields just come back empty.

| What fails                                                                  | Result                                                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Any station, UV, air-quality, 24-hour, or 4-day request                     | Those fields become `null` (or `[]`). The refresh still returns `200`.                                                           |
| The `two-hr-forecast` request itself                                        | Snapshot base becomes `condition: "Unavailable"` with no area. Still `200`.                                                      |
| `two-hr-forecast` returns a non-zero `code`, no items, or no area forecasts | `snapshotFromPayload()` throws `WeatherProviderError`. Refresh returns **502**. Create returns **201** with the unrefreshed row. |
| SQLite or other unexpected error                                            | Passed to Express's error handler, which returns **500**.                                                                        |
