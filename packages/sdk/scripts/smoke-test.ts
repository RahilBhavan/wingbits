// Usage: WINGBITS_API_KEY=<key> bun run smoke (from repo root) or packages/sdk
import { WingbitsClient } from '../src/index';

const apiKey = process.env.WINGBITS_API_KEY;
if (!apiKey) {
  console.error('Error: WINGBITS_API_KEY environment variable is required');
  process.exit(1);
}

const client = new WingbitsClient({ apiKey });

async function main() {
  console.log('Connecting to Wingbits Customer API...\n');

  const health = await client.health();
  console.log('health:', JSON.stringify(health, null, 2));

  // UK bounding box (approx): minLon, minLat, maxLon, maxLat → structured bbox
  const flights = await client.flights.getFlights({
    bbox: { minLat: 49, maxLat: 61, minLon: -10, maxLon: 2 },
  });
  console.log(`\nflights in UK airspace: ${flights.length}`);
  if (flights.length > 0) {
    console.log('sample flight:', JSON.stringify(flights[0], null, 2));
  }

  console.log('\nSmoke test passed — Zod schemas match live API responses.');
}

main().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(1);
});
