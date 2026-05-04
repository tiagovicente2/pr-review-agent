# PR Review Agent

Electrobun + React + TypeScript desktop app scaffold for local-first, AI-assisted GitHub pull request review drafts.

## Stack

- Electrobun desktop shell
- React UI written in TypeScript
- Vite for the renderer build
- Park UI component snippets
- Panda CSS for styling, recipes, and light/dark tokens
- Biome for linting and formatting

## Setup

```bash
bun install
bun run check
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

## GitHub connection

The app uses the local `gh` CLI session. Install GitHub CLI, then use the in-app connect page or run:

```bash
gh auth login --web --git-protocol https
```

After authentication, the inbox loads real PRs from:

```bash
gh search prs --review-requested=@me --state=open
```

## Review generation

Click **Generate with Pi** on a loaded PR. The backend sends the PR metadata and unified diff to the local Pi coding agent in print mode:

```bash
pi -p --no-tools --no-context-files --no-session
```

Pi returns structured JSON that is rendered as local draft summary text and findings. Nothing is published to GitHub automatically.

## Scripts

- `bun run lint` — lint with Biome
- `bun run format` — format with Biome
- `bun run check` — run Biome lint + format checks
- `bun run panda:build` — generate Panda CSS system and styles
- `bun run typecheck` — generate Panda output and run TypeScript checks
- `bun run build` — generate Panda output and build the React renderer
- `bun run build:app` — generate Panda output and build the Electrobun app

## Product direction

The full product brief is in [`pr-review-agent-prompt.md`](./pr-review-agent-prompt.md). The current scaffold includes a static PR review inbox/detail UI so the service layers can be implemented incrementally:

1. `gh` CLI integration for auth, review requests, PR metadata, files, and diffs.
2. OpenAI structured JSON review generation.
3. SQLite persistence for drafts, stale detection, history, and publish attempts.
4. Pi coding agent review generation via `pi -p --no-tools --no-session`.
5. Explicit approval and publish flow through `gh`.

The app must never submit a GitHub review without explicit in-app confirmation.
