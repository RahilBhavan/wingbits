import Table from 'cli-table3';
import type { AircraftDetails, Flight, FlightPath, GpsJamHex } from 'wingbits-sdk';
import chalk from 'chalk';
import { colorForAltitudeFt, colorForJammingLevel, jammingLabel } from './colors.js';

export type OutputFormat = 'table' | 'json' | 'csv';

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Print flights as table / json / csv. */
export function printFlights(flights: Flight[], format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(flights, null, 2));
    return;
  }
  if (format === 'csv') {
    const headers = [
      'id',
      'icao24',
      'callsign',
      'registration',
      'lat',
      'lon',
      'altitude',
      'groundSpeed',
      'track',
      'onGround',
      'lastSeen',
    ];
    console.log(headers.join(','));
    for (const f of flights) {
      console.log(
        [
          f.id,
          f.icao24,
          f.callsign ?? '',
          f.registration ?? '',
          f.lat,
          f.lon,
          f.altitude,
          f.groundSpeed,
          f.track,
          f.onGround,
          f.lastSeen,
        ]
          .map((v) => csvEscape(String(v)))
          .join(','),
      );
    }
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Callsign'),
      chalk.bold('ICAO24'),
      chalk.bold('Alt ft'),
      chalk.bold('kt'),
      chalk.bold('Hdg'),
      chalk.bold('Lat'),
      chalk.bold('Lon'),
    ],
    style: { head: ['cyan'] },
  });
  for (const f of flights) {
    const paint = colorForAltitudeFt(f.altitude, f.onGround);
    const cs = f.callsign ?? '—';
    table.push([
      paint(cs),
      paint(f.icao24),
      paint(String(Math.round(f.altitude))),
      paint(String(Math.round(f.groundSpeed))),
      paint(String(Math.round(f.track))),
      paint(f.lat.toFixed(4)),
      paint(f.lon.toFixed(4)),
    ]);
  }
  console.log(table.toString());
}

export function printFlight(f: Flight, format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(f, null, 2));
    return;
  }
  if (format === 'csv') {
    printFlights([f], 'csv');
    return;
  }
  const paint = colorForAltitudeFt(f.altitude, f.onGround);
  const lines = [
    `${chalk.bold('ID')}: ${f.id}`,
    `${chalk.bold('ICAO24')}: ${f.icao24}`,
    `${chalk.bold('Callsign')}: ${f.callsign ?? '—'}`,
    `${chalk.bold('Reg')}: ${f.registration ?? '—'}`,
    `${chalk.bold('Position')}: ${paint(`${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}`)}`,
    `${chalk.bold('Altitude')}: ${paint(`${Math.round(f.altitude)} ft`)}`,
    `${chalk.bold('Speed')}: ${Math.round(f.groundSpeed)} kt`,
    `${chalk.bold('Track')}: ${Math.round(f.track)}°`,
    `${chalk.bold('Vertical')}: ${Math.round(f.verticalRate)} ft/min`,
    `${chalk.bold('Squawk')}: ${f.squawk ?? '—'}`,
    `${chalk.bold('On ground')}: ${f.onGround}`,
    `${chalk.bold('Last seen')}: ${f.lastSeen}`,
    `${chalk.bold('Category')}: ${f.category ?? '—'}`,
  ];
  console.log(lines.join('\n'));
}

export function printAircraft(a: AircraftDetails, format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(a, null, 2));
    return;
  }
  if (format === 'csv') {
    const row = [
      a.icao24,
      a.registration ?? '',
      a.manufacturer ?? '',
      a.model ?? '',
      a.typecode ?? '',
      a.owner ?? '',
      a.built ?? '',
      a.engines ?? '',
    ];
    console.log(row.map((c) => csvEscape(c)).join(','));
    return;
  }
  const lines = [
    `${chalk.bold('ICAO24')}: ${a.icao24}`,
    `${chalk.bold('Registration')}: ${a.registration ?? '—'}`,
    `${chalk.bold('Manufacturer')}: ${a.manufacturer ?? '—'}`,
    `${chalk.bold('Model')}: ${a.model ?? '—'}`,
    `${chalk.bold('Type')}: ${a.typecode ?? '—'}`,
    `${chalk.bold('Serial')}: ${a.serialNumber ?? '—'}`,
    `${chalk.bold('Line')}: ${a.lineNumber ?? '—'}`,
    `${chalk.bold('Class')}: ${a.icaoAircraftClass ?? '—'}`,
    `${chalk.bold('Operator IATA')}: ${a.operatorIata ?? '—'}`,
    `${chalk.bold('Owner')}: ${a.owner ?? '—'}`,
    `${chalk.bold('Built')}: ${a.built ?? '—'}`,
    `${chalk.bold('Engines')}: ${a.engines ?? '—'}`,
  ];
  console.log(lines.join('\n'));
}

export function printFlightPath(path: FlightPath, format: OutputFormat, sparkline: string): void {
  if (format === 'json') {
    console.log(JSON.stringify({ ...path, altitudeSparkline: sparkline }, null, 2));
    return;
  }
  if (format === 'csv') {
    for (const p of path.points) {
      console.log([path.id, path.icao24, p.lat, p.lon, p.altitude, p.timestamp].join(','));
    }
    return;
  }
  console.log(`${chalk.bold('Flight')}: ${path.id} (${path.icao24})`);
  console.log(`${chalk.bold('Points')}: ${path.points.length}`);
  if (sparkline) {
    console.log(`${chalk.bold('Altitude profile')}: ${sparkline}`);
  }
}

export function printGpsJam(
  hexes: GpsJamHex[],
  format: OutputFormat,
): { avg: number; max: number; count: number } {
  const count = hexes.length;
  const avg = count ? hexes.reduce((s, h) => s + h.jammingLevel, 0) / count : 0;
  const max = count ? Math.max(...hexes.map((h) => h.jammingLevel)) : 0;

  if (format === 'json') {
    console.log(JSON.stringify({ summary: { count, avgJamming: avg, maxJamming: max }, hexes }, null, 2));
    return { avg, max, count };
  }
  if (format === 'csv') {
    console.log('h3Index,jammingLevel,timestamp');
    for (const h of hexes) {
      console.log([h.h3Index, h.jammingLevel, h.timestamp].join(','));
    }
    return { avg, max, count };
  }

  const table = new Table({
    head: [chalk.bold('H3'), chalk.bold('Jam'), chalk.bold('Severity'), chalk.bold('ts')],
    style: { head: ['cyan'] },
  });
  for (const h of hexes) {
    const paint = colorForJammingLevel(h.jammingLevel);
    table.push([h.h3Index, paint(h.jammingLevel.toFixed(3)), paint(jammingLabel(h.jammingLevel)), String(h.timestamp)]);
  }
  console.log(table.toString());
  console.log(
    chalk.dim(`Summary: ${count} hexes | avg jamming ${avg.toFixed(3)} | max ${max.toFixed(3)}`),
  );
  return { avg, max, count };
}
