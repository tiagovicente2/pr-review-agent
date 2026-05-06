import { type ReactNode, useEffect, useRef, useState } from 'react'
import { css } from 'styled-system/css'
import { Box, HStack, Stack } from 'styled-system/jsx'
import { appRpc } from '@/app/rpc'
import { useToast } from '@/app/toast'
import type { AsyncState } from '@/app/types'
import { getErrorMessage } from '@/app/utils'
import { StatusCard, TabButton } from '@/components/common'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { Button, Card, Textarea } from '@/components/ui'
import type {
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
	const [instructionsMode, setInstructionsMode] = useState<'raw' | 'preview'>('raw')
	const [instructionsModeInitialized, setInstructionsModeInitialized] = useState(false)
	const { showToast } = useToast()

	useEffect(() => {
		let cancelled = false

		appRpc.request
			.getAppSettings()
			.then((value) => {
				if (cancelled) return
				setSettings(value)
				if (!instructionsModeInitialized) {
					setInstructionsMode(value.reviewerInstructions.trim() ? 'preview' : 'raw')
					setInstructionsModeInitialized(true)
				}
				setState('idle')
			})
			.catch((unknownError: unknown) => {
				if (cancelled) return
				setError(getErrorMessage(unknownError))
				setState('error')
			})

		appRpc.request
			.listAvailablePiModels()
			.then((models) => {
				if (!cancelled) setAvailableModels(models)
			})
			.catch(() => undefined)

		return () => {
			cancelled = true
		}
	}, [])

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
						<Card.Root
							h="100%"
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
												})
											}
											options={['pi']}
										/>
									</InlineField>
									<InlineField label="Model">
										<Select
											value={settings.model}
											onChange={(model) => setSettings({ ...settings, model })}
											options={getModelOptions(settings.model, availableModels)}
											loading={availableModels.length === 0}
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
	return options.includes(currentModel) ? options : [currentModel, ...options]
}

function Select({
	value,
	options,
	onChange,
	loading = false,
}: {
	value: string
	options: string[]
	onChange: (value: string) => void
	loading?: boolean
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
				title={loading ? 'Loading Pi models…' : undefined}
				className={css({
					alignItems: 'center',
					bg: 'gray.2',
					borderColor: open ? 'border.default' : 'border.default',
					borderRadius: 'l2',
					borderWidth: '1px',
					color: 'fg.default',
					cursor: 'pointer',
					display: 'flex',
					fontSize: 'sm',
					h: '10',
					justifyContent: 'space-between',
					minW: '0',
					px: '3',
					textAlign: 'left',
					w: '100%',
				})}
				onClick={() => setOpen((current) => !current)}
			>
				<span className={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
					{value}
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
