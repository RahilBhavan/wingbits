import { describe, it, expect } from 'vitest';
import { parseBboxString } from '../../src/utils/bbox.js';

describe('parseBboxString', () => {
  it('parses four comma-separated numbers', () => {
    expect(parseBboxString('41.6,42.1,-88.0,-87.2')).toEqual({
      minLat: 41.6,
      maxLat: 42.1,
      minLon: -88.0,
      maxLon: -87.2,
    });
  });

  it('trims whitespace', () => {
    expect(parseBboxString(' 49 , 61 , -10 , 2 ')).toEqual({
      minLat: 49,
      maxLat: 61,
      minLon: -10,
      maxLon: 2,
    });
  });

  it('throws on wrong part count', () => {
    expect(() => parseBboxString('1,2,3')).toThrow(/four comma-separated/);
  });

  it('throws on NaN', () => {
    expect(() => parseBboxString('a,b,c,d')).toThrow(/invalid numbers/);
  });
});
