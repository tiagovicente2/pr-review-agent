import { BrowserView, BrowserWindow, Updater } from 'electrobun/bun'
import type { AppRPCSchema } from '@/shared/rpc'
import {
	getGitHubAuthStatus,
	getGitHubPullRequestDetails,
	getGitHubPullRequestDiff,
	listGitHubReviewRequests,
	startGitHubLogin,
} from './services/github'
import { openExternalUrl } from './services/open-external'
import { publishPiReviewComment, publishPiReviewComments } from './services/pi-publish'
import { generateReviewWithPi } from './services/pi-review'
import { getPiReviewGenerationJob, startPiReviewGeneration } from './services/pi-review-jobs'
import { getSavedGeneratedReview } from './services/review-store'
import { getAppSettings, listAvailablePiModels, saveAppSettings } from './services/settings'
import { getSystemColorMode, startSystemColorModeWatcher } from './services/system-appearance'
import {
	closeWindow,
	minimizeWindow,
	setMainWindow,
	toggleMaximizeWindow,
} from './services/window-controls'

const DEV_SERVER_PORT = 5173
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel()

	if (channel === 'dev') {
		try {
			await fetch(DEV_SERVER_URL, { method: 'HEAD' })
			console.log(`HMR enabled: using Vite dev server at ${DEV_SERVER_URL}`)
			return DEV_SERVER_URL
		} catch {
			console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.")
		}
	}

	return 'views://mainview/index.html'
}

const appRpc = BrowserView.defineRPC<AppRPCSchema>({
	maxRequestTime: 5 * 60 * 1000,
	handlers: {
		requests: {
			getAppSettings,
			saveAppSettings,
			listAvailablePiModels,
			getSystemColorMode,
			getGitHubAuthStatus,
			startGitHubLogin,
			listGitHubReviewRequests,
			getGitHubPullRequestDetails,
			getGitHubPullRequestDiff,
			generateReviewWithPi,
			startPiReviewGeneration,
			getPiReviewGenerationJob,
			getSavedPiReview: getSavedGeneratedReview,
			openExternalUrl,
			minimizeWindow,
			toggleMaximizeWindow,
			closeWindow,
			publishPiReviewComment,
			publishPiReviewComments,
		},
		messages: {},
	},
})

const url = await getMainViewUrl()

const mainWindow = new BrowserWindow({
	title: 'PR Review Agent',
	url,
	rpc: appRpc,
	frame: {
		width: 1280,
		height: 820,
		x: 120,
		y: 80,
	},
	titleBarStyle: 'default',
})

setMainWindow(mainWindow)

void startSystemColorModeWatcher((colorMode) => {
	appRpc.send.systemColorModeChanged({ colorMode })
})

console.log('PR Review Agent started', mainWindow.id)
