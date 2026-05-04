# PR Review Agent

Build a desktop application with Electrobun for AI-assisted GitHub pull request reviews.

## Project Name

PR Review Agent

## Goal

Create a local-first desktop app that automatically prepares draft PR reviews when the user is requested as a reviewer on GitHub, but never publishes them automatically. The user must be able to inspect, edit, approve, or reject each draft review before anything is submitted to GitHub.

## Core Requirements

- Use `gh` CLI for all GitHub interactions.
- Use OpenAI `gpt5.5` for review generation.
- Use Electrobun for the desktop app.
- Use the review prompt from `https://github.com/henrilhos/dotfiles/blob/main/.claude/commands/code-review.md`.
- Treat that prompt as the source review policy and preserve its intent:
- senior React / React Native review mindset
- severity-first findings
- architecture, security, performance, accessibility, testing, TypeScript, React Query, naming, file structure, etc.
- Reviews must be generated automatically, stored locally as drafts, and only published after explicit user approval.

## Primary Workflow

1. Detect when the authenticated GitHub user is requested to review a PR.
2. Fetch PR metadata, changed files, and git diff using `gh`.
3. Generate a draft review with OpenAI `gpt5.5` using the provided review prompt as the base system prompt.
4. Save the generated review locally with full context.
5. Show the review inside the Electrobun app.
6. Let the user:
- inspect PR metadata
- inspect changed files
- inspect the git diff
- inspect the generated review body and line comments
- edit the review
- approve publishing
- reject and discard
- regenerate review
7. Only after approval, publish the review through `gh`.

## Important Product Behavior

- Never auto-submit reviews.
- Never lose generated drafts on app restart.
- Support repeated refresh if the PR changes after the draft was generated.
- Detect stale drafts when the PR head SHA changes.
- Keep a local history of draft states and publish attempts.
- Clearly separate:
- pending draft
- approved for publish
- published
- rejected
- stale
- failed

## GitHub Integration Requirements

- Use `gh auth status` to validate login.
- Use `gh` commands to fetch:
- review requests assigned to the current user
- PR title, author, repo, branch, URL
- changed files
- unified diff
- existing comments/reviews if helpful
- Use `gh api` where needed, but still through `gh`.
- Use `gh` to publish:
- summary review comments
- inline review comments when supported
- Prefer non-interactive `gh` usage only.

## OpenAI Integration Requirements

- Use `OPENAI_API_KEY` from environment or secure local settings.
- Use configurable model name, defaulting to `gpt5.5`.
- Send:
- repository / PR metadata
- changed file list
- unified diff
- optional existing review context
- Ask the model to return structured review data, not just free text.

## Review Generation Format

Design a structured JSON schema for generated reviews, such as:

- review summary
- overall verdict recommendation
- severity
- findings
- per-finding file path
- line references
- code snippet
- suggested comment body
- optional fix suggestion
- confidence
- publishable body
- inline comments list

## App UI Requirements

Build a polished desktop UI with these views:

### 1. Review Inbox

- List all pending/generated reviews.
- Show repo, PR number, title, author, requested time, status, freshness, last generation time.
- Filters:
- pending
- stale
- approved
- published
- rejected
- failed
- Search by repo / PR / author / title.

### 2. Review Detail

- PR metadata header.
- changed files sidebar.
- git diff viewer.
- generated findings panel.
- editable summary review textarea.
- editable inline comments.
- regenerate button.
- mark stale / refresh button.
- approve to publish button.
- reject button.

### 3. Publish Confirmation

- Show exact review payload that will be sent to GitHub.
- Confirm publish action explicitly.

### 4. Settings

- GitHub status.
- OpenAI model.
- prompt source / prompt override.
- polling interval or webhook listener status.
- local storage location.
- logging verbosity.

## Diff Viewer Requirements

- Show git diff with file grouping.
- Support selecting a file to inspect.
- Support jumping from a finding to the relevant diff hunk.
- Highlight commented lines.
- Make it easy to edit or remove generated inline comments.

## Persistence Requirements

Use a local database, preferably SQLite.

Store:

- repositories / PR references
- PR head SHA
- raw diff snapshot
- generated review JSON
- draft edits
- publish status
- timestamps
- error logs
- model metadata

## Suggested Architecture

- Electrobun desktop shell
- frontend UI in TypeScript
- local backend services in Bun
- a GitHub service wrapper around `gh`
- an OpenAI review service
- a review orchestrator
- a local SQLite persistence layer
- a background sync / polling service

## Automation Approach

Implement at least one of these:

- polling mode:
- periodically query GitHub for PRs where the current user is requested reviewer
- optional webhook companion mode:
- small local or remote relay can forward GitHub `review_requested` events to the app

Default to polling first for simplicity and reliability.

## Prompt Handling Requirements

- Embed the contents of the linked `code-review.md` as the base review instruction.
- Adapt it for PR review automation:
- generate concise, actionable findings
- avoid noise and style-only nitpicks
- prioritize correctness, regressions, security, performance, tests, maintainability
- preserve severity ordering
- Add a second instruction layer that asks the model to output strict JSON matching the app schema.

## Constraints

- Do not require browser automation.
- Do not auto-approve or auto-request changes on GitHub.
- Do not publish anything without explicit in-app confirmation.
- Do not depend on interactive shell flows.
- Keep the implementation minimal and modular.
- Prefer small, understandable services over heavy abstractions.

## Acceptance Criteria

- User can authenticate with `gh`.
- App discovers PRs where the user is requested reviewer.
- App generates a local draft review for a PR.
- App shows PR metadata, changed files, and unified diff.
- User can edit generated review text and inline comments.
- User can approve and publish the review through `gh`.
- User can reject a review without publishing.
- App marks drafts stale when PR head SHA changes.
- Drafts survive app restart.
- Publish failures are visible and retryable.

## Nice-to-Have Features

- repo allowlist / blocklist
- notifications for new review requests
- keyboard shortcuts
- side-by-side diff mode
- comment templates
- severity badges
- export draft review as markdown/json
- regenerate only this finding action

## Implementation Plan

1. Scaffold Electrobun app.
2. Add local SQLite storage.
3. Add `gh` service and PR discovery.
4. Add PR detail fetch + diff fetch.
5. Add OpenAI review generation with structured JSON output.
6. Build inbox UI.
7. Build review detail UI with diff viewer.
8. Add edit / approve / reject flows.
9. Add publish flow using `gh`.
10. Add stale draft detection.
11. Add settings and logs.
12. Add tests for parsing, persistence, and publish pipeline.

## Developer Notes

- Keep all GitHub operations behind a single service interface.
- Keep all model operations behind a single review generation interface.
- Make the JSON schema explicit and validated.
- Prefer robust parsing and clear error states over cleverness.
- Build the smallest correct version first, then refine the UX.

## Deliverables

- working Electrobun desktop app
- local persistence
- review generation pipeline
- draft review approval flow
- publish flow via `gh`
- concise README with setup and usage
