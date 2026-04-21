import { describe, it, expect } from 'vitest';
import { altitudeSparkline, altitudeSparkSegments } from '../../src/utils/sparkline.js';

describe('altitudeSparkline', () => {
  it('returns empty string for empty input', () => {
    expect(altitudeSparkline([])).toBe('');
  });

  it('maps altitudes to block characters', () => {
    const s = altitudeSparkline([0, 1000, 2000, 3000]);
    expect(s.length).toBe(4);
    expect(/[▁▂▃▄▅▆▇█]/.test(s)).toBe(true);
  });

  it('handles flat series', () => {
    const s = altitudeSparkline([100, 100, 100]);
    expect(s.length).toBe(3);
  });

  it('altitudeSparkSegments carries normalized t for gradients', () => {
    const segs = altitudeSparkSegments([0, 1000]);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.t).toBe(0);
    expect(segs[1]!.t).toBe(1);
  });
});
