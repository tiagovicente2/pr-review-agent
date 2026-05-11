import { parsePatchFiles } from '@pierre/diffs'
import { useCallback, useEffect, useState } from 'react'
import { appRpc } from '@/app/rpc'
import type { AsyncState } from '@/app/types'
import { getErrorMessage } from '@/app/utils'
import type { GitHubPullRequestDetails } from '@/shared/github'

export function usePullRequestDiff(detail: GitHubPullRequestDetails | null) {
	const [diff, setDiff] = useState('')
	const [firstDiffFilePath, setFirstDiffFilePath] = useState<string | null>(null)
	const [diffState, setDiffState] = useState<AsyncState>('idle')
	const [diffError, setDiffError] = useState('')

	const loadDiff = useCallback(async () => {
		if (!detail) return ''
		if (diff) return diff

		setDiffState('loading')
		setDiffError('')
		try {
			const result = await appRpc.request.getGitHubPullRequestDiff({
				headSha: detail.headSha,
				pullRequestNumber: detail.pullRequestNumber,
				repo: detail.repo,
			})
			setDiff(result.diff)
			setFirstDiffFilePath(getFirstDiffFilePath(result.diff))
			setDiffState('idle')
			return result.diff
		} catch (error) {
			setDiffError(getErrorMessage(error))
			setDiffState('error')
			throw error
		}
	}, [detail, diff])

	useEffect(() => {
		setDiff('')
		setFirstDiffFilePath(null)
		setDiffState('idle')
		setDiffError('')
		if (!detail) return

		let cancelled = false
		setDiffState('loading')
		appRpc.request
			.getGitHubPullRequestDiff({
				headSha: detail.headSha,
				pullRequestNumber: detail.pullRequestNumber,
				repo: detail.repo,
			})
			.then((result) => {
				if (!cancelled) {
					setDiff(result.diff)
					setFirstDiffFilePath(getFirstDiffFilePath(result.diff))
					setDiffState('idle')
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setDiffError(getErrorMessage(error))
					setDiffState('error')
				}
			})

		return () => {
			cancelled = true
		}
	}, [detail])

	return { diff, diffError, diffState, firstDiffFilePath, loadDiff }
}

function getFirstDiffFilePath(diff: string) {
	try {
		const firstFile = parsePatchFiles(diff, 'github-pr-diff', true)[0]?.files[0]
		return firstFile?.name ?? firstFile?.prevName ?? null
	} catch {
		const match = diff.match(/^diff --git a\/(.*?) b\/(.*?)$/m)
		return match?.[2] ?? match?.[1] ?? null
	}
}
