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
export type { ValidationIssue } from './errors';

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

export { RateLimiter } from './utils/rate-limiter';
export type { RateLimiterOptions } from './utils/rate-limiter';
export { withRetry } from './utils/retry';
export type { RetryOptions } from './utils/retry';
