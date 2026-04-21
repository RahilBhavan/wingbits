import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { FlightsEndpoint } from '../../src/endpoints/flights';
import { createHttpClient } from '../../src/utils/http';
import { WingbitsApiError } from '../../src/errors';

const BASE_URL = 'https://customer-api.wingbits.com';
const client = createHttpClient({ apiKey: 'test-key', baseUrl: BASE_URL });

const mockFlight = {
  id: 'abc123', icao24: 'a1b2c3', callsign: 'UAL123',
  registration: 'N12345', lat: 41.87, lon: -87.62,
  altitude: 35000, groundSpeed: 450, track: 270,
  verticalRate: 0, squawk: '1200', onGround: false,
  lastSeen: 1713600000, category: 'A3',
};

describe('FlightsEndpoint.getFlights', () => {
  it('returns array of flights for bbox query', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights`, () => HttpResponse.json([mockFlight])),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.getFlights({
      bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.icao24).toBe('a1b2c3');
  });

  it('sends bbox as individual query params', async () => {
    let params: URLSearchParams | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    const flights = new FlightsEndpoint(client);
    await flights.getFlights({ bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 } });
    expect(params?.get('minLat')).toBe('40');
    expect(params?.get('maxLon')).toBe('-86');
  });
});

describe('FlightsEndpoint.getFlight', () => {
  it('returns a single flight by id', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/abc123`, () => HttpResponse.json(mockFlight)),
    );
    const result = await new FlightsEndpoint(client).getFlight('abc123');
    expect(result.id).toBe('abc123');
  });

  it('throws WingbitsApiError for unknown id', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/nope`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    await expect(new FlightsEndpoint(client).getFlight('nope')).rejects.toBeInstanceOf(WingbitsApiError);
  });
});

describe('FlightsEndpoint.getFlightPath', () => {
  it('returns flight path with points', async () => {
    const mockPath = {
      id: 'abc123', icao24: 'a1b2c3',
      points: [
        { lat: 41.0, lon: -87.0, altitude: 10000, timestamp: 1000 },
        { lat: 41.1, lon: -87.1, altitude: 11000, timestamp: 2000 },
      ],
    };
    server.use(
      http.get(`${BASE_URL}/v1/flights/abc123/path`, () => HttpResponse.json(mockPath)),
    );
    const result = await new FlightsEndpoint(client).getFlightPath('abc123');
    expect(result.points).toHaveLength(2);
    expect(result.points[0]?.altitude).toBe(10000);
  });
});

describe('FlightsEndpoint.searchFlights', () => {
  it('sends callsign as query param', async () => {
    let callsign: string | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights/search`, ({ request }) => {
        callsign = new URL(request.url).searchParams.get('callsign');
        return HttpResponse.json([mockFlight]);
      }),
    );
    const result = await new FlightsEndpoint(client).searchFlights({ callsign: 'UAL123' });
    expect(callsign).toBe('UAL123');
    expect(result).toHaveLength(1);
  });
});

describe('FlightsEndpoint.getAircraftDetails', () => {
  it('returns aircraft metadata', async () => {
    const mockDetails = {
      icao24: 'a1b2c3', registration: 'N12345',
      manufacturer: 'Boeing', model: '737-800',
      typecode: 'B738', serialNumber: null, lineNumber: null,
      icaoAircraftClass: 'L2J', operatorIata: 'UA',
      owner: 'United Airlines', built: '2010', engines: 'CFM56',
    };
    server.use(
      http.get(`${BASE_URL}/v1/flights/details/a1b2c3`, () => HttpResponse.json(mockDetails)),
    );
    const result = await new FlightsEndpoint(client).getAircraftDetails('a1b2c3');
    expect(result.manufacturer).toBe('Boeing');
  });
});

describe('FlightsEndpoint.queryFlightsBatch', () => {
  it('sends POST with array of queries and returns nested results', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${BASE_URL}/v1/flights`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json([[mockFlight], [mockFlight]]);
      }),
    );
    const result = await new FlightsEndpoint(client).queryFlightsBatch([
      { bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 } },
      { bbox: { minLat: 50, maxLat: 52, minLon: 10, maxLon: 12 } },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1);
  });
});

describe('FlightsEndpoint.getFlights radius params', () => {
  it('sends radius query params when radius is provided', async () => {
    let params: URLSearchParams | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    const flights = new FlightsEndpoint(client);
    await flights.getFlights({ radius: { lat: 41.87, lon: -87.62, radius: 50 } });
    expect(params?.get('lat')).toBe('41.87');
    expect(params?.get('lon')).toBe('-87.62');
    expect(params?.get('radius')).toBe('50');
    expect(params?.get('radiusUnit')).toBe('km');
  });

  it('uses provided radiusUnit instead of default', async () => {
    let params: URLSearchParams | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    const flights = new FlightsEndpoint(client);
    await flights.getFlights({ radius: { lat: 41.87, lon: -87.62, radius: 30, radiusUnit: 'mi' } });
    expect(params?.get('radiusUnit')).toBe('mi');
  });
});
