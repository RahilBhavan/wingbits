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
    const raw = await withRetry(() => this.http.get('/health'), this.retryOptions);
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
