import { useState } from 'react'
import { Box, Grid, HStack, Stack } from 'styled-system/jsx'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { Badge, Button, Card, Textarea } from '@/components/ui'
import type { PiReviewFinding } from '@/shared/review'
import { DiffCodeBlock } from './DiffCodeBlock'
import { severityColorPalette } from './reviewUtils'

export function EditableFindingCard({
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
		<Card.Root maxW="100%" overflow="visible" variant="outline">
			<Card.Body maxW="100%" overflow="visible" p="4">
				<Grid
					gridTemplateColumns={
						hasFix ? { base: '1fr', xl: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' } : '1fr'
					}
					gap="5"
					maxW="100%"
					overflow="visible"
				>
					<Stack gap="3" minW="0" overflow="visible">
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
						<Stack gap="2" minW="0">
							<Box color="fg.muted" fontWeight="semibold" textStyle="xs">
								PR comment
							</Box>
							<Textarea
								boxSizing="border-box"
								color="fg.default"
								display="block"
								minH="8rem"
								onChange={(event) => setCommentBody(event.target.value)}
								placeholder="Edit the comment before publishing..."
								resize="vertical"
								value={commentBody}
								variant="surface"
								w="100%"
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
						<Box minW="0" overflow="hidden">
							<DiffCodeBlock diff={finding.fixSuggestion ?? ''} />
						</Box>
					) : null}
				</Grid>
			</Card.Body>
		</Card.Root>
	)
}
