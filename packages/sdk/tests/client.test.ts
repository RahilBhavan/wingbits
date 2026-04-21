import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './setup';
import { WingbitsClient } from '../src/client';

const mockFlight = {
  id: 'abc123', icao24: 'a1b2c3', callsign: 'UAL123',
  registration: 'N12345', lat: 41.87, lon: -87.62,
  altitude: 35000, groundSpeed: 450, track: 270,
  verticalRate: 0, squawk: '1200', onGround: false,
  lastSeen: 1713600000, category: 'A3',
};

describe('WingbitsClient', () => {
  it('throws if apiKey is empty string', () => {
    expect(() => new WingbitsClient({ apiKey: '' })).toThrow('apiKey is required');
  });

  it('exposes flights and gps namespaces', () => {
    const client = new WingbitsClient({ apiKey: 'test-key' });
    expect(client.flights).toBeDefined();
    expect(client.gps).toBeDefined();
    expect(typeof client.flights.getFlight).toBe('function');
    expect(typeof client.gps.getJam).toBe('function');
  });

  it('uses custom baseUrl when provided', async () => {
    let capturedHost: string | null = null;
    server.use(
      http.get('https://custom.example.com/v1/flights/abc', ({ request }) => {
        capturedHost = new URL(request.url).hostname;
        return HttpResponse.json(mockFlight);
      }),
    );
    const client = new WingbitsClient({
      apiKey: 'test-key',
      baseUrl: 'https://custom.example.com',
    });
    await client.flights.getFlight('abc');
    expect(capturedHost).toBe('custom.example.com');
  });

  it('health() returns status from /health', async () => {
    server.use(
      http.get('https://customer-api.wingbits.com/health', () =>
        HttpResponse.json({ status: 'ok', version: '1.0', uptime: 9999, timestamp: 1000 }),
      ),
    );
    const client = new WingbitsClient({ apiKey: 'test-key' });
    const health = await client.health();
    expect(health.status).toBe('ok');
  });

  it('retries on 503 according to retry config', async () => {
    let callCount = 0;
    server.use(
      http.get('https://customer-api.wingbits.com/health', () => {
        callCount++;
        if (callCount < 3) return HttpResponse.json({}, { status: 503 });
        return HttpResponse.json({ status: 'ok', version: '1.0', uptime: 1, timestamp: 1 });
      }),
    );
    const client = new WingbitsClient({
      apiKey: 'test-key',
      retry: { maxAttempts: 3, baseDelayMs: 1 },
    });
    const health = await client.health();
    expect(health.status).toBe('ok');
    expect(callCount).toBe(3);
  });

  it('retries POST via wrapWithRetry on 503', async () => {
    const mockFlight2 = { ...mockFlight, id: 'xyz789' };
    let postCallCount = 0;
    server.use(
      http.post('https://customer-api.wingbits.com/v1/flights', () => {
        postCallCount++;
        if (postCallCount < 2) return HttpResponse.json({}, { status: 503 });
        return HttpResponse.json([[mockFlight2]]);
      }),
    );
    const client = new WingbitsClient({
      apiKey: 'test-key',
      retry: { maxAttempts: 3, baseDelayMs: 1 },
    });
    const results = await client.flights.queryFlightsBatch([
      { bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 } },
    ]);
    expect(results[0]?.[0]?.id).toBe('xyz789');
    expect(postCallCount).toBe(2);
  });
});
