import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { GitHubPullRequestDetails } from '@/shared/github'

const databasePath = getDatabasePath()
mkdirSync(dirname(databasePath), { recursive: true })

const db = new Database(databasePath)
db.exec(`
CREATE TABLE IF NOT EXISTS pull_request_details_cache (
	id TEXT PRIMARY KEY,
	repo TEXT NOT NULL,
	pr_number INTEGER NOT NULL,
	head_sha TEXT NOT NULL,
	details_json TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pull_request_details_cache_pr ON pull_request_details_cache(repo, pr_number);

CREATE TABLE IF NOT EXISTS pull_request_diff_cache (
	id TEXT PRIMARY KEY,
	repo TEXT NOT NULL,
	pr_number INTEGER NOT NULL,
	head_sha TEXT NOT NULL,
	diff_text TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pull_request_diff_cache_pr ON pull_request_diff_cache(repo, pr_number, head_sha);
`)

export function getCachedPullRequestDetails(params: {
	repo: string
	pullRequestNumber: number
	headSha?: string
}): GitHubPullRequestDetails | null {
	const row = db
		.query(
			params.headSha
				? 'SELECT details_json FROM pull_request_details_cache WHERE id = ?'
				: 'SELECT details_json FROM pull_request_details_cache WHERE repo = ? AND pr_number = ? ORDER BY updated_at DESC LIMIT 1',
		)
		.get(
			...(params.headSha
				? [getPullRequestCacheKey({ ...params, headSha: params.headSha })]
				: [params.repo, params.pullRequestNumber]),
		) as { details_json: string } | undefined

	return row ? (JSON.parse(row.details_json) as GitHubPullRequestDetails) : null
}

export function saveCachedPullRequestDetails(details: GitHubPullRequestDetails) {
	const metadata = { ...details, diff: '' }
	const now = new Date().toISOString()
	const id = getPullRequestCacheKey(details)
	const existing = db
		.query('SELECT created_at FROM pull_request_details_cache WHERE id = ?')
		.get(id) as { created_at: string } | undefined

	db.query(`
		INSERT INTO pull_request_details_cache (id, repo, pr_number, head_sha, details_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			details_json = excluded.details_json,
			updated_at = excluded.updated_at
	`).run(
		id,
		details.repo,
		details.pullRequestNumber,
		details.headSha,
		JSON.stringify(metadata),
		existing?.created_at ?? now,
		now,
	)
}

export function getCachedPullRequestDiff(params: {
	repo: string
	pullRequestNumber: number
	headSha: string
}): string | null {
	const row = db
		.query('SELECT diff_text FROM pull_request_diff_cache WHERE id = ?')
		.get(getPullRequestCacheKey(params)) as { diff_text: string } | undefined
	return row?.diff_text ?? null
}

export function saveCachedPullRequestDiff(params: {
	repo: string
	pullRequestNumber: number
	headSha: string
	diff: string
}) {
	const now = new Date().toISOString()
	const id = getPullRequestCacheKey(params)
	const existing = db
		.query('SELECT created_at FROM pull_request_diff_cache WHERE id = ?')
		.get(id) as { created_at: string } | undefined

	db.query(`
		INSERT INTO pull_request_diff_cache (id, repo, pr_number, head_sha, diff_text, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			diff_text = excluded.diff_text,
			updated_at = excluded.updated_at
	`).run(
		id,
		params.repo,
		params.pullRequestNumber,
		params.headSha,
		params.diff,
		existing?.created_at ?? now,
		now,
	)
}

function getPullRequestCacheKey(params: {
	repo: string
	pullRequestNumber: number
	headSha: string
}) {
	return `${params.repo}#${params.pullRequestNumber}:${params.headSha}`
}

function getDatabasePath() {
	const baseDir =
		Bun.env.XDG_DATA_HOME ??
		(Bun.env.HOME ? join(Bun.env.HOME, '.local', 'share') : join(process.cwd(), '.data'))
	return join(baseDir, 'pr-review-agent', 'review-agent.sqlite')
}
