import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { WingbitsClient } from 'wingbits-sdk';
import type { BoundingBox, Flight } from 'wingbits-sdk';
import { inkColorForAltitudeFt } from '../utils/flight-ink-color.js';

interface WatchDashboardProps {
  client: WingbitsClient;
  bbox: BoundingBox;
  intervalSec: number;
}

/**
 * Live-updating terminal dashboard: polls flights in bbox on an interval.
 */
export function WatchDashboard({ client, bbox, intervalSec }: WatchDashboardProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        setLoading(true);
        const data = await client.flights.getFlights({ bbox });
        if (cancelled) return;
        setFlights(data);
        setError(null);
        setLastUpdate(Date.now());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void tick();
    const id = setInterval(() => void tick(), Math.max(1, intervalSec) * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, bbox, intervalSec]);

  const header = `Wingbits live | ${flights.length} flights | bbox ${bbox.minLat},${bbox.maxLat},${bbox.minLon},${bbox.maxLon} | refresh ${intervalSec}s | updated ${new Date(lastUpdate).toISOString()}`;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {header}
      </Text>
      {loading && flights.length === 0 ? (
        <Box>
          <Text color="yellow">Loading…</Text>
        </Box>
      ) : null}
      {error ? (
        <Text color="red">{error}</Text>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {flights.slice(0, 40).map((f) => {
            const line = `${(f.callsign ?? '—').padEnd(10)} ${f.icao24.padEnd(8)} ${String(Math.round(f.altitude)).padStart(6)}ft ${String(Math.round(f.groundSpeed)).padStart(4)}kt ${String(Math.round(f.track)).padStart(3)}° ${f.lat.toFixed(4)} ${f.lon.toFixed(4)}`;
            return (
              <Text key={f.id} color={inkColorForAltitudeFt(f.altitude, f.onGround)}>
                {line}
              </Text>
            );
          })}
          {flights.length > 40 ? (
            <Text dimColor>…and {flights.length - 40} more (showing first 40)</Text>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
