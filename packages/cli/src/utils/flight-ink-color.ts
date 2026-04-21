/**
 * Ink named color strings for flight altitude bands (avoid mixing chalk ANSI with Ink).
 */
export function inkColorForAltitudeFt(altitudeFt: number, onGround: boolean): string {
  if (onGround || altitudeFt < 500) return 'red';
  if (altitudeFt < 5000) return 'yellow';
  if (altitudeFt < 25000) return 'green';
  return 'cyan';
}

/** GPS jamming level 0–1 → Ink color name. */
export function inkColorForJamLevel(level: number): string {
  if (level <= 0.3) return 'green';
  if (level <= 0.6) return 'yellow';
  return 'red';
}
