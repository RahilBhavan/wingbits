import type { Flight } from 'wingbits-sdk';

/** Client-side substring filter on callsign / ICAO24 / registration. */
export function filterFlightsBySubstring(flights: Flight[], query: string): Flight[] {
  const q = query.trim().toLowerCase();
  if (!q) return flights;
  return flights.filter((f) => {
    const cs = f.callsign?.toLowerCase() ?? '';
    const reg = f.registration?.toLowerCase() ?? '';
    const icao = f.icao24.toLowerCase();
    return cs.includes(q) || reg.includes(q) || icao.includes(q);
  });
}
