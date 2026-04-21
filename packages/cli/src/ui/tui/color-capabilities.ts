/**
 * Terminal color capability for Ink/chalk styling (truecolor-first with sane fallbacks).
 */
export type ColorLevel = 'none' | '16' | '256' | 'truecolor';

export interface ColorCapabilityOptions {
  env?: NodeJS.ProcessEnv;
  isTTY?: boolean;
}

/**
 * Detect best color mode from env + TTY. Respects NO_COLOR.
 */
export function getColorLevel(options: ColorCapabilityOptions = {}): ColorLevel {
  const env = options.env ?? process.env;
  const isTTY = options.isTTY ?? process.stdout.isTTY;

  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') {
    return 'none';
  }
  if (!isTTY) {
    return 'none';
  }

  const ct = env.COLORTERM;
  if (ct === 'truecolor' || ct === '24bit') {
    return 'truecolor';
  }

  const term = env.TERM ?? '';
  if (term.includes('256color') || term.endsWith('-256color')) {
    return '256';
  }

  return '16';
}
