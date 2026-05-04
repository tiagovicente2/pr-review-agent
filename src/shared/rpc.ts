import type {
	GitHubAuthStatus,
	GitHubLoginResult,
	GitHubPullRequestDetails,
	GitHubReviewRequest,
} from "./github";

export type AppRPCSchema = {
	bun: {
		requests: {
			getGitHubAuthStatus: {
				params: undefined;
				response: GitHubAuthStatus;
			};
			startGitHubLogin: {
				params: undefined;
				response: GitHubLoginResult;
			};
			listGitHubReviewRequests: {
				params: undefined;
				response: GitHubReviewRequest[];
			};
			getGitHubPullRequestDetails: {
				params: {
					repo: string;
					pullRequestNumber: number;
				};
				response: GitHubPullRequestDetails;
			};
		};
		messages: Record<never, never>;
	};
	webview: {
		requests: Record<never, never>;
		messages: Record<never, never>;
	};
};
