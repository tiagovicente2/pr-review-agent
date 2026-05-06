import { type ReactNode, useEffect, useRef, useState } from 'react'
import { css } from 'styled-system/css'
import { Box, HStack, Stack } from 'styled-system/jsx'
import { appRpc } from '@/app/rpc'
import { useToast } from '@/app/toast'
import type { AsyncState } from '@/app/types'
import { getErrorMessage } from '@/app/utils'
import { StatusCard, TabButton } from '@/components/common'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { Badge, Button, Card, Textarea } from '@/components/ui'
import type {
	AgentAvailability,
	AppSettings,
	AvailablePiModel,
	CodeAgent,
	ColorModePreference,
	ReviewLanguage,
} from '@/shared/settings'

export function SettingsPage({
	onBack,
	onSaved,
}: {
	onBack: () => void
	onSaved: (settings: AppSettings) => void
}) {
	const [settings, setSettings] = useState<AppSettings | null>(null)
	const [state, setState] = useState<AsyncState>('loading')
	const [error, setError] = useState('')
	const [availableModels, setAvailableModels] = useState<AvailablePiModel[]>([])
	const [agentAvailability, setAgentAvailability] = useState<AgentAvailability[]>([])
	const [agentsState, setAgentsState] = useState<AsyncState>('idle')
	const [instructionsMode, setInstructionsMode] = useState<'raw' | 'preview'>('raw')
	const instructionsModeInitializedRef = useRef(false)
	const { showToast } = useToast()

	useEffect(() => {
		let cancelled = false

		appRpc.request
			.getAppSettings()
			.then((value) => {
				if (cancelled) return
				setSettings(value)
				if (!instructionsModeInitializedRef.current) {
					setInstructionsMode(value.reviewerInstructions.trim() ? 'preview' : 'raw')
					instructionsModeInitializedRef.current = true
				}
				setState('idle')
			})
			.catch((unknownError: unknown) => {
				if (cancelled) return
				setError(getErrorMessage(unknownError))
				setState('error')
			})

		return () => {
			cancelled = true
		}
	}, [])

	const refreshAgentAvailability = async () => {
		setAgentsState('loading')
		try {
			setAgentAvailability(await appRpc.request.listAgentAvailability())
			setAgentsState('idle')
		} catch {
			setAgentsState('error')
		}
	}

	useEffect(() => {
		void refreshAgentAvailability()
	}, [])

	useEffect(() => {
		if (!settings) return
		let cancelled = false
		setAvailableModels([])
		appRpc.request
			.listAvailablePiModels({ agent: settings.codeAgent })
			.then((models) => {
				if (cancelled) return
				setAvailableModels(models)
				if (models.length > 0 && !models.some((model) => model.id === settings.model)) {
					setSettings((current) =>
						current?.codeAgent === settings.codeAgent
							? { ...current, model: models[0]?.id ?? current.model }
							: current,
					)
				}
			})
			.catch(() => {
				if (!cancelled) setAvailableModels([])
			})

		return () => {
			cancelled = true
		}
	}, [settings?.codeAgent])

	const selectedAgentAvailability = settings
		? agentAvailability.find((agent) => agent.agent === settings.codeAgent)
		: undefined

	const save = async () => {
		if (!settings) return
		setState('loading')
		setError('')
		try {
			const saved = await appRpc.request.saveAppSettings(settings)
			setSettings(saved)
			onSaved(saved)
			setState('idle')
			showToast({ title: 'Settings saved', tone: 'success' })
		} catch (unknownError) {
			setError(getErrorMessage(unknownError))
			setState('error')
		}
	}

	return (
		<Box boxSizing="border-box" h="100%" overflow="hidden" px="8" py="6">
			<Stack gap="4" h="100%" minH="0" mx="auto" w="100%">
				<HStack alignItems="flex-start" justify="space-between">
					<Box>
						<Box as="h1" fontWeight="bold" textStyle="3xl">
							Settings
						</Box>
						<Box color="fg.muted" textStyle="sm">
							Configure local review generation.
						</Box>
					</Box>
					<HStack gap="2" flexShrink="0">
						<Button variant="outline" onClick={onBack}>
							Back
						</Button>
						<Button loading={state === 'loading'} onClick={save} disabled={!settings}>
							Save
						</Button>
					</HStack>
				</HStack>

				{error ? <StatusCard tone="red" title="Could not save settings" body={error} /> : null}
				{settings ? (
					<Box
						display="grid"
						gap="4"
						gridTemplateColumns={{
							base: 'minmax(0, 1fr)',
							xl: '32rem minmax(0, 1fr)',
						}}
						h="100%"
						minH="0"
						overflow="hidden"
					>
						<Stack gap="4" minH="0" overflowY="auto">
						<Card.Root
							minH="0"
							overflow="visible"
							display="grid"
							gridTemplateRows="auto minmax(0, 1fr)"
						>
							<Card.Header>
								<Card.Title>Preferences</Card.Title>
								<Card.Description>Local UI and agent selection.</Card.Description>
							</Card.Header>
							<Card.Body minH="0" overflow="visible">
								<Stack gap="3" minH="100%">
									<InlineField label="Color mode">
										<Select
											value={settings.colorMode}
											onChange={(value) =>
												setSettings({
													...settings,
													colorMode: value as ColorModePreference,
												})
											}
											options={['system', 'dark', 'light']}
										/>
									</InlineField>
									<InlineField label="Code agent">
										<Select
											value={settings.codeAgent}
											onChange={(value) =>
												setSettings({
													...settings,
													codeAgent: value as CodeAgent,
													model: '',
												})
											}
											options={['pi', 'claude', 'opencode']}
										/>
									</InlineField>
									{selectedAgentAvailability ? (
										<Box color={selectedAgentAvailability.ready ? 'green.11' : 'red.11'} textStyle="xs">
											{selectedAgentAvailability.message}
										</Box>
									) : null}
									<InlineField label="Model">
										<Select
											value={settings.model}
											onChange={(model) => setSettings({ ...settings, model })}
											options={getModelOptions(settings.model, availableModels)}
											loading={availableModels.length === 0}
											disabled={availableModels.length === 0}
										/>
									</InlineField>
									<InlineField label="Review language">
										<Select
											value={settings.reviewLanguage}
											onChange={(value) =>
												setSettings({
													...settings,
													reviewLanguage: value as ReviewLanguage,
												})
											}
											options={['english', 'portuguese']}
										/>
									</InlineField>
								</Stack>
							</Card.Body>
						</Card.Root>
						<AgentStatusCard
							agents={agentAvailability}
							agentsState={agentsState}
							onRefresh={() => void refreshAgentAvailability()}
						/>
						</Stack>

						<Card.Root
							h="100%"
							minH="0"
							overflow="hidden"
							display="grid"
							gridTemplateRows="auto minmax(0, 1fr)"
						>
							<Card.Header>
								<HStack justify="space-between" gap="4">
									<Box minW="0">
										<Card.Title>Reviewer agent instructions</Card.Title>
										<Card.Description>{settings.reviewerInstructionsPath}</Card.Description>
									</Box>
									<HStack gap="1" p="0.5" bg="gray.2" borderRadius="l1" flexShrink="0">
										<TabButton
											active={instructionsMode === 'raw'}
											onClick={() => setInstructionsMode('raw')}
										>
											Raw
										</TabButton>
										<TabButton
											active={instructionsMode === 'preview'}
											onClick={() => setInstructionsMode('preview')}
										>
											Preview
										</TabButton>
									</HStack>
								</HStack>
							</Card.Header>
							<Card.Body minH="0" overflow="hidden">
								<Box display={instructionsMode === 'raw' ? 'block' : 'none'} h="100%" minH="0">
									<Textarea
										boxSizing="border-box"
										display="block"
										h="100%"
										minH="0"
										resize="none"
										placeholder="Custom markdown instructions for the reviewer agent."
										value={settings.reviewerInstructions}
										onChange={(event) =>
											setSettings({
												...settings,
												reviewerInstructions: event.target.value,
											})
										}
										variant="surface"
									/>
								</Box>
								<Box
									bg="gray.2"
									borderRadius="l2"
									display={instructionsMode === 'preview' ? 'block' : 'none'}
									h="100%"
									minH="0"
									overflowY="auto"
									p="4"
								>
									<MarkdownContent>
										{settings.reviewerInstructions || '_No instructions yet._'}
									</MarkdownContent>
								</Box>
							</Card.Body>
						</Card.Root>
					</Box>
				) : null}
			</Stack>
		</Box>
	)
}

function AgentStatusCard({
	agents,
	agentsState,
	onRefresh,
}: {
	agents: AgentAvailability[]
	agentsState: AsyncState
	onRefresh: () => void
}) {
	const readyCount = agents.filter((agent) => agent.ready).length
	return (
		<Card.Root variant="outline">
			<Card.Header>
				<HStack justify="space-between" gap="3">
					<Box minW="0">
						<Card.Title>System status</Card.Title>
						<Card.Description>GitHub is checked during onboarding. Review agent status is shown here.</Card.Description>
					</Box>
					<Button size="sm" variant="outline" loading={agentsState === 'loading'} onClick={onRefresh}>
						Recheck
					</Button>
				</HStack>
			</Card.Header>
			<Card.Body>
				<Stack gap="3">
					<HStack justify="space-between" gap="3">
						<Box color="fg.muted" textStyle="sm">
							At least one review agent must be ready to generate drafts.
						</Box>
						<Badge colorPalette={readyCount > 0 ? 'green' : 'red'}>
							{readyCount > 0 ? `${readyCount} ready` : 'Needs setup'}
						</Badge>
					</HStack>
					{agents.map((agent) => (
						<Box key={agent.agent} bg="gray.2" borderRadius="l2" p="3">
							<HStack justify="space-between" gap="3">
								<Box fontWeight="semibold">{agent.label}</Box>
								<Badge colorPalette={agent.ready ? 'green' : agent.installed ? 'cyan' : 'red'}>
									{agent.ready ? 'Ready' : agent.installed ? 'Needs login' : 'Missing'}
								</Badge>
							</HStack>
							<Box color="fg.muted" mt="2" textStyle="xs">
								{agent.message}
							</Box>
						</Box>
					))}
				</Stack>
			</Card.Body>
		</Card.Root>
	)
}

function InlineField({ children, label }: { children: ReactNode; label: string }) {
	return (
		<HStack
			justify="space-between"
			gap="4"
			borderBottomWidth="1px"
			borderColor="border.subtle"
			py="2"
		>
			<Box fontWeight="medium" textStyle="sm">
				{label}
			</Box>
			{children}
		</HStack>
	)
}

function getModelOptions(currentModel: string, models: AvailablePiModel[]) {
	const options = models.map((model) => model.id)
	if (!currentModel) return options
	return options.includes(currentModel) ? options : [currentModel, ...options]
}

function Select({
	value,
	options,
	onChange,
	loading = false,
	disabled = false,
}: {
	value: string
	options: string[]
	onChange: (value: string) => void
	loading?: boolean
	disabled?: boolean
}) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const closeOnOutsideClick = (event: MouseEvent) => {
			if (!ref.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', closeOnOutsideClick)
		return () => document.removeEventListener('mousedown', closeOnOutsideClick)
	}, [open])

	return (
		<Box position="relative" ref={ref} flexShrink="0" w="15rem">
			<button
				type="button"
				aria-busy={loading}
				aria-expanded={open}
				disabled={disabled}
				title={loading ? 'Loading models…' : undefined}
				className={css({
					alignItems: 'center',
					bg: 'gray.2',
					borderColor: open ? 'border.default' : 'border.default',
					borderRadius: 'l2',
					borderWidth: '1px',
					color: 'fg.default',
					cursor: disabled ? 'not-allowed' : 'pointer',
					display: 'flex',
					fontSize: 'sm',
					h: '10',
					justifyContent: 'space-between',
					minW: '0',
					px: '3',
					textAlign: 'left',
					w: '100%',
				})}
				onClick={() => {
					if (!disabled) setOpen((current) => !current)
				}}
			>
				<span
					className={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}
				>
					{loading ? 'Loading models…' : value}
				</span>
				<span aria-hidden="true">▾</span>
			</button>
			{open ? (
				<Box
					bg="gray.2"
					borderColor="border.default"
					borderRadius="l2"
					borderWidth="1px"
					boxShadow="lg"
					maxH="18rem"
					minW="100%"
					mt="1"
					overflowY="auto"
					position="absolute"
					right="0"
					w="max-content"
					zIndex="dropdown"
				>
					{options.map((option) => (
						<button
							key={option}
							type="button"
							title={option}
							className={css({
								bg: option === value ? 'gray.4' : 'transparent',
								color: 'fg.default',
								cursor: 'pointer',
								display: 'block',
								fontSize: 'sm',
								minH: '9',
								minW: '100%',
								px: '3',
								py: '2',
								textAlign: 'left',
								whiteSpace: 'nowrap',
								_hover: { bg: 'gray.4' },
							})}
							onClick={() => {
								onChange(option)
								setOpen(false)
							}}
						>
							{option}
						</button>
					))}
				</Box>
			) : null}
		</Box>
	)
}
