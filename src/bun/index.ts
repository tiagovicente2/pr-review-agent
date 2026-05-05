import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import type { AppRPCSchema } from "../shared/rpc";
import {
	getGitHubAuthStatus,
	getGitHubPullRequestDetails,
	listGitHubReviewRequests,
	startGitHubLogin,
} from "./services/github";
import { openExternalUrl } from "./services/open-external";
import { publishPiReviewComment, publishPiReviewComments } from "./services/pi-publish";
import { generateReviewWithPi } from "./services/pi-review";
import { getSavedGeneratedReview } from "./services/review-store";
import { getAppSettings, saveAppSettings } from "./services/settings";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();

	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
		}
	}

	return "views://mainview/index.html";
}

const appRpc = BrowserView.defineRPC<AppRPCSchema>({
	maxRequestTime: 5 * 60 * 1000,
	handlers: {
		requests: {
			getAppSettings,
			saveAppSettings,
			getGitHubAuthStatus,
			startGitHubLogin,
			listGitHubReviewRequests,
			getGitHubPullRequestDetails,
			generateReviewWithPi,
			getSavedPiReview: getSavedGeneratedReview,
			openExternalUrl,
			publishPiReviewComment,
			publishPiReviewComments,
		},
		messages: {},
	},
});

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
	title: "PR Review Agent",
	url,
	rpc: appRpc,
	frame: {
		width: 1280,
		height: 820,
		x: 120,
		y: 80,
	},
	titleBarStyle: "hidden",
});

console.log("PR Review Agent started", mainWindow.id);
