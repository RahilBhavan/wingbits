import React from 'react';
import { Box, Text } from 'ink';
import type { ColorLevel } from './color-capabilities.js';
import {
  themeAccentDanger,
  themeAccentPrimary,
  themeDim,
} from './theme.js';
import { inkFgBg } from './ink-text-props.js';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  colorCap: ColorLevel;
}

/** Section title row (lazygit-style): bold accent + dim meta on the right. */
export function SectionHeader({ title, subtitle, colorCap }: SectionHeaderProps) {
  return (
    <Box justifyContent="space-between" width="100%">
      <Text bold {...inkFgBg(themeAccentPrimary(colorCap))}>
        {title}
      </Text>
      {subtitle ? (
        <Text dimColor={themeDim(colorCap)} wrap="truncate-end">
          {subtitle}
        </Text>
      ) : null}
    </Box>
  );
}

interface ErrorBannerProps {
  message: string;
  colorCap: ColorLevel;
}

export function ErrorBanner({ message, colorCap }: ErrorBannerProps) {
  return (
    <Box
      borderStyle="round"
      borderColor={themeAccentDanger(colorCap) ?? 'red'}
      paddingX={1}
    >
      <Text {...inkFgBg(themeAccentDanger(colorCap) ?? 'red')} bold wrap="truncate">
        {message}
      </Text>
    </Box>
  );
}
