import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Grid } from 'styled-system/jsx'
import { TitleBar } from '@/app/title-bar/TitleBar'
import { GitHubLoginPage } from '@/features/auth/components/GitHubLoginPage'
import { ReviewDetail } from '@/features/reviews/components/ReviewDetail'
import { ReviewInbox } from '@/features/reviews/components/ReviewInbox'
import { SettingsPage } from '@/features/settings/components/SettingsPage'
import type {
	GitHubAuthStatus,
	GitHubPullRequestDetails,
	GitHubReviewRequest,
} from '@/shared/github'
import type { AppSettings, ColorModePreference } from '@/shared/settings'
import { appRpc } from './rpc'
import type { AsyncState, ColorMode } from './types'
import { getErrorMessage } from './utils'

const emptyAuthStatus: GitHubAuthStatus = {
	ghInstalled: false,
	authenticated: false,
	message: 'Checking GitHub CLI status...',
}

function App() {
	const [colorModePreference, setColorModePreference] = useState<ColorModePreference>('system')
	const [systemColorMode, setSystemColorMode] = useState<ColorMode>('dark')
	const [showSettings, setShowSettings] = useState(false)
	const [authStatus, setAuthStatus] = useState<GitHubAuthStatus | null>(null)
	const [authState, setAuthState] = useState<AsyncState>('loading')
	const [connectState, setConnectState] = useState<AsyncState>('idle')
	const [loginOutput, setLoginOutput] = useState('')
	const [reviews, setReviews] = useState<GitHubReviewRequest[]>([])
	const [reviewsState, setReviewsState] = useState<AsyncState>('idle')
	const [reviewsError, setReviewsError] = useState('')
	const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
	const [detail, setDetail] = useState<GitHubPullRequestDetails | null>(null)
	const [detailState, setDetailState] = useState<AsyncState>('idle')
	const [detailError, setDetailError] = useState('')
	const [query, setQuery] = useState('')
	const [, setSummary] = useState('')

	const colorMode: ColorMode =
		colorModePreference === 'system' ? systemColorMode : colorModePreference
	const toggleColorMode = () =>
		setColorModePreference((current) => (current === 'dark' ? 'light' : 'dark'))

	useEffect(() => {
		const media = window.matchMedia('(prefers-color-scheme: dark)')
		const sync = () => setSystemColorMode(media.matches ? 'dark' : 'light')
		sync()
		media.addEventListener('change', sync)
		return () => media.removeEventListener('change', sync)
	}, [])

	useEffect(() => {
		appRpc.request
			.getAppSettings()
			.then((settings) => setColorModePreference(settings.colorMode))
			.catch(() => undefined)
	}, [])

	const handleSettingsSaved = (settings: AppSettings) => {
		setColorModePreference(settings.colorMode)
	}

	const loadReviewRequests = useCallback(async () => {
		setReviewsState('loading')
		setReviewsError('')

		try {
			const items = await appRpc.request.listGitHubReviewRequests()
			setReviews(items)
			setSelectedReviewId((current) => current ?? items[0]?.id ?? null)
			setReviewsState('idle')
		} catch (error) {
			setReviewsError(getErrorMessage(error))
			setReviewsState('error')
		}
	}, [])

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
				error: getErrorMessage(error),
			})
			setAuthState('error')
		}
	}, [loadReviewRequests])

	useEffect(() => {
		void refreshAuth()
	}, [refreshAuth])

	const selectedReview = useMemo(
		() => reviews.find((review) => review.id === selectedReviewId) ?? null,
		[reviews, selectedReviewId],
	)

	useEffect(() => {
		if (!selectedReview) {
			setDetail(null)
			return
		}

		let cancelled = false
		setDetailState('loading')
		setDetailError('')
		setDetail(null)
		setSummary('')

		appRpc.request
			.getGitHubPullRequestDetails({
				repo: selectedReview.repo,
				pullRequestNumber: selectedReview.pullRequestNumber,
			})
			.then((pullRequestDetails) => {
				if (!cancelled) {
					setDetail(pullRequestDetails)
					setDetailState('idle')
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setDetailError(getErrorMessage(error))
					setDetailState('error')
				}
			})

		return () => {
			cancelled = true
		}
	}, [selectedReview])

	const filteredReviews = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()
		if (!normalizedQuery) {
			return reviews
		}

		return reviews.filter((review) => {
			const searchableText =
				`${review.repo} ${review.pullRequestNumber} ${review.title} ${review.author}`.toLowerCase()
			return searchableText.includes(normalizedQuery)
		})
	}, [query, reviews])

	const handleConnect = async () => {
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
			setLoginOutput(getErrorMessage(error))
			setConnectState('error')
		}
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
			pt="40px"
		>
			<TitleBar title="PR Review Agent" />
			{!currentAuthStatus.authenticated ? (
				<GitHubLoginPage
					authState={authState}
					colorMode={colorMode}
					connectState={connectState}
					loginOutput={loginOutput}
					onConnect={handleConnect}
					onRefresh={refreshAuth}
					onToggleColorMode={toggleColorMode}
					status={currentAuthStatus}
				/>
			) : showSettings ? (
				<SettingsPage onBack={() => setShowSettings(false)} onSaved={handleSettingsSaved} />
			) : (
				<Grid
					gridTemplateColumns={{ base: 'minmax(0, 1fr)', lg: '24rem minmax(0, 1fr)' }}
					h="100%"
					minH="0"
					minW="0"
					overflow={{ base: 'auto', lg: 'hidden' }}
					overflowX="hidden"
				>
					<ReviewInbox
						onOpenSettings={() => setShowSettings(true)}
						onRefresh={loadReviewRequests}
						onSelectReview={setSelectedReviewId}
						query={query}
						reviews={filteredReviews}
						reviewsError={reviewsError}
						reviewsState={reviewsState}
						selectedReviewId={selectedReviewId}
						setQuery={setQuery}
						username={currentAuthStatus.username}
					/>
					<ReviewDetail
						key={selectedReviewId ?? 'empty-review'}
						colorMode={colorMode}
						detail={detail}
						detailError={detailError}
						detailState={detailState}
						review={selectedReview}
						setSummary={setSummary}
					/>
				</Grid>
			)}
		</Box>
	)
}

export default App
