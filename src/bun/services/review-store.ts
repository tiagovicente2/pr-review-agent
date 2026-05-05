import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { GitHubPullRequestDetails } from "@/shared/github";
import type { PiGeneratedReview } from "@/shared/review";

const databasePath = getDatabasePath();
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.exec(`
CREATE TABLE IF NOT EXISTS generated_reviews (
	id TEXT PRIMARY KEY,
	repo TEXT NOT NULL,
	pr_number INTEGER NOT NULL,
	head_sha TEXT NOT NULL,
	review_json TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generated_reviews_pr ON generated_reviews(repo, pr_number, head_sha);
`);

export function saveGeneratedReview(params: {
	pullRequest: GitHubPullRequestDetails;
	review: PiGeneratedReview;
}): PiGeneratedReview {
	const id = getReviewStoreKey(params.pullRequest);
	const now = new Date().toISOString();
	const existing = db.query("SELECT created_at FROM generated_reviews WHERE id = ?").get(id) as
		| { created_at: string }
		| undefined;

	db.query(`
		INSERT INTO generated_reviews (id, repo, pr_number, head_sha, review_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			review_json = excluded.review_json,
			updated_at = excluded.updated_at
	`).run(
		id,
		params.pullRequest.repo,
		params.pullRequest.pullRequestNumber,
		params.pullRequest.headSha,
		JSON.stringify(params.review),
		existing?.created_at ?? now,
		now,
	);

	return params.review;
}

export function getSavedGeneratedReview(params: {
	repo: string;
	pullRequestNumber: number;
	headSha: string;
}): PiGeneratedReview | null {
	const id = getReviewStoreKey(params);
	const row = db.query("SELECT review_json FROM generated_reviews WHERE id = ?").get(id) as
		| { review_json: string }
		| undefined;

	if (!row) {
		return null;
	}

	return JSON.parse(row.review_json) as PiGeneratedReview;
}

function getReviewStoreKey(params: { repo: string; pullRequestNumber: number; headSha: string }) {
	return `${params.repo}#${params.pullRequestNumber}:${params.headSha}`;
}

function getDatabasePath() {
	const baseDir =
		Bun.env.XDG_DATA_HOME ??
		(Bun.env.HOME ? join(Bun.env.HOME, ".local", "share") : join(process.cwd(), ".data"));
	return join(baseDir, "pr-review-agent", "review-agent.sqlite");
}
