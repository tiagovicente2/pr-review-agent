import type { GeneratePiReviewParams, PiReviewGenerationJob } from '@/shared/review'
import { generateReviewWithPi } from './pi-review'

type StoredJob = PiReviewGenerationJob & {
	promise?: Promise<void>
}

const jobs = new Map<string, StoredJob>()

export function startPiReviewGeneration(params: GeneratePiReviewParams): PiReviewGenerationJob {
	const jobId = getJobId(params)
	const existing = jobs.get(jobId)
	if (existing?.status === 'running' || existing?.status === 'completed') {
		return toPublicJob(existing)
	}

	const startedAt = new Date().toISOString()
	const job: StoredJob = {
		id: jobId,
		pullRequestKey: getPullRequestKey(params),
		status: 'running',
		startedAt,
	}

	job.promise = generateReviewWithPi(params)
		.then((review) => {
			jobs.set(jobId, {
				...job,
				status: 'completed',
				review,
				finishedAt: new Date().toISOString(),
			})
		})
		.catch((error: unknown) => {
			jobs.set(jobId, {
				...job,
				status: 'failed',
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
	const { promise: _promise, ...publicJob } = job
	return publicJob
}

function getJobId(params: GeneratePiReviewParams) {
	return `pi-review:${getPullRequestKey(params)}`
}

function getPullRequestKey(params: GeneratePiReviewParams) {
	const pr = params.pullRequest
	return `${pr.repo}#${pr.pullRequestNumber}:${pr.headSha}`
}
