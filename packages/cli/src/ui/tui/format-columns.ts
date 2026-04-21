import type { Flight } from 'wingbits-sdk';

/** Fixed-width cell with truncation at end. */
export function padCell(
  raw: string,
  width: number,
  align: 'left' | 'right' = 'left',
): string {
  if (width <= 0) return '';
  const s =
    raw.length > width ? `${raw.slice(0, Math.max(0, width - 1))}…` : raw;
  if (align === 'right') return s.padStart(width);
  return s.padEnd(width);
}

export interface FlightListColumnSpec {
  callsignW: number;
  icaoW: number;
  altW: number;
  spdW: number;
  hdgW: number;
  showSpeedHdg: boolean;
}

/** Single monospace row for the flight list. */
export function formatFlightRow(f: Flight, spec: FlightListColumnSpec): string {
  const cs = padCell((f.callsign ?? '—').toUpperCase(), spec.callsignW);
  const icao = padCell(f.icao24.toLowerCase(), spec.icaoW);
  const alt = padCell(`${Math.round(f.altitude)}ft`, spec.altW, 'right');
  if (!spec.showSpeedHdg || spec.spdW <= 0) {
    return `${cs} ${icao} ${alt}`;
  }
  const spd = padCell(`${Math.round(f.groundSpeed)}`, spec.spdW, 'right');
  const hdg = padCell(`${Math.round(f.track)}`, spec.hdgW, 'right');
  return `${cs} ${icao} ${alt} ${spd} ${hdg}`;
}

/** Header line matching column spec. */
export function flightListHeader(spec: FlightListColumnSpec): string {
  const cs = padCell('CALLSIGN', spec.callsignW);
  const icao = padCell('ICAO24', spec.icaoW);
  const alt = padCell('ALT(ft)', spec.altW, 'right');
  if (!spec.showSpeedHdg || spec.spdW <= 0) {
    return `${cs} ${icao} ${alt}`;
  }
  const spd = padCell('KT', spec.spdW, 'right');
  const hdg = padCell('HDG', spec.hdgW, 'right');
  return `${cs} ${icao} ${alt} ${spd} ${hdg}`;
}

export function truncateMiddle(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  if (maxLen <= 3) return s.slice(0, maxLen);
  const left = Math.ceil((maxLen - 1) / 2);
  const right = Math.floor((maxLen - 1) / 2);
  return `${s.slice(0, left)}…${s.slice(s.length - right)}`;
}

/**
 * Column widths for the flight table from available list pane width.
 */
export function flightListColumns(listPaneWidth: number): FlightListColumnSpec {
  const inner = Math.max(32, listPaneWidth);
  if (inner >= 52) {
    return {
      callsignW: 9,
      icaoW: 7,
      altW: 8,
      spdW: 4,
      hdgW: 4,
      showSpeedHdg: true,
    };
  }
  if (inner >= 44) {
    return {
      callsignW: 8,
      icaoW: 6,
      altW: 7,
      spdW: 3,
      hdgW: 3,
      showSpeedHdg: true,
    };
  }
  return {
    callsignW: 7,
    icaoW: 6,
    altW: 7,
    spdW: 0,
    hdgW: 0,
    showSpeedHdg: false,
  };
}
