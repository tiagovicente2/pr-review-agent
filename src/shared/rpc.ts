import type {
	GitHubAuthStatus,
	GitHubLoginResult,
	GitHubPullRequestDetails,
	GitHubReviewRequest,
} from "./github";
import type {
	GeneratePiReviewParams,
	GetSavedPiReviewParams,
	PiGeneratedReview,
	PublishPiReviewCommentParams,
	PublishPiReviewCommentResult,
	PublishPiReviewCommentsParams,
} from "./review";
import type { AppSettings, SaveAppSettingsParams } from "./settings";

export type AppRPCSchema = {
	bun: {
		requests: {
			getAppSettings: {
				params: undefined;
				response: AppSettings;
			};
			saveAppSettings: {
				params: SaveAppSettingsParams;
				response: AppSettings;
			};
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
			generateReviewWithPi: {
				params: GeneratePiReviewParams;
				response: PiGeneratedReview;
			};
			getSavedPiReview: {
				params: GetSavedPiReviewParams;
				response: PiGeneratedReview | null;
			};
			openExternalUrl: {
				params: { url: string };
				response: { ok: true };
			};
			publishPiReviewComment: {
				params: PublishPiReviewCommentParams;
				response: PublishPiReviewCommentResult;
			};
			publishPiReviewComments: {
				params: PublishPiReviewCommentsParams;
				response: PublishPiReviewCommentResult;
			};
		};
		messages: Record<never, never>;
	};
	webview: {
		requests: Record<never, never>;
		messages: Record<never, never>;
	};
};
