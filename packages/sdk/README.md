# wingbits-sdk

Community TypeScript SDK for the [Wingbits Customer API](https://customer-api.wingbits.com/docs/) — the decentralized ADS-B flight tracking network built on Solana.

[![CI](https://github.com/RahilBhavan/wingbits-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/RahilBhavan/wingbits-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/wingbits-sdk)](https://www.npmjs.com/package/wingbits-sdk)

## Installation

```bash
bun add wingbits-sdk
# or: npm install wingbits-sdk
```

## Quick Start

```typescript
import { WingbitsClient } from 'wingbits-sdk';

const client = new WingbitsClient({
  apiKey: process.env.WINGBITS_API_KEY!,
});

// All flights currently over Chicago
const flights = await client.flights.getFlights({
  bbox: { minLat: 41.6, maxLat: 42.1, minLon: -88.0, maxLon: -87.2 },
});
console.log(`Tracking ${flights.length} aircraft`);
```

## Authentication

Get your API key from the [Wingbits Dashboard](https://wingbits.com/pricing). Pass it as `apiKey`. Never hardcode it — use an environment variable or secret manager.

## API Reference

### `client.flights`

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getFlights(params)` | `GetFlightsParams` | `Flight[]` | Aircraft in a bounding box or radius |
| `queryFlightsBatch(queries)` | `GetFlightsParams[]` | `Flight[][]` | Batch multiple geographic queries in one POST |
| `getFlight(id)` | `string` | `Flight` | Single flight by ID |
| `getFlightPath(id)` | `string` | `FlightPath` | Historical trajectory with altitude + timestamps |
| `searchFlights(params)` | `SearchFlightsParams` | `Flight[]` | Search by callsign, ICAO hex, or registration |
| `getAircraftDetails(icao24)` | `string` | `AircraftDetails` | Full aircraft metadata (manufacturer, model, owner) |

### `client.gps`

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getJam(params)` | `GetGpsJamParams` | `GpsJamHex[]` | GPS jamming hexagons in a bounding box |

### `client.health()`

Returns `Health` — server `status`, `version`, `uptime`, and `timestamp`.

### Utilities (exported)

- `RateLimiter` — client-side request pacing
- `withRetry` — exponential backoff for retryable API errors

## Usage Examples

```typescript
// Search for a specific flight by callsign
const results = await client.flights.searchFlights({ callsign: 'UAL123' });

// Full historical trajectory
const path = await client.flights.getFlightPath('flight-id-here');
console.log(`${path.points.length} position points`);
path.points.forEach(p => console.log(`  ${p.lat}, ${p.lon} @ ${p.altitude}ft`));

// Aircraft details
const aircraft = await client.flights.getAircraftDetails('a1b2c3');
console.log(`${aircraft.manufacturer} ${aircraft.model} (${aircraft.registration})`);

// Batch query — two regions in one network call
const [chicago, london] = await client.flights.queryFlightsBatch([
  { bbox: { minLat: 41.6, maxLat: 42.1, minLon: -88.0, maxLon: -87.2 } },
  { bbox: { minLat: 51.3, maxLat: 51.7, minLon: -0.5, maxLon: 0.2 } },
]);
console.log(`Chicago: ${chicago.length}, London: ${london.length}`);

// GPS jamming data (H3 hex index + jamming level 0–1)
const jamData = await client.gps.getJam({
  bbox: { minLat: 41.6, maxLat: 42.1, minLon: -88.0, maxLon: -87.2 },
});
const jammed = jamData.filter(h => h.jammingLevel > 0.5);
console.log(`${jammed.length} hexagons with significant GPS interference`);
```

## Error Handling

```typescript
import { WingbitsApiError, WingbitsNetworkError } from 'wingbits-sdk';

try {
  const flight = await client.flights.getFlight('unknown-id');
} catch (error) {
  if (error instanceof WingbitsApiError) {
    console.error(`API ${error.statusCode}: ${error.message}`);
    if (error.code) console.error(`Code: ${error.code}`);
  } else if (error instanceof WingbitsNetworkError) {
    console.error('Network error:', error.message);
  }
}
```

## Configuration

```typescript
const client = new WingbitsClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://...',
  retry: {
    maxAttempts: 3,
    baseDelayMs: 500,
  },
});
```

**Automatic retry** on: `429`, `500`, `502`, `503`, `504`.

## TypeScript Types

```typescript
import type {
  Flight, FlightPath, FlightPathPoint,
  AircraftDetails, GpsJamHex, Health,
  BoundingBox, RadiusQuery,
  GetFlightsParams, SearchFlightsParams, GetGpsJamParams,
} from 'wingbits-sdk';
```

## Links

- [Wingbits](https://wingbits.com/)
- [Customer API Reference](https://customer-api.wingbits.com/docs/)
- [Developer Docs](https://wingbits.gitbook.io/developers)
- [Get API Key](https://wingbits.com/pricing)

## License

MIT
