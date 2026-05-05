import { useEffect, useState } from 'react'
import { Box, Grid, HStack, Stack } from 'styled-system/jsx'
import { appRpc } from '@/app/rpc'
import type { AsyncState, ColorMode } from '@/app/types'
import { formatDate, getErrorMessage } from '@/app/utils'
import { StatusCard, TabButton } from '@/components/common'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { Badge, Button, Card } from '@/components/ui'
import type { GitHubPullRequestDetails, GitHubReviewRequest } from '@/shared/github'
import type { PiGeneratedReview, PiInlineComment, PiReviewFinding } from '@/shared/review'
import { ChangedFilesTree } from './changed-files-tree/ChangedFilesTree'
import { DiffViewer } from './diff-viewer/DiffViewer'
import { GeneratedFindings } from './GeneratedFindings'

type TabId = 'code' | 'summary' | 'review'

function getPiReviewJobId(detail: GitHubPullRequestDetails) {
	return `pi-review:${detail.repo}#${detail.pullRequestNumber}:${detail.headSha}`
}

export function ReviewDetail({
	colorMode,
	detail,
	detailError,
	detailState,
	review,
	setSummary,
}: {
	colorMode: ColorMode
	detail: GitHubPullRequestDetails | null
	detailError: string
	detailState: AsyncState
	review: GitHubReviewRequest | null
	setSummary: (summary: string) => void
}) {
	const [activeTab, setActiveTab] = useState<TabId>('code')
	const [generatedReview, setGeneratedReview] = useState<PiGeneratedReview | null>(null)
	const [generationState, setGenerationState] = useState<AsyncState>('idle')
	const [generationError, setGenerationError] = useState('')
	const [generationMessage, setGenerationMessage] = useState('')
	const [publishError, setPublishError] = useState('')
	const [publishingAll, setPublishingAll] = useState(false)
	const [publishingFindingIds, setPublishingFindingIds] = useState<Set<string>>(() => new Set())
	const [generationJobId, setGenerationJobId] = useState<string | null>(null)
	const [diff, setDiff] = useState('')
	const [diffState, setDiffState] = useState<AsyncState>('idle')
	const [diffError, setDiffError] = useState('')

	useEffect(() => {
		setDiff('')
		setDiffState('idle')
		setDiffError('')
		if (!detail) {
			setGeneratedReview(null)
			setGenerationJobId(null)
			return
		}

		let cancelled = false
		const jobId = getPiReviewJobId(detail)
		Promise.all([
			appRpc.request.getSavedPiReview({
				headSha: detail.headSha,
				pullRequestNumber: detail.pullRequestNumber,
				repo: detail.repo,
			}),
			appRpc.request.getPiReviewGenerationJob({ jobId }),
		])
			.then(([savedReview, job]) => {
				if (cancelled) {
					return
				}

				setGeneratedReview(savedReview)
				if (job?.status === 'running') {
					setGenerationState('loading')
					setGenerationJobId(job.id)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setGeneratedReview(null)
				}
			})

		return () => {
			cancelled = true
		}
	}, [detail])

	const handleOpenOnGitHub = async () => {
		if (review) {
			await appRpc.request.openExternalUrl({ url: review.url })
		}
	}

	const handlePublishFinding = async (finding: PiReviewFinding) => {
		if (!detail) {
			return
		}
		setPublishError('')
		setPublishingFindingIds((current) => new Set(current).add(finding.id))
		try {
			await appRpc.request.publishPiReviewComment({ finding, pullRequest: detail })
		} catch (error) {
			setPublishError(getErrorMessage(error))
		} finally {
			setPublishingFindingIds((current) => {
				const next = new Set(current)
				next.delete(finding.id)
				return next
			})
		}
	}

	const handlePublishAll = async (findings: PiReviewFinding[]) => {
		if (!detail) {
			return
		}
		setPublishError('')
		setPublishingAll(true)
		try {
			await appRpc.request.publishPiReviewComments({ findings, pullRequest: detail })
		} catch (error) {
			setPublishError(getErrorMessage(error))
		} finally {
			setPublishingAll(false)
		}
	}

	useEffect(() => {
		if (!detail) {
			return
		}

		let cancelled = false
		setDiffState('loading')
		setDiffError('')
		appRpc.request
			.getGitHubPullRequestDiff({
				headSha: detail.headSha,
				pullRequestNumber: detail.pullRequestNumber,
				repo: detail.repo,
			})
			.then((result) => {
				if (!cancelled) {
					setDiff(result.diff)
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

	useEffect(() => {
		if (!generationJobId) {
			return
		}

		let cancelled = false
		const interval = window.setInterval(async () => {
			try {
				const job = await appRpc.request.getPiReviewGenerationJob({ jobId: generationJobId })
				if (cancelled || !job) {
					return
				}

				setGenerationMessage(job.statusMessage ?? '')

				if (job.status === 'completed' && job.review) {
					setGeneratedReview(job.review)
					setSummary(job.review.publishableBody || job.review.summary)
					setGenerationState('idle')
					setGenerationJobId(null)
				}

				if (job.status === 'failed') {
					setGenerationError(job.error ?? 'Pi review generation failed.')
					setGenerationState('error')
					setGenerationJobId(null)
				}
			} catch (error) {
				if (!cancelled) {
					setGenerationError(getErrorMessage(error))
					setGenerationState('error')
					setGenerationJobId(null)
				}
			}
		}, 1500)

		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [generationJobId, setSummary])

	const loadDiff = async () => {
		if (!detail) {
			return ''
		}
		if (diff) {
			return diff
		}

		setDiffState('loading')
		setDiffError('')
		try {
			const result = await appRpc.request.getGitHubPullRequestDiff({
				headSha: detail.headSha,
				pullRequestNumber: detail.pullRequestNumber,
				repo: detail.repo,
			})
			setDiff(result.diff)
			setDiffState('idle')
			return result.diff
		} catch (error) {
			setDiffError(getErrorMessage(error))
			setDiffState('error')
			throw error
		}
	}

	const handleGenerateWithPi = async () => {
		if (!detail) {
			setGenerationError('Load PR details before generating a review.')
			setGenerationState('error')
			return
		}

		setGenerationState('loading')
		setGenerationError('')
		setGenerationMessage('Loading the latest PR diff before starting Pi...')

		try {
			const loadedDiff = await loadDiff()
			setGenerationMessage('Starting Pi review generation...')
			const job = await appRpc.request.startPiReviewGeneration({
				pullRequest: { ...detail, diff: loadedDiff },
			})
			setGenerationJobId(job.id)
			if (job.status === 'completed' && job.review) {
				setGeneratedReview(job.review)
				setSummary(job.review.publishableBody || job.review.summary)
				setGenerationState('idle')
			}
		} catch (error) {
			setGenerationMessage('')
			setGenerationError(getErrorMessage(error))
			setGenerationState('error')
		}
	}

	if (!review) {
		return (
			<Grid h="100%" minH="0" overflowY="auto" placeItems="center" p="8">
				<StatusCard
					title="Select a pull request"
					body="Your real GitHub review requests will appear in the inbox."
				/>
			</Grid>
		)
	}

	return (
		<Box
			display="grid"
			gridTemplateRows="auto minmax(0, 1fr)"
			h={{ base: 'auto', lg: '100%' }}
			minH="0"
			minW="0"
			overflow="hidden"
		>
			<Box bg="gray.1" px="8" py="3">
				<Grid gridTemplateColumns="minmax(0, 1fr) auto" alignItems="center" gap="4">
					<Stack gap="1" minW="0">
						<HStack flexWrap="wrap" gap="2" color="fg.muted" textStyle="sm">
							<Badge colorPalette="cyan">requested review</Badge>
							<Badge colorPalette="gray" variant="surface">
								{detailState === 'loading' ? 'loading' : review.state}
							</Badge>
							<Box>{detail?.changedFilesCount ?? '—'} files</Box>
							<Box color="green.11">+{detail?.additions ?? '—'}</Box>
							<Box color="red.11">-{detail?.deletions ?? '—'}</Box>
							{detail?.headSha ? <Box>head {detail.headSha.slice(0, 7)}</Box> : null}
						</HStack>
						<Box as="h2" textStyle="xl" fontWeight="bold" letterSpacing="-0.03em" truncate>
							#{review.pullRequestNumber} {review.title}
						</Box>
						<Box color="fg.muted" textStyle="sm" truncate>
							{review.repo} by @{review.author} · updated {formatDate(review.updatedAt)}
						</Box>
					</Stack>

					<Button onClick={handleOpenOnGitHub} size="sm">
						Open on GitHub
					</Button>
				</Grid>
				{detailError ? (
					<Box mt="4">
						<StatusCard tone="red" title="Could not load PR details" body={detailError} />
					</Box>
				) : null}
			</Box>

			<Grid
				gridTemplateColumns="minmax(0, 1fr)"
				gap="4"
				minH="0"
				minW="0"
				overflow="hidden"
				px="8"
				pb="8"
				pt="4"
			>
				<Stack gap="5" minH="0" minW="0">
					<Card.Root h="100%" minH="0" overflow="hidden">
						<Card.Header>
							<HStack justify="space-between" gap="3" w="100%">
								<HStack gap="0.5" p="0.5" bg="gray.2" borderRadius="l1" width="fit-content">
									<TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')}>
										Code
									</TabButton>
									<TabButton
										active={activeTab === 'summary'}
										onClick={() => setActiveTab('summary')}
									>
										Summary
									</TabButton>
									<TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')}>
										Review
									</TabButton>
								</HStack>
								{activeTab === 'review' ? (
									<HStack gap="2">
										{generatedReview?.findings.length ? (
											<Button
												loading={publishingAll}
												onClick={() => handlePublishAll(generatedReview.findings)}
												size="sm"
											>
												Publish all comments
											</Button>
										) : null}
										<Button
											disabled={!detail || detailState === 'loading'}
											loading={generationState === 'loading'}
											onClick={handleGenerateWithPi}
											size="sm"
											variant={generatedReview ? 'outline' : 'solid'}
										>
											{generatedReview ? 'Regenerate with Pi' : 'Generate with Pi'}
										</Button>
									</HStack>
								) : null}
							</HStack>
						</Card.Header>
						<Card.Body minH="0" overflow="hidden">
							{activeTab === 'code' && (
								<CodeTab
									colorMode={colorMode}
									detail={detail}
									detailState={detailState}
									diff={diff}
									diffError={diffError}
									diffState={diffState}
									inlineComments={generatedReview?.inlineComments ?? []}
									onLoadDiff={loadDiff}
								/>
							)}
							{activeTab === 'summary' && <SummaryTab detail={detail} />}
							{activeTab === 'review' && (
								<ReviewTab
									generationError={generationError}
									generationMessage={generationMessage}
									generationState={generationState}
									publishError={publishError}
									generatedReview={generatedReview}
									onPublishFinding={handlePublishFinding}
									publishingFindingIds={publishingFindingIds}
								/>
							)}
						</Card.Body>
					</Card.Root>
				</Stack>
			</Grid>
		</Box>
	)
}

function ReviewTab({
	generationError,
	generationMessage,
	generationState,
	generatedReview,
	publishError,
	onPublishFinding,
	publishingFindingIds,
}: {
	generationError: string
	generationMessage: string
	generationState: AsyncState
	generatedReview: PiGeneratedReview | null
	publishError: string
	onPublishFinding: (finding: PiReviewFinding) => void
	publishingFindingIds: Set<string>
}) {
	return (
		<Stack gap="4" h="100%" minH="0" overflow="hidden">
			<Box
				h="100%"
				minH="0"
				overflowY="auto"
				textAlign={generatedReview ? 'left' : 'center'}
				w="100%"
			>
				<GeneratedFindings
					error={generationError || publishError}
					generationMessage={generationMessage}
					generationState={generationState}
					onPublishFinding={onPublishFinding}
					publishingFindingIds={publishingFindingIds}
					review={generatedReview}
				/>
			</Box>
		</Stack>
	)
}

function CodeTab({
	colorMode,
	detail,
	detailState,
	diff,
	diffError,
	diffState,
	inlineComments,
	onLoadDiff,
}: {
	colorMode: ColorMode
	detail: GitHubPullRequestDetails | null
	detailState: AsyncState
	diff: string
	diffError: string
	diffState: AsyncState
	inlineComments: PiInlineComment[]
	onLoadDiff: () => Promise<string>
}) {
	const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

	if (detailState === 'loading') {
		return (
			<StatusCard
				title="Loading pull request metadata"
				body="Loading PR summary and file list..."
			/>
		)
	}

	return (
		<Grid
			gridTemplateColumns={{ base: 'minmax(0, 1fr)', xl: '24rem minmax(0, 1fr)' }}
			gap="5"
			h="100%"
			minH="0"
			minW="0"
			overflow="hidden"
		>
			<Card.Root
				h="100%"
				maxH={{ base: '24rem', xl: '100%' }}
				minH="0"
				overflow="hidden"
				variant="outline"
			>
				<Card.Header>
					<Card.Title>Changed files</Card.Title>
					<Card.Description truncate>
						{selectedFilePath
							? `Focused: ${selectedFilePath}`
							: `${detail?.files.length ?? 0} edited files`}
					</Card.Description>
				</Card.Header>
				<Card.Body minH="0" overflow="hidden">
					{detail ? (
						<ChangedFilesTree
							files={detail.files}
							onSelectFile={setSelectedFilePath}
							selectedFilePath={selectedFilePath}
						/>
					) : null}
				</Card.Body>
			</Card.Root>

			<Box
				h="100%"
				maxH={{ base: '70vh', xl: '100%' }}
				maxW="100%"
				minH="0"
				minW="0"
				overflow="auto"
			>
				{diff ? (
					<DiffViewer
						colorMode={colorMode}
						inlineComments={inlineComments}
						patch={diff}
						selectedFilePath={selectedFilePath}
					/>
				) : (
					<Stack h="100%" placeContent="center" alignItems="center" gap="4" textAlign="center">
						<StatusCard
							tone={diffError ? 'red' : 'gray'}
							title={diffError ? 'Could not load diff' : 'Loading diff'}
							body={diffError || 'Loading the patch in the background...'}
						/>
						{diffError ? (
							<Button loading={diffState === 'loading'} onClick={() => void onLoadDiff()}>
								Retry loading diff
							</Button>
						) : null}
					</Stack>
				)}
			</Box>
		</Grid>
	)
}

function SummaryTab({ detail }: { detail: GitHubPullRequestDetails | null }) {
	return (
		<Stack h="100%" maxH={{ base: '70vh', xl: 'calc(100vh - 18rem)' }} minH="0" overflow="hidden">
			<Card.Root h="100%" minH="0" overflow="hidden" variant="outline">
				<Card.Header>
					<Card.Title>Pull request summary</Card.Title>
					<Card.Description>
						{detail
							? `${detail.headRefName} → ${detail.baseRefName} · ${detail.changedFilesCount} files changed`
							: 'Load a pull request to see its summary.'}
					</Card.Description>
				</Card.Header>
				<Card.Body minH="0" overflowY="auto">
					<MarkdownContent>
						{detail?.body || 'This pull request does not include a description.'}
					</MarkdownContent>
				</Card.Body>
			</Card.Root>
		</Stack>
	)
}
