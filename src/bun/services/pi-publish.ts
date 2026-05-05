import type {
	PiReviewFinding,
	PublishPiReviewCommentParams,
	PublishPiReviewCommentResult,
	PublishPiReviewCommentsParams,
} from "@/shared/review";

const PI_PUBLISH_TIMEOUT_MS = 5 * 60 * 1000;

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

export async function publishPiReviewComment(
	params: PublishPiReviewCommentParams,
): Promise<PublishPiReviewCommentResult> {
	return publishPiReviewComments({ pullRequest: params.pullRequest, findings: [params.finding] });
}

export async function publishPiReviewComments(
	params: PublishPiReviewCommentsParams,
): Promise<PublishPiReviewCommentResult> {
	const publishableFindings = params.findings.filter(isPublishableFinding);
	if (publishableFindings.length === 0) {
		throw new Error(
			"No publishable inline findings. Findings need filePath, lineStart, and a comment body.",
		);
	}

	const result = await runPiPublisher(buildPublishPrompt(params, publishableFindings));
	const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

	if (result.exitCode !== 0) {
		throw new Error(output || "Pi failed to publish review comments.");
	}

	return { ok: true, output };
}

function isPublishableFinding(finding: PiReviewFinding) {
	return Boolean(finding.filePath && finding.lineStart && getCommentBody(finding));
}

function getCommentBody(finding: PiReviewFinding) {
	return finding.suggestedCommentBody || finding.body;
}

function buildPublishPrompt(params: PublishPiReviewCommentsParams, findings: PiReviewFinding[]) {
	return `You are publishing GitHub PR review comments for PR Review Agent.

Use the local gh CLI only. Do not approve, request changes, submit a full review, merge, close, edit code, or push commits.
Create only individual pending-free PR review comments using GitHub's review comment API.

PR:
${JSON.stringify(
	{
		repo: params.pullRequest.repo,
		pullRequestNumber: params.pullRequest.pullRequestNumber,
		commitId: params.pullRequest.headSha,
		url: params.pullRequest.url,
	},
	null,
	2,
)}

Comments to publish:
${JSON.stringify(
	findings.map((finding) => ({
		body: getCommentBody(finding),
		line: finding.lineStart,
		path: finding.filePath,
		side: "RIGHT",
		title: finding.title,
	})),
	null,
	2,
)}

For each comment, run a command equivalent to:
gh api repos/OWNER/REPO/pulls/PR_NUMBER/comments -f body=... -f commit_id=... -f path=... -F line=... -f side=RIGHT

Return a concise success/failure summary.`;
}

async function runPiPublisher(prompt: string): Promise<CommandResult> {
	const proc = Bun.spawn(
		[
			"pi",
			"-p",
			"--no-context-files",
			"--no-session",
			"--thinking",
			"low",
			"--system-prompt",
			"You are a careful local automation agent. Use tools only to run the requested gh CLI commands. Never publish anything except the explicitly provided PR review comments.",
		],
		{
			stdin: "pipe",
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...Bun.env,
				PI_SKIP_VERSION_CHECK: "1",
			},
		},
	);

	proc.stdin.write(prompt);
	proc.stdin.end();

	const timeout = new Promise<never>((_, reject) => {
		setTimeout(() => {
			proc.kill();
			reject(new Error("Pi publish timed out."));
		}, PI_PUBLISH_TIMEOUT_MS);
	});

	const result = Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]).then(([stdout, stderr, exitCode]) => ({ exitCode, stdout, stderr }));

	return Promise.race([result, timeout]);
}
