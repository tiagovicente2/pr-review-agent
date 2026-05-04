import { useCallback, useEffect, useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { Box, Grid, HStack, Stack } from "styled-system/jsx";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import type {
	GitHubAuthStatus,
	GitHubPullRequestDetails,
	GitHubReviewRequest,
} from "../shared/github";
import type { PiGeneratedReview, ReviewSeverity } from "../shared/review";
import { appRpc } from "./rpc";

type ColorMode = "light" | "dark";

type AsyncState = "idle" | "loading" | "error";

const emptyAuthStatus: GitHubAuthStatus = {
	ghInstalled: false,
	authenticated: false,
	message: "Checking GitHub CLI status...",
};

function App() {
	const [colorMode, setColorMode] = useState<ColorMode>("dark");
	const [authStatus, setAuthStatus] = useState<GitHubAuthStatus | null>(null);
	const [authState, setAuthState] = useState<AsyncState>("loading");
	const [connectState, setConnectState] = useState<AsyncState>("idle");
	const [loginOutput, setLoginOutput] = useState("");
	const [reviews, setReviews] = useState<GitHubReviewRequest[]>([]);
	const [reviewsState, setReviewsState] = useState<AsyncState>("idle");
	const [reviewsError, setReviewsError] = useState("");
	const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
	const [detail, setDetail] = useState<GitHubPullRequestDetails | null>(null);
	const [detailState, setDetailState] = useState<AsyncState>("idle");
	const [detailError, setDetailError] = useState("");
	const [query, setQuery] = useState("");
	const [summary, setSummary] = useState("");

	const loadReviewRequests = useCallback(async () => {
		setReviewsState("loading");
		setReviewsError("");

		try {
			const items = await appRpc.request.listGitHubReviewRequests();
			setReviews(items);
			setSelectedReviewId((current) => current ?? items[0]?.id ?? null);
			setReviewsState("idle");
		} catch (error) {
			setReviewsError(getErrorMessage(error));
			setReviewsState("error");
		}
	}, []);

	const refreshAuth = useCallback(async () => {
		setAuthState("loading");
		try {
			const status = await appRpc.request.getGitHubAuthStatus();
			setAuthStatus(status);
			setAuthState("idle");

			if (status.authenticated) {
				await loadReviewRequests();
			}
		} catch (error) {
			setAuthStatus({
				ghInstalled: false,
				authenticated: false,
				error: getErrorMessage(error),
			});
			setAuthState("error");
		}
	}, [loadReviewRequests]);

	useEffect(() => {
		void refreshAuth();
	}, [refreshAuth]);

	const selectedReview = useMemo(
		() => reviews.find((review) => review.id === selectedReviewId) ?? null,
		[reviews, selectedReviewId],
	);

	useEffect(() => {
		if (!selectedReview) {
			setDetail(null);
			return;
		}

		let cancelled = false;
		setDetailState("loading");
		setDetailError("");
		setDetail(null);
		setSummary("");

		appRpc.request
			.getGitHubPullRequestDetails({
				repo: selectedReview.repo,
				pullRequestNumber: selectedReview.pullRequestNumber,
			})
			.then((pullRequestDetails) => {
				if (!cancelled) {
					setDetail(pullRequestDetails);
					setDetailState("idle");
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setDetailError(getErrorMessage(error));
					setDetailState("error");
				}
			});

		return () => {
			cancelled = true;
		};
	}, [selectedReview]);

	const filteredReviews = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) {
			return reviews;
		}

		return reviews.filter((review) => {
			const searchableText =
				`${review.repo} ${review.pullRequestNumber} ${review.title} ${review.author}`.toLowerCase();
			return searchableText.includes(normalizedQuery);
		});
	}, [query, reviews]);

	const handleConnect = async () => {
		setConnectState("loading");
		setLoginOutput("");

		try {
			const result = await appRpc.request.startGitHubLogin();
			setAuthStatus(result.status);
			setLoginOutput(result.output);
			setConnectState(result.ok ? "idle" : "error");

			if (result.status.authenticated) {
				await loadReviewRequests();
			}
		} catch (error) {
			setLoginOutput(getErrorMessage(error));
			setConnectState("error");
		}
	};

	const currentAuthStatus = authStatus ?? emptyAuthStatus;

	return (
		<Box className={colorMode} minH="100vh" bg="gray.1" color="fg.default" colorPalette="cyan">
			{!currentAuthStatus.authenticated ? (
				<GitHubLoginPage
					authState={authState}
					colorMode={colorMode}
					connectState={connectState}
					loginOutput={loginOutput}
					onConnect={handleConnect}
					onRefresh={refreshAuth}
					onToggleColorMode={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
					status={currentAuthStatus}
				/>
			) : (
				<Grid gridTemplateColumns={{ base: "1fr", lg: "24rem minmax(0, 1fr)" }} minH="100vh">
					<ReviewInbox
						colorMode={colorMode}
						onRefresh={loadReviewRequests}
						onSelectReview={setSelectedReviewId}
						onToggleColorMode={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
						query={query}
						reviews={filteredReviews}
						reviewsError={reviewsError}
						reviewsState={reviewsState}
						selectedReviewId={selectedReviewId}
						setQuery={setQuery}
						username={currentAuthStatus.username}
					/>
					<ReviewDetail
						key={selectedReviewId ?? "empty-review"}
						detail={detail}
						detailError={detailError}
						detailState={detailState}
						onReloadReviews={loadReviewRequests}
						review={selectedReview}
						setSummary={setSummary}
						summary={summary}
					/>
				</Grid>
			)}
		</Box>
	);
}

function GitHubLoginPage({
	authState,
	colorMode,
	connectState,
	loginOutput,
	onConnect,
	onRefresh,
	onToggleColorMode,
	status,
}: {
	authState: AsyncState;
	colorMode: ColorMode;
	connectState: AsyncState;
	loginOutput: string;
	onConnect: () => void;
	onRefresh: () => void;
	onToggleColorMode: () => void;
	status: GitHubAuthStatus;
}) {
	const installMessage = !status.ghInstalled
		? "Install GitHub CLI first, then come back and click Recheck."
		: "Use your GitHub account through the local gh CLI credential store.";

	return (
		<Grid minH="100vh" placeItems="center" p="6">
			<Card.Root maxW="560px" w="full">
				<Card.Header>
					<HStack justify="space-between">
						<Badge colorPalette="cyan" size="lg">
							GitHub connect
						</Badge>
						<Button size="sm" variant="outline" onClick={onToggleColorMode}>
							{colorMode === "dark" ? "Light" : "Dark"}
						</Button>
					</HStack>
					<Card.Title>Connect PR Review Agent to GitHub</Card.Title>
					<Card.Description>
						The app uses the official GitHub CLI session. No fake data is loaded after you connect.
					</Card.Description>
				</Card.Header>
				<Card.Body>
					<Stack gap="5">
						<Box bg="gray.2" borderRadius="l2" p="4">
							<HStack justify="space-between" mb="2">
								<Box fontWeight="semibold">Status</Box>
								<Badge colorPalette={status.ghInstalled ? "green" : "red"}>
									{status.ghInstalled ? "gh installed" : "gh missing"}
								</Badge>
							</HStack>
							<Box color="fg.muted" textStyle="sm">
								{authState === "loading"
									? "Checking GitHub CLI..."
									: status.error || status.message || installMessage}
							</Box>
						</Box>

						<Stack gap="2">
							<Box fontWeight="semibold">How connection works</Box>
							<Box color="fg.muted" textStyle="sm">
								Click Connect to run <Code>gh auth login --web</Code>. GitHub opens in your browser,
								then this app reads PRs where your GitHub user is requested as a reviewer.
							</Box>
						</Stack>

						{loginOutput ? (
							<Box as="pre" bg="gray.2" borderRadius="l2" overflowX="auto" p="4" textStyle="xs">
								<code>{loginOutput}</code>
							</Box>
						) : null}
					</Stack>
				</Card.Body>
				<Card.Footer>
					<Button variant="outline" onClick={onRefresh} loading={authState === "loading"}>
						Recheck
					</Button>
					<Button
						disabled={!status.ghInstalled}
						loading={connectState === "loading"}
						onClick={onConnect}
					>
						Connect GitHub
					</Button>
				</Card.Footer>
			</Card.Root>
		</Grid>
	);
}

function ReviewInbox({
	colorMode,
	onRefresh,
	onSelectReview,
	onToggleColorMode,
	query,
	reviews,
	reviewsError,
	reviewsState,
	selectedReviewId,
	setQuery,
	username,
}: {
	colorMode: ColorMode;
	onRefresh: () => void;
	onSelectReview: (id: string) => void;
	onToggleColorMode: () => void;
	query: string;
	reviews: GitHubReviewRequest[];
	reviewsError: string;
	reviewsState: AsyncState;
	selectedReviewId: string | null;
	setQuery: (query: string) => void;
	username?: string;
}) {
	return (
		<Box borderRightWidth={{ base: "0", lg: "1px" }} bg="gray.2" p="5">
			<Stack gap="5">
				<Stack gap="2">
					<HStack justify="space-between">
						<Box textStyle="xs" fontWeight="bold" letterSpacing="0.28em" color="cyan.11">
							PR Review Agent
						</Box>
						<Button size="sm" variant="outline" onClick={onToggleColorMode}>
							{colorMode === "dark" ? "Light" : "Dark"}
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

function ReviewDetail({
	detail,
	detailError,
	detailState,
	onReloadReviews,
	review,
	setSummary,
	summary,
}: {
	detail: GitHubPullRequestDetails | null;
	detailError: string;
	detailState: AsyncState;
	onReloadReviews: () => void;
	review: GitHubReviewRequest | null;
	setSummary: (summary: string) => void;
	summary: string;
}) {
	const [generatedReview, setGeneratedReview] = useState<PiGeneratedReview | null>(null);
	const [generationState, setGenerationState] = useState<AsyncState>("idle");
	const [generationError, setGenerationError] = useState("");

	const handleGenerateWithPi = async () => {
		if (!detail) {
			setGenerationError("Load PR details before generating a review.");
			setGenerationState("error");
			return;
		}

		setGenerationState("loading");
		setGenerationError("");

		try {
			const reviewDraft = await appRpc.request.generateReviewWithPi({ pullRequest: detail });
			setGeneratedReview(reviewDraft);
			setSummary(reviewDraft.publishableBody || reviewDraft.summary);
			setGenerationState("idle");
		} catch (error) {
			setGenerationError(getErrorMessage(error));
			setGenerationState("error");
		}
	};

	if (!review) {
		return (
			<Grid minH="100vh" placeItems="center" p="8">
				<StatusCard
					title="Select a pull request"
					body="Your real GitHub review requests will appear in the inbox."
				/>
			</Grid>
		);
	}

	return (
		<Box minW="0">
			<Box borderBottomWidth="1px" bg="gray.1" px="8" py="6">
				<HStack alignItems="flex-start" flexWrap="wrap" justify="space-between" gap="6">
					<Stack gap="3">
						<HStack flexWrap="wrap" gap="2">
							<Badge colorPalette="cyan" size="lg">
								requested review
							</Badge>
							<Badge colorPalette="gray" variant="surface" size="lg">
								{detail?.headSha ? `head ${detail.headSha.slice(0, 7)}` : "loading head"}
							</Badge>
						</HStack>
						<Box as="h2" textStyle="4xl" fontWeight="bold" letterSpacing="-0.04em">
							#{review.pullRequestNumber} {review.title}
						</Box>
						<Box color="fg.muted">
							{review.repo} by @{review.author} · updated {formatDate(review.updatedAt)}
						</Box>
					</Stack>

					<HStack flexWrap="wrap" gap="3">
						<Button variant="outline" onClick={onReloadReviews}>
							Refresh inbox
						</Button>
						<Button asChild>
							<a href={review.url} rel="noreferrer" target="_blank">
								Open on GitHub
							</a>
						</Button>
					</HStack>
				</HStack>
			</Box>

			<Grid gridTemplateColumns={{ base: "1fr", xl: "280px minmax(0, 1fr) 360px" }} gap="5" p="8">
				<Stack gap="5">
					<Card.Root>
						<Card.Header>
							<Card.Title>PR context</Card.Title>
							<Card.Description>Loaded from gh pr view</Card.Description>
						</Card.Header>
						<Card.Body>
							{detailError ? (
								<StatusCard tone="red" title="Could not load PR details" body={detailError} />
							) : null}
							<Grid columns={2} gap="3">
								<Metric label="Files" value={detail?.changedFilesCount ?? "—"} />
								<Metric label="Additions" value={detail?.additions ?? "—"} />
								<Metric label="Deletions" value={detail?.deletions ?? "—"} />
								<Metric
									label="State"
									value={detailState === "loading" ? "loading" : review.state}
								/>
							</Grid>
						</Card.Body>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>Changed files</Card.Title>
						</Card.Header>
						<Card.Body>
							<Stack gap="2">
								{detailState === "loading" ? <Box color="fg.muted">Loading files...</Box> : null}
								{detail?.files.map((file) => (
									<Box bg="gray.2" borderRadius="l2" key={file.path} p="3">
										<Box truncate>{file.path}</Box>
										<Box color="fg.muted" mt="1" textStyle="xs">
											+{file.additions} / -{file.deletions}
										</Box>
									</Box>
								))}
							</Stack>
						</Card.Body>
					</Card.Root>
				</Stack>

				<Stack gap="5" minW="0">
					<Card.Root>
						<Card.Header>
							<HStack justify="space-between">
								<Card.Title>Unified diff</Card.Title>
								<Badge colorPalette="gray" variant="surface">
									gh pr diff
								</Badge>
							</HStack>
						</Card.Header>
						<Card.Body>
							<Box
								as="pre"
								bg="gray.2"
								borderRadius="l2"
								maxH="560px"
								overflow="auto"
								p="4"
								textStyle="sm"
							>
								<code>
									{detailState === "loading"
										? "Loading diff from GitHub..."
										: detail?.diff || "No diff loaded."}
								</code>
							</Box>
						</Card.Body>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>Draft review summary</Card.Title>
							<Card.Description>
								Generated by Pi and kept local until an explicit publish confirmation exists.
							</Card.Description>
						</Card.Header>
						<Card.Body>
							<Textarea
								onChange={(event) => setSummary(event.target.value)}
								placeholder="Write or generate a draft review here..."
								rows={8}
								value={summary}
								variant="surface"
							/>
						</Card.Body>
					</Card.Root>
				</Stack>

				<Stack gap="5">
					<Card.Root>
						<Card.Header>
							<HStack justify="space-between" gap="3">
								<Stack gap="1">
									<Card.Title>Pi-generated findings</Card.Title>
									<Card.Description>
										Generate a local draft review with the Pi coding agent.
									</Card.Description>
								</Stack>
								<Button
									disabled={!detail || detailState === "loading"}
									loading={generationState === "loading"}
									onClick={handleGenerateWithPi}
									size="sm"
								>
									Generate with Pi
								</Button>
							</HStack>
						</Card.Header>
						<Card.Body>
							<GeneratedFindings
								error={generationError}
								generationState={generationState}
								review={generatedReview}
							/>
						</Card.Body>
					</Card.Root>

					<Card.Root bg="cyan.subtle.bg" borderColor="cyan.surface.border" borderWidth="1px">
						<Card.Body pt="6">
							<Card.Title color="cyan.12">Connected through gh CLI</Card.Title>
							<Box mt="2" color="cyan.11" textStyle="sm">
								Auth, requested reviews, PR metadata, changed files, and diffs now come from GitHub.
							</Box>
						</Card.Body>
					</Card.Root>
				</Stack>
			</Grid>
		</Box>
	);
}

function GeneratedFindings({
	error,
	generationState,
	review,
}: {
	error: string;
	generationState: AsyncState;
	review: PiGeneratedReview | null;
}) {
	if (generationState === "loading") {
		return (
			<StatusCard title="Pi is reviewing this PR" body="This can take a minute for larger diffs." />
		);
	}

	if (error) {
		return <StatusCard tone="red" title="Pi review generation failed" body={error} />;
	}

	if (!review) {
		return (
			<StatusCard
				title="No Pi draft yet"
				body="Click Generate with Pi to review the loaded GitHub diff and create a local draft."
			/>
		);
	}

	return (
		<Stack gap="3">
			<HStack justify="space-between" gap="3">
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
				<Card.Root key={finding.id} variant="outline">
					<Card.Body p="4">
						<HStack justify="space-between" gap="3">
							<Badge colorPalette={severityColorPalette(finding.severity)}>
								{finding.severity}
							</Badge>
							<Box color="fg.muted" textStyle="xs">
								{Math.round(finding.confidence * 100)}% confidence
							</Box>
						</HStack>
						<Box mt="3" fontWeight="semibold">
							{finding.title}
						</Box>
						<Box mt="2" color="fg.muted" textStyle="sm">
							{finding.body}
						</Box>
						{finding.filePath ? (
							<Box mt="3" color="cyan.11" textStyle="xs">
								{finding.filePath}
								{finding.lineStart ? `:${finding.lineStart}` : ""}
							</Box>
						) : null}
					</Card.Body>
				</Card.Root>
			))}
		</Stack>
	);
}

function severityColorPalette(severity: ReviewSeverity): "cyan" | "gray" | "red" {
	if (severity === "critical" || severity === "high") {
		return "red";
	}

	if (severity === "medium") {
		return "cyan";
	}

	return "gray";
}

function Metric({ label, value }: { label: string; value: number | string }) {
	return (
		<Box bg="gray.2" borderRadius="l2" p="3">
			<Box color="fg.muted" textStyle="xs">
				{label}
			</Box>
			<Box mt="1" fontWeight="bold" textTransform="capitalize">
				{value}
			</Box>
		</Box>
	);
}

function StatusCard({
	body,
	title,
	tone = "gray",
}: {
	body: string;
	title: string;
	tone?: "gray" | "red";
}) {
	return (
		<Box bg={tone === "red" ? "red.subtle.bg" : "gray.2"} borderRadius="l2" p="4">
			<Box color={tone === "red" ? "red.11" : "fg.default"} fontWeight="semibold">
				{title}
			</Box>
			<Box color={tone === "red" ? "red.11" : "fg.muted"} mt="1" textStyle="sm">
				{body}
			</Box>
		</Box>
	);
}

function Code({ children }: { children: string }) {
	return (
		<Box as="code" bg="gray.3" borderRadius="l1" color="fg.default" px="1.5" py="0.5">
			{children}
		</Box>
	);
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export default App;
