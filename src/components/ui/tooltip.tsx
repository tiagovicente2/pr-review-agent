import type { ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Box } from 'styled-system/jsx'

export function InfoTooltip({
	children,
	message,
	tone = 'default',
}: {
	children?: ReactNode
	message: string
	tone?: 'default' | 'success' | 'error'
}) {
	const color = tone === 'success' ? 'green.11' : tone === 'error' ? 'red.11' : 'fg.muted'
	const borderColor = tone === 'success' ? 'green.9' : tone === 'error' ? 'red.9' : 'border.default'

	return (
		<Box position="relative" className={css({ _hover: { '& [data-tooltip]': { opacity: 1, visibility: 'visible' } } })}>
			<button
				type="button"
				aria-label={message}
				className={css({
					alignItems: 'center',
					borderColor,
					borderRadius: 'full',
					borderWidth: '1px',
					color,
					display: 'inline-flex',
					fontSize: 'xs',
					fontWeight: 'bold',
					h: '5',
					justifyContent: 'center',
					w: '5',
				})}
			>
				{children ?? 'i'}
			</button>
			<Box
				data-tooltip
				bg="gray.3"
				borderColor="gray.7"
				borderRadius="l2"
				borderWidth="1px"
				top="50%"
				boxShadow="lg"
				color="fg.default"
				fontSize="xs"
				left="calc(100% + 0.5rem)"
				maxW="16rem"
				opacity="0"
				p="2"
				position="absolute"
				transform="translateY(-50%)"
				transition="opacity 120ms ease"
				visibility="hidden"
				whiteSpace="normal"
				w="16rem"
				zIndex="tooltip"
			>
				{message}
			</Box>
		</Box>
	)
}
