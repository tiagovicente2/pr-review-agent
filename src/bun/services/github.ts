import type {
	GitHubAuthStatus,
	GitHubLoginResult,
	GitHubPullRequestDetails,
	GitHubReviewRequest,
} from "../../shared/github";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

async function runGh(
	args: string[],
	input?: string,
	options: { disablePrompt?: boolean } = {},
): Promise<CommandResult> {
	const proc = Bun.spawn(["gh", ...args], {
		stdin: input === undefined ? "ignore" : "pipe",
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...Bun.env,
			...(options.disablePrompt === false ? {} : { GH_PROMPT_DISABLED: "1" }),
		},
	});

	if (input !== undefined) {
		proc.stdin.write(input);
		proc.stdin.end();
	}

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	return { exitCode, stdout, stderr };
}

function commandOutput(result: CommandResult) {
	return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

function assertSuccess(result: CommandResult, action: string) {
	if (result.exitCode === 0) {
		return;
	}

	throw new Error(commandOutput(result) || `GitHub CLI failed while trying to ${action}.`);
}

async function isGhInstalled() {
	try {
		const result = await runGh(["--version"]);
		return result.exitCode === 0;
	} catch {
		return false;
	}
}

function getRepoName(repository: unknown): string {
	if (!repository || typeof repository !== "object") {
		return "unknown/unknown";
	}

	const repo = repository as {
		fullName?: string;
		nameWithOwner?: string;
		name?: string;
		owner?: { login?: string };
	};

	if (repo.nameWithOwner) {
		return repo.nameWithOwner;
	}

	if (repo.fullName) {
		return repo.fullName;
	}

	if (repo.owner?.login && repo.name) {
		return `${repo.owner.login}/${repo.name}`;
	}

	return repo.name ?? "unknown/unknown";
}

function getAuthorLogin(author: unknown): string {
	if (!author || typeof author !== "object") {
		return "unknown";
	}

	return (
		(author as { login?: string; name?: string }).login ??
		(author as { name?: string }).name ??
		"unknown"
	);
}

export async function getGitHubAuthStatus(): Promise<GitHubAuthStatus> {
	const ghInstalled = await isGhInstalled();

	if (!ghInstalled) {
		return {
			ghInstalled: false,
			authenticated: false,
			error: "GitHub CLI is not installed or is not available on PATH.",
		};
	}

	const status = await runGh(["auth", "status"]);
	if (status.exitCode !== 0) {
		return {
			ghInstalled: true,
			authenticated: false,
			message: commandOutput(status) || "GitHub CLI is installed, but you are not authenticated.",
		};
	}

	const user = await runGh(["api", "user", "--jq", ".login"]);
	if (user.exitCode !== 0) {
		return {
			ghInstalled: true,
			authenticated: false,
			error: commandOutput(user) || "Could not read the authenticated GitHub user.",
		};
	}

	return {
		ghInstalled: true,
		authenticated: true,
		username: user.stdout.trim(),
		message: "Connected to GitHub through gh CLI.",
	};
}

export async function startGitHubLogin(): Promise<GitHubLoginResult> {
	const before = await getGitHubAuthStatus();
	if (!before.ghInstalled) {
		return {
			ok: false,
			status: before,
			output: before.error ?? "Install the GitHub CLI first.",
		};
	}

	if (before.authenticated) {
		return {
			ok: true,
			status: before,
			output: "Already connected to GitHub.",
		};
	}

	const login = await runGh(
		[
			"auth",
			"login",
			"--hostname",
			"github.com",
			"--web",
			"--clipboard",
			"--git-protocol",
			"https",
			"--skip-ssh-key",
		],
		"\n",
		{ disablePrompt: false },
	);
	const status = await getGitHubAuthStatus();

	return {
		ok: login.exitCode === 0 && status.authenticated,
		status,
		output: commandOutput(login),
	};
}

export async function listGitHubReviewRequests(): Promise<GitHubReviewRequest[]> {
	const authStatus = await getGitHubAuthStatus();
	if (!authStatus.authenticated) {
		throw new Error(
			authStatus.error ?? authStatus.message ?? "Connect GitHub before listing reviews.",
		);
	}

	const result = await runGh([
		"search",
		"prs",
		"--review-requested=@me",
		"--state=open",
		"--limit=50",
		"--json",
		"repository,number,title,author,url,updatedAt,state,isDraft,id",
	]);
	assertSuccess(result, "list pull requests requesting your review");

	const parsed = JSON.parse(result.stdout) as Array<{
		id?: string;
		repository?: unknown;
		number: number;
		title: string;
		author?: unknown;
		url: string;
		updatedAt: string;
		state: string;
		isDraft?: boolean;
	}>;

	return parsed.map((item) => {
		const repo = getRepoName(item.repository);
		return {
			id: item.id ?? `${repo}#${item.number}`,
			repo,
			pullRequestNumber: item.number,
			title: item.title,
			author: getAuthorLogin(item.author),
			url: item.url,
			updatedAt: item.updatedAt,
			state: item.state,
			isDraft: item.isDraft ?? false,
		};
	});
}

export async function getGitHubPullRequestDetails(params: {
	repo: string;
	pullRequestNumber: number;
}): Promise<GitHubPullRequestDetails> {
	const view = await runGh([
		"pr",
		"view",
		String(params.pullRequestNumber),
		"--repo",
		params.repo,
		"--json",
		"title,author,url,body,state,isDraft,headRefOid,headRefName,baseRefName,changedFiles,additions,deletions,files,number",
	]);
	assertSuccess(view, "fetch pull request details");

	const diff = await runGh([
		"pr",
		"diff",
		String(params.pullRequestNumber),
		"--repo",
		params.repo,
		"--patch",
		"--color=never",
	]);
	assertSuccess(diff, "fetch pull request diff");

	const parsed = JSON.parse(view.stdout) as {
		number: number;
		title: string;
		author?: unknown;
		url: string;
		body?: string;
		state: string;
		isDraft?: boolean;
		headRefOid?: string;
		headRefName?: string;
		baseRefName?: string;
		changedFiles?: number;
		additions?: number;
		deletions?: number;
		files?: Array<{ path?: string; additions?: number; deletions?: number }>;
	};

	return {
		repo: params.repo,
		pullRequestNumber: parsed.number,
		title: parsed.title,
		author: getAuthorLogin(parsed.author),
		url: parsed.url,
		body: parsed.body ?? "",
		state: parsed.state,
		isDraft: parsed.isDraft ?? false,
		headSha: parsed.headRefOid ?? "",
		headRefName: parsed.headRefName ?? "",
		baseRefName: parsed.baseRefName ?? "",
		changedFilesCount: parsed.changedFiles ?? parsed.files?.length ?? 0,
		additions: parsed.additions ?? 0,
		deletions: parsed.deletions ?? 0,
		files: (parsed.files ?? []).map((file) => ({
			path: file.path ?? "unknown",
			additions: file.additions ?? 0,
			deletions: file.deletions ?? 0,
		})),
		diff: diff.stdout,
	};
}
