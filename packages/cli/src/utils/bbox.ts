import type { BoundingBox } from 'wingbits-sdk';

/**
 * Parse bbox string: `minLat,maxLat,minLon,maxLon` (comma-separated, no spaces required).
 */
export function parseBboxString(raw: string): BoundingBox {
  const parts = raw.split(',').map((s) => s.trim());
  if (parts.length !== 4) {
    throw new Error(
      'bbox must be four comma-separated numbers: minLat,maxLat,minLon,maxLon (e.g. 41.6,42.1,-88.0,-87.2)',
    );
  }
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n))) {
    throw new Error('bbox contains invalid numbers');
  }
  const [minLat, maxLat, minLon, maxLon] = nums as [number, number, number, number];
  return { minLat, maxLat, minLon, maxLon };
}
