import { describe, expect, it } from 'vitest';
import {
  inkColorForAltitudeFt,
  inkColorForJamLevel,
} from '../../src/utils/flight-ink-color.js';

describe('inkColorForAltitudeFt', () => {
  it('maps bands', () => {
    expect(inkColorForAltitudeFt(0, true)).toBe('red');
    expect(inkColorForAltitudeFt(100, false)).toBe('red');
    expect(inkColorForAltitudeFt(2000, false)).toBe('yellow');
    expect(inkColorForAltitudeFt(15000, false)).toBe('green');
    expect(inkColorForAltitudeFt(35000, false)).toBe('cyan');
  });
});

describe('inkColorForJamLevel', () => {
  it('maps severity', () => {
    expect(inkColorForJamLevel(0)).toBe('green');
    expect(inkColorForJamLevel(0.25)).toBe('green');
    expect(inkColorForJamLevel(0.5)).toBe('yellow');
    expect(inkColorForJamLevel(1)).toBe('red');
  });
});
