---
title: HTTP API
description: Endpoints, request payloads, response shapes, and status codes.
sidebar:
  order: 1
---

The server listens on `127.0.0.1`. All request and response bodies are JSON. Error responses always look like this:

```json
{ "detail": "Human-readable message" }
```

## Endpoint summary

| Method   | Path                                 | Success | Errors             | Calls data.gov.sg |
| -------- | ------------------------------------ | ------- | ------------------ | ----------------- |
| `GET`    | `/health`                            | 200     | —                  | No                |
| `GET`    | `/api/locations`                     | 200     | 500                | No                |
| `POST`   | `/api/locations`                     | 201     | 409, 422, 500      | Yes               |
| `GET`    | `/api/locations/:locationId`         | 200     | 404, 422, 500      | No                |
| `POST`   | `/api/locations/:locationId/refresh` | 200     | 404, 422, 502, 500 | Yes               |
| `DELETE` | `/api/locations/:locationId`         | 204     | 404, 422, 500      | No                |
| `POST`   | `/api/logs`                          | 204     | 422                | No                |

## `GET /health`

Liveness check. `npm run doctor` calls it.

```json
{ "status": "healthy" }
```

## `GET /api/locations`

Returns every saved location with its cached weather, **newest first** (ordered by `created_at` descending, then `id` descending).

```json
{
  "locations": [
    /* LocationRecord, ... */
  ]
}
```

## `POST /api/locations`

Creates a location, then fetches weather for it straight away.

```json
{ "latitude": 1.3508, "longitude": 103.839 }
```

Validation:

- Both values go through `Number()`, so numeric strings like `"1.35"` are accepted. `NaN` → **422** `latitude and longitude are required`.
- Coordinates must be within Singapore, bounds inclusive: latitude 1.1–1.5, longitude 103.6–104.1. Otherwise → **422** `Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)`.
- The exact same latitude/longitude pair already saved → **409** `Location already exists`.

Response is **201** with a `LocationRecord`. If the weather fetch throws a `WeatherProviderError`, the location is still created and returned with the default snapshot (`condition: "Not refreshed"`, `source: "not-refreshed"`).

```bash
curl -s -X POST http://127.0.0.1:3000/api/locations \
  -H "Content-Type: application/json" \
  -d '{"latitude": 1.35, "longitude": 103.85}'
```

## `GET /api/locations/:locationId`

Returns one `LocationRecord`.

- Non-numeric id → **422** `locationId must be a number`
- Unknown id → **404** `Location not found`

## `POST /api/locations/:locationId/refresh`

Fetches fresh weather from data.gov.sg, overwrites the stored snapshot, and returns the updated `LocationRecord` with **200**.

- Non-numeric id → **422**
- Unknown id → **404**
- `WeatherProviderError` → **502** with the provider message. In practice this only happens when the two-hour forecast payload is invalid; see [failure behaviour](/architecture/refresh-data-flow/#failure-behaviour).

```bash
curl -s -X POST http://127.0.0.1:3000/api/locations/1/refresh
```

## `DELETE /api/locations/:locationId`

Deletes a location. Returns **204** with no body.

- Non-numeric id → **422**
- Unknown id → **404**

## `POST /api/logs`

Receives interaction events from the frontend and writes them to the backend log.

```json
{ "event": "location_created", "metadata": { "locationId": 3 }, "page": "/" }
```

- `event` is required and must match `^[a-z][a-z0-9_.:-]{1,63}$`. Otherwise → **422** `event is required`.
- `metadata` is kept only if it's an object. `page` is kept only if it's a string.
- Success → **204**. The event is logged at `info` with `source: "frontend"`.

Events the frontend sends:

| Event                                                                       | Sent from         |
| --------------------------------------------------------------------------- | ----------------- |
| `location_form_opened`                                                      | Store `setAdding` |
| `location_create_submitted`, `location_created`, `location_create_failed`   | Store `create`    |
| `location_refresh_clicked`, `location_refreshed`, `location_refresh_failed` | Store `refresh`   |
| `location_delete_clicked`, `location_deleted`, `location_delete_failed`     | Store `remove`    |
| `theme_changed`                                                             | Theme provider    |
| `map_pin_selected`, `map_expanded`, `map_collapsed`                         | `MapCard`         |

## Data shapes

### `LocationRecord`

```json
{
  "id": 1,
  "latitude": 1.35,
  "longitude": 103.85,
  "created_at": "2026-09-14T09:30:00",
  "weather": {
    "condition": "Partly Cloudy (Day)",
    "observed_at": "2026-09-14T17:30:00+08:00",
    "source": "api-open.data.gov.sg",
    "area": "Bishan",
    "valid_period_text": "5.30 pm to 7.30 pm",
    "temperature_c": 29.4,
    "humidity_percent": 78,
    "rainfall_mm": 0,
    "wind_speed_knots": 5.2,
    "wind_direction_degrees": 160,
    "forecast_low_c": 25,
    "forecast_high_c": 33,
    "uv_index": 3,
    "psi_twenty_four_hourly": 42,
    "pm25_one_hourly": 9,
    "air_quality_region": "central",
    "forecast_periods": [
      { "label": "6 pm 14 Sep to 6 am 15 Sep", "forecast": "Partly Cloudy (Night)" }
    ],
    "daily_forecast": [
      {
        "date": "2026-09-15",
        "forecast": "Afternoon thundery showers",
        "temperature_low_c": 25,
        "temperature_high_c": 33
      }
    ]
  }
}
```

The values above are illustrative. `created_at` is UTC, formatted as `YYYY-MM-DDTHH:MM:SS` **without** a timezone suffix.

### `WeatherSnapshot` fields

| Field                    | Type             | Notes                                                       |
| ------------------------ | ---------------- | ----------------------------------------------------------- |
| `condition`              | `string \| null` | 2-hour forecast text for the nearest area                   |
| `observed_at`            | `string \| null` | Timestamp of the 2-hour forecast item                       |
| `source`                 | `string \| null` | `api-open.data.gov.sg`, or `not-refreshed`                  |
| `area`                   | `string \| null` | Nearest forecast area name                                  |
| `valid_period_text`      | `string \| null` | Validity window of the 2-hour forecast                      |
| `temperature_c`          | `number \| null` | °C, nearest station                                         |
| `humidity_percent`       | `number \| null` | %, nearest station                                          |
| `rainfall_mm`            | `number \| null` | mm, nearest station                                         |
| `wind_speed_knots`       | `number \| null` | knots, nearest station                                      |
| `wind_direction_degrees` | `number \| null` | degrees, nearest station                                    |
| `forecast_low_c`         | `number \| null` | 24-hour forecast low                                        |
| `forecast_high_c`        | `number \| null` | 24-hour forecast high                                       |
| `uv_index`               | `number \| null` | Latest nationwide UVI                                       |
| `psi_twenty_four_hourly` | `number \| null` | 24-hour PSI for the nearest region                          |
| `pm25_one_hourly`        | `number \| null` | 1-hour PM2.5 (µg/m³) for the nearest region                 |
| `air_quality_region`     | `string \| null` | `north`, `south`, `east`, `west`, or `central`              |
| `forecast_periods`       | `array`          | `{ label, forecast }` periods from the 24-hour forecast     |
| `daily_forecast`         | `array`          | `{ date, forecast, temperature_low_c, temperature_high_c }` |
