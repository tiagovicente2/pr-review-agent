import { useEffect, useState } from 'react'
import { css } from 'styled-system/css'
import { Box, Grid, HStack, Stack } from 'styled-system/jsx'
import type { AsyncState } from '@/app/types'
import { StatusCard } from '@/components/common'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { Badge, Button, Card, Textarea } from '@/components/ui'
import type { PiGeneratedReview, PiReviewFinding, ReviewSeverity } from '@/shared/review'

export function GeneratedFindings({
	error,
	generationMessage,
	generationState,
	onPublishFinding,
	publishingFindingIds,
	review,
}: {
	error: string
	generationMessage?: string
	generationState: AsyncState
	onPublishFinding?: (finding: PiReviewFinding) => void
	publishingFindingIds?: Set<string>
	review: PiGeneratedReview | null
}) {
	if (generationState === 'loading') {
		return <PiReviewProgress message={generationMessage} />
	}

	if (error) {
		return <StatusCard tone="red" title="Pi review generation failed" body={error} />
	}

	if (!review) {
		return (
			<StatusCard
				title="No Pi draft yet"
				body="Click Generate with Pi to review the loaded GitHub diff and create a local draft."
			/>
		)
	}

	return (
		<Stack gap="3">
			<HStack gap="2">
				<Badge colorPalette={severityColorPalette(review.severity)}>{review.severity}</Badge>
				<Badge colorPalette="gray" variant="surface">
					{review.verdictRecommendation}
				</Badge>
			</HStack>
			<Box color="fg.muted" textStyle="sm">
				{review.summary}
			</Box>
			{review.diffWasTruncated ? (
				<StatusCard
					title="Diff was truncated"
					body="The PR diff was too large to send in full. Review the raw diff before publishing anything."
				/>
			) : null}
			{review.findings.length === 0 ? (
				<StatusCard
					title="No concrete findings"
					body="Pi did not identify publishable findings for this diff."
				/>
			) : null}
			{review.findings.map((finding) => (
				<EditableFindingCard
					finding={finding}
					key={finding.id}
					onPublishFinding={onPublishFinding}
					publishing={publishingFindingIds?.has(finding.id) ?? false}
				/>
			))}
		</Stack>
	)
}

const piReviewFrames = [
	'[=     ]',
	'[==    ]',
	'[ ===  ]',
	'[  === ]',
	'[    ==]',
	'[     =]',
	'[    ==]',
	'[  === ]',
]

function PiReviewProgress({ message }: { message?: string }) {
	const [frameIndex, setFrameIndex] = useState(0)

	useEffect(() => {
		const interval = window.setInterval(() => {
			setFrameIndex((current) => (current + 1) % piReviewFrames.length)
		}, 180)

		return () => window.clearInterval(interval)
	}, [])

	return (
		<Stack bg="gray.2" borderRadius="l2" gap="3" p="4" textAlign="left">
			<HStack gap="3">
				<Box color="cyan.11" fontFamily="mono" textStyle="sm">
					{piReviewFrames[frameIndex]}
				</Box>
				<Box fontWeight="semibold">Pi is reviewing this PR</Box>
			</HStack>
			<Box color="fg.muted" textStyle="sm">
				{message || 'This can take a minute for larger diffs.'}
			</Box>
		</Stack>
	)
}

function EditableFindingCard({
	finding,
	onPublishFinding,
	publishing,
}: {
	finding: PiReviewFinding
	onPublishFinding?: (finding: PiReviewFinding) => void
	publishing: boolean
}) {
	const [commentBody, setCommentBody] = useState(finding.suggestedCommentBody || finding.body)
	const canPublish = Boolean(finding.filePath && finding.lineStart && commentBody.trim())
	const hasFix = Boolean(finding.fixSuggestion)
	const publishableFinding = {
		...finding,
		suggestedCommentBody: commentBody.trim(),
	}

	return (
		<Card.Root variant="outline">
			<Card.Body p="4">
				<Grid
					gridTemplateColumns={
						hasFix ? { base: '1fr', xl: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' } : '1fr'
					}
					gap="5"
				>
					<Stack gap="3" minW="0">
						<HStack justify="space-between" gap="3">
							<Badge colorPalette={severityColorPalette(finding.severity)}>
								{finding.severity}
							</Badge>
							<Button
								disabled={!canPublish}
								loading={publishing}
								onClick={() => onPublishFinding?.(publishableFinding)}
								size="xs"
								variant="outline"
							>
								Publish comment
							</Button>
						</HStack>
						<Box fontWeight="semibold">{finding.title}</Box>
						<MarkdownContent>{finding.body}</MarkdownContent>
						<Stack gap="2">
							<Box color="fg.muted" fontWeight="semibold" textStyle="xs">
								PR comment
							</Box>
							<Textarea
								minH="8rem"
								onChange={(event) => setCommentBody(event.target.value)}
								placeholder="Edit the comment before publishing..."
								value={commentBody}
								variant="surface"
							/>
						</Stack>
						<HStack color="fg.muted" justify="space-between" textStyle="xs">
							<Box color="cyan.11">
								{finding.filePath}
								{finding.lineStart ? `:${finding.lineStart}` : ''}
							</Box>
							<Box>{Math.round(finding.confidence * 100)}% confidence</Box>
						</HStack>
					</Stack>
					{hasFix ? (
						<Box minW="0">
							<DiffCodeBlock diff={finding.fixSuggestion ?? ''} />
						</Box>
					) : null}
				</Grid>
			</Card.Body>
		</Card.Root>
	)
}

function DiffCodeBlock({ diff }: { diff: string }) {
	const normalizedDiff = stripMarkdownFence(diff)
	const lineCounts = new Map<string, number>()
	const lines = normalizedDiff.split('\n').map((line) => {
		const count = lineCounts.get(line) ?? 0
		lineCounts.set(line, count + 1)
		return { id: `${line}-${count}`, value: line }
	})

	return (
		<Box
			as="pre"
			className={css({
				backgroundColor: 'gray.1',
				borderColor: 'border.default',
				borderRadius: 'l2',
				borderWidth: '1px',
				fontFamily: 'mono',
				fontSize: 'xs',
				lineHeight: '1.7',
				overflowX: 'auto',
				padding: '3',
			})}
		>
			{lines.map((line) => (
				<Box
					as="code"
					className={css({
						color: diffLineColor(line.value),
						display: 'block',
						whiteSpace: 'pre',
					})}
					key={line.id}
				>
					{line.value || ' '}
				</Box>
			))}
		</Box>
	)
}

function stripMarkdownFence(value: string) {
	return value
		.replace(/^```(?:diff|patch)?\n/i, '')
		.replace(/\n```$/i, '')
		.trim()
}

function diffLineColor(line: string) {
	if (line.startsWith('+') && !line.startsWith('+++')) {
		return 'green.11'
	}

	if (line.startsWith('-') && !line.startsWith('---')) {
		return 'red.11'
	}

	if (line.startsWith('@@')) {
		return 'cyan.11'
	}

	return 'fg.muted'
}

function severityColorPalette(severity: ReviewSeverity): 'cyan' | 'gray' | 'red' {
	if (severity === 'critical' || severity === 'high') {
		return 'red'
	}

	if (severity === 'medium') {
		return 'cyan'
	}

	return 'gray'
}
