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
      const message = (json as { message?: string } | null)?.message ?? response.statusText;
      const code = (json as { code?: string } | null)?.code;
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
