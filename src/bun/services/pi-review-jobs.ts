import type { GeneratePiReviewParams, PiReviewGenerationJob } from '@/shared/review'
import { generateReviewWithPi } from './pi-review'

type StoredJob = PiReviewGenerationJob & {
	promise?: Promise<void>
	progressTimer?: Timer
}

const progressMessages = [
	'Pi is reading the PR metadata and diff...',
	'Pi is checking the changed files for correctness issues...',
	'Pi is looking for regressions, edge cases, and risky assumptions...',
	'Pi is drafting concise GitHub review comments...',
	'Pi is formatting the review output...',
]

const jobs = new Map<string, StoredJob>()

export function startPiReviewGeneration(params: GeneratePiReviewParams): PiReviewGenerationJob {
	const jobId = getJobId(params)
	const existing = jobs.get(jobId)
	if (existing?.status === 'running') {
		return toPublicJob(existing)
	}

	const startedAt = new Date().toISOString()
	const job: StoredJob = {
		id: jobId,
		pullRequestKey: getPullRequestKey(params),
		status: 'running',
		statusMessage: 'Pi is reading the PR metadata and diff...',
		startedAt,
	}

	job.progressTimer = startProgressTimer(jobId, job)
	job.promise = generateReviewWithPi(params)
		.then((review) => {
			clearProgressTimer(job)
			jobs.set(jobId, {
				...job,
				progressTimer: undefined,
				status: 'completed',
				statusMessage: 'Pi finished the draft review.',
				review,
				finishedAt: new Date().toISOString(),
			})
		})
		.catch((error: unknown) => {
			clearProgressTimer(job)
			jobs.set(jobId, {
				...job,
				progressTimer: undefined,
				status: 'failed',
				statusMessage: 'Pi could not finish the draft review.',
				error: error instanceof Error ? error.message : String(error),
				finishedAt: new Date().toISOString(),
			})
		})

	jobs.set(jobId, job)
	return toPublicJob(job)
}

export function getPiReviewGenerationJob(params: { jobId: string }): PiReviewGenerationJob | null {
	const job = jobs.get(params.jobId)
	return job ? toPublicJob(job) : null
}

function toPublicJob(job: StoredJob): PiReviewGenerationJob {
	const { progressTimer: _progressTimer, promise: _promise, ...publicJob } = job
	return publicJob
}

function startProgressTimer(jobId: string, initialJob: StoredJob) {
	let index = 0
	return setInterval(() => {
		const current = jobs.get(jobId) ?? initialJob
		if (current.status !== 'running') {
			clearProgressTimer(current)
			return
		}

		index = Math.min(index + 1, progressMessages.length - 1)
		jobs.set(jobId, {
			...current,
			statusMessage: progressMessages[index],
		})
	}, 7000)
}

function clearProgressTimer(job: StoredJob) {
	if (job.progressTimer) {
		clearInterval(job.progressTimer)
	}
}

function getJobId(params: GeneratePiReviewParams) {
	return `pi-review:${getPullRequestKey(params)}`
}

function getPullRequestKey(params: GeneratePiReviewParams) {
	const pr = params.pullRequest
	return `${pr.repo}#${pr.pullRequestNumber}:${pr.headSha}`
}
