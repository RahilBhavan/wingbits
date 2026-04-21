import type { ColorLevel } from './color-capabilities.js';

/** Subtle selection background (Nord-inspired) — works with chalk bgHex in Ink. */
const SEL_BG_TRUE = '#3b4252';
const SEL_BG_FALLBACK = 'gray';

/** Interpolate hex `#rrggbb` for sparkline gradient (low → high altitude feel). */
export function lerpHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const u = clamp01(t);
  const r = Math.round(pa.r + (pb.r - pa.r) * u);
  const g = Math.round(pa.g + (pb.g - pa.g) * u);
  const bch = Math.round(pa.b + (pb.b - pa.b) * u);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(bch)}`;
}

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

function parseHex(s: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s.trim());
  if (!m) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(m[1]!, 16),
    g: parseInt(m[2]!, 16),
    b: parseInt(m[3]!, 16),
  };
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Foreground color for altitude band — truecolor hex or chalk name string for Ink `color` prop.
 */
export function themeAltitudeFg(
  altitudeFt: number,
  onGround: boolean,
  level: ColorLevel,
): string | undefined {
  if (level === 'none') return undefined;
  if (onGround || altitudeFt < 500) {
    if (level === 'truecolor') return '#f87171';
    return 'red';
  }
  if (altitudeFt < 5000) {
    if (level === 'truecolor') return '#fbbf24';
    return 'yellow';
  }
  if (altitudeFt < 25000) {
    if (level === 'truecolor') return '#4ade80';
    return 'green';
  }
  if (level === 'truecolor') return '#67e8f9';
  return 'cyan';
}

export function themeJamFg(cap: ColorLevel, jamming: number): string | undefined {
  if (cap === 'none') return undefined;
  if (jamming <= 0.3) {
    if (cap === 'truecolor') return '#86efac';
    return 'green';
  }
  if (jamming <= 0.6) {
    if (cap === 'truecolor') return '#fde047';
    return 'yellow';
  }
  if (cap === 'truecolor') return '#fb7185';
  return 'red';
}

/** Sparkline low/high gradient anchors (truecolor only). */
export const SPARK_LOW = '#38bdf8';
export const SPARK_HIGH = '#c084fc';

export function themeSparkSegment(t: number, level: ColorLevel): string | undefined {
  if (level === 'none') return undefined;
  if (level !== 'truecolor') return 'cyan';
  return lerpHex(SPARK_LOW, SPARK_HIGH, t);
}

export function themeSelectionBg(level: ColorLevel): string | undefined {
  if (level === 'none') return undefined;
  if (level === 'truecolor') return SEL_BG_TRUE;
  return SEL_BG_FALLBACK;
}

export function themeBorderMuted(level: ColorLevel): string {
  if (level === 'none' || level === '16') return 'gray';
  if (level === 'truecolor') return '#4c566a';
  return 'gray';
}

export function themeAccentPrimary(level: ColorLevel): string | undefined {
  if (level === 'none') return undefined;
  if (level === 'truecolor') return '#88c0d0';
  return 'cyan';
}

export function themeAccentWarn(level: ColorLevel): string | undefined {
  if (level === 'none') return undefined;
  if (level === 'truecolor') return '#ebcb8b';
  return 'yellow';
}

export function themeAccentDanger(level: ColorLevel): string | undefined {
  if (level === 'none') return undefined;
  if (level === 'truecolor') return '#bf616a';
  return 'red';
}

export function themeDim(level: ColorLevel): boolean {
  return level !== 'none';
}
