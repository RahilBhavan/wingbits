import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { configStore } from './config-store.js';

export interface EnsureApiKeyOptions {
  /** From --api-key flag */
  flagKey?: string | undefined;
  /** Fail instead of prompting (CI / scripts) */
  nonInteractive?: boolean | undefined;
}

/**
 * Resolve API key: flag → env → saved config → interactive prompt.
 */
export async function ensureApiKey(options: EnsureApiKeyOptions = {}): Promise<string> {
  if (options.flagKey?.trim()) return options.flagKey.trim();

  const fromEnv = process.env.WINGBITS_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const saved = configStore.get('apiKey');
  if (typeof saved === 'string' && saved.trim()) return saved.trim();

  if (options.nonInteractive) {
    throw new Error(
      'No API key: set WINGBITS_API_KEY, run `wingbits config set api-key <key>`, or pass --api-key',
    );
  }

  const rl = readline.createInterface({ input, output });
  try {
    console.log('');
    console.log('Welcome to Wingbits CLI!');
    console.log('Enter your API key (get one at https://wingbits.com/pricing):');
    const key = await rl.question('> ');
    const trimmed = key.trim();
    if (!trimmed) throw new Error('API key is required');
    configStore.set('apiKey', trimmed);
    console.log('API key saved to ~/.config/wingbits/config.json');
    console.log('');
    return trimmed;
  } finally {
    rl.close();
  }
}
