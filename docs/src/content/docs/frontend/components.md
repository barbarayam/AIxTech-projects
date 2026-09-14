---
title: Components
description: What each UI component renders and the rules behind it.
sidebar:
  order: 3
---

All components are in `frontend/src/components/`. They read data through `useStore()` / `useSelectedLocation()` or receive a `WeatherSnapshot` as props.

## Shell

### `Layout`

A full-height flex row: `Sidebar` | `Hero`, with `ThemeSelector` fixed at the top right.

### `Sidebar`

A 22rem side panel containing:

- a **search** input that filters locations case-insensitively by `weather.area` or `weather.condition` (client-side only)
- `AddLocationForm`
- a scrollable list of `SidebarCard`s, with states for loading, no matches, and no locations

### `SidebarCard`

One location summary, selectable with a click, `Enter`, or `Space`.

- **Title:** `weather.area`, or `lat, lon` to three decimals.
- **Subtitle:** "My Location · Home" for `locations[0]`, otherwise the observed time, or "Not refreshed".
- **Body:** current temperature, condition, `H:` / `L:` from the forecast.
- **× button** calls `remove(id)`. It calls `stopPropagation()` so it doesn't also select the card, and shows a spinner while `deletingId` matches.

### `AddLocationForm`

Collapsed, it's an **Add Location** button. Expanded, it's a latitude/longitude form.

- **Use my location** (shown only when `navigator.geolocation` exists) fills in the fields from the browser's position (10 s timeout, 60 s maximum age). It doesn't submit. If the position is outside Singapore's bounds, it still fills the fields and shows a warning.
- Submitting calls `create()` and shows any server `detail` inline (for example the 409 duplicate or the 422 bounds message).

### `ThemeSelector`

A native `<select>` listing `THEMES`, bound to `useTheme()`.

## Dashboard (`Hero`)

With no selection, `Hero` shows "Select a location". Otherwise, from top to bottom:

1. **Header:** "Home" badge (for `locations[0]`), area, large temperature, condition, H/L, "Updated {time}".
2. **Valid period** text from the 2-hour forecast.
3. `HourlyStrip`
4. `TenDayForecast`
5. `MapCard`
6. `TileGrid`
7. **Footer:** the **Refresh** button (spins while `refreshingId` matches) and "Weather for {area} · {source}".

### `HourlyStrip`

One column per entry in `forecast_periods` (from the 24-hour forecast). The first column is always labelled **Now**. The others show the start of the period label with any four-digit year removed. The icon is a sun if the forecast text contains "fair", otherwise a cloud. With no periods, it shows "Forecast unavailable from this data source."

### `TenDayForecast`

Despite the name, it shows however many days `daily_forecast` has (data.gov.sg provides four). Each row has the weekday, low, a range bar, the high, and the outlook text. The bar is positioned against the lowest low and highest high of the whole period.

### `MapCard`

A Leaflet map of **all** saved locations, using CARTO Voyager raster tiles.

- **Pins** are custom `L.divIcon`s: a temperature pill above a dot, sky blue when selected. This avoids Leaflet's default marker images, which don't load correctly under Vite.
- **Framing:** a single location is centred at zoom 13. Multiple locations use `fitBounds` with 40 px padding and a maximum zoom of 14. The view is recalculated only when the set of location ids changes.
- **Card mode** turns off dragging and every kind of zoom, so the page scrolls normally. Clicking a pin selects that location (logs `map_pin_selected`). Clicking anywhere else, or the **Expand** button, opens fullscreen.
- **Fullscreen mode** renders `FullscreenMap` through `createPortal` into `document.body`, with full pan and zoom. Escape or **Close** exits, and page scroll is locked while it's open.

The map can't create locations. Adding still goes through `AddLocationForm`.

### `TileGrid`

A 2-column grid (4 columns on `lg`) of eight tiles. Wide tiles span two columns.

| Tile                | Width | Shows                                                               |
| ------------------- | ----- | ------------------------------------------------------------------- |
| `ConditionTile`     | 2     | Condition text with an icon and accent colour, area, valid period   |
| `AirQualityTile`    | 2     | 24-hour PSI, category, scale bar (0–300), PM2.5 and region          |
| `WindTile`          | 2     | Speed in km/h (knots × 1.852), direction in degrees, compass needle |
| `UVTile`            | 1     | UV index, category, scale bar (0–11)                                |
| `TemperatureTile`   | 1     | Nearest-station temperature                                         |
| `PrecipitationTile` | 1     | Rainfall in mm (1 decimal)                                          |
| `HumidityTile`      | 1     | Relative humidity %                                                 |
| `AveragesTile`      | 1     | "Forecast High": today's high from the 24-hour forecast             |

Category thresholds:

| PSI (24-hour) | Label          |     | UV index | Label     |
| ------------- | -------------- | --- | -------- | --------- |
| ≤ 50          | Good           |     | ≤ 2      | Low       |
| ≤ 100         | Moderate       |     | ≤ 5      | Moderate  |
| ≤ 200         | Unhealthy      |     | ≤ 7      | High      |
| ≤ 300         | Very Unhealthy |     | ≤ 10     | Very High |
| > 300         | Hazardous      |     | > 10     | Extreme   |

`conditionStyle()` in `ConditionTile` checks the condition text in this order and uses the first match:

| Text contains                 | Icon    | Accent  |
| ----------------------------- | ------- | ------- |
| `thunder`                     | Cloud   | Yellow  |
| `heavy rain`, `moderate rain` | Droplet | Sky 300 |
| `shower`, `rain`, `drizzle`   | Droplet | Sky 200 |
| `night`, `overcast`           | Moon    | Indigo  |
| `fair`, `sunny`, `hot`        | Sun     | Amber   |
| anything else                 | Cloud   | White   |

## Helpers

- `format.ts`: `formatTemperature()` rounds to `29°`, or shows `--°` when there's no value. `formatTime()` shows an ISO timestamp as a local time such as `5:30 PM`.
- `icons.tsx`: inline SVG icon components (`CloudIcon`, `SunIcon`, `MoonIcon`, `WindIcon`, `DropletIcon`, `RefreshIcon`, `ExpandIcon`, `CloseIcon`, and others). Each accepts a `className`.
