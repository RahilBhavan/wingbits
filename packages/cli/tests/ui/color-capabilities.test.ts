import { describe, expect, it } from 'vitest';
import { getColorLevel } from '../../src/ui/tui/color-capabilities.js';

describe('getColorLevel', () => {
  it('returns none when NO_COLOR set', () => {
    expect(
      getColorLevel({
        env: { NO_COLOR: '1', COLORTERM: 'truecolor' },
        isTTY: true,
      }),
    ).toBe('none');
  });

  it('returns none when not TTY', () => {
    expect(getColorLevel({ env: {}, isTTY: false })).toBe('none');
  });

  it('returns truecolor for COLORTERM truecolor', () => {
    expect(
      getColorLevel({ env: { COLORTERM: 'truecolor' }, isTTY: true }),
    ).toBe('truecolor');
  });

  it('returns 256 for xterm-256color', () => {
    expect(
      getColorLevel({ env: { TERM: 'xterm-256color' }, isTTY: true }),
    ).toBe('256');
  });

  it('returns 16 for plain TTY', () => {
    expect(getColorLevel({ env: { TERM: 'dumb' }, isTTY: true })).toBe('16');
  });
});
