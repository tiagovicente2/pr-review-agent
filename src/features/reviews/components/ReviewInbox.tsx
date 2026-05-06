import { css, cx } from 'styled-system/css'
import { Box, HStack, Stack } from 'styled-system/jsx'
import type { AsyncState } from '@/app/types'
import { formatDate } from '@/app/utils'
import { StatusCard } from '@/components/common'
import { Badge, Button, Card, Input } from '@/components/ui'
import type { GitHubReviewRequest } from '@/shared/github'

export function ReviewInbox({
	onRefresh,
	onOpenSettings,
	onReviewPr,
	onSelectReview,
	query,
	reviews,
	reviewsError,
	reviewPrState,
	reviewsState,
	selectedReviewId,
	setQuery,
	username,
}: {
	onRefresh: () => void
	onOpenSettings: () => void
	onReviewPr: () => void
	onSelectReview: (id: string) => void
	query: string
	reviews: GitHubReviewRequest[]
	reviewsError: string
	reviewPrState: AsyncState
	reviewsState: AsyncState
	selectedReviewId: string | null
	setQuery: (query: string) => void
	username?: string
}) {
	return (
		<Box
			borderRightWidth={{ base: '0', lg: '1px' }}
			bg="gray.2"
			h={{ base: 'auto', lg: '100%' }}
			minH="0"
			overflowY={{ base: 'visible', lg: 'auto' }}
			p="5"
		>
			<Stack gap="5">
				<Stack gap="3">
					<HStack justify="space-between" alignItems="flex-start" gap="3">
						<Box as="h1" textStyle="4xl" fontWeight="bold" letterSpacing="-0.04em">
							Review inbox
						</Box>
						<Button size="sm" variant="outline" onClick={onOpenSettings}>
							Settings
						</Button>
					</HStack>
					<HStack justify="space-between" gap="3">
						<Box color="fg.muted" textStyle="sm">
							Connected as @{username ?? 'unknown'}
						</Box>
						<Button
							size="sm"
							variant="plain"
							onClick={onRefresh}
							loading={reviewsState === 'loading'}
						>
							Refresh
						</Button>
					</HStack>
				</Stack>

				<Stack gap="2">
					<label className={css({ textStyle: 'sm', fontWeight: 'medium' })} htmlFor="review-search">
						Search or review a PR
					</label>
					<HStack gap="2">
						<Input
							id="review-search"
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') onReviewPr()
							}}
							placeholder="Repo, PR, author, title, or github.com/owner/repo/pull/123"
							value={query}
							variant="surface"
						/>
						<Button
							size="sm"
							onClick={onReviewPr}
							loading={reviewPrState === 'loading'}
							disabled={!query.trim() || reviewPrState === 'loading'}
						>
							Review PR
						</Button>
					</HStack>
				</Stack>

				{reviewsError ? (
					<StatusCard tone="red" title="Could not load review requests" body={reviewsError} />
				) : null}

				<Stack gap="3">
					{reviewsState === 'loading' ? (
						<StatusCard
							title="Loading real GitHub PRs"
							body="Calling gh search prs --review-requested=@me..."
						/>
					) : null}

					{reviewsState !== 'loading' && reviews.length === 0 ? (
						<StatusCard
							title="No requested reviews found"
							body="GitHub did not return any open PRs where you are currently requested as a reviewer."
						/>
					) : null}

					{reviews.map((review) => {
						const selected = review.id === selectedReviewId

						return (
							<Card.Root
								asChild
								className={cx(
									css({
										appearance: 'none',
										bg: 'gray.surface.bg',
										color: 'fg.default',
										cursor: 'pointer',
										font: 'inherit',
										transition: 'all 150ms ease',
										w: '100%',
									}),
									selected &&
										css({ borderColor: 'cyan.8', boxShadow: '0 0 0 1px token(colors.cyan.8)' }),
								)}
								key={review.id}
							>
								<button onClick={() => onSelectReview(review.id)} type="button">
									<Card.Body p="4" textAlign="left">
										<HStack alignItems="flex-start" justify="space-between" gap="3" w="100%">
											<Stack gap="1" minW="0" flex="1">
												<Box color="cyan.11" fontWeight="semibold" textStyle="sm">
													{review.repo}
												</Box>
												<Box fontWeight="medium" textAlign="left">
													#{review.pullRequestNumber} {review.title}
												</Box>
											</Stack>
											<Badge colorPalette={review.isDraft ? 'gray' : 'cyan'}>
												{review.isDraft ? 'draft' : 'open'}
											</Badge>
										</HStack>
										<HStack justify="space-between" mt="4" color="fg.muted" textStyle="xs">
											<Box>@{review.author}</Box>
											<Box>{formatDate(review.updatedAt)}</Box>
										</HStack>
									</Card.Body>
								</button>
							</Card.Root>
						)
					})}
				</Stack>
			</Stack>
		</Box>
	)
}
