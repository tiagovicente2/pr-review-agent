import { Box, HStack, Stack } from 'styled-system/jsx'
import type { AsyncState } from '@/app/types'
import { Button } from '@/components/ui'

export function ReviewInboxHeader({
	onOpenSettings,
	onRefresh,
	reviewsState,
	username,
}: {
	onOpenSettings: () => void
	onRefresh: () => void
	reviewsState: AsyncState
	username?: string
}) {
	return (
		<Stack gap="3">
			<HStack justify="space-between" alignItems="flex-start" gap="3">
				<Box as="h1" textStyle="4xl" fontWeight="bold" letterSpacing="-0.04em">
					Review inbox
				</Box>
				<Button size="sm" variant="outline" onClick={onOpenSettings}>
					Settings
				</Button>
			</HStack>
			<HStack justify="space-between" gap="3">
				<Box color="fg.muted" textStyle="sm">
					Connected as @{username ?? 'unknown'}
				</Box>
				<Button size="sm" variant="plain" onClick={onRefresh} loading={reviewsState === 'loading'}>
					Refresh
				</Button>
			</HStack>
		</Stack>
	)
}
