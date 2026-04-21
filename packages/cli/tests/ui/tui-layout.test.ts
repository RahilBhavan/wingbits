import { describe, expect, it } from 'vitest';
import { clamp, ensureScroll } from '../../src/ui/tui/layout.js';

describe('clamp', () => {
  it('clamps to bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('ensureScroll', () => {
  it('returns 0 for empty list', () => {
    expect(ensureScroll(0, 0, 5, 0)).toBe(0);
  });

  it('scrolls down when selection moves below window', () => {
    expect(ensureScroll(7, 0, 5, 10)).toBe(3);
  });

  it('scrolls up when selection moves above window', () => {
    expect(ensureScroll(2, 5, 5, 10)).toBe(2);
  });

  it('keeps scroll when selection already visible', () => {
    expect(ensureScroll(3, 0, 5, 10)).toBe(0);
  });
});
