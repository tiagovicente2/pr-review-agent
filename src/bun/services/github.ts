import { Buffer } from 'node:buffer'
import type {
	GitHubAuthStatus,
	GitHubLoginResult,
	GitHubPullRequestDetails,
	GitHubReviewRequest,
} from '@/shared/github'
import {
	getCachedPullRequestDetails,
	getCachedPullRequestDiff,
	saveCachedPullRequestDetails,
	saveCachedPullRequestDiff,
} from './pull-request-cache'

type CommandResult = {
	exitCode: number
	stdout: string
	stderr: string
}

async function runGh(
	args: string[],
	input?: string,
	options: { disablePrompt?: boolean } = {},
): Promise<CommandResult> {
	const proc = Bun.spawn(['gh', ...args], {
		stdin: input === undefined ? 'ignore' : 'pipe',
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			...Bun.env,
			...(options.disablePrompt === false ? {} : { GH_PROMPT_DISABLED: '1' }),
		},
	})

	if (input !== undefined && proc.stdin) {
		proc.stdin.write(input)
		proc.stdin.end()
	}

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	])

	return { exitCode, stdout, stderr }
}

async function runGhBinary(args: string[]): Promise<{
	exitCode: number
	stdout: ArrayBuffer
	stderr: string
}> {
	const proc = Bun.spawn(['gh', ...args], {
		stdin: 'ignore',
		stdout: 'pipe',
		stderr: 'pipe',
		env: { ...Bun.env, GH_PROMPT_DISABLED: '1' },
	})
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).arrayBuffer(),
		new Response(proc.stderr).text(),
		proc.exited,
	])
	return { exitCode, stdout, stderr }
}

function commandOutput(result: CommandResult) {
	return [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
}

function assertSuccess(result: CommandResult, action: string) {
	if (result.exitCode === 0) {
		return
	}

	throw new Error(commandOutput(result) || `GitHub CLI failed while trying to ${action}.`)
}

async function isGhInstalled() {
	try {
		const result = await runGh(['--version'])
		return result.exitCode === 0
	} catch {
		return false
	}
}

function getRepoName(repository: unknown): string {
	if (!repository || typeof repository !== 'object') {
		return 'unknown/unknown'
	}

	const repo = repository as {
		fullName?: string
		nameWithOwner?: string
		name?: string
		owner?: { login?: string }
	}

	if (repo.nameWithOwner) {
		return repo.nameWithOwner
	}

	if (repo.fullName) {
		return repo.fullName
	}

	if (repo.owner?.login && repo.name) {
		return `${repo.owner.login}/${repo.name}`
	}

	return repo.name ?? 'unknown/unknown'
}

function getRepoParts(repo: string) {
	const [owner, name] = repo.split('/')
	if (!owner || !name) throw new Error(`Invalid repository name: ${repo}`)
	return { owner, name }
}

function rewriteGitHubAssetUrls(markdown: string, repo: string) {
	const { owner, name } = getRepoParts(repo)
	return markdown.replace(
		/(<img\b[^>]*\bsrc=["']|!\[[^\]]*\]\()\/?assets\//gi,
		`$1https://github.com/${owner}/${name}/assets/`,
	)
}

function getAuthorLogin(author: unknown): string {
	if (!author || typeof author !== 'object') {
		return 'unknown'
	}

	return (
		(author as { login?: string; name?: string }).login ??
		(author as { name?: string }).name ??
		'unknown'
	)
}

export async function getGitHubAuthStatus(): Promise<GitHubAuthStatus> {
	const ghInstalled = await isGhInstalled()

	if (!ghInstalled) {
		return {
			ghInstalled: false,
			authenticated: false,
			error: 'GitHub CLI is not installed or is not available on PATH.',
		}
	}

	const status = await runGh(['auth', 'status'])
	if (status.exitCode !== 0) {
		return {
			ghInstalled: true,
			authenticated: false,
			message: commandOutput(status) || 'GitHub CLI is installed, but you are not authenticated.',
		}
	}

	const user = await runGh(['api', 'user', '--jq', '.login'])
	if (user.exitCode !== 0) {
		return {
			ghInstalled: true,
			authenticated: false,
			error: commandOutput(user) || 'Could not read the authenticated GitHub user.',
		}
	}

	return {
		ghInstalled: true,
		authenticated: true,
		username: user.stdout.trim(),
		message: 'Connected to GitHub through gh CLI.',
	}
}

export async function startGitHubLogin(): Promise<GitHubLoginResult> {
	const before = await getGitHubAuthStatus()
	if (!before.ghInstalled) {
		return {
			ok: false,
			status: before,
			output: before.error ?? 'Install the GitHub CLI first.',
		}
	}

	if (before.authenticated) {
		return {
			ok: true,
			status: before,
			output: 'Already connected to GitHub.',
		}
	}

	const login = await runGh(
		[
			'auth',
			'login',
			'--hostname',
			'github.com',
			'--web',
			'--clipboard',
			'--git-protocol',
			'https',
			'--skip-ssh-key',
		],
		'\n',
		{ disablePrompt: false },
	)
	const status = await getGitHubAuthStatus()

	return {
		ok: login.exitCode === 0 && status.authenticated,
		status,
		output: commandOutput(login),
	}
}

function toReviewRequest(item: {
	id?: string
	repository?: unknown
	number: number
	title: string
	author?: unknown
	url: string
	updatedAt?: string
	state: string
	isDraft?: boolean
}): GitHubReviewRequest {
	const repo = getRepoName(item.repository)
	return {
		id: item.id ?? `${repo}#${item.number}`,
		repo,
		pullRequestNumber: item.number,
		title: item.title,
		author: getAuthorLogin(item.author),
		url: item.url,
		updatedAt: item.updatedAt ?? new Date().toISOString(),
		state: item.state,
		isDraft: item.isDraft ?? false,
	}
}

function repoFromPullRequestUrl(url: string): { nameWithOwner: string } {
	const match = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/i)
	return { nameWithOwner: match?.[1] ?? 'unknown/unknown' }
}

function parsePullRequestQuery(query: string): { target: string; repo?: string } {
	const trimmed = query.trim()
	if (!trimmed) {
		throw new Error('Enter a GitHub PR URL, owner/repo#number, or owner/repo number.')
	}

	const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/i)
	if (urlMatch) {
		return { target: urlMatch[2] ?? trimmed, repo: urlMatch[1] }
	}

	const hashMatch = trimmed.match(/^([^\s#]+\/[^\s#]+)#(\d+)$/)
	if (hashMatch) {
		return { target: hashMatch[2] ?? trimmed, repo: hashMatch[1] }
	}

	const spacedMatch = trimmed.match(/^([^\s#]+\/[^\s#]+)\s+(\d+)$/)
	if (spacedMatch) {
		return { target: spacedMatch[2] ?? trimmed, repo: spacedMatch[1] }
	}

	return { target: trimmed }
}

export async function listGitHubReviewRequests(): Promise<GitHubReviewRequest[]> {
	const authStatus = await getGitHubAuthStatus()
	if (!authStatus.authenticated) {
		throw new Error(
			authStatus.error ?? authStatus.message ?? 'Connect GitHub before listing reviews.',
		)
	}

	const result = await runGh([
		'search',
		'prs',
		'--review-requested=@me',
		'--state=open',
		'--limit=50',
		'--json',
		'repository,number,title,author,url,updatedAt,state,isDraft,id',
	])
	assertSuccess(result, 'list pull requests requesting your review')

	const parsed = JSON.parse(result.stdout) as Array<{
		id?: string
		repository?: unknown
		number: number
		title: string
		author?: unknown
		url: string
		updatedAt: string
		state: string
		isDraft?: boolean
	}>

	return parsed.map(toReviewRequest)
}

export async function getGitHubPullRequestForReview(params: {
	query: string
}): Promise<GitHubReviewRequest> {
	const authStatus = await getGitHubAuthStatus()
	if (!authStatus.authenticated) {
		throw new Error(authStatus.error ?? authStatus.message ?? 'Connect GitHub before loading a PR.')
	}

	const { target, repo } = parsePullRequestQuery(params.query)
	const args = [
		'pr',
		'view',
		target,
		'--json',
		'number,title,author,url,updatedAt,state,isDraft,id',
	]
	if (repo) {
		args.push('--repo', repo)
	}

	const result = await runGh(args)
	assertSuccess(result, 'load pull request for review')

	const parsed = JSON.parse(result.stdout) as {
		id?: string
		number: number
		title: string
		author?: unknown
		url: string
		updatedAt?: string
		state: string
		isDraft?: boolean
	}

	return toReviewRequest({ ...parsed, repository: repoFromPullRequestUrl(parsed.url) })
}

export async function getGitHubPullRequestDetails(params: {
	repo: string
	pullRequestNumber: number
}): Promise<GitHubPullRequestDetails> {
	const cached = getCachedPullRequestDetails(params)
	if (cached) {
		return { ...cached, body: rewriteGitHubAssetUrls(cached.body, params.repo) }
	}

	const view = await runGh([
		'pr',
		'view',
		String(params.pullRequestNumber),
		'--repo',
		params.repo,
		'--json',
		'title,author,url,body,state,isDraft,headRefOid,headRefName,baseRefName,changedFiles,additions,deletions,files,number,reviewDecision,reviews',
	])
	assertSuccess(view, 'fetch pull request details')

	const parsed = JSON.parse(view.stdout) as {
		number: number
		title: string
		author?: unknown
		url: string
		body?: string
		state: string
		isDraft?: boolean
		headRefOid?: string
		headRefName?: string
		baseRefName?: string
		changedFiles?: number
		additions?: number
		deletions?: number
		files?: Array<{ path?: string; additions?: number; deletions?: number }>
		reviewDecision?: string
		reviews?: Array<{ author?: unknown; state?: string; submittedAt?: string }>
	}

	const body = rewriteGitHubAssetUrls(parsed.body ?? '', params.repo)

	const details = {
		repo: params.repo,
		pullRequestNumber: parsed.number,
		title: parsed.title,
		author: getAuthorLogin(parsed.author),
		url: parsed.url,
		body,
		state: parsed.state,
		isDraft: parsed.isDraft ?? false,
		headSha: parsed.headRefOid ?? '',
		headRefName: parsed.headRefName ?? '',
		baseRefName: parsed.baseRefName ?? '',
		changedFilesCount: parsed.changedFiles ?? parsed.files?.length ?? 0,
		additions: parsed.additions ?? 0,
		deletions: parsed.deletions ?? 0,
		reviewDecision: parsed.reviewDecision,
		reviews: (parsed.reviews ?? []).map((review) => ({
			author: getAuthorLogin(review.author),
			state: review.state ?? 'UNKNOWN',
			submittedAt: review.submittedAt,
		})),
		files: (parsed.files ?? []).map((file) => ({
			path: file.path ?? 'unknown',
			additions: file.additions ?? 0,
			deletions: file.deletions ?? 0,
		})),
		diff: '',
	}

	saveCachedPullRequestDetails(details)
	return details
}

export async function getGitHubAsset(params: { url: string }): Promise<{ dataUrl: string }> {
	const parsedUrl = new URL(params.url)
	if (parsedUrl.hostname !== 'github.com') {
		throw new Error('Only github.com asset URLs can be loaded.')
	}

	const result = await runGhBinary([
		'api',
		parsedUrl.pathname,
		'--header',
		'Accept: application/octet-stream',
	])
	if (result.exitCode !== 0) {
		throw new Error(result.stderr || 'GitHub CLI failed while trying to fetch GitHub asset.')
	}

	const data = Buffer.from(result.stdout).toString('base64')
	return { dataUrl: `data:image/png;base64,${data}` }
}

export async function getGitHubPullRequestDiff(params: {
	repo: string
	pullRequestNumber: number
	headSha: string
}): Promise<{ diff: string }> {
	const cached = getCachedPullRequestDiff(params)
	if (cached !== null) {
		return { diff: cached }
	}

	const diff = await runGh([
		'pr',
		'diff',
		String(params.pullRequestNumber),
		'--repo',
		params.repo,
		'--patch',
		'--color=never',
	])
	assertSuccess(diff, 'fetch pull request diff')
	saveCachedPullRequestDiff({ ...params, diff: diff.stdout })
	return { diff: diff.stdout }
}
