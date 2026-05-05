import { type ReactNode, useEffect, useState } from 'react'
import { css } from 'styled-system/css'
import { Box, HStack, Stack } from 'styled-system/jsx'
import { appRpc } from '@/app/rpc'
import type { AsyncState } from '@/app/types'
import { getErrorMessage } from '@/app/utils'
import { StatusCard, TabButton } from '@/components/common'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { Button, Card, Textarea } from '@/components/ui'
import type { AppSettings, CodeAgent, ColorModePreference, ReviewLanguage } from '@/shared/settings'

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
	const [instructionsMode, setInstructionsMode] = useState<'raw' | 'preview'>('raw')

	useEffect(() => {
		appRpc.request
			.getAppSettings()
			.then((value) => {
				setSettings(value)
				setState('idle')
			})
			.catch((unknownError: unknown) => {
				setError(getErrorMessage(unknownError))
				setState('error')
			})
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
		} catch (unknownError) {
			setError(getErrorMessage(unknownError))
			setState('error')
		}
	}

	return (
		<Box h="100%" overflow="hidden" px="8" py="6">
			<Stack gap="4" h="100%" maxW="10/12" minH="0" mx="auto">
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
							xl: '22rem minmax(0, 1fr)',
						}}
						h="100%"
						minH="0"
						overflow="hidden"
					>
						<Card.Root
							h="100%"
							minH="0"
							overflow="hidden"
							display="grid"
							gridTemplateRows="auto minmax(0, 1fr)"
						>
							<Card.Header>
								<Card.Title>Preferences</Card.Title>
								<Card.Description>Local UI and agent selection.</Card.Description>
							</Card.Header>
							<Card.Body minH="0" overflowY="auto">
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
											options={['pi-agent']}
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
										h="100%"
										minH="0"
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

function Select({
	value,
	options,
	onChange,
}: {
	value: string
	options: string[]
	onChange: (value: string) => void
}) {
	return (
		<select
			className={css({
				appearance: 'none',
				bg: 'gray.2',
				backgroundImage:
					'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)',
				backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 12px) 50%',
				backgroundRepeat: 'no-repeat',
				backgroundSize: '6px 6px, 6px 6px',
				borderColor: 'border.default',
				borderRadius: 'l2',
				borderWidth: '1px',
				color: 'fg.default',
				h: '10',
				minW: '11rem',
				px: '3',
				width: '11rem',
			})}
			value={value}
			onChange={(event) => onChange(event.target.value)}
		>
			{options.map((option) => (
				<option key={option} value={option}>
					{option}
				</option>
			))}
		</select>
	)
}
