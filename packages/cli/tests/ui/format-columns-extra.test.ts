import { describe, expect, it } from 'vitest';
import {
  padCell,
  truncateMiddle,
  flightListColumns,
} from '../../src/ui/tui/format-columns.js';

describe('padCell', () => {
  it('returns empty for non-positive width', () => {
    expect(padCell('x', 0)).toBe('');
  });

  it('right-aligns', () => {
    expect(padCell('9', 3, 'right')).toBe('  9');
  });
});

describe('truncateMiddle', () => {
  it('short strings unchanged', () => {
    expect(truncateMiddle('ab', 4)).toBe('ab');
  });

  it('truncates long', () => {
    expect(truncateMiddle('abcdefghij', 5).includes('…')).toBe(true);
  });
});

describe('flightListColumns', () => {
  it('defaults to narrow without speed', () => {
    const s = flightListColumns(40);
    expect(s.showSpeedHdg).toBe(false);
  });
});
