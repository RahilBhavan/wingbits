import React from 'react';
import { Box, Text } from 'ink';
import type { ColorLevel } from './color-capabilities.js';
import { themeSparkSegment } from './theme.js';
import { inkFgBg } from './ink-text-props.js';
import { altitudeSparkSegments } from '../../utils/sparkline.js';

interface SparklineGradientProps {
  values: number[];
  colorCap: ColorLevel;
}

/**
 * Altitude sparkline with per-segment coloring (rich in truecolor, solid cyan otherwise).
 */
export function SparklineGradient({ values, colorCap }: SparklineGradientProps) {
  const segments = altitudeSparkSegments(values);
  if (segments.length === 0) {
    return null;
  }
  return (
    <Box flexDirection="row" flexWrap="nowrap">
      {segments.map((seg, i) => {
        const c = themeSparkSegment(seg.t, colorCap);
        return (
          <Text key={i} {...inkFgBg(c)}>
            {seg.char}
          </Text>
        );
      })}
    </Box>
  );
}
