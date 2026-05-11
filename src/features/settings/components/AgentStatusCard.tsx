import { Box, HStack, Stack } from 'styled-system/jsx'
import type { AsyncState } from '@/app/types'
import { Badge, Button, Card } from '@/components/ui'
import type { AgentAvailability } from '@/shared/settings'

export function AgentStatusCard({
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
						<Card.Description>
							GitHub is checked during onboarding. Review agent status is shown here.
						</Card.Description>
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
