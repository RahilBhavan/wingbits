import { describe, it, expect } from 'vitest';
import { colorForAltitudeFt, colorForJammingLevel, jammingLabel } from '../../src/utils/colors.js';

describe('colorForAltitudeFt', () => {
  it('returns a function', () => {
    const fn = colorForAltitudeFt(1000, false);
    expect(typeof fn).toBe('function');
    expect(fn('x')).toBeDefined();
  });
});

describe('jammingLabel', () => {
  it('classifies severity', () => {
    expect(jammingLabel(0.1)).toBe('low');
    expect(jammingLabel(0.5)).toBe('moderate');
    expect(jammingLabel(0.9)).toBe('severe');
  });
});

describe('colorForJammingLevel', () => {
  it('returns a function', () => {
    const fn = colorForJammingLevel(0.5);
    expect(typeof fn).toBe('function');
  });
});
