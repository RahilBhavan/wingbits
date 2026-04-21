import chalk from 'chalk';

/** Altitude (feet) → terminal color band for quick scanning. */
export function colorForAltitudeFt(altitudeFt: number, onGround: boolean): (s: string) => string {
  if (onGround || altitudeFt < 500) return chalk.red;
  if (altitudeFt < 5000) return chalk.yellow;
  if (altitudeFt < 25000) return chalk.green;
  return chalk.cyan;
}

/** GPS jamming level 0–1 → severity color. */
export function colorForJammingLevel(level: number): (s: string) => string {
  if (level <= 0.3) return chalk.green;
  if (level <= 0.6) return chalk.yellow;
  return chalk.red.bold;
}

export function jammingLabel(level: number): string {
  if (level <= 0.3) return 'low';
  if (level <= 0.6) return 'moderate';
  return 'severe';
}
