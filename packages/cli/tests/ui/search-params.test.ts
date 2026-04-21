import { describe, expect, it } from 'vitest';
import { inferSearchParams } from '../../src/ui/tui/search-params.js';

describe('inferSearchParams', () => {
  it('returns null for empty', () => {
    expect(inferSearchParams('   ')).toBeNull();
  });

  it('detects 6-char ICAO24 hex', () => {
    expect(inferSearchParams('a1b2c3')).toEqual({ icao24: 'a1b2c3' });
    expect(inferSearchParams('ABCDEF')).toEqual({ icao24: 'abcdef' });
  });

  it('uses registration for N-prefix', () => {
    expect(inferSearchParams('N12345')).toEqual({ registration: 'N12345' });
  });

  it('defaults to callsign', () => {
    expect(inferSearchParams('UAL123')).toEqual({ callsign: 'UAL123' });
  });
});
