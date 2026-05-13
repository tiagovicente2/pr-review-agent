# Development

## Prerequisites

- [Bun](https://bun.sh/)
- GitHub CLI (`gh`)
- A supported review agent if you want to test generation locally: Pi, Claude, opencode, or Codex.

## Install dependencies

```bash
bun install
```

## Run locally

Electrobun watch mode:

```bash
bun run dev
```

Vite HMR + Electrobun:

```bash
bun run dev:hmr
```

## Checks

```bash
bun run typecheck
bun run lint
bun run check
```

## Build

Renderer build:

```bash
bun run build
```

Desktop app build:

```bash
bun run build:app
```

The packaged app is written under `build/`.

## Scripts

- `bun run panda:build` — generate Panda CSS system and styles.
- `bun run typecheck` — generate Panda output and run TypeScript checks.
- `bun run build` — generate Panda output and build the React renderer.
- `bun run build:app` — generate Panda output and build the Electrobun app.
- `bun run lint` — lint with Biome.
- `bun run format` — format with Biome.
- `bun run check` — run Biome lint and format checks.
