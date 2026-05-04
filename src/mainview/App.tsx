import { useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { Box, Grid, HStack, Stack } from "styled-system/jsx";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";

type DraftStatus = "pending" | "stale" | "approved" | "published" | "rejected" | "failed";
type ColorMode = "light" | "dark";

type DraftReview = {
	id: string;
	repo: string;
	pullRequestNumber: number;
	title: string;
	author: string;
	requestedAt: string;
	status: DraftStatus;
	freshness: "fresh" | "stale";
	lastGeneratedAt: string;
	severity: "critical" | "high" | "medium" | "low";
	headSha: string;
	filesChanged: number;
	comments: number;
};

type Finding = {
	id: string;
	severity: "high" | "medium" | "low";
	filePath: string;
	line: number;
	title: string;
	body: string;
	confidence: number;
};

const drafts: DraftReview[] = [
	{
		id: "draft-1",
		repo: "acme/mobile-app",
		pullRequestNumber: 482,
		title: "Refactor checkout review step",
		author: "maria",
		requestedAt: "8 min ago",
		status: "pending",
		freshness: "fresh",
		lastGeneratedAt: "2 min ago",
		severity: "high",
		headSha: "9f3a1c2",
		filesChanged: 12,
		comments: 4,
	},
	{
		id: "draft-2",
		repo: "acme/web-dashboard",
		pullRequestNumber: 131,
		title: "Add React Query cache persistence",
		author: "luis",
		requestedAt: "1 hr ago",
		status: "stale",
		freshness: "stale",
		lastGeneratedAt: "49 min ago",
		severity: "medium",
		headSha: "b17e9aa",
		filesChanged: 7,
		comments: 2,
	},
	{
		id: "draft-3",
		repo: "open-source/design-system",
		pullRequestNumber: 76,
		title: "Improve combobox keyboard support",
		author: "nora",
		requestedAt: "Yesterday",
		status: "approved",
		freshness: "fresh",
		lastGeneratedAt: "Yesterday",
		severity: "low",
		headSha: "54ac09d",
		filesChanged: 5,
		comments: 1,
	},
];

const changedFiles = [
	"src/features/checkout/ReviewStep.tsx",
	"src/features/checkout/useSubmitOrder.ts",
	"src/features/checkout/validation.ts",
	"src/components/Button.tsx",
	"src/test/checkout.test.tsx",
];

const findings: Finding[] = [
	{
		id: "finding-1",
		severity: "high",
		filePath: "src/features/checkout/useSubmitOrder.ts",
		line: 42,
		title: "Mutation can double-submit an order",
		body: "The submit handler does not guard against an already pending mutation, so a double click can create duplicate checkout requests.",
		confidence: 0.91,
	},
	{
		id: "finding-2",
		severity: "medium",
		filePath: "src/features/checkout/ReviewStep.tsx",
		line: 118,
		title: "Error state is not announced to screen readers",
		body: "The validation message is visually rendered, but it is not connected via aria-describedby or an alert region.",
		confidence: 0.84,
	},
	{
		id: "finding-3",
		severity: "low",
		filePath: "src/test/checkout.test.tsx",
		line: 27,
		title: "Missing regression coverage for stale cart totals",
		body: "Add a focused test for cart total changes between review and submission to prevent checkout regressions.",
		confidence: 0.78,
	},
];

const initialSummary =
	"This draft review focuses on correctness and user-impacting regressions. I found one high-severity issue around duplicate order submission, plus follow-ups for accessibility and test coverage. Please verify the mutation guard before merging.";

const diffPreview = `diff --git a/src/features/checkout/useSubmitOrder.ts b/src/features/checkout/useSubmitOrder.ts
@@ -36,7 +36,10 @@ export function useSubmitOrder() {
   const mutation = useMutation({ mutationFn: submitOrder });
 
   return async function handleSubmit(payload: OrderPayload) {
+    // TODO: prevent duplicate requests while pending
     analytics.track("checkout_submit_clicked");
     await mutation.mutateAsync(payload);
   };
 }`;

const statusTone: Record<DraftStatus, "cyan" | "gray" | "green" | "red"> = {
	pending: "cyan",
	stale: "red",
	approved: "green",
	published: "gray",
	rejected: "red",
	failed: "red",
};

const severityTone: Record<Finding["severity"], "cyan" | "gray" | "red"> = {
	high: "red",
	medium: "cyan",
	low: "gray",
};

function App() {
	const [selectedDraftId, setSelectedDraftId] = useState(drafts[0].id);
	const [query, setQuery] = useState("");
	const [summary, setSummary] = useState(initialSummary);
	const [colorMode, setColorMode] = useState<ColorMode>("dark");

	const filteredDrafts = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) {
			return drafts;
		}

		return drafts.filter((draft) => {
			const searchableText =
				`${draft.repo} ${draft.pullRequestNumber} ${draft.title} ${draft.author}`.toLowerCase();
			return searchableText.includes(normalizedQuery);
		});
	}, [query]);

	const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0];

	return (
		<Box className={colorMode} minH="100vh" bg="gray.1" color="fg.default" colorPalette="cyan">
			<Grid gridTemplateColumns={{ base: "1fr", lg: "24rem minmax(0, 1fr)" }} minH="100vh">
				<Box borderRightWidth={{ base: "0", lg: "1px" }} bg="gray.2" p="5">
					<Stack gap="5">
						<Stack gap="2">
							<HStack justify="space-between">
								<Box textStyle="xs" fontWeight="bold" letterSpacing="0.28em" color="cyan.11">
									PR Review Agent
								</Box>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
								>
									{colorMode === "dark" ? "Light" : "Dark"}
								</Button>
							</HStack>
							<Box as="h1" textStyle="4xl" fontWeight="bold" letterSpacing="-0.04em">
								Review inbox
							</Box>
							<Box color="fg.muted" textStyle="sm">
								Local-first AI drafts. Nothing is published without your approval.
							</Box>
						</Stack>

						<Stack gap="2">
							<label
								className={css({ textStyle: "sm", fontWeight: "medium" })}
								htmlFor="review-search"
							>
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

						<Stack gap="3">
							{filteredDrafts.map((draft) => {
								const selected = draft.id === selectedDraftId;

								return (
									<Card.Root
										asChild
										className={cx(
											css({ cursor: "pointer", transition: "all 150ms ease" }),
											selected &&
												css({ borderColor: "cyan.8", boxShadow: "0 0 0 1px token(colors.cyan.8)" }),
										)}
										key={draft.id}
									>
										<button onClick={() => setSelectedDraftId(draft.id)} type="button">
											<Card.Body p="4">
												<HStack alignItems="flex-start" justify="space-between" gap="3">
													<Stack gap="1" minW="0">
														<Box color="cyan.11" fontWeight="semibold" textStyle="sm">
															{draft.repo}
														</Box>
														<Box fontWeight="medium" textAlign="left">
															#{draft.pullRequestNumber} {draft.title}
														</Box>
													</Stack>
													<Badge colorPalette={statusTone[draft.status]}>{draft.status}</Badge>
												</HStack>
												<HStack justify="space-between" mt="4" color="fg.muted" textStyle="xs">
													<Box>@{draft.author}</Box>
													<Box>{draft.lastGeneratedAt}</Box>
												</HStack>
											</Card.Body>
										</button>
									</Card.Root>
								);
							})}
						</Stack>
					</Stack>
				</Box>

				<Box minW="0">
					<Box borderBottomWidth="1px" bg="gray.1" px="8" py="6">
						<HStack alignItems="flex-start" flexWrap="wrap" justify="space-between" gap="6">
							<Stack gap="3">
								<HStack flexWrap="wrap" gap="2">
									<Badge colorPalette={statusTone[selectedDraft.status]} size="lg">
										{selectedDraft.status}
									</Badge>
									<Badge colorPalette="gray" variant="surface" size="lg">
										head {selectedDraft.headSha}
									</Badge>
								</HStack>
								<Box as="h2" textStyle="4xl" fontWeight="bold" letterSpacing="-0.04em">
									#{selectedDraft.pullRequestNumber} {selectedDraft.title}
								</Box>
								<Box color="fg.muted">
									{selectedDraft.repo} by @{selectedDraft.author} · requested{" "}
									{selectedDraft.requestedAt}
								</Box>
							</Stack>

							<HStack flexWrap="wrap" gap="3">
								<Button variant="outline">Regenerate</Button>
								<Button colorPalette="red" variant="outline">
									Reject
								</Button>
								<Button>Approve to publish</Button>
							</HStack>
						</HStack>
					</Box>

					<Grid
						gridTemplateColumns={{ base: "1fr", xl: "280px minmax(0, 1fr) 360px" }}
						gap="5"
						p="8"
					>
						<Stack gap="5">
							<Card.Root>
								<Card.Header>
									<Card.Title>PR context</Card.Title>
									<Card.Description>Fresh local draft metadata</Card.Description>
								</Card.Header>
								<Card.Body>
									<Grid columns={2} gap="3">
										<Metric label="Files" value={selectedDraft.filesChanged} />
										<Metric label="Comments" value={selectedDraft.comments} />
										<Metric label="Freshness" value={selectedDraft.freshness} />
										<Metric label="Severity" value={selectedDraft.severity} />
									</Grid>
								</Card.Body>
							</Card.Root>

							<Card.Root>
								<Card.Header>
									<Card.Title>Changed files</Card.Title>
								</Card.Header>
								<Card.Body>
									<Stack gap="2">
										{changedFiles.map((filePath) => (
											<Button justifyContent="flex-start" key={filePath} variant="plain">
												<Box truncate>{filePath}</Box>
											</Button>
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
									<Box as="pre" bg="gray.2" borderRadius="l2" overflowX="auto" p="4" textStyle="sm">
										<code>{diffPreview}</code>
									</Box>
								</Card.Body>
							</Card.Root>

							<Card.Root>
								<Card.Header>
									<Card.Title>Editable summary review</Card.Title>
									<Card.Description>
										This payload stays local until explicit GitHub publish confirmation.
									</Card.Description>
								</Card.Header>
								<Card.Body>
									<Textarea
										onChange={(event) => setSummary(event.target.value)}
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
									<Card.Title>Generated findings</Card.Title>
								</Card.Header>
								<Card.Body>
									<Stack gap="3">
										{findings.map((finding) => (
											<Card.Root key={finding.id} variant="outline">
												<Card.Body p="4">
													<HStack justify="space-between" gap="3">
														<Badge colorPalette={severityTone[finding.severity]}>
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
													<Box mt="3" color="cyan.11" textStyle="xs">
														{finding.filePath}:{finding.line}
													</Box>
												</Card.Body>
											</Card.Root>
										))}
									</Stack>
								</Card.Body>
							</Card.Root>

							<Card.Root bg="cyan.subtle.bg" borderColor="cyan.surface.border" borderWidth="1px">
								<Card.Body pt="6">
									<Card.Title color="cyan.12">Park UI + Panda CSS</Card.Title>
									<Box mt="2" color="cyan.11" textStyle="sm">
										Theme tokens include light and dark modes with cyan accent and slate gray
										palettes.
									</Box>
								</Card.Body>
							</Card.Root>
						</Stack>
					</Grid>
				</Box>
			</Grid>
		</Box>
	);
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

export default App;
