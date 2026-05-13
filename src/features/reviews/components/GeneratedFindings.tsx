import { Box, HStack, Stack } from 'styled-system/jsx'
import type { AsyncState } from '@/app/types'
import { StatusCard } from '@/components/common'
import { Badge } from '@/components/ui'
import type { PiGeneratedReview, PiReviewFinding } from '@/shared/review'
import { EditableFindingCard } from './EditableFindingCard'
import { ReviewProgress } from './ReviewProgress'
import { severityColorPalette } from './reviewUtils'

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
		return <ReviewProgress message={generationMessage} />
	}

	if (error) {
		return <StatusCard tone="red" title="Review generation failed" body={error} />
	}

	if (!review) {
		return (
			<StatusCard
				title="No draft yet"
				body="Click Generate review to review the loaded GitHub diff and create a local draft."
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
					body="The reviewer did not identify publishable findings for this diff."
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
