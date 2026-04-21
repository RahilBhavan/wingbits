import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { WingbitsClient } from 'wingbits-sdk';
import type {
  AircraftDetails,
  BoundingBox,
  Flight,
  FlightPath,
  GpsJamHex,
} from 'wingbits-sdk';
import { parseBboxString } from '../../utils/bbox.js';
import { jammingLabel } from '../../utils/colors.js';
import { filterFlightsBySubstring } from './filter-flights.js';
import { clamp, ensureScroll } from './layout.js';
import { inferSearchParams } from './search-params.js';
import { getColorLevel, type ColorLevel } from './color-capabilities.js';
import {
  flightListColumns,
  flightListHeader,
  formatFlightRow,
  truncateMiddle,
} from './format-columns.js';
import { ErrorBanner, SectionHeader } from './panel-chrome.js';
import { SparklineGradient } from './sparkline-gradient.js';
import {
  themeAccentPrimary,
  themeAltitudeFg,
  themeJamFg,
  themeSelectionBg,
  themeBorderMuted,
} from './theme.js';
import { inkFgBg } from './ink-text-props.js';

export interface TuiAppProps {
  client: WingbitsClient;
  initialBbox: BoundingBox;
  initialIntervalSec: number;
}

type Overlay = 'none' | 'search' | 'bbox' | 'filter' | 'help';

type ViewMode =
  | { kind: 'bbox' }
  | { kind: 'search'; results: Flight[]; queryLabel: string };

function ruleChar(width: number): string {
  return '─'.repeat(Math.max(0, width));
}

export function TuiApp({ client, initialBbox, initialIntervalSec }: TuiAppProps) {
  const { exit } = useApp();
  const stdout = useStdout();

  const rows = stdout.stdout.rows ?? 24;
  const cols = stdout.stdout.columns ?? 80;

  const colorCap: ColorLevel = useMemo(() => getColorLevel(), []);

  const [bbox, setBbox] = useState<BoundingBox>(initialBbox);
  const [intervalSec, setIntervalSec] = useState(() =>
    clamp(Math.floor(initialIntervalSec), 1, 3600),
  );
  const [paused, setPaused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>({ kind: 'bbox' });
  const [bboxFlights, setBboxFlights] = useState<Flight[]>([]);
  const [gpsHexes, setGpsHexes] = useState<GpsJamHex[]>([]);
  const [gpsVisible, setGpsVisible] = useState(true);

  const [pollError, setPollError] = useState<string | null>(null);
  const [lastPollAt, setLastPollAt] = useState<number | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(false);

  const [localFilter, setLocalFilter] = useState('');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [overlayBuffer, setOverlayBuffer] = useState('');

  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const [path, setPath] = useState<FlightPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathNonce, setPathNonce] = useState(0);

  const [aircraft, setAircraft] = useState<AircraftDetails | null>(null);
  const [aircraftLoading, setAircraftLoading] = useState(false);

  const [searchRunning, setSearchRunning] = useState(false);

  const baseFlights: Flight[] =
    viewMode.kind === 'bbox' ? bboxFlights : viewMode.results;

  const filteredFlights = useMemo(
    () => filterFlightsBySubstring(baseFlights, localFilter),
    [baseFlights, localFilter],
  );

  const selectedIndex = useMemo(() => {
    if (!selectedFlightId) return -1;
    return filteredFlights.findIndex((f) => f.id === selectedFlightId);
  }, [filteredFlights, selectedFlightId]);

  const selectedFlight: Flight | null =
    selectedIndex >= 0 ? filteredFlights[selectedIndex]! : null;

  const listPaneWidth = Math.max(36, Math.floor(cols * 0.46));
  const detailWidth = Math.max(28, cols - listPaneWidth - 3);
  const columnSpec = flightListColumns(listPaneWidth - 2);
  const ruleW = Math.min(cols - 4, listPaneWidth);

  const reservedRows =
    4 +
    (pollError ? 3 : 0) +
    (gpsVisible ? 4 : 2) +
    (overlay !== 'none' ? 5 : 0);
  const mainHeight = Math.max(10, rows - reservedRows);
  const listViewport = Math.max(5, Math.floor(mainHeight * 0.52));
  const detailBlockMin = Math.max(6, mainHeight - listViewport);

  useEffect(() => {
    if (filteredFlights.length === 0) {
      setScrollTop(0);
      return;
    }
    const idx = selectedIndex >= 0 ? selectedIndex : 0;
    setScrollTop((st) => ensureScroll(idx, st, listViewport, filteredFlights.length));
  }, [selectedIndex, listViewport, filteredFlights.length]);

  useEffect(() => {
    if (filteredFlights.length === 0) {
      setSelectedFlightId(null);
      return;
    }
    if (
      selectedFlightId &&
      !filteredFlights.some((f) => f.id === selectedFlightId)
    ) {
      setSelectedFlightId(filteredFlights[0]!.id);
    }
    if (!selectedFlightId && filteredFlights[0]) {
      setSelectedFlightId(filteredFlights[0].id);
    }
  }, [filteredFlights, selectedFlightId]);

  useEffect(() => {
    if (viewMode.kind !== 'bbox' || paused) return;
    let cancelled = false;

    async function tick() {
      setLoadingPoll(true);
      try {
        const [flights, jam] = await Promise.all([
          client.flights.getFlights({ bbox }),
          gpsVisible ? client.gps.getJam({ bbox }) : Promise.resolve([] as GpsJamHex[]),
        ]);
        if (cancelled) return;
        setBboxFlights(flights);
        if (gpsVisible) setGpsHexes(jam);
        setPollError(null);
        setLastPollAt(Date.now());
      } catch (e) {
        if (!cancelled) {
          setPollError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoadingPoll(false);
      }
    }

    void tick();
    const id = setInterval(() => void tick(), intervalSec * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, bbox, intervalSec, paused, viewMode, gpsVisible]);

  useEffect(() => {
    const f = selectedFlight;
    if (!f) {
      setAircraft(null);
      return;
    }
    let cancelled = false;
    setAircraftLoading(true);
    void (async () => {
      try {
        const a = await client.flights.getAircraftDetails(f.icao24);
        if (!cancelled) setAircraft(a);
      } catch {
        if (!cancelled) setAircraft(null);
      } finally {
        if (!cancelled) setAircraftLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, selectedFlight?.icao24]);

  useEffect(() => {
    const f = selectedFlight;
    if (!f) {
      setPath(null);
      setPathError(null);
      setPathLoading(false);
      return;
    }
    let cancelled = false;
    setPathLoading(true);
    setPathError(null);
    void (async () => {
      try {
        const p = await client.flights.getFlightPath(f.id);
        if (!cancelled) {
          setPath(p);
          setPathError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPath(null);
          setPathError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setPathLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFlight?.id, pathNonce]);

  const moveSelection = useCallback(
    (delta: number) => {
      if (filteredFlights.length === 0) return;
      const cur = selectedIndex >= 0 ? selectedIndex : 0;
      const next = clamp(cur + delta, 0, filteredFlights.length - 1);
      setSelectedFlightId(filteredFlights[next]!.id);
      setScrollTop((st) =>
        ensureScroll(next, st, listViewport, filteredFlights.length),
      );
    },
    [filteredFlights, listViewport, selectedIndex],
  );

  const openOverlay = useCallback(
    (o: 'search' | 'bbox' | 'filter') => {
      setOverlay(o);
      if (o === 'search') setOverlayBuffer('');
      if (o === 'bbox') {
        setOverlayBuffer(
          `${bbox.minLat},${bbox.maxLat},${bbox.minLon},${bbox.maxLon}`,
        );
      }
      if (o === 'filter') setOverlayBuffer(localFilter);
    },
    [bbox, localFilter],
  );

  const submitSearch = useCallback(async () => {
    const params = inferSearchParams(overlayBuffer);
    if (!params) {
      setOverlay('none');
      return;
    }
    setSearchRunning(true);
    setOverlay('none');
    try {
      const results = await client.flights.searchFlights(params);
      setViewMode({ kind: 'search', results, queryLabel: overlayBuffer.trim() });
      setSelectedFlightId(results[0]?.id ?? null);
      setScrollTop(0);
      setPollError(null);
    } catch (e) {
      setPollError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearchRunning(false);
    }
  }, [client, overlayBuffer]);

  const submitBbox = useCallback(() => {
    try {
      const next = parseBboxString(overlayBuffer);
      setBbox(next);
      setOverlay('none');
      if (viewMode.kind === 'search') {
        setViewMode({ kind: 'bbox' });
      }
    } catch (e) {
      setPollError(e instanceof Error ? e.message : String(e));
    }
  }, [overlayBuffer, viewMode.kind]);

  const submitFilter = useCallback(() => {
    setLocalFilter(overlayBuffer);
    setOverlay('none');
  }, [overlayBuffer]);

  useInput(
    (input, key) => {
      if (overlay === 'help') {
        if (key.escape || input === '?') {
          setOverlay('none');
        }
        return;
      }

      if (overlay !== 'none') {
        if (key.escape) {
          setOverlay('none');
          return;
        }
        if (overlay === 'search' || overlay === 'filter') {
          if (key.return) {
            if (overlay === 'search') void submitSearch();
            else submitFilter();
            return;
          }
          if (key.backspace || key.delete) {
            setOverlayBuffer((b) => b.slice(0, -1));
            return;
          }
          if (input && !key.ctrl && !key.meta) {
            setOverlayBuffer((b) => b + input);
          }
          return;
        }
        if (overlay === 'bbox') {
          if (key.return) {
            submitBbox();
            return;
          }
          if (key.backspace || key.delete) {
            setOverlayBuffer((b) => b.slice(0, -1));
            return;
          }
          if (input && !key.ctrl && !key.meta) {
            setOverlayBuffer((b) => b + input);
          }
        }
        return;
      }

      if (key.escape && viewMode.kind === 'search') {
        setViewMode({ kind: 'bbox' });
        setPollError(null);
        return;
      }

      if (input === '?' && !key.ctrl) {
        setOverlay('help');
        return;
      }

      if (input === 'q' && !key.ctrl) {
        exit();
        return;
      }

      if (input === ' ' || input === 'p') {
        setPaused((p) => !p);
        return;
      }
      if (input === 'r') {
        setPathNonce((n) => n + 1);
        return;
      }
      if (input === 'g') {
        setGpsVisible((v) => !v);
        return;
      }
      if (input === '/') {
        openOverlay('search');
        return;
      }
      if (input === 'b') {
        openOverlay('bbox');
        return;
      }
      if (input === 'f') {
        openOverlay('filter');
        return;
      }
      if (input === '[') {
        setIntervalSec((s) => clamp(s - 1, 1, 3600));
        return;
      }
      if (input === ']') {
        setIntervalSec((s) => clamp(s + 1, 1, 3600));
        return;
      }

      if (key.upArrow || input === 'k') {
        moveSelection(-1);
        return;
      }
      if (key.downArrow || input === 'j') {
        moveSelection(1);
        return;
      }
      if (key.pageUp) {
        moveSelection(-listViewport);
        return;
      }
      if (key.pageDown) {
        moveSelection(listViewport);
        return;
      }
    },
    {
      isActive: true,
    },
  );

  const visible = filteredFlights.slice(scrollTop, scrollTop + listViewport);

  const alts =
    path && path.points.length > 0 ? path.points.map((p) => p.altitude) : [];

  const gpsSorted = useMemo(
    () => [...gpsHexes].sort((a, b) => b.jammingLevel - a.jammingLevel).slice(0, 10),
    [gpsHexes],
  );

  const headerLeft =
    viewMode.kind === 'search'
      ? `SEARCH “${viewMode.queryLabel}” · ${filteredFlights.length} rows`
      : `BBOX ${bbox.minLat},${bbox.maxLat},${bbox.minLon},${bbox.maxLon}`;

  const hintLine =
    cols >= 96
      ? 'j/k · PgUp/Pg · / search · f filter · b bbox · [] · g GPS · p pause · r path · ? help · q quit'
      : '? help · q quit · / search · esc';

  const borderMuted = themeBorderMuted(colorCap);

  return (
    <Box flexDirection="column" padding={0}>
      <Box
        borderStyle="single"
        borderColor={borderMuted}
        flexDirection="column"
        paddingX={1}
      >
        <Box justifyContent="space-between">
          <Text bold {...inkFgBg(themeAccentPrimary(colorCap))}>
            ▸ wingbits
          </Text>
          <Text
            {...inkFgBg(
              paused ? 'yellow' : themeAccentPrimary(colorCap) ?? undefined,
            )}
          >
            {paused ? '◆ PAUSED' : '● LIVE'} · {intervalSec}s poll · {cols}×{rows}
          </Text>
        </Box>
        <Box justifyContent="space-between">
          <Text dimColor={colorCap !== 'none'} wrap="truncate-end">
            {headerLeft}
            {lastPollAt ? ` · ${new Date(lastPollAt).toLocaleTimeString()}` : ''}
            {loadingPoll ? ' · …' : ''}
          </Text>
          {searchRunning ? (
            <Text {...inkFgBg(themeAccentPrimary(colorCap))}>search…</Text>
          ) : null}
        </Box>
        <Text dimColor={colorCap !== 'none'}>
          {ruleChar(Math.min(cols - 4, 72))}
        </Text>
      </Box>

      {pollError ? (
        <Box marginTop={1}>
          <ErrorBanner message={pollError} colorCap={colorCap} />
        </Box>
      ) : null}

      <Box flexDirection="row" marginTop={1}>
        <Box
          flexDirection="column"
          width={listPaneWidth}
          borderStyle="single"
          borderColor={borderMuted}
          paddingX={1}
          minHeight={mainHeight}
        >
          <SectionHeader
            title="FLIGHTS"
            subtitle={`${filteredFlights.length} visible`}
            colorCap={colorCap}
          />
          <Text dimColor={colorCap !== 'none'}>{ruleChar(ruleW - 2)}</Text>
          <Text bold dimColor={colorCap !== 'none'} wrap="truncate-end">
            {flightListHeader(columnSpec)}
          </Text>
          <Text dimColor={colorCap !== 'none'}>{ruleChar(ruleW - 2)}</Text>
          {visible.map((f) => {
            const sel = f.id === selectedFlightId;
            const line = formatFlightRow(f, columnSpec);
            const fg = themeAltitudeFg(f.altitude, f.onGround, colorCap);
            const bg = sel ? themeSelectionBg(colorCap) : undefined;
            return (
              <Box key={f.id} flexDirection="row">
                <Text {...inkFgBg(themeAccentPrimary(colorCap))}>{sel ? '▌' : ' '}</Text>
                <Text {...inkFgBg(fg, bg)} wrap="truncate-end">
                  {line}
                </Text>
              </Box>
            );
          })}
          {filteredFlights.length === 0 ? (
            <Text dimColor={colorCap !== 'none'}>— no rows —</Text>
          ) : null}
          <Box marginTop={1}>
            <Text dimColor={colorCap !== 'none'} wrap="truncate-end">
              rows {scrollTop + 1}–
              {Math.min(scrollTop + listViewport, filteredFlights.length)} /{' '}
              {filteredFlights.length}
            </Text>
          </Box>
        </Box>

        <Box
          flexDirection="column"
          width={detailWidth}
          marginLeft={1}
          borderStyle="single"
          borderColor={borderMuted}
          paddingX={1}
          minHeight={mainHeight}
        >
          <SectionHeader title="DETAIL" colorCap={colorCap} />
          <Text dimColor={colorCap !== 'none'}>{ruleChar(Math.min(detailWidth - 2, 40))}</Text>
          {selectedFlight ? (
            <>
              <Text wrap="truncate-end">
                <Text bold {...inkFgBg(themeAccentPrimary(colorCap))}>
                  ID{' '}
                </Text>
                {truncateMiddle(selectedFlight.id, Math.max(16, detailWidth - 8))}
              </Text>
              <Text wrap="truncate-end">
                ICAO {selectedFlight.icao24} · CS {selectedFlight.callsign ?? '—'} · Reg{' '}
                {selectedFlight.registration ?? '—'}
              </Text>
              <Text wrap="truncate-end">
                {selectedFlight.lat.toFixed(4)}, {selectedFlight.lon.toFixed(4)} ·{' '}
                {Math.round(selectedFlight.altitude)} ft · {Math.round(selectedFlight.groundSpeed)} kt ·{' '}
                {Math.round(selectedFlight.track)}°
              </Text>
              <Text dimColor={colorCap !== 'none'} wrap="truncate-end">
                sq {selectedFlight.squawk ?? '—'} · gnd {String(selectedFlight.onGround)} · vs{' '}
                {Math.round(selectedFlight.verticalRate)} fpm
              </Text>
              {aircraftLoading ? (
                <Text dimColor={colorCap !== 'none'}>Aircraft…</Text>
              ) : aircraft ? (
                <Text dimColor={colorCap !== 'none'} wrap="truncate-end">
                  {aircraft.manufacturer ?? '—'} {aircraft.model ?? ''} · {aircraft.typecode ?? '—'}
                </Text>
              ) : (
                <Text dimColor={colorCap !== 'none'}>— no aircraft record —</Text>
              )}
            </>
          ) : (
            <Text dimColor={colorCap !== 'none'}>Select a flight</Text>
          )}

          <Box marginTop={1}>
            <SectionHeader title="PATH" subtitle="r refresh" colorCap={colorCap} />
          </Box>
          {pathLoading ? (
            <Text dimColor={colorCap !== 'none'}>
              {path ? 'Refreshing trajectory…' : 'Fetching trajectory…'}
            </Text>
          ) : null}
          {pathError ? (
            <Text {...inkFgBg(themeJamFg(colorCap, 0.95))} wrap="truncate-end">
              {pathError}
            </Text>
          ) : null}
          {path && !pathLoading && alts.length > 0 ? (
            <Box flexDirection="column">
              <Text dimColor={colorCap !== 'none'}>
                {alts.length} samples
              </Text>
              <SparklineGradient values={alts} colorCap={colorCap} />
            </Box>
          ) : null}

          <Box marginTop={1} flexDirection="column" minHeight={detailBlockMin}>
            <Text dimColor={colorCap !== 'none'} wrap="truncate-end">
              {hintLine}
            </Text>
          </Box>
        </Box>
      </Box>

      {gpsVisible ? (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="single"
          borderColor={borderMuted}
          paddingX={1}
        >
          <SectionHeader
            title="GPS JAM"
            subtitle={`top ${gpsSorted.length}`}
            colorCap={colorCap}
          />
          {viewMode.kind === 'search' ? (
            <Text dimColor={colorCap !== 'none'}>
              Jam polling uses live bbox — Esc to leave search
            </Text>
          ) : gpsSorted.length === 0 ? (
            <Text dimColor={colorCap !== 'none'}>— no jam hexes —</Text>
          ) : (
            gpsSorted.map((h) => (
              <Text key={h.h3Index} wrap="truncate-end">
                <Text {...inkFgBg(themeJamFg(colorCap, h.jammingLevel))}>
                  {truncateMiddle(h.h3Index, 22).padEnd(22)}
                </Text>
                <Text>
                  {' '}
                  {(h.jammingLevel * 100).toFixed(0)}% · {jammingLabel(h.jammingLevel)}
                </Text>
              </Text>
            ))
          )}
        </Box>
      ) : (
        <Box marginTop={1} paddingX={1}>
          <Text dimColor={colorCap !== 'none'}>GPS panel hidden — g toggles</Text>
        </Box>
      )}

      {overlay === 'search' ? (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={themeAccentPrimary(colorCap) ?? 'cyan'}
          paddingX={1}
        >
          <Text bold {...inkFgBg(themeAccentPrimary(colorCap))}>
            API search
          </Text>
          <Text dimColor={colorCap !== 'none'}>callsign · 6-char ICAO · N-reg</Text>
          <Text>
            <Text {...inkFgBg(themeAccentPrimary(colorCap))}>&gt; </Text>
            {overlayBuffer}
            <Text dimColor={colorCap !== 'none'}>█</Text>
          </Text>
        </Box>
      ) : null}
      {overlay === 'bbox' ? (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={themeJamFg(colorCap, 0.5) ?? 'yellow'}
          paddingX={1}
        >
          <Text bold>Bbox</Text>
          <Text dimColor={colorCap !== 'none'}>minLat,maxLat,minLon,maxLon</Text>
          <Text>
            <Text {...inkFgBg(themeJamFg(colorCap, 0.5))}>&gt; </Text>
            {overlayBuffer}
            <Text dimColor={colorCap !== 'none'}>█</Text>
          </Text>
        </Box>
      ) : null}
      {overlay === 'filter' ? (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={themeJamFg(colorCap, 0.2) ?? 'green'}
          paddingX={1}
        >
          <Text bold>Local filter</Text>
          <Text dimColor={colorCap !== 'none'}>substring on CS / ICAO / reg</Text>
          <Text>
            <Text {...inkFgBg(themeJamFg(colorCap, 0.2))}>&gt; </Text>
            {overlayBuffer}
            <Text dimColor={colorCap !== 'none'}>█</Text>
          </Text>
        </Box>
      ) : null}
      {overlay === 'help' ? (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="double"
          borderColor={themeAccentPrimary(colorCap) ?? 'cyan'}
          paddingX={1}
        >
          <Text bold {...inkFgBg(themeAccentPrimary(colorCap))}>
            Keys
          </Text>
          <Text dimColor={colorCap !== 'none'}>
            j/k · arrows · PgUp/PgDn — move list
          </Text>
          <Text dimColor={colorCap !== 'none'}>
            / search · f filter · b bbox · [ ] interval
          </Text>
          <Text dimColor={colorCap !== 'none'}>
            p space pause · r path · g GPS · ? close · Esc
          </Text>
          <Text dimColor={colorCap !== 'none'}>q — quit</Text>
        </Box>
      ) : null}
    </Box>
  );
}
