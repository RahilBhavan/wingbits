import { WingbitsClient } from 'wingbits-sdk';
import { ensureApiKey, type EnsureApiKeyOptions } from './api-key.js';

/** Build a configured SDK client (reads API key via ensureApiKey). */
export async function createCliClient(options: EnsureApiKeyOptions = {}): Promise<WingbitsClient> {
  const apiKey = await ensureApiKey(options);
  return new WingbitsClient({ apiKey });
}
