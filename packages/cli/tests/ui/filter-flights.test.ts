import { describe, expect, it } from 'vitest';
import type { Flight } from 'wingbits-sdk';
import { filterFlightsBySubstring } from '../../src/ui/tui/filter-flights.js';

const base = (over: Partial<Flight>): Flight => ({
  id: '1',
  icao24: 'abc123',
  callsign: 'TEST1',
  registration: 'N111',
  lat: 0,
  lon: 0,
  altitude: 1000,
  groundSpeed: 100,
  track: 90,
  verticalRate: 0,
  squawk: null,
  onGround: false,
  lastSeen: 0,
  category: null,
  ...over,
});

describe('filterFlightsBySubstring', () => {
  const flights = [
    base({ id: '1', callsign: 'AAA', icao24: 'aaaaaa' }),
    base({ id: '2', callsign: 'BBB', icao24: 'bbbbbb', registration: 'G-TEST' }),
  ];

  it('returns all when query empty', () => {
    expect(filterFlightsBySubstring(flights, '  ')).toHaveLength(2);
  });

  it('filters by callsign', () => {
    expect(filterFlightsBySubstring(flights, 'aa')).toHaveLength(1);
  });

  it('filters by icao24', () => {
    expect(filterFlightsBySubstring(flights, 'bbbb')).toHaveLength(1);
  });

  it('filters by registration', () => {
    expect(filterFlightsBySubstring(flights, 'g-te')).toHaveLength(1);
  });

  it('handles null callsign and registration', () => {
    const rows = [
      base({ id: 'a', callsign: null, registration: null, icao24: 'cccccc' }),
    ];
    expect(filterFlightsBySubstring(rows, 'cccc')).toHaveLength(1);
    expect(filterFlightsBySubstring(rows, 'nope')).toHaveLength(0);
  });
});
