# wingbits-cli

Terminal interface for the [Wingbits Customer API](https://customer-api.wingbits.com/docs/) — list and search flights, trajectories, aircraft metadata, GPS jamming hexes, a minimal live `watch` dashboard, and a full interactive `tui`.

## Install

From npm (when published):

```bash
bun add -g wingbits-cli
# or: npx wingbits-cli health
```

From this monorepo:

```bash
bun install
bun run build
# binary: packages/cli/dist/cli.js — symlink or `bun packages/cli/dist/cli.js`
```

## Authentication

1. Get an API key from [Wingbits pricing](https://wingbits.com/pricing).
2. Either:
   - `export WINGBITS_API_KEY=...`
   - `wingbits config set api-key YOUR_KEY`
   - pass `--api-key YOUR_KEY` per command

Interactive first-time prompt runs if no key is found (except `watch`, which requires a key in env/config).

## Commands

| Command | Description |
|---------|-------------|
| `health` | API status, version, uptime |
| `flights --bbox minLat,maxLat,minLon,maxLon` | Flights in region (colored table / json / csv) |
| `flight <id>` | Single flight |
| `search --callsign UAL123` | Search (also `--icao24`, `--registration`) |
| `path <id>` | Trajectory + ASCII altitude sparkline |
| `aircraft <icao24>` | Aircraft metadata |
| `gps-jam --bbox ...` | GPS jamming hexes + summary |
| `watch --bbox ... [--interval 5]` | Minimal live Ink dashboard (poll-only table) |
| `tui --bbox ... [--interval 5]` | Full interactive TUI: list, detail, path sparkline, GPS jam, search, bbox/interval |
| `config set api-key <key>` / `config show` | Saved config |

**Global options (on API commands):** `--api-key`, `-n` / `--non-interactive`

**Format:** `-f json` | `-f csv` | `-f table` (default)

## Examples

```bash
wingbits health -f json
wingbits flights --bbox 41.6,42.1,-88.0,-87.2 --non-interactive
wingbits search --callsign UAL123
wingbits path abc123-fake-id
wingbits gps-jam --bbox 41.6,42.1,-88.0,-87.2
wingbits watch --bbox 41.6,42.1,-88.0,-87.2 --interval 10 --api-key "$WINGBITS_API_KEY"
wingbits tui --bbox 41.6,42.1,-88.0,-87.2 --interval 5 --api-key "$WINGBITS_API_KEY"
```

## `wingbits tui` — interactive terminal UI

Power-user interface built with [Ink](https://github.com/vadimdemedes/ink). Requires an API key in env, config, or `--api-key` (same as `watch`).

### Visual design

- **Look:** “Premium devtool” layout — bordered panes, section headers, aligned monospace columns, restrained palette.
- **Color:** Detects **truecolor** (`COLORTERM`) when available and uses richer hex accents + gradient **altitude sparkline**; falls back to 16 / 256-color safe named colors. **`NO_COLOR`** disables styling.
- **Tables:** Flight list uses fixed column widths from terminal width; headers and rules separate metadata from data. Selection uses a **cursor bar** (`▌`) + row background instead of inverse-only highlighting.
- **Help:** Press **`?`** for the full key map; a one-line hint stays in the detail pane on narrow terminals.

### Layout

- **Left:** scrollable flight list for the current bbox (or API search results), with altitude-colored rows and a selection cursor.
- **Right:** detail for the selected flight (including aircraft metadata when available), altitude **path sparkline** (`getFlightPath`), and status/error lines.
- **Bottom:** GPS jam hexes for the **same bbox** (hidden with `g`; while viewing API search results, jam polling is paused — press `Esc` to return to bbox mode for live jam data).

### Keybindings

| Key | Action |
|-----|--------|
| `j` / `↓`, `k` / `↑` | Move selection |
| PgUp / PgDn | Jump by one viewport |
| `/` | Open **API search** (callsign, 6-char ICAO hex, or `N` registration). `Enter` runs, `Esc` closes. |
| `Esc` | Close overlay, or exit **search results** back to bbox polling |
| `f` | **Local filter** (substring on callsign / ICAO / reg) on the current list |
| `?` | **Help** overlay (Esc or `?` again to close) |
| `b` | Edit **bbox** (`minLat,maxLat,minLon,maxLon`) |
| `[` / `]` | Decrease / increase poll interval (seconds) |
| `p` or `Space` | Pause / resume polling |
| `r` | Refresh **flight path** / sparkline for the selection |
| `g` | Toggle **GPS jam** panel |
| `q` | Quit |

## License

MIT
