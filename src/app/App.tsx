import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Grid } from 'styled-system/jsx'
import { OnboardingPage } from '@/features/auth/components/OnboardingPage'
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

const onboardingStorageKey = 'pr-review-agent:onboarding-complete'

function App() {
	const [colorModePreference, setColorModePreference] = useState<ColorModePreference>('system')
	const [systemColorMode, setSystemColorMode] = useState<ColorMode>('light')
	const [showSettings, setShowSettings] = useState(false)
	const [onboardingComplete, setOnboardingComplete] = useState(
		() => window.localStorage.getItem(onboardingStorageKey) === 'true',
	)
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

	useEffect(() => {
		let cancelled = false
		const media = window.matchMedia('(prefers-color-scheme: dark)')
		const syncFromMediaQuery = () => setSystemColorMode(media.matches ? 'dark' : 'light')
		const syncFromNative = () => {
			appRpc.request
				.getSystemColorMode()
				.then((nativeColorMode) => {
					if (!cancelled) setSystemColorMode(nativeColorMode)
				})
				.catch(syncFromMediaQuery)
		}
		const handleNativeChange = ({ colorMode }: { colorMode: ColorMode }) => {
			setSystemColorMode(colorMode)
		}

		syncFromNative()
		media.addEventListener('change', syncFromMediaQuery)
		appRpc.addMessageListener('systemColorModeChanged', handleNativeChange)
		return () => {
			cancelled = true
			media.removeEventListener('change', syncFromMediaQuery)
			appRpc.removeMessageListener('systemColorModeChanged', handleNativeChange)
		}
	}, [])

	useEffect(() => {
		document.documentElement.classList.toggle('dark', colorMode === 'dark')
		document.documentElement.classList.toggle('light', colorMode === 'light')
		document.documentElement.style.colorScheme = colorMode
	}, [colorMode])

	useEffect(() => {
		appRpc.request
			.getAppSettings()
			.then((settings) => setColorModePreference(settings.colorMode))
			.catch(() => undefined)
	}, [])

	const handleSettingsSaved = (settings: AppSettings) => {
		setColorModePreference(settings.colorMode)
	}

	const completeOnboarding = () => {
		window.localStorage.setItem(onboardingStorageKey, 'true')
		setOnboardingComplete(true)
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
		>
			{showSettings ? (
				<SettingsPage onBack={() => setShowSettings(false)} onSaved={handleSettingsSaved} />
			) : !currentAuthStatus.authenticated || !onboardingComplete ? (
				<OnboardingPage
					authState={authState}
					connectState={connectState}
					loginOutput={loginOutput}
					onConnect={handleConnect}
					onComplete={completeOnboarding}
					onOpenSettings={() => setShowSettings(true)}
					onRefresh={refreshAuth}
					status={currentAuthStatus}
				/>
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
