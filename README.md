# PR Review Agent

Local-first desktop app for AI-assisted GitHub pull request review drafts.

PR Review Agent helps you load GitHub PRs, inspect their summary and diff, generate a local draft review with your preferred coding agent, and optionally publish individual review comments after explicit confirmation.

## Features

- Review inbox for PRs requesting your review.
- Manual PR loading by GitHub URL, `owner/repo#123`, or `owner/repo 123`.
- PR summary rendering with GitHub-flavored Markdown and GitHub-hosted images.
- Lightweight code tab with changed-file tree and collapsible per-file diffs.
- Local draft review generation with selectable agents:
  - Pi
  - Claude
  - opencode
- Agent/model settings and readiness status checks.
- Local saved generated reviews.
- Explicit publish flow for generated inline comments.

## Requirements

- [Bun](https://bun.sh/)
- [GitHub CLI](https://cli.github.com/) authenticated with access to the target repositories
- At least one supported review agent installed and authenticated:
  - `pi`
  - `claude`
  - `opencode`

Authenticate GitHub with either the in-app onboarding flow or:

```bash
gh auth login --web --git-protocol https
```

## Setup

```bash
bun install
bun run typecheck
bun run build
```

## Development

```bash
# Electrobun watch mode
bun run dev

# Vite HMR + Electrobun
bun run dev:hmr
```

## Build the desktop app

```bash
bun run build:app
```

The packaged app is written under `build/`.

## Scripts

- `bun run lint` — lint with Biome
- `bun run format` — format with Biome
- `bun run check` — run Biome lint + format checks
- `bun run panda:build` — generate Panda CSS system and styles
- `bun run typecheck` — generate Panda output and run TypeScript checks
- `bun run build` — generate Panda output and build the React renderer
- `bun run build:app` — generate Panda output and build the Electrobun app

## Safety

The app does not submit GitHub reviews automatically. Generated output stays local until you explicitly publish selected comments in the UI.
