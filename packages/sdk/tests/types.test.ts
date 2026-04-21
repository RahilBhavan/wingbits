import { describe, it, expect } from 'vitest';
import {
  FlightSchema,
  FlightPathSchema,
  AircraftDetailsSchema,
  GpsJamHexSchema,
  HealthSchema,
} from '../src/types';

describe('FlightSchema', () => {
  it('parses a valid flight object', () => {
    const raw = {
      id: 'abc123', icao24: 'a1b2c3', callsign: 'UAL123',
      registration: 'N12345', lat: 41.8781, lon: -87.6298,
      altitude: 35000, groundSpeed: 450, track: 270,
      verticalRate: 0, squawk: '1200', onGround: false,
      lastSeen: 1713600000, category: 'A3',
    };
    const result = FlightSchema.parse(raw);
    expect(result.icao24).toBe('a1b2c3');
    expect(result.onGround).toBe(false);
  });

  it('allows null callsign and registration', () => {
    const raw = {
      id: 'xyz', icao24: 'ff0011', callsign: null,
      registration: null, lat: 0, lon: 0, altitude: 0,
      groundSpeed: 0, track: 0, verticalRate: 0,
      squawk: null, onGround: true, lastSeen: 0, category: null,
    };
    expect(() => FlightSchema.parse(raw)).not.toThrow();
  });
});

describe('FlightPathSchema', () => {
  it('parses a path with multiple points', () => {
    const raw = {
      id: 'abc123', icao24: 'a1b2c3',
      points: [
        { lat: 41.0, lon: -87.0, altitude: 10000, timestamp: 1000 },
        { lat: 41.1, lon: -87.1, altitude: 11000, timestamp: 2000 },
      ],
    };
    const result = FlightPathSchema.parse(raw);
    expect(result.points).toHaveLength(2);
  });
});

describe('GpsJamHexSchema', () => {
  it('rejects jammingLevel above 1', () => {
    expect(() =>
      GpsJamHexSchema.parse({ h3Index: '8928308280fffff', jammingLevel: 1.5, timestamp: 1000 })
    ).toThrow();
  });

  it('accepts valid jammingLevel', () => {
    expect(() =>
      GpsJamHexSchema.parse({ h3Index: '8928308280fffff', jammingLevel: 0.8, timestamp: 1000 })
    ).not.toThrow();
  });
});

describe('HealthSchema', () => {
  it('parses health response', () => {
    const raw = { status: 'ok', version: '1.2.3', uptime: 99999, timestamp: 1713600000 };
    const result = HealthSchema.parse(raw);
    expect(result.status).toBe('ok');
  });
});

describe('AircraftDetailsSchema', () => {
  it('allows all nullable fields', () => {
    const raw = {
      icao24: 'a1b2c3', registration: null, manufacturer: null,
      model: null, typecode: null, serialNumber: null,
      lineNumber: null, icaoAircraftClass: null, operatorIata: null,
      owner: null, built: null, engines: null,
    };
    expect(() => AircraftDetailsSchema.parse(raw)).not.toThrow();
  });
});
