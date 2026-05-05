import { css, cx } from "styled-system/css";
import { Box, HStack, Stack } from "styled-system/jsx";
import { Badge, Button, Card, Input } from "@/components/ui";
import type { GitHubReviewRequest } from "../../shared/github";
import type { AsyncState } from "../types";
import { formatDate } from "../utils";
import { StatusCard } from "./common";

export function ReviewInbox({
	onRefresh,
	onOpenSettings,
	onSelectReview,
	query,
	reviews,
	reviewsError,
	reviewsState,
	selectedReviewId,
	setQuery,
	username,
}: {
	onRefresh: () => void;
	onOpenSettings: () => void;
	onSelectReview: (id: string) => void;
	query: string;
	reviews: GitHubReviewRequest[];
	reviewsError: string;
	reviewsState: AsyncState;
	selectedReviewId: string | null;
	setQuery: (query: string) => void;
	username?: string;
}) {
	return (
		<Box
			borderRightWidth={{ base: "0", lg: "1px" }}
			bg="gray.2"
			h={{ base: "auto", lg: "100%" }}
			minH="0"
			overflowY={{ base: "visible", lg: "auto" }}
			p="5"
		>
			<Stack gap="5">
				<Stack gap="2">
					<HStack justify="space-between">
						<Box textStyle="xs" fontWeight="bold" letterSpacing="0.28em" color="cyan.11">
							PR Review Agent
						</Box>
						<Button size="sm" variant="outline" onClick={onOpenSettings}>
							Settings
						</Button>
					</HStack>
					<Box as="h1" textStyle="4xl" fontWeight="bold" letterSpacing="-0.04em">
						Review inbox
					</Box>
					<HStack justify="space-between">
						<Box color="fg.muted" textStyle="sm">
							Connected as @{username ?? "unknown"}
						</Box>
						<Button
							size="sm"
							variant="plain"
							onClick={onRefresh}
							loading={reviewsState === "loading"}
						>
							Refresh
						</Button>
					</HStack>
				</Stack>

				<Stack gap="2">
					<label className={css({ textStyle: "sm", fontWeight: "medium" })} htmlFor="review-search">
						Search reviews
					</label>
					<Input
						id="review-search"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Repo, PR, author, title"
						value={query}
						variant="surface"
					/>
				</Stack>

				{reviewsError ? (
					<StatusCard tone="red" title="Could not load review requests" body={reviewsError} />
				) : null}

				<Stack gap="3">
					{reviewsState === "loading" ? (
						<StatusCard
							title="Loading real GitHub PRs"
							body="Calling gh search prs --review-requested=@me..."
						/>
					) : null}

					{reviewsState !== "loading" && reviews.length === 0 ? (
						<StatusCard
							title="No requested reviews found"
							body="GitHub did not return any open PRs where you are currently requested as a reviewer."
						/>
					) : null}

					{reviews.map((review) => {
						const selected = review.id === selectedReviewId;

						return (
							<Card.Root
								asChild
								className={cx(
									css({ cursor: "pointer", transition: "all 150ms ease" }),
									selected &&
										css({ borderColor: "cyan.8", boxShadow: "0 0 0 1px token(colors.cyan.8)" }),
								)}
								key={review.id}
							>
								<button onClick={() => onSelectReview(review.id)} type="button">
									<Card.Body p="4">
										<HStack alignItems="flex-start" justify="space-between" gap="3">
											<Stack gap="1" minW="0">
												<Box color="cyan.11" fontWeight="semibold" textStyle="sm">
													{review.repo}
												</Box>
												<Box fontWeight="medium" textAlign="left">
													#{review.pullRequestNumber} {review.title}
												</Box>
											</Stack>
											<Badge colorPalette={review.isDraft ? "gray" : "cyan"}>
												{review.isDraft ? "draft" : "open"}
											</Badge>
										</HStack>
										<HStack justify="space-between" mt="4" color="fg.muted" textStyle="xs">
											<Box>@{review.author}</Box>
											<Box>{formatDate(review.updatedAt)}</Box>
										</HStack>
									</Card.Body>
								</button>
							</Card.Root>
						);
					})}
				</Stack>
			</Stack>
		</Box>
	);
}
