import { describe, expect, it } from 'vitest';
import type { Flight } from 'wingbits-sdk';
import {
  flightListColumns,
  flightListHeader,
  formatFlightRow,
} from '../../src/ui/tui/format-columns.js';

const f = (over: Partial<Flight>): Flight => ({
  id: 'id',
  icao24: 'abcdef',
  callsign: 'TST123',
  registration: 'N1',
  lat: 0,
  lon: 0,
  altitude: 12345,
  groundSpeed: 400,
  track: 270,
  verticalRate: 0,
  squawk: null,
  onGround: false,
  lastSeen: 0,
  category: null,
  ...over,
});

describe('formatFlightRow', () => {
  it('aligns wide layout', () => {
    const spec = flightListColumns(54);
    const row = formatFlightRow(f({}), spec);
    expect(row).toContain('TST123');
    expect(row).toContain('400');
  });

  it('header matches spec', () => {
    const spec = flightListColumns(54);
    const h = flightListHeader(spec);
    expect(h).toContain('CALLSIGN');
    expect(h).toContain('ALT(ft)');
  });
});
