import type { SearchFlightsParams } from 'wingbits-sdk';

/**
 * Turn a single user query line into search API params.
 * Heuristic: 6-char hex → ICAO24; N-prefix US-style reg → registration; else callsign.
 */
export function inferSearchParams(raw: string): SearchFlightsParams | null {
  const q = raw.trim();
  if (!q) return null;

  if (/^[0-9a-fA-F]{6}$/.test(q)) {
    return { icao24: q.toLowerCase() };
  }

  if (/^N[0-9A-Z]{1,10}$/i.test(q)) {
    return { registration: q.toUpperCase() };
  }

  return { callsign: q.toUpperCase() };
}
