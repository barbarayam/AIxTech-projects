import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeatherSnapshot } from '../weather.js';

const weather: WeatherSnapshot = {
  condition: 'Cloudy',
  observed_at: '2026-05-04T00:00:00Z',
  source: 'test',
  area: 'Bishan',
  valid_period_text: 'Now',
  temperature_c: 29,
  humidity_percent: 80,
  rainfall_mm: 0,
  wind_speed_knots: 4,
  wind_direction_degrees: 180,
  forecast_low_c: 25,
  forecast_high_c: 32,
  uv_index: 7,
  psi_twenty_four_hourly: 42,
  pm25_one_hourly: 9,
  air_quality_region: 'central',
  forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
  daily_forecast: [
    { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
  ],
};

const updatedWeather: WeatherSnapshot = {
  ...weather,
  condition: 'Sunny',
  temperature_c: 33,
  area: 'Ang Mo Kio',
};

describe('GET /health', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    const { createApp } = await import('../server.js');
    app = await createApp({ serveFrontend: false, enableRequestLogging: false });
  });

  afterAll(async () => {
    // node:sqlite holds WAL files open on Windows; ignore EBUSY on cleanup
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('returns healthy status', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });
});

describe('POST /api/logs', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    const { createApp } = await import('../server.js');
    app = await createApp({ serveFrontend: false, enableRequestLogging: false });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('returns 204 for a valid event', async () => {
    await request(app)
      .post('/api/logs')
      .send({ event: 'location.added', metadata: { id: 1 } })
      .expect(204);
  });

  it('returns 422 when event is missing', async () => {
    const response = await request(app).post('/api/logs').send({}).expect(422);
    expect(response.body.detail).toBeDefined();
  });

  it('returns 422 when event fails the allowlist pattern', async () => {
    const response = await request(app)
      .post('/api/logs')
      .send({ event: 'INVALID EVENT!' })
      .expect(422);
    expect(response.body.detail).toBeDefined();
  });

  it('accepts events without metadata', async () => {
    await request(app).post('/api/logs').send({ event: 'page.viewed' }).expect(204);
  });
});

describe('locations API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;
  const getCurrentWeather = vi.fn(async () => weather);

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: { getCurrentWeather },
    });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  beforeEach(() => {
    getCurrentWeather.mockResolvedValue(weather);
  });

  // ------------------------------------------------------------------ create
  describe('POST /api/locations', () => {
    it('creates a location and immediately fetches weather', async () => {
      const response = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.35, longitude: 103.85 })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        latitude: 1.35,
        longitude: 103.85,
        weather: { condition: 'Cloudy', area: 'Bishan', temperature_c: 29 },
      });
    });

    it('returns 422 when coordinates are missing', async () => {
      const response = await request(app).post('/api/locations').send({}).expect(422);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 422 when coordinates are non-numeric', async () => {
      const response = await request(app)
        .post('/api/locations')
        .send({ latitude: 'abc', longitude: 103.85 })
        .expect(422);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 422 when coordinates are outside Singapore bounds', async () => {
      const response = await request(app)
        .post('/api/locations')
        .send({ latitude: 35.0, longitude: 139.0 })
        .expect(422);
      expect(response.body.detail).toMatch(/Singapore/i);
    });

    it('returns 409 when the same coordinate is added twice', async () => {
      await request(app)
        .post('/api/locations')
        .send({ latitude: 1.36, longitude: 103.86 })
        .expect(201);

      const response = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.36, longitude: 103.86 })
        .expect(409);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 201 with unrefreshed data when weather fetch fails', async () => {
      const { WeatherProviderError } = await import('../weather.js');
      getCurrentWeather.mockRejectedValueOnce(new WeatherProviderError('API down'));

      const response = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.37, longitude: 103.87 })
        .expect(201);

      // Location is created even if weather fetch fails
      expect(response.body).toMatchObject({ latitude: 1.37, longitude: 103.87 });
      expect(response.body.weather.condition).toBe('Not refreshed');
    });
  });

  // -------------------------------------------------------------------- list
  describe('GET /api/locations', () => {
    it('returns all saved locations with weather', async () => {
      const response = await request(app).get('/api/locations').expect(200);
      expect(response.body.locations).toBeInstanceOf(Array);
      expect(response.body.locations.length).toBeGreaterThan(0);
      expect(response.body.locations[0]).toMatchObject({
        id: expect.any(Number),
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        weather: expect.any(Object),
      });
    });
  });

  // ----------------------------------------------------------------- get one
  describe('GET /api/locations/:id', () => {
    it('returns a single location by id', async () => {
      const create = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.38, longitude: 103.88 })
        .expect(201);

      const { id } = create.body as { id: number };
      const response = await request(app).get(`/api/locations/${id}`).expect(200);
      expect(response.body).toMatchObject({ id, latitude: 1.38, longitude: 103.88 });
    });

    it('returns 404 for a non-existent id', async () => {
      const response = await request(app).get('/api/locations/99999').expect(404);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 422 for a non-numeric id', async () => {
      const response = await request(app).get('/api/locations/abc').expect(422);
      expect(response.body.detail).toBeDefined();
    });
  });

  // --------------------------------------------------------------- refresh
  describe('POST /api/locations/:id/refresh', () => {
    it('fetches fresh weather and updates the stored snapshot', async () => {
      const create = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.39, longitude: 103.89 })
        .expect(201);

      const { id } = create.body as { id: number };

      getCurrentWeather.mockResolvedValueOnce(updatedWeather);

      const response = await request(app)
        .post(`/api/locations/${id}/refresh`)
        .expect(200);

      expect(response.body).toMatchObject({
        id,
        weather: { condition: 'Sunny', temperature_c: 33, area: 'Ang Mo Kio' },
      });
    });

    it('returns 404 for a non-existent id', async () => {
      const response = await request(app)
        .post('/api/locations/99999/refresh')
        .expect(404);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 422 for a non-numeric id', async () => {
      const response = await request(app).post('/api/locations/abc/refresh').expect(422);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 502 when the weather provider fails', async () => {
      const create = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.4, longitude: 103.9 })
        .expect(201);

      const { id } = create.body as { id: number };
      const { WeatherProviderError } = await import('../weather.js');
      getCurrentWeather.mockRejectedValueOnce(new WeatherProviderError('Rate limited'));

      const response = await request(app)
        .post(`/api/locations/${id}/refresh`)
        .expect(502);
      expect(response.body.detail).toBeDefined();
    });
  });

  // --------------------------------------------------------------- delete
  describe('DELETE /api/locations/:id', () => {
    it('deletes an existing location and returns 204', async () => {
      const create = await request(app)
        .post('/api/locations')
        .send({ latitude: 1.41, longitude: 103.91 })
        .expect(201);

      const { id } = create.body as { id: number };

      await request(app).delete(`/api/locations/${id}`).expect(204);

      // Confirm it's gone
      await request(app).get(`/api/locations/${id}`).expect(404);
    });

    it('returns 404 when deleting a non-existent location', async () => {
      const response = await request(app).delete('/api/locations/99999').expect(404);
      expect(response.body.detail).toBeDefined();
    });

    it('returns 422 for a non-numeric id', async () => {
      const response = await request(app).delete('/api/locations/abc').expect(422);
      expect(response.body.detail).toBeDefined();
    });
  });
});
