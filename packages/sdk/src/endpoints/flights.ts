import { z } from 'zod';
import {
  FlightSchema, FlightPathSchema, AircraftDetailsSchema,
  type Flight, type FlightPath, type AircraftDetails,
  type GetFlightsParams, type SearchFlightsParams,
} from '../types';
import type { HttpClient } from '../utils/http';

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
