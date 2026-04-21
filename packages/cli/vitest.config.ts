import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Thresholds apply only to pure utilities; CLI entry and Ink UI are covered by manual/e2e runs.
      include: [
        'src/utils/bbox.ts',
        'src/utils/sparkline.ts',
        'src/utils/colors.ts',
        'src/utils/flight-ink-color.ts',
        'src/ui/tui/layout.ts',
        'src/ui/tui/search-params.ts',
        'src/ui/tui/filter-flights.ts',
        'src/ui/tui/color-capabilities.ts',
        'src/ui/tui/theme.ts',
        'src/ui/tui/format-columns.ts',
        'src/ui/tui/ink-text-props.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 65, statements: 80 },
    },
  },
});
