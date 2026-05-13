import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box } from 'styled-system/jsx'
import { useAgentAvailability } from '@/app/hooks/useAgentAvailability'
import { useColorMode } from '@/app/hooks/useColorMode'
import { useErrorLog } from '@/app/hooks/useErrorLog'
import { usePullRequestDetails } from '@/app/hooks/usePullRequestDetails'
import { isPullRequestQuery, useReviewRequests } from '@/app/hooks/useReviewRequests'
import { OnboardingPage } from '@/features/auth/components/OnboardingPage'
import { ErrorLogPage } from '@/features/errors/components/ErrorLogPage'
import { SettingsPage } from '@/features/settings/components/SettingsPage'
import type { GitHubAuthStatus } from '@/shared/github'
import type { AppSettings } from '@/shared/settings'
import { MainReviewScreen } from './MainReviewScreen'
import { appRpc } from './rpc'
import type { AsyncState } from './types'

const emptyAuthStatus: GitHubAuthStatus = {
	ghInstalled: false,
	authenticated: false,
	message: 'Checking GitHub CLI status...',
}

function App() {
	const [showSettings, setShowSettings] = useState(false)
	const [showErrorLog, setShowErrorLog] = useState(false)
	const [onboardingComplete, setOnboardingComplete] = useState(false)
	const [authStatus, setAuthStatus] = useState<GitHubAuthStatus | null>(null)
	const [authState, setAuthState] = useState<AsyncState>('loading')
	const [connectState, setConnectState] = useState<AsyncState>('idle')
	const [loginOutput, setLoginOutput] = useState('')
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [, setSummary] = useState('')

	const { colorMode, setPreference: setColorModePreference } = useColorMode()
	const openErrorLog = useCallback(() => {
		setShowSettings(false)
		setShowErrorLog(true)
	}, [])
	const { clearErrors, dismissError, errors: errorLogs, logError } = useErrorLog(openErrorLog)

	const { agentAvailability, agentsState, refreshAgents } = useAgentAvailability()
	const {
		activeSearchQuery,
		loadReviewRequests,
		reviewPullRequest,
		reviewPrState,
		reviews,
		reviewsState,
		searchActive,
		searchMode,
		searchPullRequests,
		selectedReview,
		selectedReviewId,
		setSearchMode,
		setSelectedReviewId,
	} = useReviewRequests({ logError })

	useEffect(() => {
		appRpc.request
			.getAppSettings()
			.then((settings) => {
				setColorModePreference(settings.colorMode)
				setOnboardingComplete(settings.onboardingComplete)
			})
			.catch(() => undefined)
	}, [setColorModePreference])

	const handleSettingsSaved = (settings: AppSettings) => {
		setColorModePreference(settings.colorMode)
	}

	const completeOnboarding = async () => {
		const settings = await appRpc.request.completeOnboarding()
		setOnboardingComplete(settings.onboardingComplete)
	}

	const refreshAuth = useCallback(async () => {
		setAuthState('loading')
		try {
			const status = await appRpc.request.getGitHubAuthStatus()
			setAuthStatus(status)
			setAuthState('idle')

			if (status.authenticated) {
				await loadReviewRequests()
			}
		} catch (error) {
			setAuthStatus({
				ghInstalled: false,
				authenticated: false,
				error: logError('Could not check GitHub auth', error, 'Onboarding'),
			})
			setAuthState('error')
		}
	}, [loadReviewRequests, logError])

	useEffect(() => {
		void refreshAuth()
		void refreshAgents()
	}, [refreshAuth, refreshAgents])

	useEffect(() => {
		const timeout = window.setTimeout(() => setDebouncedQuery(query), 250)
		return () => window.clearTimeout(timeout)
	}, [query])


	const displayedReviews = useMemo(() => {
		const normalizedQuery = debouncedQuery.trim().toLowerCase()
		if (!normalizedQuery) return reviews

		return reviews.filter((review) => {
			const searchableText =
				`${review.repo} ${review.pullRequestNumber} ${review.title} ${review.author} ${review.url}`.toLowerCase()
			return searchableText.includes(normalizedQuery)
		})
	}, [debouncedQuery, reviews])

	const resetSummary = useCallback(() => setSummary(''), [])
	const { detail, detailError, detailState } = usePullRequestDetails({
		logError,
		onResetSummary: resetSummary,
		review: selectedReview,
	})

	const canReviewPrQuery = isPullRequestQuery(query)

	const handleSearch = () => {
		void searchPullRequests(query)
	}

	const handleClearSearch = () => {
		setQuery('')
		void loadReviewRequests()
	}

	const handleReviewPr = async () => {
		const reviewed = await reviewPullRequest(query)
		if (reviewed) setQuery('')
	}

	const handleConnect = async () => {
		void refreshAgents()
		setConnectState('loading')
		setLoginOutput('')

		try {
			const result = await appRpc.request.startGitHubLogin()
			setAuthStatus(result.status)
			setLoginOutput(result.output)
			setConnectState(result.ok ? 'idle' : 'error')

			if (result.status.authenticated) {
				await loadReviewRequests()
			}
		} catch (error) {
			setLoginOutput(logError('Could not connect GitHub', error, 'GitHub login'))
			setConnectState('error')
		}
	}

	const handleRefreshSetup = () => {
		void refreshAuth()
		void refreshAgents()
	}

	const currentAuthStatus = authStatus ?? emptyAuthStatus

	return (
		<Box
			className={colorMode}
			h="100vh"
			minH="0"
			overflow="hidden"
			bg="gray.1"
			color="fg.default"
			colorPalette="cyan"
		>
			{showErrorLog ? (
				<ErrorLogPage
					errors={errorLogs}
					onBack={() => setShowErrorLog(false)}
					onClear={clearErrors}
					onDismiss={dismissError}
				/>
			) : showSettings ? (
				<SettingsPage
					onBack={() => setShowSettings(false)}
					onOpenErrorLog={() => {
						setShowSettings(false)
						setShowErrorLog(true)
					}}
					onSaved={handleSettingsSaved}
				/>
			) : !currentAuthStatus.authenticated || !onboardingComplete ? (
				<OnboardingPage
					agentAvailability={agentAvailability}
					agentsState={agentsState}
					authState={authState}
					connectState={connectState}
					loginOutput={loginOutput}
					onConnect={handleConnect}
					onComplete={completeOnboarding}
					onOpenSettings={() => setShowSettings(true)}
					onRefresh={handleRefreshSetup}
					status={currentAuthStatus}
				/>
			) : (
				<MainReviewScreen
					activeSearchQuery={activeSearchQuery}
					canReviewPrQuery={canReviewPrQuery}
					colorMode={colorMode}
					currentAuthStatus={currentAuthStatus}
					detail={detail}
					detailError={detailError}
					detailState={detailState}
					displayedReviews={displayedReviews}
					loadReviewRequests={loadReviewRequests}
					onClearSearch={handleClearSearch}
					onOpenSettings={() => setShowSettings(true)}
					onReviewPr={handleReviewPr}
					onSearch={handleSearch}
					query={query}
					reviewPrState={reviewPrState}
					reviewsState={reviewsState}
					searchActive={searchActive}
					searchMode={searchMode}
					selectedReview={selectedReview}
					selectedReviewId={selectedReviewId}
					setQuery={setQuery}
					setSearchMode={setSearchMode}
					setSelectedReviewId={setSelectedReviewId}
					setSummary={setSummary}
				/>
			)}
		</Box>
	)
}

export default App
