/**
 * Unicode block sparkline of numeric series (e.g. altitude profile).
 * Uses ▁▂▃▄▅▆▇█ on one row.
 */
export const SPARK_BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

/** Normalized height keys for gradient coloring (0–1 within min/max range). */
export function altitudeSparkSegments(values: number[]): { char: string; t: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => {
    const t = (v - min) / span;
    const idx = Math.min(SPARK_BLOCKS.length - 1, Math.floor(t * SPARK_BLOCKS.length));
    return { char: SPARK_BLOCKS[idx] ?? SPARK_BLOCKS[0], t };
  });
}

export function altitudeSparkline(values: number[]): string {
  return altitudeSparkSegments(values)
    .map((s) => s.char)
    .join('');
}
