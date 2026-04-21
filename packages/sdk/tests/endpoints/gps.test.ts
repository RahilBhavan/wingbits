import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { GpsEndpoint } from '../../src/endpoints/gps';
import { createHttpClient } from '../../src/utils/http';

const BASE_URL = 'https://customer-api.wingbits.com';
const client = createHttpClient({ apiKey: 'test-key', baseUrl: BASE_URL });

describe('GpsEndpoint.getJam', () => {
  it('returns GPS jam hexagons for a bounding box', async () => {
    const mockHexes = [
      { h3Index: '8928308280fffff', jammingLevel: 0.8, timestamp: 1713600000 },
      { h3Index: '8928308281fffff', jammingLevel: 0.2, timestamp: 1713600000 },
    ];
    server.use(
      http.get(`${BASE_URL}/v1/gps/jam`, () => HttpResponse.json(mockHexes)),
    );
    const gps = new GpsEndpoint(client);
    const result = await gps.getJam({
      bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 },
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.jammingLevel).toBe(0.8);
  });

  it('sends bbox as query params', async () => {
    let capturedParams: URLSearchParams | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/gps/jam`, ({ request }) => {
        capturedParams = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    const gps = new GpsEndpoint(client);
    await gps.getJam({ bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 } });
    expect(capturedParams?.get('minLat')).toBe('40');
    expect(capturedParams?.get('maxLon')).toBe('-86');
  });
});
