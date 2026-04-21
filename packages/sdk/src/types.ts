import { z } from 'zod';

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

// Input param types (caller-provided, no Zod validation needed)
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
