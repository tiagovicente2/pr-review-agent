import { useEffect, useState } from 'react'
import { Box, Stack } from 'styled-system/jsx'

const reviewFrames = [
	'[=     ]',
	'[==    ]',
	'[ ===  ]',
	'[  === ]',
	'[    ==]',
	'[     =]',
	'[    ==]',
	'[  === ]',
]

export function ReviewProgress({ message }: { message?: string }) {
	const [frameIndex, setFrameIndex] = useState(0)

	useEffect(() => {
		const interval = window.setInterval(() => {
			setFrameIndex((current) => (current + 1) % reviewFrames.length)
		}, 500)

		return () => window.clearInterval(interval)
	}, [])

	return (
		<Stack bg="gray.2" borderRadius="l2" gap="5" minH="18rem" p="6" textAlign="center">
			<Box fontWeight="semibold" textAlign="left">
				Reviewing this PR
			</Box>
			<Stack alignItems="center" flex="1" gap="4" justify="center">
				<Box color="cyan.11" fontFamily="mono" fontSize="5xl" fontWeight="bold" lineHeight="1">
					{reviewFrames[frameIndex]}
				</Box>
				<Box color="fg.muted" maxW="32rem" textStyle="sm">
					{message || 'This can take a minute for larger diffs.'}
				</Box>
			</Stack>
		</Stack>
	)
}
