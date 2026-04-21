import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { createHttpClient } from '../../src/utils/http';
import { WingbitsApiError, WingbitsNetworkError } from '../../src/errors';

const BASE_URL = 'https://customer-api.wingbits.com';

describe('createHttpClient', () => {
  it('injects x-api-key header on every request', async () => {
    let capturedApiKey: string | null = null;
    server.use(
      http.get(`${BASE_URL}/health`, ({ request }) => {
        capturedApiKey = request.headers.get('x-api-key');
        return HttpResponse.json({ status: 'ok', version: '1.0', uptime: 100, timestamp: 1000 });
      }),
    );
    const client = createHttpClient({ apiKey: 'test-key-123', baseUrl: BASE_URL });
    await client.get('/health');
    expect(capturedApiKey).toBe('test-key-123');
  });

  it('returns parsed JSON on 2xx', async () => {
    server.use(
      http.get(`${BASE_URL}/health`, () =>
        HttpResponse.json({ status: 'ok', version: '1.0', uptime: 100, timestamp: 1000 }),
      ),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    const data = await client.get('/health');
    expect(data).toMatchObject({ status: 'ok' });
  });

  it('throws WingbitsApiError on 4xx', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/999`, () =>
        HttpResponse.json({ message: 'Not found', code: 'FLIGHT_NOT_FOUND' }, { status: 404 }),
      ),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await expect(client.get('/v1/flights/999')).rejects.toBeInstanceOf(WingbitsApiError);
    await expect(client.get('/v1/flights/999')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws WingbitsApiError on 5xx', async () => {
    server.use(
      http.get(`${BASE_URL}/health`, () =>
        HttpResponse.json({ message: 'Internal error' }, { status: 500 }),
      ),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await expect(client.get('/health')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('sends POST body as JSON', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${BASE_URL}/v1/flights`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json([]);
      }),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await client.post('/v1/flights', { queries: [{ minLat: 40, maxLat: 42 }] });
    expect(capturedBody).toEqual({ queries: [{ minLat: 40, maxLat: 42 }] });
  });

  it('serializes query params to the URL', async () => {
    let capturedUrl: URL | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights/search`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await client.get('/v1/flights/search', { callsign: 'UAL123' });
    expect(capturedUrl?.searchParams.get('callsign')).toBe('UAL123');
  });

  it('omits undefined and null query params', async () => {
    let capturedUrl: URL | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights/search`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await client.get('/v1/flights/search', { callsign: 'UAL123', registration: undefined });
    expect(capturedUrl?.searchParams.has('registration')).toBe(false);
  });

  it('appends array values as repeated query params', async () => {
    let capturedUrl: URL | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await client.get('/v1/flights', { categories: ['A1', 'A2', 'A3'] });
    expect(capturedUrl?.searchParams.getAll('categories')).toEqual(['A1', 'A2', 'A3']);
  });

  it('throws WingbitsNetworkError when GET fetch fails with a network error', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/network-fail-get`, () => HttpResponse.error()),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await expect(client.get('/v1/network-fail-get')).rejects.toBeInstanceOf(WingbitsNetworkError);
  });

  it('throws WingbitsNetworkError when POST fetch fails with a network error', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/network-fail-post`, () => HttpResponse.error()),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await expect(client.post('/v1/network-fail-post', {})).rejects.toBeInstanceOf(WingbitsNetworkError);
  });

  it('throws WingbitsApiError (not wrapped) when GET response is 4xx', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/bad`, () =>
        HttpResponse.json({ message: 'Bad request' }, { status: 400 }),
      ),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    const err = await client.get('/v1/flights/bad').catch((e) => e);
    expect(err).toBeInstanceOf(WingbitsApiError);
    expect(err.statusCode).toBe(400);
  });

  it('throws WingbitsApiError (not wrapped) when POST response is 4xx', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/flights/bad`, () =>
        HttpResponse.json({ message: 'Validation error' }, { status: 422 }),
      ),
    );
    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    const err = await client.post('/v1/flights/bad', {}).catch((e) => e);
    expect(err).toBeInstanceOf(WingbitsApiError);
    expect(err.statusCode).toBe(422);
  });
});
