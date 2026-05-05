import { Box, Grid, HStack, Stack } from "styled-system/jsx";
import type { AsyncState, ColorMode } from "@/app/types";
import { Code } from "@/components/common";
import { Badge, Button, Card } from "@/components/ui";
import type { GitHubAuthStatus } from "@/shared/github";

export function GitHubLoginPage({
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
		<Grid h="100%" minH="0" overflowY="auto" placeItems="center" p="6">
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
