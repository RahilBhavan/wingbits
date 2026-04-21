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
