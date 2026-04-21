import { describe, expect, it } from 'vitest';
import {
  lerpHex,
  themeAccentDanger,
  themeAccentPrimary,
  themeAccentWarn,
  themeAltitudeFg,
  themeBorderMuted,
  themeDim,
  themeJamFg,
  themeSelectionBg,
  themeSparkSegment,
} from '../../src/ui/tui/theme.js';

describe('lerpHex', () => {
  it('interpolates endpoints', () => {
    expect(lerpHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(lerpHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    const mid = lerpHex('#000000', '#ffffff', 0.5);
    expect(mid).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('clamps t outside 0–1', () => {
    expect(lerpHex('#ff0000', '#00ff00', -1)).toBe('#ff0000');
    expect(lerpHex('#ff0000', '#00ff00', 2)).toBe('#00ff00');
  });

  it('handles invalid hex gracefully', () => {
    const x = lerpHex('bad', '#ffffff', 0.5);
    expect(x.startsWith('#')).toBe(true);
  });
});

describe('themeAltitudeFg', () => {
  it('returns undefined for none', () => {
    expect(themeAltitudeFg(1000, false, 'none')).toBeUndefined();
  });

  it('covers bands for 16 and truecolor', () => {
    expect(themeAltitudeFg(0, true, '16')).toBe('red');
    expect(themeAltitudeFg(100, false, '16')).toBe('red');
    expect(themeAltitudeFg(2000, false, '16')).toBe('yellow');
    expect(themeAltitudeFg(15000, false, '16')).toBe('green');
    expect(themeAltitudeFg(35000, false, '16')).toBe('cyan');
    expect(themeAltitudeFg(35000, false, 'truecolor')?.startsWith('#')).toBe(true);
  });
});

describe('themeJamFg', () => {
  it('returns undefined for none', () => {
    expect(themeJamFg('none', 0.5)).toBeUndefined();
  });

  it('covers severities', () => {
    expect(themeJamFg('16', 0)).toBe('green');
    expect(themeJamFg('16', 0.5)).toBe('yellow');
    expect(themeJamFg('16', 1)).toBe('red');
    expect(themeJamFg('truecolor', 1)?.startsWith('#')).toBe(true);
  });
});

describe('themeSparkSegment', () => {
  it('handles levels', () => {
    expect(themeSparkSegment(0.5, 'none')).toBeUndefined();
    expect(themeSparkSegment(0.5, '256')).toBe('cyan');
    expect(themeSparkSegment(0.5, 'truecolor')?.startsWith('#')).toBe(true);
  });
});

describe('chrome helpers', () => {
  it('themeSelectionBg', () => {
    expect(themeSelectionBg('none')).toBeUndefined();
    expect(themeSelectionBg('truecolor')).toBe('#3b4252');
    expect(themeSelectionBg('16')).toBe('gray');
  });

  it('themeBorderMuted', () => {
    expect(themeBorderMuted('none')).toBe('gray');
    expect(themeBorderMuted('16')).toBe('gray');
    expect(themeBorderMuted('256')).toBe('gray');
    expect(themeBorderMuted('truecolor')).toBe('#4c566a');
  });

  it('accents', () => {
    expect(themeAccentPrimary('none')).toBeUndefined();
    expect(themeAccentPrimary('16')).toBe('cyan');
    expect(themeAccentWarn('truecolor')?.startsWith('#')).toBe(true);
    expect(themeAccentDanger('truecolor')?.startsWith('#')).toBe(true);
  });

  it('themeDim', () => {
    expect(themeDim('none')).toBe(false);
    expect(themeDim('16')).toBe(true);
  });
});
