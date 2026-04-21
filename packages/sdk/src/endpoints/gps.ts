import { z } from 'zod';
import { GpsJamHexSchema, type GpsJamHex, type GetGpsJamParams } from '../types';
import type { HttpClient } from '../utils/http';

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
