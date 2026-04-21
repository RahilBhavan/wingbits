import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import chalk from 'chalk';
import ora from 'ora';
import { WingbitsClient, type SearchFlightsParams } from 'wingbits-sdk';
import { createCliClient } from './utils/client.js';
import type { EnsureApiKeyOptions } from './utils/api-key.js';
import { parseBboxString } from './utils/bbox.js';
import { configStore } from './utils/config-store.js';
import type { OutputFormat } from './utils/format.js';
import {
  printFlights,
  printFlight,
  printFlightPath,
  printAircraft,
  printGpsJam,
} from './utils/format.js';
import { altitudeSparkline } from './utils/sparkline.js';
import { WatchDashboard } from './ui/watch-dashboard.js';
import { TuiApp } from './ui/tui/tui-app.js';

const pkg = { version: '0.1.0' };

export interface CommonCliOpts {
  apiKey?: string;
  nonInteractive?: boolean;
}

/** Shared flags for commands that call the API (subcommands do not inherit parent options in Commander). */
function withApiOptions(cmd: Command): Command {
  return cmd
    .option('--api-key <key>', 'Wingbits API key (overrides WINGBITS_API_KEY and saved config)')
    .option('-n, --non-interactive', 'Do not prompt for API key');
}

function parseFormat(v: string): OutputFormat {
  if (v === 'table' || v === 'json' || v === 'csv') return v;
  throw new Error(`Invalid --format: ${v} (use table, json, or csv)`);
}

/** Satisfy exactOptionalPropertyTypes when passing Commander opts into the SDK. */
function ensureOptions(opts: CommonCliOpts): EnsureApiKeyOptions {
  const o: EnsureApiKeyOptions = {};
  if (opts.apiKey !== undefined) o.flagKey = opts.apiKey;
  if (opts.nonInteractive !== undefined) o.nonInteractive = opts.nonInteractive;
  return o;
}

function buildSearchParams(opts: {
  callsign?: string;
  icao24?: string;
  registration?: string;
}): SearchFlightsParams {
  const p: SearchFlightsParams = {};
  if (opts.callsign !== undefined) p.callsign = opts.callsign;
  if (opts.icao24 !== undefined) p.icao24 = opts.icao24;
  if (opts.registration !== undefined) p.registration = opts.registration;
  return p;
}

async function main() {
  const program = new Command();
  program.name('wingbits').description('Wingbits Customer API — flights, GPS jamming, live watch').version(pkg.version);

  withApiOptions(
    program
      .command('health')
      .description('Check API health (status, version, uptime)')
      .option('-f, --format <mode>', 'output: table, json, csv', 'table'),
  ).action(async (opts: { format: string } & CommonCliOpts) => {
    const spinner = ora('Checking health…').start();
    try {
      const client = await createCliClient(ensureOptions(opts));
      const h = await client.health();
      spinner.stop();
      const format = parseFormat(opts.format);
      if (format === 'json') {
        console.log(JSON.stringify(h, null, 2));
        return;
      }
      if (format === 'csv') {
        console.log('status,version,uptime,timestamp');
        console.log([h.status, h.version, h.uptime, h.timestamp].join(','));
        return;
      }
      console.log(`${chalk.bold('Status')}: ${h.status}`);
      console.log(`${chalk.bold('Version')}: ${h.version}`);
      console.log(`${chalk.bold('Uptime')}: ${h.uptime}s`);
      console.log(`${chalk.bold('Timestamp')}: ${h.timestamp}`);
    } catch (e) {
      spinner.fail('Health check failed');
      throw e;
    }
  });

  withApiOptions(
    program.command('flights').description('List flights in a bounding box').requiredOption('--bbox <coords>', 'minLat,maxLat,minLon,maxLon').option('-f, --format <mode>', 'table, json, csv', 'table'),
  ).action(async (opts: { bbox: string; format: string } & CommonCliOpts) => {
    const bbox = parseBboxString(opts.bbox);
    const client = await createCliClient(ensureOptions(opts));
    const spinner = ora('Fetching flights…').start();
    const flights = await client.flights.getFlights({ bbox });
    spinner.stop();
    printFlights(flights, parseFormat(opts.format));
  });

  withApiOptions(
    program.command('flight').description('Show a single flight by id').argument('<id>', 'flight id').option('-f, --format <mode>', 'table, json, csv', 'table'),
  ).action(async (id: string, opts: { format: string } & CommonCliOpts) => {
    const client = await createCliClient(ensureOptions(opts));
    const spinner = ora('Fetching flight…').start();
    const f = await client.flights.getFlight(id);
    spinner.stop();
    printFlight(f, parseFormat(opts.format));
  });

  withApiOptions(
    program
      .command('search')
      .description('Search flights by callsign, ICAO24, or registration')
      .option('--callsign <cs>', 'callsign')
      .option('--icao24 <hex>', 'ICAO 24-bit hex')
      .option('--registration <reg>', 'registration')
      .option('-f, --format <mode>', 'table, json, csv', 'table'),
  ).action(async (opts: { callsign?: string; icao24?: string; registration?: string; format: string } & CommonCliOpts) => {
    if (!opts.callsign && !opts.icao24 && !opts.registration) {
      throw new Error('Provide at least one of --callsign, --icao24, --registration');
    }
    const client = await createCliClient(ensureOptions(opts));
    const spinner = ora('Searching…').start();
    const flights = await client.flights.searchFlights(buildSearchParams(opts));
    spinner.stop();
    printFlights(flights, parseFormat(opts.format));
  });

  withApiOptions(
    program.command('path').description('Show flight path (trajectory) and altitude sparkline').argument('<id>', 'flight id').option('-f, --format <mode>', 'table, json, csv', 'table'),
  ).action(async (id: string, opts: { format: string } & CommonCliOpts) => {
    const client = await createCliClient(ensureOptions(opts));
    const spinner = ora('Fetching path…').start();
    const path = await client.flights.getFlightPath(id);
    spinner.stop();
    const alts = path.points.map((p) => p.altitude);
    const spark = altitudeSparkline(alts);
    printFlightPath(path, parseFormat(opts.format), spark);
  });

  withApiOptions(
    program.command('aircraft').description('Aircraft metadata by ICAO24').argument('<icao24>', 'ICAO 24-bit hex').option('-f, --format <mode>', 'table, json, csv', 'table'),
  ).action(async (icao24: string, opts: { format: string } & CommonCliOpts) => {
    const client = await createCliClient(ensureOptions(opts));
    const spinner = ora('Fetching aircraft…').start();
    const a = await client.flights.getAircraftDetails(icao24);
    spinner.stop();
    printAircraft(a, parseFormat(opts.format));
  });

  withApiOptions(
    program.command('gps-jam').description('GPS jamming hexes in a bounding box').requiredOption('--bbox <coords>', 'minLat,maxLat,minLon,maxLon').option('-f, --format <mode>', 'table, json, csv', 'table'),
  ).action(async (opts: { bbox: string; format: string } & CommonCliOpts) => {
    const bbox = parseBboxString(opts.bbox);
    const client = await createCliClient(ensureOptions(opts));
    const spinner = ora('Fetching GPS jam data…').start();
    const hexes = await client.gps.getJam({ bbox });
    spinner.stop();
    printGpsJam(hexes, parseFormat(opts.format));
  });

  withApiOptions(
    program
      .command('watch')
      .description('Live dashboard: auto-refresh flights in a bounding box (Ink TUI). Requires API key in env/config; no interactive prompt.')
      .requiredOption('--bbox <coords>', 'minLat,maxLat,minLon,maxLon')
      .option('-i, --interval <sec>', 'poll interval in seconds', '5'),
  ).action(async (opts: { bbox: string; interval: string } & CommonCliOpts) => {
    const bbox = parseBboxString(opts.bbox);
    const apiKey =
      opts.apiKey?.trim() ||
      process.env.WINGBITS_API_KEY?.trim() ||
      (configStore.get('apiKey') as string | undefined)?.trim();
    if (!apiKey) {
      throw new Error(
        'watch requires API key: set WINGBITS_API_KEY, run wingbits config set api-key <key>, or pass --api-key',
      );
    }
    const client = new WingbitsClient({ apiKey });
    const intervalSec = Number(opts.interval);
    if (Number.isNaN(intervalSec) || intervalSec < 1) {
      throw new Error('--interval must be a positive number (seconds)');
    }
    render(<WatchDashboard client={client} bbox={bbox} intervalSec={intervalSec} />);
  });

  withApiOptions(
    program
      .command('tui')
      .description(
        'Interactive TUI: navigable list, detail, path sparkline, GPS jam, API search, bbox & interval controls (Ink). Keeps `watch` as the minimal dashboard.',
      )
      .requiredOption('--bbox <coords>', 'minLat,maxLat,minLon,maxLon')
      .option('-i, --interval <sec>', 'poll interval in seconds', '5'),
  ).action(async (opts: { bbox: string; interval: string } & CommonCliOpts) => {
    const bboxParsed = parseBboxString(opts.bbox);
    const apiKey =
      opts.apiKey?.trim() ||
      process.env.WINGBITS_API_KEY?.trim() ||
      (configStore.get('apiKey') as string | undefined)?.trim();
    if (!apiKey) {
      throw new Error(
        'tui requires API key: set WINGBITS_API_KEY, run wingbits config set api-key <key>, or pass --api-key',
      );
    }
    const client = new WingbitsClient({ apiKey });
    const intervalSec = Number(opts.interval);
    if (Number.isNaN(intervalSec) || intervalSec < 1) {
      throw new Error('--interval must be a positive number (seconds)');
    }
    render(<TuiApp client={client} initialBbox={bboxParsed} initialIntervalSec={intervalSec} />);
  });

  const configCmd = program.command('config').description('Manage saved CLI configuration');

  configCmd
    .command('set')
    .description('Set a config value (currently only api-key)')
    .argument('<key>', 'api-key')
    .argument('[value]', 'value (optional if WINGBITS_API_KEY is set)')
    .action((key: string, value?: string) => {
      if (key !== 'api-key') throw new Error('Only config key supported: api-key');
      const v = value ?? process.env.WINGBITS_API_KEY;
      if (!v?.trim()) throw new Error('Provide value or set WINGBITS_API_KEY');
      configStore.set('apiKey', v.trim());
      console.log(chalk.green('Saved api-key to config store.'));
    });

  configCmd.command('show').description('Show config (API key masked)').action(() => {
    const k = configStore.get('apiKey');
    if (typeof k !== 'string' || !k) {
      console.log('No api-key in config.');
      return;
    }
    const masked = k.length <= 8 ? '****' : `${k.slice(0, 4)}…${k.slice(-4)}`;
    console.log(`api-key: ${masked}`);
  });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
