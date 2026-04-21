import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { WingbitsClient } from 'wingbits-sdk';
import { TuiApp } from '../../src/ui/tui/tui-app.js';

function mockClient(): WingbitsClient {
  return {
    flights: {
      getFlights: vi.fn().mockResolvedValue([]),
      getFlightPath: vi.fn().mockResolvedValue({
        id: 'x',
        icao24: 'abc123',
        points: [{ lat: 0, lon: 0, altitude: 1000, timestamp: 1 }],
      }),
      searchFlights: vi.fn().mockResolvedValue([]),
      getAircraftDetails: vi.fn().mockRejectedValue(new Error('no')),
    },
    gps: { getJam: vi.fn().mockResolvedValue([]) },
  } as unknown as WingbitsClient;
}

describe('TuiApp', () => {
  it('renders header', () => {
    const { lastFrame } = render(
      <TuiApp
        client={mockClient()}
        initialBbox={{ minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 }}
        initialIntervalSec={5}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame.includes('wingbits') || frame.includes('▸')).toBe(true);
  });
});
