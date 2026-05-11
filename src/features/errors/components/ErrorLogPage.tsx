import { Box, HStack, Stack } from 'styled-system/jsx'
import { Button, Card } from '@/components/ui'

export type AppErrorLog = {
	id: string
	title: string
	message: string
	createdAt: string
	context?: string
}

export function ErrorLogPage({
	errors,
	onBack,
	onClear,
	onDismiss,
}: {
	errors: AppErrorLog[]
	onBack: () => void
	onClear: () => void
	onDismiss: (id: string) => void
}) {
	return (
		<Box boxSizing="border-box" h="100%" overflow="hidden" px="8" py="6">
			<Stack gap="4" h="100%" minH="0" mx="auto" w="100%">
				<HStack alignItems="flex-start" justify="space-between">
					<Box>
						<Box as="h1" fontWeight="bold" textStyle="3xl">
							Error log
						</Box>
						<Box color="fg.muted" textStyle="sm">
							Recent app and GitHub errors captured during this session.
						</Box>
					</Box>
					<HStack gap="2">
						<Button variant="outline" onClick={onClear} disabled={errors.length === 0}>
							Clear all
						</Button>
						<Button onClick={onBack}>Back</Button>
					</HStack>
				</HStack>

				<Stack gap="3" minH="0" overflowY="auto" pr="2">
					{errors.length === 0 ? (
						<Card.Root variant="outline">
							<Card.Body p="5">
								<Box fontWeight="semibold">No errors logged</Box>
								<Box color="fg.muted" mt="1" textStyle="sm">
									Errors will appear here when something fails.
								</Box>
							</Card.Body>
						</Card.Root>
					) : null}

					{errors.map((error) => (
						<Card.Root key={error.id} variant="outline">
							<Card.Body p="4">
								<HStack alignItems="flex-start" justify="space-between" gap="4">
									<Stack gap="2" minW="0">
										<Box color="red.11" fontWeight="semibold">
											{error.title}
										</Box>
										<Box color="fg.muted" textStyle="xs">
											{new Date(error.createdAt).toLocaleString()}
											{error.context ? ` · ${error.context}` : ''}
										</Box>
										<Box
											as="pre"
											bg="gray.2"
											borderRadius="l2"
											maxW="100%"
											overflowX="auto"
											p="3"
											textStyle="sm"
											whiteSpace="pre-wrap"
										>
											{error.message}
										</Box>
									</Stack>
									<Button size="sm" variant="plain" onClick={() => onDismiss(error.id)}>
										Dismiss
									</Button>
								</HStack>
							</Card.Body>
						</Card.Root>
					))}
				</Stack>
			</Stack>
		</Box>
	)
}
