# Wingbits monorepo

Community tools for the [Wingbits Customer API](https://customer-api.wingbits.com/docs/) — ADS-B flight data and GPS jamming intelligence from the decentralized flight-tracking network on Solana.

[![CI](https://github.com/RahilBhavan/wingbits-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/RahilBhavan/wingbits-sdk/actions/workflows/ci.yml)

## Packages

| Package | Description | npm |
|--------|-------------|-----|
| [`wingbits-sdk`](./packages/sdk/) | TypeScript SDK (`WingbitsClient`, Zod-validated responses, retries) | [`wingbits-sdk`](https://www.npmjs.com/package/wingbits-sdk) |
| [`wingbits-cli`](./packages/cli/) | Terminal CLI — flights, search, paths, GPS jam, `watch`, full `tui` (Ink) | _(publish when ready)_ |

## Repo layout

```
packages/
  sdk/     # wingbits-sdk — HTTP client library
  cli/     # wingbits-cli — `wingbits` binary
```

## Prerequisites

- [Bun](https://bun.sh/) (used for install/scripts in this repo)
- Node 18+ for running built output

## Development

```bash
bun install
bun run build    # builds SDK then CLI (CLI depends on SDK dist)
bun run test
bun run smoke    # optional: WINGBITS_API_KEY=... exercises live API from packages/sdk
```

## wingbits-cli (quick start)

After `bun run build`, run the CLI from the workspace:

```bash
# From repo root (after build + link)
bun packages/cli/dist/cli.js health --non-interactive
```

Or install globally from `packages/cli` after `bun link` / local path.

```bash
wingbits health --api-key "$WINGBITS_API_KEY"
wingbits flights --bbox 41.6,42.1,-88.0,-87.2 --format table
wingbits gps-jam --bbox 41.6,42.1,-88.0,-87.2
wingbits watch --bbox 41.6,42.1,-88.0,-87.2 --interval 5 --api-key "$WINGBITS_API_KEY"
wingbits tui --bbox 41.6,42.1,-88.0,-87.2 --interval 5 --api-key "$WINGBITS_API_KEY"
wingbits config set api-key YOUR_KEY
```

**BBox format:** `minLat,maxLat,minLon,maxLon` (comma-separated).

**Output:** `--format table` (default), `json`, or `csv` on most commands.

### Demo GIFs (placeholders)

Add screen recordings here when ready:

- `docs/demo-watch.gif` — `wingbits watch` Ink dashboard
- `docs/demo-tui.gif` — `wingbits tui` full interactive UI
- `docs/demo-flights.gif` — `wingbits flights` colored table
- `docs/demo-gps-jam.gif` — `wingbits gps-jam` severity coloring

## wingbits-sdk

See [packages/sdk/README.md](./packages/sdk/README.md) for full API reference and examples.

## Links

- [Wingbits](https://wingbits.com/)
- [Customer API (Scalar)](https://customer-api.wingbits.com/docs/)
- [Developer docs](https://wingbits.gitbook.io/developers)

## License

MIT
