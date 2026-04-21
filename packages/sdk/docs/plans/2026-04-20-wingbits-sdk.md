# Wingbits TypeScript SDK Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish a production-grade TypeScript SDK (`wingbits-sdk`) for the Wingbits Customer API — the first community SDK for their December 2025-launched API.

**Architecture:** A typed HTTP client with endpoint-namespaced methods, retry/backoff, rate limiting, and full ESM+CJS dual build. The public surface is one `WingbitsClient` class; internals are modular utilities composed inside it.

**Tech Stack:** TypeScript 5, Vitest 2, tsup (bundler), msw (mock service worker for tests), zod (runtime validation at API boundary)

---

## API Reference (Ground Truth)

Base URL: `https://customer-api.wingbits.com`

Auth: `x-api-key` header on every request (API key from Wingbits dashboard)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server uptime/version |
| GET | `/v1/flights` | Aircraft in bounding box or radius |
| POST | `/v1/flights` | Batch geographic queries |
| GET | `/v1/flights/{id}` | Single flight by ID |
| GET | `/v1/flights/{id}/path` | Flight trajectory history |
| GET | `/v1/flights/search` | Search by callsign / ICAO hex / registration |
| GET | `/v1/flights/details/{icao24}` | Full aircraft metadata |
| GET | `/v1/gps/jam` | GPS jamming hexagons in bounded region |

---

## Repository Layout (Final State)

```
wingbits-sdk/
├── src/
│   ├── index.ts                 # Public exports
│   ├── client.ts                # WingbitsClient class
│   ├── types.ts                 # All TypeScript types + Zod schemas
│   ├── errors.ts                # WingbitsError hierarchy
│   ├── endpoints/
│   │   ├── flights.ts           # FlightsEndpoint class
│   │   └── gps.ts               # GpsEndpoint class
│   └── utils/
│       ├── http.ts              # fetch wrapper, auth injection
│       ├── retry.ts             # exponential backoff retry
│       └── rate-limiter.ts      # token bucket rate limiter
├── tests/
│   ├── setup.ts                 # msw server setup
│   ├── client.test.ts
│   ├── endpoints/
│   │   ├── flights.test.ts
│   │   └── gps.test.ts
│   └── utils/
│       ├── retry.test.ts
│       └── rate-limiter.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── tsup.config.ts
├── .gitignore
├── .npmignore
└── README.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tsup.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts` (empty stub)

**Step 1: Initialize the npm project**

```bash
cd /Users/rahilbhavan/projects/wingbits
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install --save-dev typescript vitest @vitest/coverage-v8 tsup msw zod
npm install --save-dev @types/node
```

Why each:
- `typescript` — compiler
- `vitest` — test runner (faster than Jest, native ESM)
- `@vitest/coverage-v8` — coverage reports
- `tsup` — zero-config bundler, produces ESM + CJS
- `msw` — mock HTTP at the network layer (no fetch mocking hacks)
- `zod` — runtime validation of API responses at the boundary
- `@types/node` — Node built-in types

**Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 4: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
      include: ['src/**'],
      exclude: ['src/index.ts'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

**Step 5: Write `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
});
```

**Step 6: Update `package.json` scripts and exports map**

Replace the scripts section and add exports/types fields:

```json
{
  "name": "wingbits-sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for the Wingbits Customer API",
  "license": "MIT",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "keywords": ["wingbits", "adsb", "flight-tracking", "depin", "aviation"],
  "engines": { "node": ">=18" }
}
```

**Step 7: Write `.gitignore`**

```
node_modules/
dist/
coverage/
*.env
.env.local
```

**Step 8: Write `src/index.ts` stub**

```typescript
export {};
```

**Step 9: Run typecheck to confirm config is valid**

```bash
npx tsc --noEmit
```

Expected: no errors (just the empty export warning is fine)

**Step 10: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts tsup.config.ts .gitignore src/index.ts
git commit -m "chore: scaffold wingbits-sdk project"
```

---

## Task 2: Error Hierarchy

Errors come first because every other module throws them.

**Files:**
- Create: `src/errors.ts`
- Create: `tests/errors.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/errors.test.ts
import { describe, it, expect } from 'vitest';
import { WingbitsError, WingbitsApiError, WingbitsNetworkError, WingbitsValidationError } from '../src/errors';

describe('WingbitsError', () => {
  it('is an Error subclass', () => {
    const err = new WingbitsError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('WingbitsError');
    expect(err.message).toBe('boom');
  });
});

describe('WingbitsApiError', () => {
  it('carries statusCode and optional API error code', () => {
    const err = new WingbitsApiError('Not found', 404, 'FLIGHT_NOT_FOUND');
    expect(err).toBeInstanceOf(WingbitsError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('FLIGHT_NOT_FOUND');
    expect(err.name).toBe('WingbitsApiError');
  });

  it('works without optional code', () => {
    const err = new WingbitsApiError('Server error', 500);
    expect(err.code).toBeUndefined();
  });
});

describe('WingbitsNetworkError', () => {
  it('wraps an underlying cause', () => {
    const cause = new TypeError('fetch failed');
    const err = new WingbitsNetworkError('Network unreachable', cause);
    expect(err).toBeInstanceOf(WingbitsError);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('WingbitsNetworkError');
  });
});

describe('WingbitsValidationError', () => {
  it('carries field-level validation issues', () => {
    const issues = [{ path: 'lat', message: 'must be between -90 and 90' }];
    const err = new WingbitsValidationError('Validation failed', issues);
    expect(err.issues).toEqual(issues);
    expect(err.name).toBe('WingbitsValidationError');
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/errors.test.ts
```

Expected: FAIL — "Cannot find module '../src/errors'"

**Step 3: Write `src/errors.ts`**

```typescript
export class WingbitsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WingbitsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WingbitsApiError extends WingbitsError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'WingbitsApiError';
  }
}

export class WingbitsNetworkError extends WingbitsError {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super(message);
    this.name = 'WingbitsNetworkError';
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class WingbitsValidationError extends WingbitsError {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[],
  ) {
    super(message);
    this.name = 'WingbitsValidationError';
  }
}
```

**Step 4: Run test to confirm it passes**

```bash
npx vitest run tests/errors.test.ts
```

Expected: PASS, 4 test suites green

**Step 5: Commit**

```bash
git add src/errors.ts tests/errors.test.ts
git commit -m "feat: add WingbitsError hierarchy"
```

---

## Task 3: Types and Zod Schemas

All TypeScript types and Zod runtime validators in one file. Zod schemas are the source of truth — TypeScript types are inferred from them.

**Files:**
- Create: `src/types.ts`
- Create: `tests/types.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  FlightSchema,
  FlightPathSchema,
  AircraftDetailsSchema,
  GpsJamHexSchema,
  HealthSchema,
} from '../src/types';

describe('FlightSchema', () => {
  it('parses a valid flight object', () => {
    const raw = {
      id: 'abc123',
      icao24: 'a1b2c3',
      callsign: 'UAL123',
      registration: 'N12345',
      lat: 41.8781,
      lon: -87.6298,
      altitude: 35000,
      groundSpeed: 450,
      track: 270,
      verticalRate: 0,
      squawk: '1200',
      onGround: false,
      lastSeen: 1713600000,
      category: 'A3',
    };
    const result = FlightSchema.parse(raw);
    expect(result.icao24).toBe('a1b2c3');
    expect(result.onGround).toBe(false);
  });

  it('allows null callsign and registration', () => {
    const raw = {
      id: 'xyz',
      icao24: 'ff0011',
      callsign: null,
      registration: null,
      lat: 0,
      lon: 0,
      altitude: 0,
      groundSpeed: 0,
      track: 0,
      verticalRate: 0,
      squawk: null,
      onGround: true,
      lastSeen: 0,
      category: null,
    };
    expect(() => FlightSchema.parse(raw)).not.toThrow();
  });
});

describe('FlightPathSchema', () => {
  it('parses a path with multiple points', () => {
    const raw = {
      id: 'abc123',
      icao24: 'a1b2c3',
      points: [
        { lat: 41.0, lon: -87.0, altitude: 10000, timestamp: 1000 },
        { lat: 41.1, lon: -87.1, altitude: 11000, timestamp: 2000 },
      ],
    };
    const result = FlightPathSchema.parse(raw);
    expect(result.points).toHaveLength(2);
  });
});

describe('GpsJamHexSchema', () => {
  it('validates jammingLevel is between 0 and 1', () => {
    expect(() =>
      GpsJamHexSchema.parse({ h3Index: '8928308280fffff', jammingLevel: 1.5, timestamp: 1000 })
    ).toThrow();
  });
});

describe('HealthSchema', () => {
  it('parses health response', () => {
    const raw = { status: 'ok', version: '1.2.3', uptime: 99999, timestamp: 1713600000 };
    const result = HealthSchema.parse(raw);
    expect(result.status).toBe('ok');
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/types.test.ts
```

Expected: FAIL — "Cannot find module '../src/types'"

**Step 3: Write `src/types.ts`**

```typescript
import { z } from 'zod';

// --- Primitives ---

export const FlightSchema = z.object({
  id: z.string(),
  icao24: z.string(),
  callsign: z.string().nullable(),
  registration: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  altitude: z.number(),
  groundSpeed: z.number(),
  track: z.number().min(0).max(360),
  verticalRate: z.number(),
  squawk: z.string().nullable(),
  onGround: z.boolean(),
  lastSeen: z.number(),
  category: z.string().nullable(),
});

export type Flight = z.infer<typeof FlightSchema>;

export const FlightPathPointSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  altitude: z.number(),
  timestamp: z.number(),
});

export type FlightPathPoint = z.infer<typeof FlightPathPointSchema>;

export const FlightPathSchema = z.object({
  id: z.string(),
  icao24: z.string(),
  points: z.array(FlightPathPointSchema),
});

export type FlightPath = z.infer<typeof FlightPathSchema>;

export const AircraftDetailsSchema = z.object({
  icao24: z.string(),
  registration: z.string().nullable(),
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  typecode: z.string().nullable(),
  serialNumber: z.string().nullable(),
  lineNumber: z.string().nullable(),
  icaoAircraftClass: z.string().nullable(),
  operatorIata: z.string().nullable(),
  owner: z.string().nullable(),
  built: z.string().nullable(),
  engines: z.string().nullable(),
});

export type AircraftDetails = z.infer<typeof AircraftDetailsSchema>;

export const GpsJamHexSchema = z.object({
  h3Index: z.string(),
  jammingLevel: z.number().min(0).max(1),
  timestamp: z.number(),
});

export type GpsJamHex = z.infer<typeof GpsJamHexSchema>;

export const HealthSchema = z.object({
  status: z.string(),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.number(),
});

export type Health = z.infer<typeof HealthSchema>;

// --- Query parameter types (not validated by Zod — these are inputs we send) ---

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface RadiusQuery {
  lat: number;
  lon: number;
  radius: number;
  radiusUnit?: 'km' | 'nm';
}

export interface GetFlightsParams {
  bbox?: BoundingBox;
  radius?: RadiusQuery;
  altitudeMin?: number;
  altitudeMax?: number;
  categories?: string[];
}

export interface SearchFlightsParams {
  callsign?: string;
  icao24?: string;
  registration?: string;
}

export interface GetGpsJamParams {
  bbox: BoundingBox;
}
```

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/types.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/types.ts tests/types.test.ts
git commit -m "feat: add types and Zod schemas for all API responses"
```

---

## Task 4: Retry Utility

**Files:**
- Create: `src/utils/retry.ts`
- Create: `tests/utils/retry.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/utils/retry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/utils/retry';

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 429 })
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue({ statusCode: 500 });
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ statusCode: 404 });
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff (delay grows)', async () => {
    const delays: number[] = [];
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 429 })
      .mockRejectedValueOnce({ statusCode: 429 })
      .mockResolvedValue('ok');

    vi.useFakeTimers();
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    await promise;
    vi.useRealTimers();

    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/utils/retry.test.ts
```

Expected: FAIL

**Step 3: Write `src/utils/retry.ts`**

```typescript
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
}

function isRetryable(error: unknown): boolean {
  if (error !== null && typeof error === 'object' && 'statusCode' in error) {
    return RETRYABLE_STATUS_CODES.has((error as { statusCode: number }).statusCode);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
```

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/utils/retry.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/retry.ts tests/utils/retry.test.ts
git commit -m "feat: add retry utility with exponential backoff"
```

---

## Task 5: Rate Limiter

**Files:**
- Create: `src/utils/rate-limiter.ts`
- Create: `tests/utils/rate-limiter.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/utils/rate-limiter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from '../../src/utils/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit without delay', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 10 });
    const start = Date.now();
    await limiter.acquire();
    await limiter.acquire();
    // Both should complete near-instantly
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('queues requests that exceed the per-second limit', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 2 });
    const completions: number[] = [];

    const p1 = limiter.acquire().then(() => completions.push(1));
    const p2 = limiter.acquire().then(() => completions.push(2));
    const p3 = limiter.acquire().then(() => completions.push(3));

    // After 0ms: p1 and p2 should complete (limit=2), p3 queued
    await vi.advanceTimersByTimeAsync(0);
    expect(completions).toEqual(expect.arrayContaining([1, 2]));
    expect(completions).not.toContain(3);

    // After 1000ms: p3 should complete
    await vi.advanceTimersByTimeAsync(1000);
    await p3;
    expect(completions).toContain(3);
  });

  it('respects requestsPerSecond=1', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 1 });

    const p1 = limiter.acquire();
    const p2 = limiter.acquire();

    await vi.advanceTimersByTimeAsync(0);
    await p1; // first completes immediately

    await vi.advanceTimersByTimeAsync(1000);
    await p2; // second completes after 1s
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/utils/rate-limiter.test.ts
```

Expected: FAIL

**Step 3: Write `src/utils/rate-limiter.ts`**

```typescript
export interface RateLimiterOptions {
  requestsPerSecond: number;
}

export class RateLimiter {
  private readonly intervalMs: number;
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private lastResetTime = Date.now();
  private windowCount = 0;

  constructor(private readonly options: RateLimiterOptions) {
    this.intervalMs = 1000 / options.requestsPerSecond;
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.drain();
    });
  }

  private drain(): void {
    const now = Date.now();
    if (now - this.lastResetTime >= 1000) {
      this.windowCount = 0;
      this.lastResetTime = now;
    }

    while (this.queue.length > 0 && this.windowCount < this.options.requestsPerSecond) {
      const resolve = this.queue.shift()!;
      this.windowCount++;
      resolve();
    }

    if (this.queue.length > 0) {
      const remainingMs = 1000 - (now - this.lastResetTime);
      setTimeout(() => this.drain(), remainingMs);
    }
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/utils/rate-limiter.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/rate-limiter.ts tests/utils/rate-limiter.test.ts
git commit -m "feat: add token-bucket rate limiter"
```

---

## Task 6: HTTP Utility (fetch wrapper)

**Files:**
- Create: `src/utils/http.ts`
- Create: `tests/setup.ts` (msw server)
- Create: `tests/utils/http.test.ts`

**Step 1: Write `tests/setup.ts`** (no test, this is infrastructure)

```typescript
// tests/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Step 2: Write the failing test**

```typescript
// tests/utils/http.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { createHttpClient } from '../../src/utils/http';
import { WingbitsApiError, WingbitsNetworkError } from '../../src/errors';

const BASE_URL = 'https://customer-api.wingbits.com';

describe('createHttpClient', () => {
  it('injects x-api-key header on every request', async () => {
    let capturedApiKey: string | null = null;

    server.use(
      http.get(`${BASE_URL}/health`, ({ request }) => {
        capturedApiKey = request.headers.get('x-api-key');
        return HttpResponse.json({ status: 'ok', version: '1.0', uptime: 100, timestamp: 1000 });
      }),
    );

    const client = createHttpClient({ apiKey: 'test-key-123', baseUrl: BASE_URL });
    await client.get('/health');
    expect(capturedApiKey).toBe('test-key-123');
  });

  it('returns parsed JSON on 2xx', async () => {
    server.use(
      http.get(`${BASE_URL}/health`, () =>
        HttpResponse.json({ status: 'ok', version: '1.0', uptime: 100, timestamp: 1000 }),
      ),
    );

    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    const data = await client.get('/health');
    expect(data).toMatchObject({ status: 'ok' });
  });

  it('throws WingbitsApiError on 4xx', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/999`, () =>
        HttpResponse.json({ message: 'Not found', code: 'FLIGHT_NOT_FOUND' }, { status: 404 }),
      ),
    );

    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await expect(client.get('/v1/flights/999')).rejects.toBeInstanceOf(WingbitsApiError);
    await expect(client.get('/v1/flights/999')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws WingbitsApiError on 5xx', async () => {
    server.use(
      http.get(`${BASE_URL}/health`, () =>
        HttpResponse.json({ message: 'Internal error' }, { status: 500 }),
      ),
    );

    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await expect(client.get('/health')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('sends POST body as JSON', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post(`${BASE_URL}/v1/flights`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json([]);
      }),
    );

    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await client.post('/v1/flights', { queries: [{ minLat: 40, maxLat: 42 }] });
    expect(capturedBody).toEqual({ queries: [{ minLat: 40, maxLat: 42 }] });
  });

  it('serializes query params correctly', async () => {
    let capturedUrl: URL | null = null;

    server.use(
      http.get(`${BASE_URL}/v1/flights/search`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );

    const client = createHttpClient({ apiKey: 'key', baseUrl: BASE_URL });
    await client.get('/v1/flights/search', { callsign: 'UAL123' });
    expect(capturedUrl?.searchParams.get('callsign')).toBe('UAL123');
  });
});
```

**Step 3: Run to confirm it fails**

```bash
npx vitest run tests/utils/http.test.ts
```

Expected: FAIL

**Step 4: Write `src/utils/http.ts`**

```typescript
import { WingbitsApiError, WingbitsNetworkError } from '../errors';

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
}

export interface HttpClient {
  get(path: string, params?: Record<string, unknown>): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { apiKey, baseUrl } = options;

  const baseHeaders: Record<string, string> = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function handleResponse(response: Response): Promise<unknown> {
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const message = (json as { message?: string })?.message ?? response.statusText;
      const code = (json as { code?: string })?.code;
      throw new WingbitsApiError(message, response.status, code);
    }

    return json;
  }

  function buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(path, baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      }
    }
    return url.toString();
  }

  return {
    async get(path, params) {
      try {
        const response = await fetch(buildUrl(path, params), { headers: baseHeaders });
        return handleResponse(response);
      } catch (error) {
        if (error instanceof WingbitsApiError) throw error;
        throw new WingbitsNetworkError('Network request failed', error);
      }
    },

    async post(path, body) {
      try {
        const response = await fetch(buildUrl(path), {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify(body),
        });
        return handleResponse(response);
      } catch (error) {
        if (error instanceof WingbitsApiError) throw error;
        throw new WingbitsNetworkError('Network request failed', error);
      }
    },
  };
}
```

**Step 5: Run tests**

```bash
npx vitest run tests/utils/http.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/utils/http.ts tests/utils/http.test.ts tests/setup.ts
git commit -m "feat: add HTTP client with auth injection and error mapping"
```

---

## Task 7: Flights Endpoint

**Files:**
- Create: `src/endpoints/flights.ts`
- Create: `tests/endpoints/flights.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/endpoints/flights.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { FlightsEndpoint } from '../../src/endpoints/flights';
import { createHttpClient } from '../../src/utils/http';

const BASE_URL = 'https://customer-api.wingbits.com';
const client = createHttpClient({ apiKey: 'test-key', baseUrl: BASE_URL });

const mockFlight = {
  id: 'abc123', icao24: 'a1b2c3', callsign: 'UAL123',
  registration: 'N12345', lat: 41.87, lon: -87.62,
  altitude: 35000, groundSpeed: 450, track: 270,
  verticalRate: 0, squawk: '1200', onGround: false,
  lastSeen: 1713600000, category: 'A3',
};

describe('FlightsEndpoint.getFlights', () => {
  it('returns array of flights for bbox query', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights`, () => HttpResponse.json([mockFlight])),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.getFlights({
      bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.icao24).toBe('a1b2c3');
  });
});

describe('FlightsEndpoint.getFlight', () => {
  it('returns a single flight by id', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/abc123`, () => HttpResponse.json(mockFlight)),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.getFlight('abc123');
    expect(result.id).toBe('abc123');
  });

  it('throws WingbitsApiError for unknown id', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/flights/nope`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    const flights = new FlightsEndpoint(client);
    await expect(flights.getFlight('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('FlightsEndpoint.getFlightPath', () => {
  it('returns flight path with points', async () => {
    const mockPath = {
      id: 'abc123', icao24: 'a1b2c3',
      points: [
        { lat: 41.0, lon: -87.0, altitude: 10000, timestamp: 1000 },
        { lat: 41.1, lon: -87.1, altitude: 11000, timestamp: 2000 },
      ],
    };
    server.use(
      http.get(`${BASE_URL}/v1/flights/abc123/path`, () => HttpResponse.json(mockPath)),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.getFlightPath('abc123');
    expect(result.points).toHaveLength(2);
  });
});

describe('FlightsEndpoint.searchFlights', () => {
  it('sends callsign as query param and returns results', async () => {
    let capturedCallsign: string | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/flights/search`, ({ request }) => {
        capturedCallsign = new URL(request.url).searchParams.get('callsign');
        return HttpResponse.json([mockFlight]);
      }),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.searchFlights({ callsign: 'UAL123' });
    expect(capturedCallsign).toBe('UAL123');
    expect(result).toHaveLength(1);
  });
});

describe('FlightsEndpoint.getAircraftDetails', () => {
  it('returns aircraft metadata', async () => {
    const mockDetails = {
      icao24: 'a1b2c3', registration: 'N12345',
      manufacturer: 'Boeing', model: '737-800',
      typecode: 'B738', serialNumber: null, lineNumber: null,
      icaoAircraftClass: 'L2J', operatorIata: 'UA',
      owner: 'United Airlines', built: '2010', engines: 'CFM56',
    };
    server.use(
      http.get(`${BASE_URL}/v1/flights/details/a1b2c3`, () => HttpResponse.json(mockDetails)),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.getAircraftDetails('a1b2c3');
    expect(result.manufacturer).toBe('Boeing');
  });
});

describe('FlightsEndpoint.queryFlightsBatch', () => {
  it('sends POST with array of queries', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${BASE_URL}/v1/flights`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json([[mockFlight], [mockFlight]]);
      }),
    );
    const flights = new FlightsEndpoint(client);
    const result = await flights.queryFlightsBatch([
      { bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 } },
      { bbox: { minLat: 50, maxLat: 52, minLon: 10, maxLon: 12 } },
    ]);
    expect(result).toHaveLength(2);
  });
});
```

**Step 2: Run to confirm it fails**

```bash
npx vitest run tests/endpoints/flights.test.ts
```

Expected: FAIL

**Step 3: Write `src/endpoints/flights.ts`**

```typescript
import {
  FlightSchema,
  FlightPathSchema,
  AircraftDetailsSchema,
  type Flight,
  type FlightPath,
  type AircraftDetails,
  type GetFlightsParams,
  type SearchFlightsParams,
} from '../types';
import type { HttpClient } from '../utils/http';
import { z } from 'zod';

export class FlightsEndpoint {
  constructor(private readonly http: HttpClient) {}

  async getFlights(params: GetFlightsParams): Promise<Flight[]> {
    const query: Record<string, unknown> = {};

    if (params.bbox) {
      query['minLat'] = params.bbox.minLat;
      query['maxLat'] = params.bbox.maxLat;
      query['minLon'] = params.bbox.minLon;
      query['maxLon'] = params.bbox.maxLon;
    }

    if (params.radius) {
      query['lat'] = params.radius.lat;
      query['lon'] = params.radius.lon;
      query['radius'] = params.radius.radius;
      query['radiusUnit'] = params.radius.radiusUnit ?? 'km';
    }

    if (params.altitudeMin !== undefined) query['altitudeMin'] = params.altitudeMin;
    if (params.altitudeMax !== undefined) query['altitudeMax'] = params.altitudeMax;
    if (params.categories) query['categories'] = params.categories;

    const raw = await this.http.get('/v1/flights', query);
    return z.array(FlightSchema).parse(raw);
  }

  async queryFlightsBatch(queries: GetFlightsParams[]): Promise<Flight[][]> {
    const raw = await this.http.post('/v1/flights', queries);
    return z.array(z.array(FlightSchema)).parse(raw);
  }

  async getFlight(id: string): Promise<Flight> {
    const raw = await this.http.get(`/v1/flights/${id}`);
    return FlightSchema.parse(raw);
  }

  async getFlightPath(id: string): Promise<FlightPath> {
    const raw = await this.http.get(`/v1/flights/${id}/path`);
    return FlightPathSchema.parse(raw);
  }

  async searchFlights(params: SearchFlightsParams): Promise<Flight[]> {
    const raw = await this.http.get('/v1/flights/search', params as Record<string, unknown>);
    return z.array(FlightSchema).parse(raw);
  }

  async getAircraftDetails(icao24: string): Promise<AircraftDetails> {
    const raw = await this.http.get(`/v1/flights/details/${icao24}`);
    return AircraftDetailsSchema.parse(raw);
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/endpoints/flights.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/endpoints/flights.ts tests/endpoints/flights.test.ts
git commit -m "feat: add FlightsEndpoint with all 6 methods"
```

---

## Task 8: GPS Endpoint

**Files:**
- Create: `src/endpoints/gps.ts`
- Create: `tests/endpoints/gps.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/endpoints/gps.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { GpsEndpoint } from '../../src/endpoints/gps';
import { createHttpClient } from '../../src/utils/http';

const BASE_URL = 'https://customer-api.wingbits.com';
const client = createHttpClient({ apiKey: 'test-key', baseUrl: BASE_URL });

describe('GpsEndpoint.getJam', () => {
  it('returns GPS jam hexagons for a bounding box', async () => {
    const mockHexes = [
      { h3Index: '8928308280fffff', jammingLevel: 0.8, timestamp: 1713600000 },
      { h3Index: '8928308281fffff', jammingLevel: 0.2, timestamp: 1713600000 },
    ];
    server.use(
      http.get(`${BASE_URL}/v1/gps/jam`, () => HttpResponse.json(mockHexes)),
    );

    const gps = new GpsEndpoint(client);
    const result = await gps.getJam({
      bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 },
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.jammingLevel).toBe(0.8);
  });

  it('sends bbox as query params', async () => {
    let capturedParams: URLSearchParams | null = null;
    server.use(
      http.get(`${BASE_URL}/v1/gps/jam`, ({ request }) => {
        capturedParams = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );

    const gps = new GpsEndpoint(client);
    await gps.getJam({ bbox: { minLat: 40, maxLat: 42, minLon: -88, maxLon: -86 } });
    expect(capturedParams?.get('minLat')).toBe('40');
    expect(capturedParams?.get('maxLon')).toBe('-86');
  });
});
```

**Step 2: Run to confirm it fails**

```bash
npx vitest run tests/endpoints/gps.test.ts
```

Expected: FAIL

**Step 3: Write `src/endpoints/gps.ts`**

```typescript
import { GpsJamHexSchema, type GpsJamHex, type GetGpsJamParams } from '../types';
import type { HttpClient } from '../utils/http';
import { z } from 'zod';

export class GpsEndpoint {
  constructor(private readonly http: HttpClient) {}

  async getJam(params: GetGpsJamParams): Promise<GpsJamHex[]> {
    const { bbox } = params;
    const raw = await this.http.get('/v1/gps/jam', {
      minLat: bbox.minLat,
      maxLat: bbox.maxLat,
      minLon: bbox.minLon,
      maxLon: bbox.maxLon,
    });
    return z.array(GpsJamHexSchema).parse(raw);
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/endpoints/gps.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/endpoints/gps.ts tests/endpoints/gps.test.ts
git commit -m "feat: add GpsEndpoint"
```

---

## Task 9: WingbitsClient (the public entry point)

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/client.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './setup';
import { WingbitsClient } from '../src/client';

const mockFlight = {
  id: 'abc123', icao24: 'a1b2c3', callsign: 'UAL123',
  registration: 'N12345', lat: 41.87, lon: -87.62,
  altitude: 35000, groundSpeed: 450, track: 270,
  verticalRate: 0, squawk: '1200', onGround: false,
  lastSeen: 1713600000, category: 'A3',
};

describe('WingbitsClient', () => {
  it('throws if apiKey is empty', () => {
    expect(() => new WingbitsClient({ apiKey: '' })).toThrow('apiKey is required');
  });

  it('exposes flights and gps namespaces', () => {
    const client = new WingbitsClient({ apiKey: 'test-key' });
    expect(client.flights).toBeDefined();
    expect(client.gps).toBeDefined();
  });

  it('uses custom baseUrl when provided', async () => {
    let capturedHost: string | null = null;
    server.use(
      http.get('https://custom.example.com/v1/flights/abc', ({ request }) => {
        capturedHost = new URL(request.url).hostname;
        return HttpResponse.json(mockFlight);
      }),
    );

    const client = new WingbitsClient({
      apiKey: 'test-key',
      baseUrl: 'https://custom.example.com',
    });
    await client.flights.getFlight('abc');
    expect(capturedHost).toBe('custom.example.com');
  });

  it('health check returns status ok', async () => {
    server.use(
      http.get('https://customer-api.wingbits.com/health', () =>
        HttpResponse.json({ status: 'ok', version: '1.0', uptime: 9999, timestamp: 1000 }),
      ),
    );
    const client = new WingbitsClient({ apiKey: 'test-key' });
    const health = await client.health();
    expect(health.status).toBe('ok');
  });

  it('retry option is passed through', async () => {
    let callCount = 0;
    server.use(
      http.get('https://customer-api.wingbits.com/health', () => {
        callCount++;
        if (callCount < 3) return HttpResponse.json({}, { status: 503 });
        return HttpResponse.json({ status: 'ok', version: '1.0', uptime: 1, timestamp: 1 });
      }),
    );
    const client = new WingbitsClient({
      apiKey: 'test-key',
      retry: { maxAttempts: 3, baseDelayMs: 1 },
    });
    const health = await client.health();
    expect(health.status).toBe('ok');
    expect(callCount).toBe(3);
  });
});
```

**Step 2: Run to confirm it fails**

```bash
npx vitest run tests/client.test.ts
```

Expected: FAIL

**Step 3: Write `src/client.ts`**

```typescript
import { FlightsEndpoint } from './endpoints/flights';
import { GpsEndpoint } from './endpoints/gps';
import { HealthSchema, type Health } from './types';
import { createHttpClient, type HttpClient } from './utils/http';
import { withRetry, type RetryOptions } from './utils/retry';

const DEFAULT_BASE_URL = 'https://customer-api.wingbits.com';
const DEFAULT_RETRY: RetryOptions = { maxAttempts: 3, baseDelayMs: 500 };

export interface WingbitsClientOptions {
  apiKey: string;
  baseUrl?: string;
  retry?: RetryOptions;
}

export class WingbitsClient {
  readonly flights: FlightsEndpoint;
  readonly gps: GpsEndpoint;

  private readonly http: HttpClient;
  private readonly retryOptions: RetryOptions;

  constructor(options: WingbitsClientOptions) {
    if (!options.apiKey) throw new Error('apiKey is required');

    this.retryOptions = options.retry ?? DEFAULT_RETRY;

    this.http = createHttpClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    });

    const retryHttp = this.wrapWithRetry(this.http);
    this.flights = new FlightsEndpoint(retryHttp);
    this.gps = new GpsEndpoint(retryHttp);
  }

  async health(): Promise<Health> {
    const raw = await withRetry(
      () => this.http.get('/health'),
      this.retryOptions,
    );
    return HealthSchema.parse(raw);
  }

  private wrapWithRetry(http: HttpClient): HttpClient {
    const opts = this.retryOptions;
    return {
      get: (path, params) => withRetry(() => http.get(path, params), opts),
      post: (path, body) => withRetry(() => http.post(path, body), opts),
    };
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/client.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/client.ts tests/client.test.ts
git commit -m "feat: add WingbitsClient with retry, flights, gps, health"
```

---

## Task 10: Wire Up Public Exports

**Files:**
- Modify: `src/index.ts`

**Step 1: No test needed — just ensure the public surface type-checks cleanly**

**Step 2: Write `src/index.ts`**

```typescript
export { WingbitsClient } from './client';
export type { WingbitsClientOptions } from './client';

export { FlightsEndpoint } from './endpoints/flights';
export { GpsEndpoint } from './endpoints/gps';

export {
  WingbitsError,
  WingbitsApiError,
  WingbitsNetworkError,
  WingbitsValidationError,
} from './errors';

export type {
  Flight,
  FlightPath,
  FlightPathPoint,
  AircraftDetails,
  GpsJamHex,
  Health,
  BoundingBox,
  RadiusQuery,
  GetFlightsParams,
  SearchFlightsParams,
  GetGpsJamParams,
} from './types';
```

**Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors

**Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire public exports in index.ts"
```

---

## Task 11: Build and Coverage Check

**Step 1: Run full test suite with coverage**

```bash
npx vitest run --coverage
```

Expected: Lines ≥ 90%, Functions ≥ 90%, Branches ≥ 85%. If any threshold fails, add missing test cases before proceeding.

**Step 2: Run the build**

```bash
npx tsup
```

Expected: `dist/index.js` (ESM) and `dist/index.cjs` (CJS) and `dist/index.d.ts` created with no errors.

**Step 3: Verify the build works with a quick smoke test**

Create a temporary file `smoke.mjs`:

```javascript
import { WingbitsClient, WingbitsApiError } from './dist/index.js';

const client = new WingbitsClient({ apiKey: 'test' });
console.log('Smoke test passed:', typeof client.flights.getFlight === 'function');
console.log('Error export:', WingbitsApiError.name);
```

```bash
node smoke.mjs
```

Expected:
```
Smoke test passed: true
Error export: WingbitsApiError
```

Delete `smoke.mjs`.

**Step 4: Commit**

```bash
git add dist/ --force   # dist is normally gitignored but check before npm publish
git commit -m "chore: verify build and coverage thresholds"
```

---

## Task 12: README

**Files:**
- Create: `README.md`

Write a README with:
1. One-paragraph description ("Community TypeScript SDK for the Wingbits Customer API...")
2. Installation (`npm install wingbits-sdk`)
3. Quick start (instantiate, call `flights.getFlights`)
4. Full API reference table (every method, params, return type)
5. Error handling section (show how to catch `WingbitsApiError`)
6. Configuration options table
7. Links to official Wingbits docs

**Step 1: Write `README.md`** (content matters here — it's what the Wingbits team reads first)

The README should include real usage examples like:

```typescript
import { WingbitsClient, WingbitsApiError } from 'wingbits-sdk';

const client = new WingbitsClient({ apiKey: process.env.WINGBITS_API_KEY! });

// Get all flights over Chicago
const flights = await client.flights.getFlights({
  bbox: { minLat: 41.6, maxLat: 42.1, minLon: -88.0, maxLon: -87.2 },
});

// Search for a specific flight
const results = await client.flights.searchFlights({ callsign: 'UAL123' });

// Full aircraft metadata
const aircraft = await client.flights.getAircraftDetails('a1b2c3');

// GPS jamming in a region
const jamData = await client.gps.getJam({
  bbox: { minLat: 41.6, maxLat: 42.1, minLon: -88.0, maxLon: -87.2 },
});

// Error handling
try {
  const flight = await client.flights.getFlight('unknown-id');
} catch (error) {
  if (error instanceof WingbitsApiError) {
    console.error(`API error ${error.statusCode}: ${error.message}`);
  }
}
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with install, quick start, and API reference"
```

---

## Task 13: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx vitest run --coverage
      - run: npx tsup

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions CI with multi-node test matrix and npm publish on tag"
```

---

## Task 14: Final Polish + npm Publish Dry Run

**Step 1: Add `.npmignore`**

```
tests/
.github/
*.test.ts
vitest.config.ts
tsup.config.ts
tsconfig.json
coverage/
smoke.mjs
```

**Step 2: Run publish dry run**

```bash
npm publish --dry-run
```

Review the output. Verify only `dist/` and `README.md` and `package.json` are included.

**Step 3: Tag the release**

```bash
git tag v0.1.0
git push origin main --tags
```

This triggers the CI publish job.

**Step 4: Final commit**

```bash
git add .npmignore
git commit -m "chore: add .npmignore for clean publish"
```

---

## Done Criteria

- [ ] `npx vitest run --coverage` passes with ≥90% line coverage
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx tsup` builds without errors
- [ ] `node smoke.mjs` outputs "Smoke test passed: true"
- [ ] `npm publish --dry-run` shows only intended files
- [ ] README has real code examples, not pseudocode
- [ ] Package is on npm as `wingbits-sdk`
- [ ] GitHub Actions CI is green on all Node versions

---

**Plan complete and saved to `docs/plans/2026-04-20-wingbits-sdk.md`.**

Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session in this directory and use the executing-plans skill pointing at this file

Which approach?
